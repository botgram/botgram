import { Message, MessageEntity } from '../telegram'

/**
 * Represents a parsed command message.
 */
export interface Command {
  /**
   * The command name, without the leading slash.
   * Example: `help`
   */
  name: string
  /**
   * If the command is directed to a particular bot (i.e.
   * `/help@some_bot`), the username without leading `@`.
   * Otherwise it's undefined.
   */
  username?: string
  /**
   * The rest of the text in the message, excluding leading
   * or trailing whitespace.
   */
  args: string
}

/**
 * Given a message, check if it's a text message starting
 * with a bot command (i.e. `/start`) and parse it into a
 * [[Command]] object.
 *
 * @param msg Message to parse
 * @returns The parsed command, or undefined if it's not a
 * text message or doesn't start with a command.
 */
export function parseCommand(msg: Message): Command | undefined {
  const { text, entities } = msg
  if (!(text && entities)) {
    return
  }
  if (!(entities[0] && entities[0].type === 'bot_command' &&
      entities[0].offset === 0 && entities[0].length > 1)) {
    return
  }
  const hasMention = (entities[1] && entities[1].type === 'mention' &&
      entities[1].offset === entities[0].length && entities[1].length > 1)
  const getEnd = (entity: MessageEntity) => entity.offset + entity.length
  
  return {
    name: text.substring(1, entities[0].length),
    username: hasMention ? text.substring(entities[1].offset + 1,
      getEnd(entities[1])) : undefined,
    args: text.substring(getEnd(entities[ hasMention ? 1 : 0 ])).trim(),
  }
}

/**
 * Given a list of command names, which may be strings or
 * regular expressions, test if the passed command name matches
 * one of them.
 * 
 * **Note:** Strings will be matched case-insensitively. It's
 * recommended to pass case-insensitive RegExps.
 * 
 * This method is used by [[Bot]] when you register a command
 * handler.
 * 
 * @param name Command name to test for a match
 * @param names List of allowed names
 * @returns Whether the name matches some item in `names`.
 */
export function matchCommand(name: string, names: (string | RegExp)[]): boolean {
  for (const n of names) {
    if ((n instanceof RegExp) ? n.test(name) : 
      (n as string).toLowerCase() === name.toLowerCase()) {
      return true
    }
  }
  return false
}

/**
 * Given a [[Command]] object, format it into its original command.
 * **Note**: This method does not validate `name` or `username`,
 * and will produce an invalid command if they contain invalid characters.
 *
 * @param command Command to format
 * @returns Command text
 */
export function formatCommand({name, username, args}: Command): string {
  return `/${name}${username ? `@${username}` : ''}${args ? ` ${args}` : ''}`
}

// FIXME: text / entities to HTML
