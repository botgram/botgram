/**
 * This module implements integrations to easily create a
 * webhook to receive messages for a bot. See the [[Webhook guide]].
 */

import * as http from 'http'
import * as stream from 'stream'
import { promisify } from 'util'
import Bot from '../bot'

const finished = promisify(stream.finished)

/**
 * Returns a handler that may be set in an AWS Lambda function.
 * Example:
 *
 * ~~~ js
 * const bot = botgram('<auth token>')
 * 
 * // register your handlers
 * 
 * exports.handler = bot.makeLambdaHandler()
 * ~~~
 *
 * The handler simply passes the request body to [[processUpdate]]
 * and awaits on the result. If it resolves successfully a 204 is
 * returned to Telegram, otherwise the error is passed to Lambda.
 * 
 * After setting up your Lambda function, you must also set up
 * an API Gateway proxy so that it has a public URL. Then follow
 * the rest of the [[Webhook guide]].
 */
export function makeLambdaHandler (bot: Bot) {
  return async function botgramLambdaHandler(event: any, context: any) {
    if (event.isBase64Encoded) {
      event.body = Buffer.from(event.body, 'base64')
    }
    await bot.processUpdate(event.body)
    return { statusCode: 204, body: '' }
  }
}

/**
 * Returns middleware implementing a webhook. The middleware can be
 * used in Express, Connect, Resfity, Fastify, as a handler for HTTP
 * Cloud Functions, or even on a plain `http.Server`.
 *
 * You do not need to use `express.json()` or similar.
 * Example:
 * 
 * ~~~ js
 * const bot = botgram('<auth token>')
 * 
 * // register your handlers
 * 
 * const app = require('express')()
 * app.use('/telegramWebhook', bot.makeMiddleware())
 * app.listen(8080)
 * ~~~
 * 
 * The middleware simply collects the body (if needed) and passes it
 * to [[processUpdate]] and awaits on the result. If it resolves
 * successfully a 204 is returned to Telegram, otherwise the error
 * is passed to `next`.
 * 
 * If no `next` is present (i.e. using it directly in a server)
 * then the error will be printed and a 500 will be returned to Telegram.
 * 
 * **Tip:** Instead of `/telegramWebhook`, it's recommended to place
 * your webhook on a random or hard-to-guess URL, to make sure messages
 * really come from Telegram servers.
 */
export function makeMiddleware (bot: Bot) {
  return async function botgramMiddleware(req: http.IncomingMessage, res: http.ServerResponse, next?: (error?: any) => any) {
    try {
      let body = (req as any).body
      if (body === undefined) {
        body = []
        req.on('data', data => body.push(data))
        await finished(req)
        body = Buffer.concat(body)
      }
      await bot.processUpdate(body)
      res.statusCode = 204
      res.end()
    } catch (error) {
      if (next) {
        return next(error)
      }
      console.error(`Failed processing update: ${(error && error.stack) || error}`)
      res.statusCode = 500
      res.end('Internal error')
    }
  }
}
