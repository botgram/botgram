import * as EventEmitter from 'events'
import { Client, ClientOptions, defaultOptions as clientOptions } from './client'
import { UpdateLoop, UpdateLoopOptions, defaultOptions as updateLoopOptions } from './update-loop'
import { integer, Update, Message, Chat } from './telegram'
import * as telegram from './telegram'

export class Bot extends EventEmitter {

  /** The API client used by this bot */
  public client: Client
  /** Bot options */
  options: BotOptions

  /**
   * Construct a new [[Bot]] object
   * @param authToken The authentication token for the bot
   * @param options Bot & API client options
   */
  public constructor (authToken: string, options?: BotOptions) {
    super()
    this.options = { ...defaultOptions, ...options }
    this.client = new Client(authToken, this.options.clientOptions)
  }

  // Loop management

  private loop?: UpdateLoop

  public listen(): void {
    if (!this.loop) {
      this.loop = new UpdateLoop(this.client, this.options.updateLoopOptions)
      this.loop.on('sync', () => this.emit('sync'))
      this.loop.on('updates', (updates, queued) => this.handleBatch(updates, queued))
      this.loop.on('error', (error, retry) =>
        this.emit(retry ? 'updateError' : 'error', error))
    }
  }

  public stop(): void {
    if (this.loop) {
      this.loop.stop()
      this.loop = undefined
    }
  }

  private handleBatch(updates: Update[], queued: boolean): void {
    // FIXME: export queued
    updates.forEach(update => this._processUpdate(update, queued))
  }

  // Other methods for update reception

  public processUpdate(u: string | object): any {
    u = (typeof u === 'string') ? JSON.parse(u) : u
    return this._processUpdate(new Update(u, this.client))
  }

  // Update processing

  protected parseUpdate(update: Update, queued?: boolean): IncomingUpdate | void {
    const base: IncomingUpdateBase = { id: update.update_id, update, queued }
    if (update.message) {
      let msg = update.message, chat = msg.chat
      return {...base, type: 'message', msg, chat, edited: false}
    } else if (update.edited_message) {
      let msg = update.edited_message, chat = msg.chat
      return {...base, type: 'edited_message', msg, chat, edited: true}
    } else if (update.channel_post) {
      let msg = update.channel_post, channel = msg.chat
      return {...base, type: 'channel_post', msg, channel, edited: false}
    } else if (update.edited_channel_post) {
      let msg = update.edited_channel_post, channel = msg.chat
      return {...base, type: 'edited_channel_post', msg, channel, edited: true}
    } else if (update.inline_query) {
      return {...base, type: 'inline_query', query: update.inline_query}
    } else if (update.chosen_inline_result) {
      return {...base, type: 'chosen_inline_result', result: update.chosen_inline_result}
    } else if (update.callback_query) {
      return {...base, type: 'callback_query', query: update.callback_query}
    } else if (update.shipping_query) {
      return {...base, type: 'shipping_query', query: update.shipping_query}
    } else if (update.pre_checkout_query) {
      return {...base, type: 'pre_checkout_query', query: update.pre_checkout_query}
    }
  }

  protected _processUpdate(update: Update, queued?: boolean): any {
    const info = this.parseUpdate(update, queued)
    if (typeof info !== 'undefined') {
      return this.callHandler(info)
    }
  }

  protected handlers: (Handler<this, IncomingUpdate>)[] = []

  protected callHandler(info: IncomingUpdate, idx: integer = 0): any {
    if (idx < this.handlers.length) {
      return this.handlers[idx].call(this, info, () => this.callHandler(info, idx + 1))
    }
  }

  public use(handler: Handler<this, IncomingUpdate>): void {
    this.handlers.push(handler)
  }

  // Generic handlers

  public message(handler: Handler<this, IncomingMessage>): void {
    return this.use(filterHandler(info => info.type === 'message', handler))
  }

