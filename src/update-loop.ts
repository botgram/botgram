/**
 * This module defines the update loop logic, i.e. using
 * the API client and long polling to receive bot updates.
 */

import * as EventEmitter from 'events'
import * as BluebirdPromise from 'bluebird'
import { Client, NetworkError } from './client'
import { Update, UpdateKind, integer } from './telegram'

/**
 * Implements an Update-receiving loop, which is started when the object
 * is constructed and can be stopped with the [[UpdateLoop.stop]] method.
 * An `updates` event is emitted for every batch of received updates.
 * An `error` event is emitted when an error is received for the request.
 *
 * The loop has two phases: first it receives all *queued* updates and
 * emits `updates` events with the second argument set to `true`. Then
 * it emits a `sync` event and starts making long-polling requests.
 */
export class UpdateLoop extends EventEmitter {

  /** The API client to query for updates */
  client: Client
  /** Options for the update loop */
  options: UpdateLoopOptions

  constructor (client: Client, options?: UpdateLoopOptions) {
    super()
    this.options = { ...defaultOptions, ...options }
    //FIXME validate options
    this.client = client
    this.loop()
  }

  /** `false` if the loop hasn't been stopped or finished due to fatal error */
  running: boolean = true
  /** `false` if all the queued updates have been received (`sync` event emitted) */
  queued: boolean = true
  /** last request made to the API */
  request?: BluebirdPromise<Update[]>
  /** ID of last received update + 1, if any */
  offset?: integer

  /**
   * Loop tick
   */
  private loop () {
    if (!this.running) {
      return
    }

    let offset = this.offset
    if (!this.request && this.options.discard !== false) {
      offset = (this.options.discard === true) ? -1 : -this.options.discard!
    }

    this.request = this.client.getUpdates({
      offset, timeout: this.queued ? 0 : this.options.pollTime,
      limit: this.options.batchSize,
      allowed_updates: this.options.allowedUpdates,
    })

    this.request.then(updates => {
      if (updates.length) {
        this.offset = updates[updates.length - 1].update_id + 1
      }
      if (!(this.queued && this.options.discard === true)) {
        this.emit('updates', updates, this.queued)
      }
      if (this.queued && updates.length < this.options.batchSize!) {
        this.emit('sync')
        this.queued = false
      }
      this.loop()
    }, error => {
      this.running = this.options.alwaysRetry ? true : (error instanceof NetworkError)
      this.emit('error', error, this.running)
      if (this.running) {
        setTimeout(() => this.loop(), this.options.retryTime! * 1e3)
      }
    })
  }

  /**
   * Stop the loop. No more events will be emitted and no more
   * requests will be made to the API, and the current request
   * will be aborted.
   */
  public stop (): void {
    this.running = false
    if (this.request) {
      this.request.cancel()
    }
  }

}

/**
 * Default options for an update loop
 */
export const defaultOptions: UpdateLoopOptions = {
  pollTime: 50,
  discard: false,
  allowedUpdates: [],
  batchSize: 100,
  retryTime: 10,
  alwaysRetry: false,
}

/**
 * Options for the update loop
 */
export interface UpdateLoopOptions {
  pollTime?: integer,
  discard?: boolean | integer,
  batchSize?: integer,
  allowedUpdates?: UpdateKind[],
  retryTime?: integer,
  alwaysRetry?: boolean,
}

export default UpdateLoop
