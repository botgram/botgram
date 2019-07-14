/**
 * This module defines the API client, the part of Botgram
 * that handles the communication with Telegram's REST API.
 *
 * It also provides
 * some convenience methods for common API operations, such as
 * downloading a file.
 */

import * as util from 'util'
import * as url from 'url'
import * as querystring from 'querystring'
import * as stream from 'stream'
import * as http from 'http'
import * as https from 'https'
import * as FormData from 'form-data'
import * as BluebirdPromise from 'bluebird'
import { ClientBase, isAttachment } from './telegram'
const finished = util.promisify(stream.finished)
const pipeline = util.promisify(stream.pipeline)

/**
 * Contains information about the original request.
 */
export interface RequestInfo {
  /** Method name */
  method: string
  /** Parameters */
  parameters: object
  /** Stack trace of the request call, if enabled and available */
  stack?: string
}

/**
 * This is the base class for any errors resulting from a
 * Telegram API request, which can be [[TelegramError]]
 * or [[NetworkError]].
 *
 * @see Client.callMethod
 */
export class RequestError extends Error {
  /** Information about the request that caused this error */
  req: RequestInfo

  protected constructor (req: RequestInfo, message: string) {
    super(message)
    this.name = RequestError.name
    this.req = req

    // Enhance stack trace
    const params = util.inspect(this.req.parameters, { depth: 0 }).replace(/\s+/g, ' ')
    this.stack += '\n' + util.format('When calling method %s: %s', this.req.method, params)
    if (req.stack) {
      this.stack += '\n' + req.stack.split('\n').slice(1).join('\n')
    }
  }
}

/**
 * This error is produced when the Telegram API returns an error
 * for a request, and contains information returned by Telegram
 * about the failure.
 *
 * @see Client.callMethod
 */
export class TelegramError extends RequestError {
  /**
   * Raw response object received from Telegram. `ok` equals false
   * and the error is explained in `description`. An integer `error_code`
   * field is also returned, but its contents are subject to change
   * in the future. Some errors may also have an optional field
   * `parameters` of the type ResponseParameters, which can help
   * to automatically handle the error.
   */
  response: any

  constructor (response: any, req: RequestInfo) {
    super(req, response.description)
    this.name = TelegramError.name
    this.response = response
  }
}

/**
 * This error is produced when the HTTP request itself couldn't
 * be carried out correctly, or when an unexpected response was
 * received. It contains information about the original error
 * that caused this one.
 */
export class NetworkError extends RequestError {
  /** Reason of the network error, or original error */
  reason: string | Error

  constructor (reason: string | Error, req: RequestInfo) {
    super(req, reason.toString())
    this.name = NetworkError.name
    this.reason = reason
  }
}

/**
 * Simple to use API client for the
 * [Telegram Bots API](https://core.telegram.org/bots/api).
 *
 * You can use this class instead of [[Bot]] if you don't need to receive
 * updates or messages and just want to make requests to the API.
 *
 * Note that all API calls return a Bluebird promise, not a native one.
 * If you [enable cancellation](http://bluebirdjs.com/docs/api/cancellation.html),
 * you may call `result.cancel()` to abort the request (no `.then()`
 * or `.catch()` handlers will be called). This shouldn't matter most
 * of the time, but if you need to convert it into a native Promise you
 * can call `Promise.resolve(result)`.
 *
 * Two types of error can occur as a result of an API call:
 * [[TelegramError]] if the API returned an error response,
 * or [[NetworkError]] if the request couldn't be made or an
 * unexpected or malformed response was received.
 *
 * Keep in mind that aborting the request or receiving a
 * [[NetworkError]] do **not** guarantee that the request wasn't
 * performed.
 */
export class Client extends ClientBase {

  /** The authentication token for the bot */
  options: ClientOptions
  /** Client options */
  authToken: string

  /**
   * Construct a new API client object
   * @param authToken The authentication token for the bot
   * @param options Client options
   */
  public constructor (authToken: string, options?: ClientOptions) {
    super()
    if (typeof authToken !== 'string' || !authToken.length) {
      throw new Error('Invalid auth token')
    }
    this.options = { ...defaultOptions, ...options }
    this.authToken = authToken
  }