  public editedMessage(handler: Handler<this, IncomingEditedMessage>): void {
    return this.use(filterHandler(info => info.type === 'edited_message', handler))
  }

  public channelPost(handler: Handler<this, IncomingChannelPost>): void {
    return this.use(filterHandler(info => info.type === 'channel_post', handler))
  }

  public editedChannelPost(handler: Handler<this, IncomingEditedChannelPost>): void {
    return this.use(filterHandler(info => info.type === 'edited_channel_post', handler))
  }

  public inlineQuery(handler: Handler<this, IncomingInlineQuery>): void {
    return this.use(filterHandler(info => info.type === 'inline_query', handler))
  }

  public chosenInlineResult(handler: Handler<this, IncomingChosenInlineResult>): void {
    return this.use(filterHandler(info => info.type === 'chosen_inline_result', handler))
  }

  public callbackQuery(handler: Handler<this, IncomingCallbackQuery>): void {
    return this.use(filterHandler(info => info.type === 'callback_query', handler))
  }

  public shippingQuery(handler: Handler<this, IncomingShippingQuery>): void {
    return this.use(filterHandler(info => info.type === 'shipping_query', handler))
  }

  public preCheckoutQuery(handler: Handler<this, IncomingPreCheckoutQuery>): void {
    return this.use(filterHandler(info => info.type === 'pre_checkout_query', handler))
  }

  // Message handlers

  

}

export type Handler<T, I extends IncomingUpdate> =
  (this: T, info: I, next: () => any) => void

const filterHandler = <T, I1 extends IncomingUpdate, I2 extends I1>(
  filter: (info: I1) => boolean,
  handler: Handler<T, I2>): Handler<T, I1> =>
  function (info, next) { return filter(info) ? handler.call(this, info as I2, next) : next() }

/**
 * Default options for the bot object
 */
export const defaultOptions: BotOptions = {
  clientOptions,
  updateLoopOptions,
}

/**
 * Options for the bot object
 */
export interface BotOptions {
  clientOptions?: ClientOptions
  updateLoopOptions?: UpdateLoopOptions
}

export default Bot

// INFO TYPES

export interface IncomingUpdateBase {
  update: Update
  id: integer
  type?: telegram.UpdateKind
  queued?: boolean
}

export type IncomingUpdate =
  IncomingMessage |
  IncomingEditedMessage |
  IncomingChannelPost |
  IncomingEditedChannelPost |
  IncomingInlineQuery |
  IncomingChosenInlineResult |
  IncomingCallbackQuery |
  IncomingShippingQuery |
  IncomingPreCheckoutQuery

export interface IncomingMessage extends IncomingUpdateBase {
  type: "message"
  msg: Message
  chat: Chat
  edited: false
}

export interface IncomingEditedMessage extends IncomingUpdateBase {
  type: "edited_message"
  msg: Message
  chat: Chat
  edited: true
}

export interface IncomingChannelPost extends IncomingUpdateBase {
  type: "channel_post"
  msg: Message
  channel: Chat
  edited: false
}

export interface IncomingEditedChannelPost extends IncomingUpdateBase {
  type: "edited_channel_post"
  msg: Message
  channel: Chat
  edited: true
}

export interface IncomingInlineQuery extends IncomingUpdateBase {
  type: "inline_query"
  query: telegram.InlineQuery
}

export interface IncomingChosenInlineResult extends IncomingUpdateBase {
  type: "chosen_inline_result"
  result: telegram.ChosenInlineResult
}

export interface IncomingCallbackQuery extends IncomingUpdateBase {
  type: "callback_query"
  query: telegram.CallbackQuery
}

export interface IncomingShippingQuery extends IncomingUpdateBase {
  type: "shipping_query"
  query: telegram.ShippingQuery
}

export interface IncomingPreCheckoutQuery extends IncomingUpdateBase {
  type: "pre_checkout_query"
  query: telegram.PreCheckoutQuery
}
