import { Bot, BotOptions } from './bot'

/**
 * Construct a new [[Bot]] object
 * @param authToken The authentication token for the bot
 * @param options Bot & API client options
 */
export default function botgram (authToken: string, options?: BotOptions): Bot {
  return new Bot(authToken, options)
}

export * from './bot'