  /**
   * Call a method in the Telegram Bots API.
   *
   * All the other client methods internally call this one to execute
   * the request. You should never need to call this directly.
   *
   * @param method Name of the method to call.
   *
   * @param parameters Object where each property is a parameter to send.
   * Values which are not [[Attachment]] or primitive types, will be
   * serialized into JSON objects.
   *
   * @returns Promise for the method call result (JSON object).
   */
  public callMethod (method: string, parameters: any): BluebirdPromise<any> {
    const reqInfo: RequestInfo = { method, parameters }
    if (this.options.captureStack && Error.captureStackTrace) {
      Error.captureStackTrace(reqInfo, this.callMethod)
    }

    // Encode non-null parameters into strings (except if they're attachments)
    const data: any = {}
    let attachmentsPresent = false
    Object.keys(parameters).forEach((key) => {
      let value: any = parameters[key]
      if (value !== null && value !== undefined) {
        if (isAttachment(value)) {
          attachmentsPresent = true
        } else if (typeof value !== 'string') {
          value = JSON.stringify(value)
        }
        data[key] = value
      }
    })

    const uri = this.options.apiBase + `bot${this.authToken}/${method}`
    const options: http.RequestOptions = {
      agent: this.options.agent,
      headers: { 'accept': 'application/json' },
    }

    // The strategy is to send the request as a GET if there are no attachments.
    // Otherwise we're left to POSTing a multipart/form-data which has overhead
    // for small properties.
    if (attachmentsPresent) {
      const form = new FormData()
      const userStreams: stream.Readable[] = []
      Object.keys(data).forEach((key) => {
        const value = data[key]
        if (isAttachment(value)) {
          if (value.file instanceof stream.Readable) {
            userStreams.push(value.file)
          }
          return form.append(key, value.file, value)
        }
        form.append(key, value)
      })
      const response = this._submitForm(form, uri, options).finally(() =>
        userStreams.forEach((stream) => stream.destroy()))
      return this._processResponse(reqInfo, response)
    } else {
      const fullUri = uri + '?' + querystring.stringify(data)
      return this._processResponse(reqInfo, this._sendGet(fullUri, options))
    }
  }

  private _submitForm (form: FormData, uri: string, options: http.RequestOptions): BluebirdPromise<http.IncomingMessage> {
    options.method = 'POST'
    options.headers = { ...options.headers, ...form.getHeaders() }
    if (form.hasKnownLength()) {
      options.headers['content-length'] = form.getLengthSync()
    }
    const req = (options.protocol === 'https' ? https : http).request(uri, options)
    return new BluebirdPromise((resolve, reject, onCancel) => {
      pipeline(form, req).catch(reject)
      req.on('error', reject)
      req.on('response', resolve)
      onCancel && onCancel(() => req.abort())
    })
  }

  private _sendGet (uri: string, options: http.RequestOptions): BluebirdPromise<http.IncomingMessage> {
    const req = (options.protocol === 'https' ? https : http).get(uri, options)
    return new BluebirdPromise((resolve, reject, onCancel) => {
      req.on('error', reject)
      req.on('response', resolve)
      onCancel && onCancel(() => req.abort())
    })
  }

  private _processResponse (reqInfo: RequestInfo, response: BluebirdPromise<http.IncomingMessage>): BluebirdPromise<any> {
    // Collect the body; parse as JSON; emit result or TelegramError.
    // For any other error, wrap inside NetworkError.
    return response.then((response) => {
      const chunks: Buffer[] = []
      response.on('data', (chunk) => chunks.push(chunk))
      return finished(response).then(() =>
        ({ response, data: Buffer.concat(chunks).toString('utf-8') }))
    }).then(({ response, data }) => {
      let body: any
      try {
        body = JSON.parse(data)
      } catch (err) {
        throw new NetworkError(`body is not JSON: ${util.inspect(data)}`, reqInfo)
      }
      if (body.ok !== false && body.ok !== true) {
        throw new NetworkError('ok field is not boolean', reqInfo)
      }
      if (body.ok !== (response.statusCode === 200)) {
        throw new NetworkError('ok field not matching HTTP response', reqInfo)
      }
      if (!body.ok) {
        throw new TelegramError(body, reqInfo)
      }
      return body.result
    }, (error) => {
      throw new NetworkError(error, reqInfo)
    })
  }

}

/**
 * Default agent used for requests
 */
export const defaultAgent: https.Agent =
  new https.Agent({ keepAlive: true, maxFreeSockets: 5 })

/**
 * Default options for the API client
 */
export const defaultOptions: ClientOptions = {
  agent: defaultAgent,
  apiBase: 'https://api.telegram.org/',
  captureStack: true
}

/**
 * Options for the API client
 */
export interface ClientOptions {
  /**
   * `Agent` to use when performing requests, instead of the default.
   */
  agent?: https.Agent
  /**
   * API base URL, useful to change in tests for mock servers
   */
  apiBase?: string
  /**
   * By default, the stack is captured when a request is made to Telegram,
   * so that errors indicate the place in your code where the request was
   * made. This reduces performance, and can be disabled with this option.
   */
  captureStack?: boolean
}

export default Client
