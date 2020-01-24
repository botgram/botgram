/**
 * This module defines all the types and requests exported
 * by Telegram's API, and the introspection system.
 */
/* tslint:disable:class-name variable-name no-trailing-whitespace no-consecutive-blank-lines */

import { finished, Readable } from 'stream'
import * as BluebirdPromise from 'bluebird'
import { IncomingMessage } from 'http'
import { AppendOptions } from 'form-data'

/** Represents an integer */
export type integer = number

/**
 * Represents a file attachment to be uploaded to Telegram when
 * sending the request. This is one of three ways to upload files,
 * see [[InputFile]].
 * 
 * At the very least, you must provide a `file` field with
 * either a `Readable` or a `Buffer`, and a `filename` or `filepath`
 * field specifying the name of the file, with a suitable extension.
 * 
 * For common types of streams, such as a `request` stream or
 * a `fs.ReadStrem`, you may omit the `filename` or `filepath` field
 * and it'll be autodetected from the original file / URL.
 * 
 * **Note:** If you provide a stream, it'll always be fully read or
 * destroyed if a promise is returned. However if an error is thrown
 * before the function returns the promise, you must take care of it
 * yourself.
 * 
 * For more information, and the full list of options that may
 * be provided, see [form-data](https://github.com/form-data/form-data).
 */
export interface Attachment extends AppendOptions {
  /** Contents of the file */
  file: Readable | Uint8Array
}

export function isAttachment (x: object): x is Attachment {
  const { file } = x as Attachment
  return (file instanceof Readable) || (file instanceof Uint8Array)
}

/**
 * Specifies the file to use, by passing one of these:
 *
 * 1. The identifier of a file that is already in Telegram servers,
 *    which can be specified with either a [[File]] object (or any object with
 *    a `file_id`) or the file ID directly (`string`).
 * 
 *    Example: `"AgADBAADKq8xG7n6KVIKN7ExAcrfKlEssRoABEOHMoPAv1AKtsUAAgI"`  
 *    Example: `some_message.document.file_id`  
 *    Example: `some_message.document`
 * 
 * 2. The URL or a file that will be downloaded by Telegram (`string`).
 * 
 *    Example: `"http://backend.example.com/assets/file12309481.jpg"`
 * 
 * 3. The binary contents of the file (readable stream or buffer), which
 *    will be uploaded to the server when making the request.
 *    It must be an [[Attachment]] object, see there for details.
 * 
 *    Example: `{ file: fs.createReadStream("assets/drawing.png") }`
 *    Example: `{ file: fs.readFileSync("assets/drawing.png"), filename: "image.png" }`
 *
 * **Limitations when passing a file identifier:**
 *
 *   - The file type must match. For example, a [[Document]] file
 *     can't be specified when sending a *photo* message.
 *   - It is not possible to resend thumbnails.
 *   - Passing the identifier of a photo size will send *all* of the sizes.
 *   - File identifiers are unique for each individual bot, and **can't** be
 *     transferred from one bot to another.
 *   - File identifiers uniquely identify a file, but a file can have different
 *     valid identifiers even for the same bot.
 *
 * **Limitations when passing a URL:**
 *
 *   - 5 MB max size for photos and 20 MB max for other types of content.
 *   - The target file must have the correct MIME type (e.g., `audio/mpeg` when
 *     sending an audio message, etc.).
 *   - When sending a document message, sending by URL will currently only work
 *     for gif, pdf and zip files.
 *   - To send voice messages, the file must have the type `audio/ogg` and be no
 *     more than 1MB in size. 1–20MB voice notes will be sent as files.
 *   - Other configurations may work but we can't guarantee that they will.
 *
 * **Limitations when passing binary content:**
 *
 *   - 10 MB max size for photos, 50 MB for other files.
 *
 */
export type InputFile = FileId | string | Attachment

/**
 * For input files which are [[Attachment]] objects, this moves them
 * to the top-level parameters and returns an "attach://" URL pointing
 * to them. Other values are left untouched.
 *
 * Users shouldn't need to call this method.
 *
 * @param file Input file value
 * @returns File ID or URL (possibly converted)
 */
export function extractInputFile (fdata: FormatData, file: InputFile): string {
  if (typeof file === 'object' && isAttachment(file)) {
    const id = fdata.fileId++
    const name = '_file_' + id
    fdata.parameters[name] = file
    return 'attach://' + name
  }
  return resolveFileId(file)
}

/**
 * Identifier for a binary file in Telegram servers, which can
 * be specified with either a [[File]] object (or any object with
 * a `file_id`) or its textual ID directly (`string`).
 * 
 * **Note:** File identifiers are unique for each individual bot,
 * and can't be transferred from one bot to another. See [[InputFile]]
 */
export type FileId = IFile | FileContext | string

export function resolveFileId (file: FileId): string {
  return (typeof file === 'string') ? file : file.file_id
}

/**
 * Identifier for a Telegram user, which can be specified
 * with either a [[IUser]] object or its numeric ID.
 *
 * [[IChat]] objects where `type = 'private'` are also valid.
 */
export type UserId = IUser | UserContext | (IChat & { type: 'private' }) | integer

/**
 * Resolve a generic [[UserId]] value to its numerical ID.
 *
 * @param user User identifier value
 * @returns Numerical identifier
 */
export function resolveUserId (user: UserId): integer {
  return (typeof user === 'object') ? user.id : user
}

/**
 * Identifier for a Telegram chat, which can be specified
 * with either an [[IChat]] object, an [[IUser]] object or its numeric ID.
 */
export type ChatId = IChat | ChatContext | UserId | integer

/**
 * Resolve a generic [[ChatId]] value to its numerical ID.
 *
 * @param chat Chat identifier value
 * @returns Numerical identifier
 */
export function resolveChatId (chat: ChatId): integer

/**
 * Resolve a generic [[ChatId]] value to its numerical ID.
 * A string is also accepted, and it'll be returned unchanged.
 *
 * @param chat Chat identifier value or username string
 * @returns Numerical identifier (or string)
 */
export function resolveChatId (chat: ChatId | string): integer | string
export function resolveChatId (chat: ChatId | string): integer | string {
  return (typeof chat === 'object') ? chat.id : chat
}

/**
 * A chat ID and message ID pair, which identify a regular
 * Telegram message at the chat it was sent on.
 *
 * [[IMessage]] objects are valid values of this type.
 */
export interface MessageId {
  /**
   * Identifier of the chat this message was sent on, or
   * username of the target channel (in the format `@channelusername`)
   */
  chat: ChatId | string
  /** Identifier of the message inside of the chat */
  message_id: integer
}

/**
 * Thrown when incorrect data is found before data is sent
 * to telegram (sending requests) or when parsing data
 * received from telegram (parsing methods). Validation is usually
 * only performed on a few spots where the typing system can't guarantee it.
 */
export class ValidationError extends Error {
  /**
   * Construct a new error
   * @param reason - Reason for the validation fail
   */
  constructor (reason: string) {
    super(reason)
    this.name = ValidationError.name
  }
}

/**
 * Base class for all contexts.
 */
class Context {
  /**
   * Construct a new context
   * @param client - API client to use for requests
   */
  constructor (client: ClientBase) {
    Object.defineProperty(this, '__client', { 'enumerable': false, 'value': client })
  }

  protected __getClient (): ClientBase {
    return (this as any).__client
  }
}

/**
 * This structure tracks data that is local to a request formatting.
 * Users shouldn't need to use this type directly.
 */
interface FormatData {
  parameters: any
  fileId: integer
}


// Getting updates
// ---------------

/**
 * Kind of Update
 */
export type UpdateKind =
    'message' |
    'edited_message' |
    'channel_post' |
    'edited_channel_post' |
    'inline_query' |
    'chosen_inline_result' |
    'callback_query' |
    'shipping_query' |
    'pre_checkout_query' |
    'poll' |
    'poll_answer'

/**
 * This object represents an incoming update.  
 * At most **one** of the optional parameters can be present in any given
 * update.
 */
export interface IUpdate {
  /**
   * The update‘s unique identifier. Update identifiers start from a
   * certain positive number and increase sequentially. This ID becomes
   * especially handy if you’re using [[setWebhook]], since it allows you
   * to ignore repeated updates or to restore the correct update sequence,
   * should they get out of order. If there are no new updates for at least
   * a week, then identifier of the next update will be chosen randomly
   * instead of sequentially.
   */
  update_id: integer

  /** New incoming message of any kind — text, photo, sticker, etc. */
  message?: IMessage

  /** New version of a message that is known to the bot and was edited */
  edited_message?: IMessage

  /** New incoming channel post of any kind — text, photo, sticker, etc. */
  channel_post?: IMessage

  /** New version of a channel post that is known to the bot and was edited */
  edited_channel_post?: IMessage

  /**
   * New incoming [inline](https://core.telegram.org/bots/api#inline-mode)
   * query
   */
  inline_query?: IInlineQuery

  /**
   * The result of an
   * [inline](https://core.telegram.org/bots/api#inline-mode) query that
   * was chosen by a user and sent to their chat partner. Please see our
   * documentation on the [feedback
   * collecting](https://core.telegram.org/bots/inline#collecting-feedback)
   * for details on how to enable these updates for your bot.
   */
  chosen_inline_result?: IChosenInlineResult

  /** New incoming callback query */
  callback_query?: ICallbackQuery

  /** New incoming shipping query. Only for invoices with flexible price */
  shipping_query?: IShippingQuery

  /**
   * New incoming pre-checkout query. Contains full information about
   * checkout
   */
  pre_checkout_query?: IPreCheckoutQuery

  /**
   * New poll state. Bots receive only updates about stopped polls and
   * polls, which are sent by the bot
   */
  poll?: IPoll

  /**
   * A user changed their answer in a non-anonymous poll. Bots receive new
   * votes only in polls that were sent by the bot itself.
   */
  poll_answer?: IPollAnswer
}

/**
 * Contains information about the current status of a webhook.
 */
export interface IWebhookInfo {
  /** Webhook URL, may be empty if webhook is not set up */
  url: string

  /**
   * True, if a custom certificate was provided for webhook certificate
   * checks
   */
  has_custom_certificate: boolean

  /** Number of updates awaiting delivery */
  pending_update_count: integer

  /**
   * Unix time for the most recent error that happened when trying to
   * deliver an update via webhook
   */
  last_error_date?: Date

  /**
   * Error message in human-readable format for the most recent error that
   * happened when trying to deliver an update via webhook
   */
  last_error_message?: string

  /**
   * Maximum allowed number of simultaneous HTTPS connections to the
   * webhook for update delivery
   */
  max_connections?: integer

  /**
   * A list of update types the bot is subscribed to. Defaults to all
   * update types
   */
  allowed_updates?: UpdateKind[]
}


// Available types
// ---------------

/**
 * This object represents a Telegram user or bot.
 */
export interface IUser {
  /** Unique identifier for this user or bot */
  id: integer

  /** True, if this user is a bot */
  is_bot: boolean

  /** User‘s or bot’s first name */
  first_name: string

  /** User‘s or bot’s last name */
  last_name?: string

  /** User‘s or bot’s username */
  username?: string

  /**
   * [IETF language tag](https://en.wikipedia.org/wiki/IETF_language_tag)
   * of the user's language
   */
  language_code?: string

  /** True, if the bot can be invited to groups. Returned only in [[getMe]]. */
  can_join_groups?: boolean

  /**
   * True, if [privacy mode](https://core.telegram.org/bots#privacy-mode)
   * is disabled for the bot. Returned only in [[getMe]].
   */
  can_read_all_group_messages?: boolean

  /** True, if the bot supports inline queries. Returned only in [[getMe]]. */
  supports_inline_queries?: boolean
}

/**
 * This object represents a chat.
 */
export interface IChat {
  /**
   * Unique identifier for this chat. This number may be greater than 32
   * bits and some programming languages may have difficulty/silent defects
   * in interpreting it. But it is smaller than 52 bits, so a signed 64 bit
   * integer or double-precision float type are safe for storing this
   * identifier.
   */
  id: integer

  /**
   * Type of chat, can be either “private”, “group”, “supergroup” or
   * “channel”
   */
  type: 'private' | 'group' | 'supergroup' | 'channel'

  /** Title, for supergroups, channels and group chats */
  title?: string

  /** Username, for private chats, supergroups and channels if available */
  username?: string

  /** First name of the other party in a private chat */
  first_name?: string

  /** Last name of the other party in a private chat */
  last_name?: string

  /** Chat photo. Returned only in [[getChat]]. */
  photo?: IChatPhoto

  /**
   * Description, for groups, supergroups and channel chats. Returned only
   * in [[getChat]].
   */
  description?: string

  /**
   * Chat invite link, for groups, supergroups and channel chats. Each
   * administrator in a chat generates their own invite links, so the bot
   * must first generate the link using [[exportChatInviteLink]]. Returned
   * only in [[getChat]].
   */
  invite_link?: string

  /**
   * Pinned message, for groups, supergroups and channels. Returned only in
   * [[getChat]].
   */
  pinned_message?: IMessage

  /**
   * Default chat member permissions, for groups and supergroups. Returned
   * only in [[getChat]].
   */
  permissions?: IChatPermissions

  /**
   * For supergroups, the minimum allowed delay between consecutive
   * messages sent by each unpriviledged user. Returned only in
   * [[getChat]].
   */
  slow_mode_delay?: integer

  /**
   * For supergroups, name of group sticker set. Returned only in
   * [[getChat]].
   */
  sticker_set_name?: string

  /**
   * True, if the bot can change the group sticker set. Returned only in
   * [[getChat]].
   */
  can_set_sticker_set?: boolean
}

/**
 * This object represents a message.
 */
export interface IMessage {
  /** Unique message identifier inside this chat */
  message_id: integer

  /** Sender, empty for messages sent to channels */
  from?: IUser

  /** Date the message was sent in Unix time */
  date: Date

  /** Conversation the message belongs to */
  chat: IChat

  /** For forwarded messages, sender of the original message */
  forward_from?: IUser

  /**
   * For messages forwarded from channels, information about the original
   * channel
   */
  forward_from_chat?: IChat

  /**
   * For messages forwarded from channels, identifier of the original
   * message in the channel
   */
  forward_from_message_id?: integer

  /**
   * For messages forwarded from channels, signature of the post author if
   * present
   */
  forward_signature?: string

  /**
   * Sender's name for messages forwarded from users who disallow adding a
   * link to their account in forwarded messages
   */
  forward_sender_name?: string

  /**
   * For forwarded messages, date the original message was sent in Unix
   * time
   */
  forward_date?: Date

  /**
   * For replies, the original message. Note that the Message object in
   * this field will not contain further *reply_to_message* fields even if
   * it itself is a reply.
   */
  reply_to_message?: IMessage

  /** Date the message was last edited in Unix time */
  edit_date?: Date

  /** The unique identifier of a media message group this message belongs to */
  media_group_id?: string

  /** Signature of the post author for messages in channels */
  author_signature?: string

  /**
   * For text messages, the actual UTF-8 text of the message, 0-4096
   * characters.
   */
  text?: string

  /**
   * For text messages, special entities like usernames, URLs, bot
   * commands, etc. that appear in the text
   */
  entities?: IMessageEntity[]

  /**
   * For messages with a caption, special entities like usernames, URLs,
   * bot commands, etc. that appear in the caption
   */
  caption_entities?: IMessageEntity[]

  /** Message is an audio file, information about the file */
  audio?: IAudio

  /** Message is a general file, information about the file */
  document?: IDocument

  /**
   * Message is an animation, information about the animation. For backward
   * compatibility, when this field is set, the *document* field will also
   * be set
   */
  animation?: IAnimation

  /** Message is a game, information about the game. */
  game?: IGame

  /** Message is a photo, available sizes of the photo */
  photo?: IPhotoSize[]

  /** Message is a sticker, information about the sticker */
  sticker?: ISticker

  /** Message is a video, information about the video */
  video?: IVideo

  /** Message is a voice message, information about the file */
  voice?: IVoice

  /**
   * Message is a [video
   * note](https://telegram.org/blog/video-messages-and-telescope),
   * information about the video message
   */
  video_note?: IVideoNote

  /**
   * Caption for the animation, audio, document, photo, video or voice,
   * 0-1024 characters
   */
  caption?: string

  /** Message is a shared contact, information about the contact */
  contact?: IContact

  /** Message is a shared location, information about the location */
  location?: ILocation

  /** Message is a venue, information about the venue */
  venue?: IVenue

  /** Message is a native poll, information about the poll */
  poll?: IPoll

  /**
   * New members that were added to the group or supergroup and information
   * about them (the bot itself may be one of these members)
   */
  new_chat_members?: IUser[]

  /**
   * A member was removed from the group, information about them (this
   * member may be the bot itself)
   */
  left_chat_member?: IUser

  /** A chat title was changed to this value */
  new_chat_title?: string

  /** A chat photo was change to this value */
  new_chat_photo?: IPhotoSize[]

  /** Service message: the chat photo was deleted */
  delete_chat_photo?: true

  /** Service message: the group has been created */
  group_chat_created?: true

  /**
   * Service message: the supergroup has been created. This field can‘t be
   * received in a message coming through updates, because bot can’t be a
   * member of a supergroup when it is created. It can only be found in
   * reply_to_message if someone replies to a very first message in a
   * directly created supergroup.
   */
  supergroup_chat_created?: true

  /**
   * Service message: the channel has been created. This field can‘t be
   * received in a message coming through updates, because bot can’t be a
   * member of a channel when it is created. It can only be found in
   * reply_to_message if someone replies to a very first message in a
   * channel.
   */
  channel_chat_created?: true

  /**
   * The group has been migrated to a supergroup with the specified
   * identifier. This number may be greater than 32 bits and some
   * programming languages may have difficulty/silent defects in
   * interpreting it. But it is smaller than 52 bits, so a signed 64 bit
   * integer or double-precision float type are safe for storing this
   * identifier.
   */
  migrate_to_chat_id?: integer

  /**
   * The supergroup has been migrated from a group with the specified
   * identifier. This number may be greater than 32 bits and some
   * programming languages may have difficulty/silent defects in
   * interpreting it. But it is smaller than 52 bits, so a signed 64 bit
   * integer or double-precision float type are safe for storing this
   * identifier.
   */
  migrate_from_chat_id?: integer

  /**
   * Specified message was pinned. Note that the Message object in this
   * field will not contain further *reply_to_message* fields even if it is
   * itself a reply.
   */
  pinned_message?: IMessage

  /**
   * Message is an invoice for a
   * [payment](https://core.telegram.org/bots/api#payments), information
   * about the invoice.
   */
  invoice?: IInvoice

  /**
   * Message is a service message about a successful payment, information
   * about the payment.
   */
  successful_payment?: ISuccessfulPayment

  /** The domain name of the website on which the user has logged in. */
  connected_website?: string

  /** Telegram Passport data */
  passport_data?: IPassportData

  /**
   * Inline keyboard attached to the message. `login_url` buttons are
   * represented as ordinary `url` buttons.
   */
  reply_markup?: IInlineKeyboardMarkup
}

/**
 * This object represents one special entity in a text message. For
 * example, hashtags, usernames, URLs, etc.
 */
export interface IMessageEntity {
  /**
   * Type of the entity. Can be “mention” (`@username`), “hashtag”
   * (`#hashtag`), “cashtag” (`$USD`), “bot_command” (`/start@jobs_bot`),
   * “url” (`https://telegram.org`), “email” (`do-not-reply@telegram.org`),
   * “phone_number” (`+1-212-555-0123`), “bold” (**bold text**), “italic”
   * (*italic text*), “underline” (underlined text), “strikethrough”
   * (strikethrough text), “code” (monowidth string), “pre” (monowidth
   * block), “text_link” (for clickable text URLs), “text_mention” (for
   * users [without
   * usernames](https://telegram.org/blog/edit#new-mentions))
   */
  type: 'mention' | 'hashtag' | 'cashtag' | 'bot_command' | 'url' | 'email' | 'phone_number' | 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'pre' | 'text_link' | 'text_mention'

  /** Offset in UTF-16 code units to the start of the entity */
  offset: integer

  /** Length of the entity in UTF-16 code units */
  length: integer

  /**
   * For “text_link” only, url that will be opened after user taps on the
   * text
   */
  url?: string

  /** For “text_mention” only, the mentioned user */
  user?: IUser

  /** For “pre” only, the programming language of the entity text */
  language?: string
}

/**
 * This object represents one size of a photo or a [[IDocument]] /
 * [[ISticker]] thumbnail.
 */
export interface IPhotoSize {
  /**
   * Identifier for this file, which can be used to download or reuse the
   * file
   */
  file_id: string

  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** Photo width */
  width: integer

  /** Photo height */
  height: integer

  /** File size */
  file_size?: integer
}

/**
 * This object represents an audio file to be treated as music by the
 * Telegram clients.
 */
export interface IAudio {
  /**
   * Identifier for this file, which can be used to download or reuse the
   * file
   */
  file_id: string

  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** Duration of the audio in seconds as defined by sender */
  duration: integer

  /** Performer of the audio as defined by sender or by audio tags */
  performer?: string

  /** Title of the audio as defined by sender or by audio tags */
  title?: string

  /** MIME type of the file as defined by sender */
  mime_type?: string

  /** File size */
  file_size?: integer

  /** Thumbnail of the album cover to which the music file belongs */
  thumb?: IPhotoSize
}

/**
 * This object represents a general file (as opposed to [[IPhotoSize]],
 * [[IVoice]] and [[IAudio]]).
 */
export interface IDocument {
  /**
   * Identifier for this file, which can be used to download or reuse the
   * file
   */
  file_id: string

  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** Document thumbnail as defined by sender */
  thumb?: IPhotoSize

  /** Original filename as defined by sender */
  file_name?: string

  /** MIME type of the file as defined by sender */
  mime_type?: string

  /** File size */
  file_size?: integer
}

/**
 * This object represents a video file.
 */
export interface IVideo {
  /**
   * Identifier for this file, which can be used to download or reuse the
   * file
   */
  file_id: string

  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** Video width as defined by sender */
  width: integer

  /** Video height as defined by sender */
  height: integer

  /** Duration of the video in seconds as defined by sender */
  duration: integer

  /** Video thumbnail */
  thumb?: IPhotoSize

  /** Mime type of a file as defined by sender */
  mime_type?: string

  /** File size */
  file_size?: integer
}

/**
 * This object represents an animation file (GIF or H.264/MPEG-4 AVC
 * video without sound).
 */
export interface IAnimation {
  /**
   * Identifier for this file, which can be used to download or reuse the
   * file
   */
  file_id: string

  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** Video width as defined by sender */
  width: integer

  /** Video height as defined by sender */
  height: integer

  /** Duration of the video in seconds as defined by sender */
  duration: integer

  /** Animation thumbnail as defined by sender */
  thumb?: IPhotoSize

  /** Original animation filename as defined by sender */
  file_name?: string

  /** MIME type of the file as defined by sender */
  mime_type?: string

  /** File size */
  file_size?: integer
}

/**
 * This object represents a voice note.
 */
export interface IVoice {
  /**
   * Identifier for this file, which can be used to download or reuse the
   * file
   */
  file_id: string

  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** Duration of the audio in seconds as defined by sender */
  duration: integer

  /** MIME type of the file as defined by sender */
  mime_type?: string

  /** File size */
  file_size?: integer
}

/**
 * This object represents a [video
 * message](https://telegram.org/blog/video-messages-and-telescope)
 * (available in Telegram apps as of
 * [v.4.0](https://telegram.org/blog/video-messages-and-telescope)).
 */
export interface IVideoNote {
  /**
   * Identifier for this file, which can be used to download or reuse the
   * file
   */
  file_id: string

  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /**
   * Video width and height (diameter of the video message) as defined by
   * sender
   */
  length: integer

  /** Duration of the video in seconds as defined by sender */
  duration: integer

  /** Video thumbnail */
  thumb?: IPhotoSize

  /** File size */
  file_size?: integer
}

/**
 * This object represents a phone contact.
 */
export interface IContact {
  /** Contact's phone number */
  phone_number: string

  /** Contact's first name */
  first_name: string

  /** Contact's last name */
  last_name?: string

  /** Contact's user identifier in Telegram */
  user_id?: integer

  /**
   * Additional data about the contact in the form of a
   * [vCard](https://en.wikipedia.org/wiki/VCard)
   */
  vcard?: string
}

/**
 * This object represents a point on the map.
 */
export interface ILocation {
  /** Longitude as defined by sender */
  longitude: number

  /** Latitude as defined by sender */
  latitude: number
}

/**
 * This object represents a venue.
 */
export interface IVenue {
  /** Venue location */
  location: ILocation

  /** Name of the venue */
  title: string

  /** Address of the venue */
  address: string

  /** Foursquare identifier of the venue */
  foursquare_id?: string

  /**
   * Foursquare type of the venue. (For example,
   * “arts_entertainment/default”, “arts_entertainment/aquarium” or
   * “food/icecream”.)
   */
  foursquare_type?: string
}

/**
 * This object contains information about one answer option in a poll.
 */
export interface IPollOption {
  /** Option text, 1-100 characters */
  text: string

  /** Number of users that voted for this option */
  voter_count: integer
}

/**
 * This object represents an answer of a user in a non-anonymous poll.
 */
export interface IPollAnswer {
  /** Unique poll identifier */
  poll_id: string

  /** The user, who changed the answer to the poll */
  user: IUser

  /**
   * 0-based identifiers of answer options, chosen by the user. May be
   * empty if the user retracted their vote.
   */
  option_ids: integer[]
}

/**
 * Poll type, currently can be “regular” or “quiz”
 */
export type PollType =
    'regular' |
    'quiz'

/**
 * This object contains information about a poll.
 */
export interface IPoll {
  /** Unique poll identifier */
  id: string

  /** Poll question, 1-255 characters */
  question: string

  /** List of poll options */
  options: IPollOption[]

  /** Total number of users that voted in the poll */
  total_voter_count: integer

  /** True, if the poll is closed */
  is_closed: boolean

  /** True, if the poll is anonymous */
  is_anonymous: boolean

  /** Poll type, currently can be “regular” or “quiz” */
  type: PollType

  /** True, if the poll allows multiple answers */
  allows_multiple_answers: boolean

  /**
   * 0-based identifier of the correct answer option. Available only for
   * polls in the quiz mode, which are closed, or was sent (not forwarded)
   * by the bot or to the private chat with the bot.
   */
  correct_option_id?: integer
}

/**
 * This object represent a user's profile pictures.
 */
export interface IUserProfilePhotos {
  /** Total number of profile pictures the target user has */
  total_count: integer

  /** Requested profile pictures (in up to 4 sizes each) */
  photos: IPhotoSize[][]
}

/**
 * This object represents a file ready to be downloaded. The file can be
 * downloaded via the link
 * `https://api.telegram.org/file/bot<token>/<file_path>`. It is
 * guaranteed that the link will be valid for at least 1 hour. When the
 * link expires, a new one can be requested by calling [[getFile]].
 *
 * > Maximum file size to download is 20 MB
 */
export interface IFile {
  /**
   * Identifier for this file, which can be used to download or reuse the
   * file
   */
  file_id: string

  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** File size, if known */
  file_size?: integer

  /**
   * File path. Use `https://api.telegram.org/file/bot<token>/<file_path>`
   * to get the file.
   */
  file_path?: string
}

/**
 * This object represents a [custom
 * keyboard](https://core.telegram.org/bots#keyboards) with reply options
 * (see [Introduction to bots](https://core.telegram.org/bots#keyboards)
 * for details and examples).
 */
export interface IReplyKeyboardMarkup {
  /**
   * Array of button rows, each represented by an Array of
   * [[IKeyboardButton]] objects
   */
  keyboard: IKeyboardButton[][]

  /**
   * Requests clients to resize the keyboard vertically for optimal fit
   * (e.g., make the keyboard smaller if there are just two rows of
   * buttons). Defaults to *false*, in which case the custom keyboard is
   * always of the same height as the app's standard keyboard.
   */
  resize_keyboard?: boolean

  /**
   * Requests clients to hide the keyboard as soon as it's been used. The
   * keyboard will still be available, but clients will automatically
   * display the usual letter-keyboard in the chat – the user can press a
   * special button in the input field to see the custom keyboard again.
   * Defaults to *false*.
   */
  one_time_keyboard?: boolean

  /**
   * Use this parameter if you want to show the keyboard to specific users
   * only. Targets: 1) users that are @mentioned in the *text* of the
   * [[IMessage]] object; 2) if the bot's message is a reply (has
   * *reply_to_message_id*), sender of the original message.  
   *   
   * *Example:* A user requests to change the bot‘s language, bot replies
   * to the request with a keyboard to select the new language. Other users
   * in the group don’t see the keyboard.
   */
  selective?: boolean
}

/**
 * This object represents one button of the reply keyboard. For simple
 * text buttons *String* can be used instead of this object to specify
 * text of the button. Optional fields *request_contact*,
 * *request_location*, and *request_poll* are mutually exclusive.
 *
 * **Note:** *request_contact* and *request_location* options will only
 * work in Telegram versions released after 9 April, 2016. Older clients
 * will receive unsupported message.  
 * **Note:** *request_poll* option will only work in Telegram versions
 * released after 23 January, 2020. Older clients will receive
 * unsupported message.
 */
export interface IKeyboardButton {
  /**
   * Text of the button. If none of the optional fields are used, it will
   * be sent as a message when the button is pressed
   */
  text: string

  /**
   * If *True*, the user's phone number will be sent as a contact when the
   * button is pressed. Available in private chats only
   */
  request_contact?: boolean

  /**
   * If *True*, the user's current location will be sent when the button is
   * pressed. Available in private chats only
   */
  request_location?: boolean

  /**
   * If specified, the user will be asked to create a poll and send it to
   * the bot when the button is pressed. Available in private chats only
   */
  request_poll?: IKeyboardButtonPollType
}

/**
 * This object represents type of a poll, which is allowed to be created
 * and sent when the corresponding button is pressed.
 */
export interface IKeyboardButtonPollType {
  /**
   * If *quiz* is passed, the user will be allowed to create only polls in
   * the quiz mode. If *regular* is passed, only regular polls will be
   * allowed. Otherwise, the user will be allowed to create a poll of any
   * type.
   */
  type?: PollType
}

/**
 * Upon receiving a message with this object, Telegram clients will
 * remove the current custom keyboard and display the default
 * letter-keyboard. By default, custom keyboards are displayed until a
 * new keyboard is sent by a bot. An exception is made for one-time
 * keyboards that are hidden immediately after the user presses a button
 * (see [[IReplyKeyboardMarkup]]).
 */
export interface IReplyKeyboardRemove {
  /**
   * Requests clients to remove the custom keyboard (user will not be able
   * to summon this keyboard; if you want to hide the keyboard from sight
   * but keep it accessible, use *one_time_keyboard* in
   * [[IReplyKeyboardMarkup]])
   */
  remove_keyboard: true

  /**
   * Use this parameter if you want to remove the keyboard for specific
   * users only. Targets: 1) users that are @mentioned in the *text* of the
   * [[IMessage]] object; 2) if the bot's message is a reply (has
   * *reply_to_message_id*), sender of the original message.  
   *   
   * *Example:* A user votes in a poll, bot returns confirmation message in
   * reply to the vote and removes the keyboard for that user, while still
   * showing the keyboard with poll options to users who haven't voted yet.
   */
  selective?: boolean
}

/**
 * This object represents an [inline
 * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
 * that appears right next to the message it belongs to.
 *
 * **Note:** This will only work in Telegram versions released after 9
 * April, 2016. Older clients will display *unsupported message*.
 */
export interface IInlineKeyboardMarkup {
  /**
   * Array of button rows, each represented by an Array of
   * [[IInlineKeyboardButton]] objects
   */
  inline_keyboard: IInlineKeyboardButton[][]
}

/**
 * This object represents one button of an inline keyboard. You **must**
 * use exactly one of the optional fields.
 */
export interface IInlineKeyboardButton {
  /** Label text on the button */
  text: string

  /** HTTP or tg:// url to be opened when button is pressed */
  url?: string

  /**
   * An HTTP URL used to automatically authorize the user. Can be used as a
   * replacement for the [Telegram Login
   * Widget](https://core.telegram.org/widgets/login).
   */
  login_url?: ILoginUrl

  /**
   * Data to be sent in a [[ICallbackQuery]] to the bot when button is
   * pressed, 1-64 bytes
   */
  callback_data?: string

  /**
   * If set, pressing the button will prompt the user to select one of
   * their chats, open that chat and insert the bot‘s username and the
   * specified inline query in the input field. Can be empty, in which case
   * just the bot’s username will be inserted.  
   *   
   * **Note:** This offers an easy way for users to start using your bot in
   * [inline mode](https://core.telegram.org/bots/inline) when they are
   * currently in a private chat with it. Especially useful when combined
   * with [[answerInlineQuery]] actions – in this case the user will be
   * automatically returned to the chat they switched from, skipping the
   * chat selection screen.
   */
  switch_inline_query?: string

  /**
   * If set, pressing the button will insert the bot‘s username and the
   * specified inline query in the current chat's input field. Can be
   * empty, in which case only the bot’s username will be inserted.  
   *   
   * This offers a quick way for the user to open your bot in inline mode
   * in the same chat – good for selecting something from multiple options.
   */
  switch_inline_query_current_chat?: string

  /**
   * Description of the game that will be launched when the user presses
   * the button.  
   *   
   * **NOTE:** This type of button **must** always be the first button in
   * the first row.
   */
  callback_game?: ICallbackGame

  /**
   * Specify True, to send a [Pay
   * button](https://core.telegram.org/bots/api#payments).  
   *   
   * **NOTE:** This type of button **must** always be the first button in
   * the first row.
   */
  pay?: boolean
}

/**
 * This object represents a parameter of the inline keyboard button used
 * to automatically authorize a user. Serves as a great replacement for
 * the [Telegram Login Widget](https://core.telegram.org/widgets/login)
 * when the user is coming from Telegram. All the user needs to do is
 * tap/click a button and confirm that they want to log in:
 *
 *
 *
 * Telegram apps support these buttons as of [version
 * 5.7](https://telegram.org/blog/privacy-discussions-web-bots#meet-seamless-web-bots).
 *
 * > Sample bot: [@discussbot](https://t.me/discussbot)
 */
export interface ILoginUrl {
  /**
   * An HTTP URL to be opened with user authorization data added to the
   * query string when the button is pressed. If the user refuses to
   * provide authorization data, the original URL without information about
   * the user will be opened. The data added is the same as described in
   * [Receiving authorization
   * data](https://core.telegram.org/widgets/login#receiving-authorization-data).  
   *   
   * **NOTE:** You **must** always check the hash of the received data to
   * verify the authentication and the integrity of the data as described
   * in [Checking
   * authorization](https://core.telegram.org/widgets/login#checking-authorization).
   */
  url: string

  /** New text of the button in forwarded messages. */
  forward_text?: string

  /**
   * Username of a bot, which will be used for user authorization. See
   * [Setting up a
   * bot](https://core.telegram.org/widgets/login#setting-up-a-bot) for
   * more details. If not specified, the current bot's username will be
   * assumed. The *url*'s domain must be the same as the domain linked with
   * the bot. See [Linking your domain to the
   * bot](https://core.telegram.org/widgets/login#linking-your-domain-to-the-bot)
   * for more details.
   */
  bot_username?: string

  /**
   * Pass True to request the permission for your bot to send messages to
   * the user.
   */
  request_write_access?: boolean
}

/**
 * This object represents an incoming callback query from a callback
 * button in an [inline
 * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
 * If the button that originated the query was attached to a message sent
 * by the bot, the field *message* will be present. If the button was
 * attached to a message sent via the bot (in [inline
 * mode](https://core.telegram.org/bots/api#inline-mode)), the field
 * *inline_message_id* will be present. Exactly one of the fields *data*
 * or *game_short_name* will be present.
 *
 * > **NOTE:** After the user presses a callback button, Telegram clients
 * > will display a progress bar until you call [[answerCallbackQuery]]. It
 * > is, therefore, necessary to react by calling [[answerCallbackQuery]]
 * > even if no notification to the user is needed (e.g., without
 * > specifying any of the optional parameters).
 */
export interface ICallbackQuery {
  /** Unique identifier for this query */
  id: string

  /** Sender */
  from: IUser

  /**
   * Message with the callback button that originated the query. Note that
   * message content and message date will not be available if the message
   * is too old
   */
  message?: IMessage

  /**
   * Identifier of the message sent via the bot in inline mode, that
   * originated the query.
   */
  inline_message_id?: string

  /**
   * Global identifier, uniquely corresponding to the chat to which the
   * message with the callback button was sent. Useful for high scores in
   * [games](https://core.telegram.org/bots/api#games).
   */
  chat_instance: string

  /**
   * Data associated with the callback button. Be aware that a bad client
   * can send arbitrary data in this field.
   */
  data?: string

  /**
   * Short name of a [Game](https://core.telegram.org/bots/api#games) to be
   * returned, serves as the unique identifier for the game
   */
  game_short_name?: string
}

/**
 * Upon receiving a message with this object, Telegram clients will
 * display a reply interface to the user (act as if the user has selected
 * the bot‘s message and tapped ’Reply'). This can be extremely useful if
 * you want to create user-friendly step-by-step interfaces without
 * having to sacrifice [privacy
 * mode](https://core.telegram.org/bots#privacy-mode).
 *
 * > **Example:** A [poll bot](https://t.me/PollBot) for groups runs in
 * > privacy mode (only receives commands, replies to its messages and
 * > mentions). There could be two ways to create a new poll:
 * > 
 * >  - Explain the user how to send a command with parameters (e.g. /newpoll
 * >    question answer1 answer2). May be appealing for hardcore users but
 * >    lacks modern day polish.
 * >  - Guide the user through a step-by-step process. ‘Please send me your
 * >    question’, ‘Cool, now let’s add the first answer option‘, ’Great. Keep
 * >    adding answer options, then send /done when you‘re ready’.
 * > 
 * > The last option is definitely more attractive. And if you use
 * > [[IForceReply]] in your bot‘s questions, it will receive the user’s
 * > answers even if it only receives replies, commands and mentions —
 * > without any extra work for the user.
 */
export interface IForceReply {
  /**
   * Shows reply interface to the user, as if they manually selected the
   * bot‘s message and tapped ’Reply'
   */
  force_reply: true

  /**
   * Use this parameter if you want to force reply from specific users
   * only. Targets: 1) users that are @mentioned in the *text* of the
   * [[IMessage]] object; 2) if the bot's message is a reply (has
   * *reply_to_message_id*), sender of the original message.
   */
  selective?: boolean
}

/**
 * This object represents a chat photo.
 */
export interface IChatPhoto {
  /**
   * File identifier of small (160x160) chat photo. This file_id can be
   * used only for photo download and only for as long as the photo is not
   * changed.
   */
  small_file_id: string

  /**
   * Unique file identifier of small (160x160) chat photo, which is
   * supposed to be the same over time and for different bots. Can't be
   * used to download or reuse the file.
   */
  small_file_unique_id: string

  /**
   * File identifier of big (640x640) chat photo. This file_id can be used
   * only for photo download and only for as long as the photo is not
   * changed.
   */
  big_file_id: string

  /**
   * Unique file identifier of big (640x640) chat photo, which is supposed
   * to be the same over time and for different bots. Can't be used to
   * download or reuse the file.
   */
  big_file_unique_id: string
}

/**
 * This object contains information about one member of a chat.
 */
export interface IChatMember {
  /** Information about the user */
  user: IUser

  /**
   * The member's status in the chat. Can be “creator”, “administrator”,
   * “member”, “restricted”, “left” or “kicked”
   */
  status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked'

  /** Owner and administrators only. Custom title for this user */
  custom_title?: string

  /**
   * Restricted and kicked only. Date when restrictions will be lifted for
   * this user; unix time
   */
  until_date?: Date

  /**
   * Administrators only. True, if the bot is allowed to edit administrator
   * privileges of that user
   */
  can_be_edited?: boolean

  /**
   * Administrators only. True, if the administrator can post in the
   * channel; channels only
   */
  can_post_messages?: boolean

  /**
   * Administrators only. True, if the administrator can edit messages of
   * other users and can pin messages; channels only
   */
  can_edit_messages?: boolean

  /**
   * Administrators only. True, if the administrator can delete messages of
   * other users
   */
  can_delete_messages?: boolean

  /**
   * Administrators only. True, if the administrator can restrict, ban or
   * unban chat members
   */
  can_restrict_members?: boolean

  /**
   * Administrators only. True, if the administrator can add new
   * administrators with a subset of his own privileges or demote
   * administrators that he has promoted, directly or indirectly (promoted
   * by administrators that were appointed by the user)
   */
  can_promote_members?: boolean

  /**
   * Administrators and restricted only. True, if the user is allowed to
   * change the chat title, photo and other settings
   */
  can_change_info?: boolean

  /**
   * Administrators and restricted only. True, if the user is allowed to
   * invite new users to the chat
   */
  can_invite_users?: boolean

  /**
   * Administrators and restricted only. True, if the user is allowed to
   * pin messages; groups and supergroups only
   */
  can_pin_messages?: boolean

  /**
   * Restricted only. True, if the user is a member of the chat at the
   * moment of the request
   */
  is_member?: boolean

  /**
   * Restricted only. True, if the user is allowed to send text messages,
   * contacts, locations and venues
   */
  can_send_messages?: boolean

  /**
   * Restricted only. True, if the user is allowed to send audios,
   * documents, photos, videos, video notes and voice notes
   */
  can_send_media_messages?: boolean

  /** Restricted only. True, if the user is allowed to send polls */
  can_send_polls?: boolean

  /**
   * Restricted only. True, if the user is allowed to send animations,
   * games, stickers and use inline bots
   */
  can_send_other_messages?: boolean

  /**
   * Restricted only. True, if the user is allowed to add web page previews
   * to their messages
   */
  can_add_web_page_previews?: boolean
}

/**
 * Describes actions that a non-administrator user is allowed to take in
 * a chat.
 */
export interface IChatPermissions {
  /**
   * True, if the user is allowed to send text messages, contacts,
   * locations and venues
   */
  can_send_messages?: boolean

  /**
   * True, if the user is allowed to send audios, documents, photos,
   * videos, video notes and voice notes, implies can_send_messages
   */
  can_send_media_messages?: boolean

  /** True, if the user is allowed to send polls, implies can_send_messages */
  can_send_polls?: boolean

  /**
   * True, if the user is allowed to send animations, games, stickers and
   * use inline bots, implies can_send_media_messages
   */
  can_send_other_messages?: boolean

  /**
   * True, if the user is allowed to add web page previews to their
   * messages, implies can_send_media_messages
   */
  can_add_web_page_previews?: boolean

  /**
   * True, if the user is allowed to change the chat title, photo and other
   * settings. Ignored in public supergroups
   */
  can_change_info?: boolean

  /** True, if the user is allowed to invite new users to the chat */
  can_invite_users?: boolean

  /**
   * True, if the user is allowed to pin messages. Ignored in public
   * supergroups
   */
  can_pin_messages?: boolean
}

/**
 * Contains information about why a request was unsuccessful.
 */
export interface IResponseParameters {
  /**
   * The group has been migrated to a supergroup with the specified
   * identifier. This number may be greater than 32 bits and some
   * programming languages may have difficulty/silent defects in
   * interpreting it. But it is smaller than 52 bits, so a signed 64 bit
   * integer or double-precision float type are safe for storing this
   * identifier.
   */
  migrate_to_chat_id?: integer

  /**
   * In case of exceeding flood control, the number of seconds left to wait
   * before the request can be repeated
   */
  retry_after?: integer
}

/**
 * This object represents the content of a media message to be sent. It
 * should be one of
 */
export type IInputMedia =
    IInputMediaAnimation |
    IInputMediaDocument |
    IInputMediaAudio |
    IInputMediaPhoto |
    IInputMediaVideo

/**
 * Represents a photo to be sent.
 */
export interface IInputMediaPhoto {
  /** Type of the result */
  type: 'photo'

  /** File to send. See [[InputFile]] for ways to upload files. */
  media: InputFile

  /** Caption of the photo to be sent, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode
}

/**
 * Represents a video to be sent.
 */
export interface IInputMediaVideo {
  /** Type of the result */
  type: 'video'

  /** File to send. See [[InputFile]] for ways to upload files. */
  media: InputFile

  /**
   * Thumbnail of the file sent; can be ignored if thumbnail generation for
   * the file is supported server-side. The thumbnail should be in JPEG
   * format and less than 200 kB in size. A thumbnail‘s width and height
   * should not exceed 320. Ignored if the file is not uploaded using
   * multipart/form-data. Thumbnails can’t be reused and can be only
   * uploaded as a new file, so you can pass “attach://<file_attach_name>”
   * if the thumbnail was uploaded using multipart/form-data under
   * <file_attach_name>.
   */
  thumb?: InputFile

  /** Caption of the video to be sent, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /** Video width */
  width?: integer

  /** Video height */
  height?: integer

  /** Video duration */
  duration?: integer

  /** Pass *True*, if the uploaded video is suitable for streaming */
  supports_streaming?: boolean
}

/**
 * Represents an animation file (GIF or H.264/MPEG-4 AVC video without
 * sound) to be sent.
 */
export interface IInputMediaAnimation {
  /** Type of the result */
  type: 'animation'

  /** File to send. See [[InputFile]] for ways to upload files. */
  media: InputFile

  /**
   * Thumbnail of the file sent; can be ignored if thumbnail generation for
   * the file is supported server-side. The thumbnail should be in JPEG
   * format and less than 200 kB in size. A thumbnail‘s width and height
   * should not exceed 320. Ignored if the file is not uploaded using
   * multipart/form-data. Thumbnails can’t be reused and can be only
   * uploaded as a new file, so you can pass “attach://<file_attach_name>”
   * if the thumbnail was uploaded using multipart/form-data under
   * <file_attach_name>.
   */
  thumb?: InputFile

  /** Caption of the animation to be sent, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /** Animation width */
  width?: integer

  /** Animation height */
  height?: integer

  /** Animation duration */
  duration?: integer
}

/**
 * Represents an audio file to be treated as music to be sent.
 */
export interface IInputMediaAudio {
  /** Type of the result */
  type: 'audio'

  /** File to send. See [[InputFile]] for ways to upload files. */
  media: InputFile

  /**
   * Thumbnail of the file sent; can be ignored if thumbnail generation for
   * the file is supported server-side. The thumbnail should be in JPEG
   * format and less than 200 kB in size. A thumbnail‘s width and height
   * should not exceed 320. Ignored if the file is not uploaded using
   * multipart/form-data. Thumbnails can’t be reused and can be only
   * uploaded as a new file, so you can pass “attach://<file_attach_name>”
   * if the thumbnail was uploaded using multipart/form-data under
   * <file_attach_name>.
   */
  thumb?: InputFile

  /** Caption of the audio to be sent, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /** Duration of the audio in seconds */
  duration?: integer

  /** Performer of the audio */
  performer?: string

  /** Title of the audio */
  title?: string
}

/**
 * Represents a general file to be sent.
 */
export interface IInputMediaDocument {
  /** Type of the result */
  type: 'document'

  /** File to send. See [[InputFile]] for ways to upload files. */
  media: InputFile

  /**
   * Thumbnail of the file sent; can be ignored if thumbnail generation for
   * the file is supported server-side. The thumbnail should be in JPEG
   * format and less than 200 kB in size. A thumbnail‘s width and height
   * should not exceed 320. Ignored if the file is not uploaded using
   * multipart/form-data. Thumbnails can’t be reused and can be only
   * uploaded as a new file, so you can pass “attach://<file_attach_name>”
   * if the thumbnail was uploaded using multipart/form-data under
   * <file_attach_name>.
   */
  thumb?: InputFile

  /** Caption of the document to be sent, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode
}


// Available methods
// -----------------

/**
 * Message formatting syntax, see [Formatting
 * Options](https://core.telegram.org/bots/api#formatting-options)
 */
export type ParseMode =
    'Markdown' |
    'HTML'

/**
 * Additional interface options for a message, such as an inline
 * keyboard, custom reply keyboard, instructions to remove reply keyboard
 * or to force a reply from the user, etc.
 */
export type IReplyMarkup =
    IInlineKeyboardMarkup |
    IReplyKeyboardMarkup |
    IReplyKeyboardRemove |
    IForceReply

/**
 * Action to show to the user
 */
export type ChatAction =
    'typing' |
    'upload_photo' |
    'record_video' |
    'upload_video' |
    'record_audio' |
    'upload_audio' |
    'upload_document' |
    'find_location' |
    'record_video_note' |
    'upload_video_note'


// Stickers
// --------

/**
 * This object represents a sticker.
 */
export interface ISticker {
  /**
   * Identifier for this file, which can be used to download or reuse the
   * file
   */
  file_id: string

  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** Sticker width */
  width: integer

  /** Sticker height */
  height: integer

  /**
   * *True*, if the sticker is
   * [animated](https://telegram.org/blog/animated-stickers)
   */
  is_animated: boolean

  /** Sticker thumbnail in the .webp or .jpg format */
  thumb?: IPhotoSize

  /** Emoji associated with the sticker */
  emoji?: string

  /** Name of the sticker set to which the sticker belongs */
  set_name?: string

  /** For mask stickers, the position where the mask should be placed */
  mask_position?: IMaskPosition

  /** File size */
  file_size?: integer
}

/**
 * This object represents a sticker set.
 */
export interface IStickerSet {
  /** Sticker set name */
  name: string

  /** Sticker set title */
  title: string

  /**
   * *True*, if the sticker set contains [animated
   * stickers](https://telegram.org/blog/animated-stickers)
   */
  is_animated: boolean

  /** *True*, if the sticker set contains masks */
  contains_masks: boolean

  /** List of all set stickers */
  stickers: ISticker[]
}

/**
 * This object describes the position on faces where a mask should be
 * placed by default.
 */
export interface IMaskPosition {
  /**
   * The part of the face relative to which the mask should be placed. One
   * of “forehead”, “eyes”, “mouth”, or “chin”.
   */
  point: 'forehead' | 'eyes' | 'mouth' | 'chin'

  /**
   * Shift by X-axis measured in widths of the mask scaled to the face
   * size, from left to right. For example, choosing -1.0 will place mask
   * just to the left of the default mask position.
   */
  x_shift: number

  /**
   * Shift by Y-axis measured in heights of the mask scaled to the face
   * size, from top to bottom. For example, 1.0 will place the mask just
   * below the default mask position.
   */
  y_shift: number

  /** Mask scaling coefficient. For example, 2.0 means double size. */
  scale: number
}


// Inline mode
// -----------

/**
 * This object represents an incoming inline query. When the user sends
 * an empty query, your bot could return some default or trending
 * results.
 */
export interface IInlineQuery {
  /** Unique identifier for this query */
  id: string

  /** Sender */
  from: IUser

  /** Sender location, only for bots that request user location */
  location?: ILocation

  /** Text of the query (up to 512 characters) */
  query: string

  /** Offset of the results to be returned, can be controlled by the bot */
  offset: string
}

/**
 * This object represents one result of an inline query. Telegram clients
 * currently support results of the following 20 types:
 */
export type IInlineQueryResult =
    IInlineQueryResultCachedAudio |
    IInlineQueryResultCachedDocument |
    IInlineQueryResultCachedGif |
    IInlineQueryResultCachedMpeg4Gif |
    IInlineQueryResultCachedPhoto |
    IInlineQueryResultCachedSticker |
    IInlineQueryResultCachedVideo |
    IInlineQueryResultCachedVoice |
    IInlineQueryResultArticle |
    IInlineQueryResultAudio |
    IInlineQueryResultContact |
    IInlineQueryResultGame |
    IInlineQueryResultDocument |
    IInlineQueryResultGif |
    IInlineQueryResultLocation |
    IInlineQueryResultMpeg4Gif |
    IInlineQueryResultPhoto |
    IInlineQueryResultVenue |
    IInlineQueryResultVideo |
    IInlineQueryResultVoice

/**
 * Represents a link to an article or web page.
 */
export interface IInlineQueryResultArticle {
  /** Type of the result */
  type: 'article'

  /** Unique identifier for this result, 1-64 Bytes */
  id: string

  /** Title of the result */
  title: string

  /** Content of the message to be sent */
  input_message_content: IInputMessageContent

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** URL of the result */
  url?: string

  /** Pass *True*, if you don't want the URL to be shown in the message */
  hide_url?: boolean

  /** Short description of the result */
  description?: string

  /** Url of the thumbnail for the result */
  thumb_url?: string

  /** Thumbnail width */
  thumb_width?: integer

  /** Thumbnail height */
  thumb_height?: integer
}

/**
 * Represents a link to a photo. By default, this photo will be sent by
 * the user with optional caption. Alternatively, you can use
 * *input_message_content* to send a message with the specified content
 * instead of the photo.
 */
export interface IInlineQueryResultPhoto {
  /** Type of the result */
  type: 'photo'

  /** Unique identifier for this result, 1-64 bytes */
  id: string

  /**
   * A valid URL of the photo. Photo must be in **jpeg** format. Photo size
   * must not exceed 5MB
   */
  photo_url: string

  /** URL of the thumbnail for the photo */
  thumb_url: string

  /** Width of the photo */
  photo_width?: integer

  /** Height of the photo */
  photo_height?: integer

  /** Title for the result */
  title?: string

  /** Short description of the result */
  description?: string

  /** Caption of the photo to be sent, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the photo */
  input_message_content?: IInputMessageContent
}

/**
 * Represents a link to an animated GIF file. By default, this animated
 * GIF file will be sent by the user with optional caption.
 * Alternatively, you can use *input_message_content* to send a message
 * with the specified content instead of the animation.
 */
export interface IInlineQueryResultGif {
  /** Type of the result */
  type: 'gif'

  /** Unique identifier for this result, 1-64 bytes */
  id: string

  /** A valid URL for the GIF file. File size must not exceed 1MB */
  gif_url: string

  /** Width of the GIF */
  gif_width?: integer

  /** Height of the GIF */
  gif_height?: integer

  /** Duration of the GIF */
  gif_duration?: integer

  /** URL of the static thumbnail for the result (jpeg or gif) */
  thumb_url: string

  /** Title for the result */
  title?: string

  /** Caption of the GIF file to be sent, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the GIF animation */
  input_message_content?: IInputMessageContent
}

/**
 * Represents a link to a video animation (H.264/MPEG-4 AVC video without
 * sound). By default, this animated MPEG-4 file will be sent by the user
 * with optional caption. Alternatively, you can use
 * *input_message_content* to send a message with the specified content
 * instead of the animation.
 */
export interface IInlineQueryResultMpeg4Gif {
  /** Type of the result */
  type: 'mpeg4_gif'

  /** Unique identifier for this result, 1-64 bytes */
  id: string

  /** A valid URL for the MP4 file. File size must not exceed 1MB */
  mpeg4_url: string

  /** Video width */
  mpeg4_width?: integer

  /** Video height */
  mpeg4_height?: integer

  /** Video duration */
  mpeg4_duration?: integer

  /** URL of the static thumbnail (jpeg or gif) for the result */
  thumb_url: string

  /** Title for the result */
  title?: string

  /** Caption of the MPEG-4 file to be sent, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the video animation */
  input_message_content?: IInputMessageContent
}

/**
 * Represents a link to a page containing an embedded video player or a
 * video file. By default, this video file will be sent by the user with
 * an optional caption. Alternatively, you can use
 * *input_message_content* to send a message with the specified content
 * instead of the video.
 *
 * > If an InlineQueryResultVideo message contains an embedded video (e.g.,
 * > YouTube), you **must** replace its content using
 * > *input_message_content*.
 */
export interface IInlineQueryResultVideo {
  /** Type of the result */
  type: 'video'

  /** Unique identifier for this result, 1-64 bytes */
  id: string

  /** A valid URL for the embedded video player or video file */
  video_url: string

  /** Mime type of the content of video url, “text/html” or “video/mp4” */
  mime_type: string

  /** URL of the thumbnail (jpeg only) for the video */
  thumb_url: string

  /** Title for the result */
  title: string

  /** Caption of the video to be sent, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /** Video width */
  video_width?: integer

  /** Video height */
  video_height?: integer

  /** Video duration in seconds */
  video_duration?: integer

  /** Short description of the result */
  description?: string

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /**
   * Content of the message to be sent instead of the video. This field is
   * **required** if InlineQueryResultVideo is used to send an HTML-page as
   * a result (e.g., a YouTube video).
   */
  input_message_content?: IInputMessageContent
}

/**
 * Represents a link to an MP3 audio file. By default, this audio file
 * will be sent by the user. Alternatively, you can use
 * *input_message_content* to send a message with the specified content
 * instead of the audio.
 *
 * **Note:** This will only work in Telegram versions released after 9
 * April, 2016. Older clients will ignore them.
 */
export interface IInlineQueryResultAudio {
  /** Type of the result */
  type: 'audio'

  /** Unique identifier for this result, 1-64 bytes */
  id: string

  /** A valid URL for the audio file */
  audio_url: string

  /** Title */
  title: string

  /** Caption, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /** Performer */
  performer?: string

  /** Audio duration in seconds */
  audio_duration?: integer

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the audio */
  input_message_content?: IInputMessageContent
}

/**
 * Represents a link to a voice recording in an .ogg container encoded
 * with OPUS. By default, this voice recording will be sent by the user.
 * Alternatively, you can use *input_message_content* to send a message
 * with the specified content instead of the the voice message.
 *
 * **Note:** This will only work in Telegram versions released after 9
 * April, 2016. Older clients will ignore them.
 */
export interface IInlineQueryResultVoice {
  /** Type of the result */
  type: 'voice'

  /** Unique identifier for this result, 1-64 bytes */
  id: string

  /** A valid URL for the voice recording */
  voice_url: string

  /** Recording title */
  title: string

  /** Caption, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /** Recording duration in seconds */
  voice_duration?: integer

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the voice recording */
  input_message_content?: IInputMessageContent
}

/**
 * Represents a link to a file. By default, this file will be sent by the
 * user with an optional caption. Alternatively, you can use
 * *input_message_content* to send a message with the specified content
 * instead of the file. Currently, only **.PDF** and **.ZIP** files can
 * be sent using this method.
 *
 * **Note:** This will only work in Telegram versions released after 9
 * April, 2016. Older clients will ignore them.
 */
export interface IInlineQueryResultDocument {
  /** Type of the result */
  type: 'document'

  /** Unique identifier for this result, 1-64 bytes */
  id: string

  /** Title for the result */
  title: string

  /** Caption of the document to be sent, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /** A valid URL for the file */
  document_url: string

  /**
   * Mime type of the content of the file, either “application/pdf” or
   * “application/zip”
   */
  mime_type: string

  /** Short description of the result */
  description?: string

  /** Inline keyboard attached to the message */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the file */
  input_message_content?: IInputMessageContent

  /** URL of the thumbnail (jpeg only) for the file */
  thumb_url?: string

  /** Thumbnail width */
  thumb_width?: integer

  /** Thumbnail height */
  thumb_height?: integer
}

/**
 * Represents a location on a map. By default, the location will be sent
 * by the user. Alternatively, you can use *input_message_content* to
 * send a message with the specified content instead of the location.
 *
 * **Note:** This will only work in Telegram versions released after 9
 * April, 2016. Older clients will ignore them.
 */
export interface IInlineQueryResultLocation {
  /** Type of the result */
  type: 'location'

  /** Unique identifier for this result, 1-64 Bytes */
  id: string

  /** Location latitude in degrees */
  latitude: number

  /** Location longitude in degrees */
  longitude: number

  /** Location title */
  title: string

  /**
   * Period in seconds for which the location can be updated, should be
   * between 60 and 86400.
   */
  live_period?: integer

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the location */
  input_message_content?: IInputMessageContent

  /** Url of the thumbnail for the result */
  thumb_url?: string

  /** Thumbnail width */
  thumb_width?: integer

  /** Thumbnail height */
  thumb_height?: integer
}

/**
 * Represents a venue. By default, the venue will be sent by the user.
 * Alternatively, you can use *input_message_content* to send a message
 * with the specified content instead of the venue.
 *
 * **Note:** This will only work in Telegram versions released after 9
 * April, 2016. Older clients will ignore them.
 */
export interface IInlineQueryResultVenue {
  /** Type of the result */
  type: 'venue'

  /** Unique identifier for this result, 1-64 Bytes */
  id: string

  /** Latitude of the venue location in degrees */
  latitude: number

  /** Longitude of the venue location in degrees */
  longitude: number

  /** Title of the venue */
  title: string

  /** Address of the venue */
  address: string

  /** Foursquare identifier of the venue if known */
  foursquare_id?: string

  /**
   * Foursquare type of the venue, if known. (For example,
   * “arts_entertainment/default”, “arts_entertainment/aquarium” or
   * “food/icecream”.)
   */
  foursquare_type?: string

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the venue */
  input_message_content?: IInputMessageContent

  /** Url of the thumbnail for the result */
  thumb_url?: string

  /** Thumbnail width */
  thumb_width?: integer

  /** Thumbnail height */
  thumb_height?: integer
}

/**
 * Represents a contact with a phone number. By default, this contact
 * will be sent by the user. Alternatively, you can use
 * *input_message_content* to send a message with the specified content
 * instead of the contact.
 *
 * **Note:** This will only work in Telegram versions released after 9
 * April, 2016. Older clients will ignore them.
 */
export interface IInlineQueryResultContact {
  /** Type of the result */
  type: 'contact'

  /** Unique identifier for this result, 1-64 Bytes */
  id: string

  /** Contact's phone number */
  phone_number: string

  /** Contact's first name */
  first_name: string

  /** Contact's last name */
  last_name?: string

  /**
   * Additional data about the contact in the form of a
   * [vCard](https://en.wikipedia.org/wiki/VCard), 0-2048 bytes
   */
  vcard?: string

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the contact */
  input_message_content?: IInputMessageContent

  /** Url of the thumbnail for the result */
  thumb_url?: string

  /** Thumbnail width */
  thumb_width?: integer

  /** Thumbnail height */
  thumb_height?: integer
}

/**
 * Represents a [Game](https://core.telegram.org/bots/api#games).
 *
 * **Note:** This will only work in Telegram versions released after
 * October 1, 2016. Older clients will not display any inline results if
 * a game result is among them.
 */
export interface IInlineQueryResultGame {
  /** Type of the result */
  type: 'game'

  /** Unique identifier for this result, 1-64 bytes */
  id: string

  /** Short name of the game */
  game_short_name: string

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup
}

/**
 * Represents a link to a photo stored on the Telegram servers. By
 * default, this photo will be sent by the user with an optional caption.
 * Alternatively, you can use *input_message_content* to send a message
 * with the specified content instead of the photo.
 */
export interface IInlineQueryResultCachedPhoto {
  /** Type of the result */
  type: 'photo'

  /** Unique identifier for this result, 1-64 bytes */
  id: string

  /** A valid file identifier of the photo */
  photo_file_id: string

  /** Title for the result */
  title?: string

  /** Short description of the result */
  description?: string

  /** Caption of the photo to be sent, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the photo */
  input_message_content?: IInputMessageContent
}

/**
 * Represents a link to an animated GIF file stored on the Telegram
 * servers. By default, this animated GIF file will be sent by the user
 * with an optional caption. Alternatively, you can use
 * *input_message_content* to send a message with specified content
 * instead of the animation.
 */
export interface IInlineQueryResultCachedGif {
  /** Type of the result */
  type: 'gif'

  /** Unique identifier for this result, 1-64 bytes */
  id: string

  /** A valid file identifier for the GIF file */
  gif_file_id: string

  /** Title for the result */
  title?: string

  /** Caption of the GIF file to be sent, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the GIF animation */
  input_message_content?: IInputMessageContent
}

/**
 * Represents a link to a video animation (H.264/MPEG-4 AVC video without
 * sound) stored on the Telegram servers. By default, this animated
 * MPEG-4 file will be sent by the user with an optional caption.
 * Alternatively, you can use *input_message_content* to send a message
 * with the specified content instead of the animation.
 */
export interface IInlineQueryResultCachedMpeg4Gif {
  /** Type of the result */
  type: 'mpeg4_gif'

  /** Unique identifier for this result, 1-64 bytes */
  id: string

  /** A valid file identifier for the MP4 file */
  mpeg4_file_id: string

  /** Title for the result */
  title?: string

  /** Caption of the MPEG-4 file to be sent, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the video animation */
  input_message_content?: IInputMessageContent
}

/**
 * Represents a link to a sticker stored on the Telegram servers. By
 * default, this sticker will be sent by the user. Alternatively, you can
 * use *input_message_content* to send a message with the specified
 * content instead of the sticker.
 *
 * **Note:** This will only work in Telegram versions released after 9
 * April, 2016 for static stickers and after 06 July, 2019 for [animated
 * stickers](https://telegram.org/blog/animated-stickers). Older clients
 * will ignore them.
 */
export interface IInlineQueryResultCachedSticker {
  /** Type of the result */
  type: 'sticker'

  /** Unique identifier for this result, 1-64 bytes */
  id: string

  /** A valid file identifier of the sticker */
  sticker_file_id: string

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the sticker */
  input_message_content?: IInputMessageContent
}

/**
 * Represents a link to a file stored on the Telegram servers. By
 * default, this file will be sent by the user with an optional caption.
 * Alternatively, you can use *input_message_content* to send a message
 * with the specified content instead of the file.
 *
 * **Note:** This will only work in Telegram versions released after 9
 * April, 2016. Older clients will ignore them.
 */
export interface IInlineQueryResultCachedDocument {
  /** Type of the result */
  type: 'document'

  /** Unique identifier for this result, 1-64 bytes */
  id: string

  /** Title for the result */
  title: string

  /** A valid file identifier for the file */
  document_file_id: string

  /** Short description of the result */
  description?: string

  /** Caption of the document to be sent, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the file */
  input_message_content?: IInputMessageContent
}

/**
 * Represents a link to a video file stored on the Telegram servers. By
 * default, this video file will be sent by the user with an optional
 * caption. Alternatively, you can use *input_message_content* to send a
 * message with the specified content instead of the video.
 */
export interface IInlineQueryResultCachedVideo {
  /** Type of the result */
  type: 'video'

  /** Unique identifier for this result, 1-64 bytes */
  id: string

  /** A valid file identifier for the video file */
  video_file_id: string

  /** Title for the result */
  title: string

  /** Short description of the result */
  description?: string

  /** Caption of the video to be sent, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the video */
  input_message_content?: IInputMessageContent
}

/**
 * Represents a link to a voice message stored on the Telegram servers.
 * By default, this voice message will be sent by the user.
 * Alternatively, you can use *input_message_content* to send a message
 * with the specified content instead of the voice message.
 *
 * **Note:** This will only work in Telegram versions released after 9
 * April, 2016. Older clients will ignore them.
 */
export interface IInlineQueryResultCachedVoice {
  /** Type of the result */
  type: 'voice'

  /** Unique identifier for this result, 1-64 bytes */
  id: string

  /** A valid file identifier for the voice message */
  voice_file_id: string

  /** Voice message title */
  title: string

  /** Caption, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the voice message */
  input_message_content?: IInputMessageContent
}

/**
 * Represents a link to an MP3 audio file stored on the Telegram servers.
 * By default, this audio file will be sent by the user. Alternatively,
 * you can use *input_message_content* to send a message with the
 * specified content instead of the audio.
 *
 * **Note:** This will only work in Telegram versions released after 9
 * April, 2016. Older clients will ignore them.
 */
export interface IInlineQueryResultCachedAudio {
  /** Type of the result */
  type: 'audio'

  /** Unique identifier for this result, 1-64 bytes */
  id: string

  /** A valid file identifier for the audio file */
  audio_file_id: string

  /** Caption, 0-1024 characters */
  caption?: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in the
   * media caption.
   */
  parse_mode?: ParseMode

  /**
   * [Inline
   * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating)
   * attached to the message
   */
  reply_markup?: IInlineKeyboardMarkup

  /** Content of the message to be sent instead of the audio */
  input_message_content?: IInputMessageContent
}

/**
 * This object represents the content of a message to be sent as a result
 * of an inline query. Telegram clients currently support the following 4
 * types:
 */
export type IInputMessageContent =
    IInputTextMessageContent |
    IInputLocationMessageContent |
    IInputVenueMessageContent |
    IInputContactMessageContent

/**
 * Represents the [[IInputMessageContent]] of a text message to be sent
 * as the result of an inline query.
 */
export interface IInputTextMessageContent {
  /** Text of the message to be sent, 1-4096 characters */
  message_text: string

  /**
   * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
   * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
   * want Telegram apps to show [bold, italic, fixed-width text or inline
   * URLs](https://core.telegram.org/bots/api#formatting-options) in your
   * bot's message.
   */
  parse_mode?: ParseMode

  /** Disables link previews for links in the sent message */
  disable_web_page_preview?: boolean
}

/**
 * Represents the [[IInputMessageContent]] of a location message to be
 * sent as the result of an inline query.
 */
export interface IInputLocationMessageContent {
  /** Latitude of the location in degrees */
  latitude: number

  /** Longitude of the location in degrees */
  longitude: number

  /**
   * Period in seconds for which the location can be updated, should be
   * between 60 and 86400.
   */
  live_period?: integer
}

/**
 * Represents the [[IInputMessageContent]] of a venue message to be sent
 * as the result of an inline query.
 */
export interface IInputVenueMessageContent {
  /** Latitude of the venue in degrees */
  latitude: number

  /** Longitude of the venue in degrees */
  longitude: number

  /** Name of the venue */
  title: string

  /** Address of the venue */
  address: string

  /** Foursquare identifier of the venue, if known */
  foursquare_id?: string

  /**
   * Foursquare type of the venue, if known. (For example,
   * “arts_entertainment/default”, “arts_entertainment/aquarium” or
   * “food/icecream”.)
   */
  foursquare_type?: string
}

/**
 * Represents the [[IInputMessageContent]] of a contact message to be
 * sent as the result of an inline query.
 */
export interface IInputContactMessageContent {
  /** Contact's phone number */
  phone_number: string

  /** Contact's first name */
  first_name: string

  /** Contact's last name */
  last_name?: string

  /**
   * Additional data about the contact in the form of a
   * [vCard](https://en.wikipedia.org/wiki/VCard), 0-2048 bytes
   */
  vcard?: string
}

/**
 * Represents a [[IInlineQueryResult]] of an inline query that was chosen
 * by the user and sent to their chat partner.
 *
 * **Note:** It is necessary to enable [inline
 * feedback](https://core.telegram.org/bots/inline#collecting-feedback)
 * via [@Botfather](https://t.me/botfather) in order to receive these
 * objects in updates.
 */
export interface IChosenInlineResult {
  /** The unique identifier for the result that was chosen */
  result_id: string

  /** The user that chose the result */
  from: IUser

  /** Sender location, only for bots that require user location */
  location?: ILocation

  /**
   * Identifier of the sent inline message. Available only if there is an
   * [[IInlineKeyboardMarkup]] attached to the message. Will be also
   * received in [[ICallbackQuery]] and can be used to
   * [edit](https://core.telegram.org/bots/api#updating-messages) the
   * message.
   */
  inline_message_id?: string

  /** The query that was used to obtain the result */
  query: string
}


// Payments
// --------

/**
 * This object represents a portion of the price for goods or services.
 */
export interface ILabeledPrice {
  /** Portion label */
  label: string

  /**
   * Price of the product in the *smallest units* of the
   * [currency](https://core.telegram.org/bots/payments#supported-currencies)
   * (integer, **not** float/double). For example, for a price of `US$
   * 1.45` pass `amount = 145`. See the *exp* parameter in
   * [currencies.json](https://core.telegram.org/bots/payments/currencies.json),
   * it shows the number of digits past the decimal point for each currency
   * (2 for the majority of currencies).
   */
  amount: integer
}

/**
 * This object contains basic information about an invoice.
 */
export interface IInvoice {
  /** Product name */
  title: string

  /** Product description */
  description: string

  /**
   * Unique bot deep-linking parameter that can be used to generate this
   * invoice
   */
  start_parameter: string

  /**
   * Three-letter ISO 4217
   * [currency](https://core.telegram.org/bots/payments#supported-currencies)
   * code
   */
  currency: string

  /**
   * Total price in the *smallest units* of the currency (integer, **not**
   * float/double). For example, for a price of `US$ 1.45` pass `amount =
   * 145`. See the *exp* parameter in
   * [currencies.json](https://core.telegram.org/bots/payments/currencies.json),
   * it shows the number of digits past the decimal point for each currency
   * (2 for the majority of currencies).
   */
  total_amount: integer
}

/**
 * This object represents a shipping address.
 */
export interface IShippingAddress {
  /** ISO 3166-1 alpha-2 country code */
  country_code: string

  /** State, if applicable */
  state: string

  /** City */
  city: string

  /** First line for the address */
  street_line1: string

  /** Second line for the address */
  street_line2: string

  /** Address post code */
  post_code: string
}

/**
 * This object represents information about an order.
 */
export interface IOrderInfo {
  /** User name */
  name?: string

  /** User's phone number */
  phone_number?: string

  /** User email */
  email?: string

  /** User shipping address */
  shipping_address?: IShippingAddress
}

/**
 * This object represents one shipping option.
 */
export interface IShippingOption {
  /** Shipping option identifier */
  id: string

  /** Option title */
  title: string

  /** List of price portions */
  prices: ILabeledPrice[]
}

/**
 * This object contains basic information about a successful payment.
 */
export interface ISuccessfulPayment {
  /**
   * Three-letter ISO 4217
   * [currency](https://core.telegram.org/bots/payments#supported-currencies)
   * code
   */
  currency: string

  /**
   * Total price in the *smallest units* of the currency (integer, **not**
   * float/double). For example, for a price of `US$ 1.45` pass `amount =
   * 145`. See the *exp* parameter in
   * [currencies.json](https://core.telegram.org/bots/payments/currencies.json),
   * it shows the number of digits past the decimal point for each currency
   * (2 for the majority of currencies).
   */
  total_amount: integer

  /** Bot specified invoice payload */
  invoice_payload: string

  /** Identifier of the shipping option chosen by the user */
  shipping_option_id?: string

  /** Order info provided by the user */
  order_info?: IOrderInfo

  /** Telegram payment identifier */
  telegram_payment_charge_id: string

  /** Provider payment identifier */
  provider_payment_charge_id: string
}

/**
 * This object contains information about an incoming shipping query.
 */
export interface IShippingQuery {
  /** Unique query identifier */
  id: string

  /** User who sent the query */
  from: IUser

  /** Bot specified invoice payload */
  invoice_payload: string

  /** User specified shipping address */
  shipping_address: IShippingAddress
}

/**
 * This object contains information about an incoming pre-checkout query.
 */
export interface IPreCheckoutQuery {
  /** Unique query identifier */
  id: string

  /** User who sent the query */
  from: IUser

  /**
   * Three-letter ISO 4217
   * [currency](https://core.telegram.org/bots/payments#supported-currencies)
   * code
   */
  currency: string

  /**
   * Total price in the *smallest units* of the currency (integer, **not**
   * float/double). For example, for a price of `US$ 1.45` pass `amount =
   * 145`. See the *exp* parameter in
   * [currencies.json](https://core.telegram.org/bots/payments/currencies.json),
   * it shows the number of digits past the decimal point for each currency
   * (2 for the majority of currencies).
   */
  total_amount: integer

  /** Bot specified invoice payload */
  invoice_payload: string

  /** Identifier of the shipping option chosen by the user */
  shipping_option_id?: string

  /** Order info provided by the user */
  order_info?: IOrderInfo
}


// Telegram Passport
// -----------------

/**
 * Contains information about Telegram Passport data shared with the bot
 * by the user.
 */
export interface IPassportData {
  /**
   * Array with information about documents and other Telegram Passport
   * elements that was shared with the bot
   */
  data: IEncryptedPassportElement[]

  /** Encrypted credentials required to decrypt the data */
  credentials: IEncryptedCredentials
}

/**
 * This object represents a file uploaded to Telegram Passport. Currently
 * all Telegram Passport files are in JPEG format when decrypted and
 * don't exceed 10MB.
 */
export interface IPassportFile {
  /**
   * Identifier for this file, which can be used to download or reuse the
   * file
   */
  file_id: string

  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** File size */
  file_size: integer

  /** Unix time when the file was uploaded */
  file_date: Date
}

/**
 * Contains information about documents or other Telegram Passport
 * elements shared with the bot by the user.
 */
export interface IEncryptedPassportElement {
  /**
   * Element type. One of “personal_details”, “passport”, “driver_license”,
   * “identity_card”, “internal_passport”, “address”, “utility_bill”,
   * “bank_statement”, “rental_agreement”, “passport_registration”,
   * “temporary_registration”, “phone_number”, “email”.
   */
  type: 'personal_details' | 'passport' | 'driver_license' | 'identity_card' | 'internal_passport' | 'address' | 'utility_bill' | 'bank_statement' | 'rental_agreement' | 'passport_registration' | 'temporary_registration' | 'phone_number' | 'email'

  /**
   * Base64-encoded encrypted Telegram Passport element data provided by
   * the user, available for “personal_details”, “passport”,
   * “driver_license”, “identity_card”, “internal_passport” and “address”
   * types. Can be decrypted and verified using the accompanying
   * [[IEncryptedCredentials]].
   */
  data?: string

  /** User's verified phone number, available only for “phone_number” type */
  phone_number?: string

  /** User's verified email address, available only for “email” type */
  email?: string

  /**
   * Array of encrypted files with documents provided by the user,
   * available for “utility_bill”, “bank_statement”, “rental_agreement”,
   * “passport_registration” and “temporary_registration” types. Files can
   * be decrypted and verified using the accompanying
   * [[IEncryptedCredentials]].
   */
  files?: IPassportFile[]

  /**
   * Encrypted file with the front side of the document, provided by the
   * user. Available for “passport”, “driver_license”, “identity_card” and
   * “internal_passport”. The file can be decrypted and verified using the
   * accompanying [[IEncryptedCredentials]].
   */
  front_side?: IPassportFile

  /**
   * Encrypted file with the reverse side of the document, provided by the
   * user. Available for “driver_license” and “identity_card”. The file can
   * be decrypted and verified using the accompanying
   * [[IEncryptedCredentials]].
   */
  reverse_side?: IPassportFile

  /**
   * Encrypted file with the selfie of the user holding a document,
   * provided by the user; available for “passport”, “driver_license”,
   * “identity_card” and “internal_passport”. The file can be decrypted and
   * verified using the accompanying [[IEncryptedCredentials]].
   */
  selfie?: IPassportFile

  /**
   * Array of encrypted files with translated versions of documents
   * provided by the user. Available if requested for “passport”,
   * “driver_license”, “identity_card”, “internal_passport”,
   * “utility_bill”, “bank_statement”, “rental_agreement”,
   * “passport_registration” and “temporary_registration” types. Files can
   * be decrypted and verified using the accompanying
   * [[IEncryptedCredentials]].
   */
  translation?: IPassportFile[]

  /**
   * Base64-encoded element hash for using in
   * [[IPassportElementErrorUnspecified]]
   */
  hash: string
}

/**
 * Contains data required for decrypting and authenticating
 * [[IEncryptedPassportElement]]. See the [Telegram Passport
 * Documentation](https://core.telegram.org/passport#receiving-information)
 * for a complete description of the data decryption and authentication
 * processes.
 */
export interface IEncryptedCredentials {
  /**
   * Base64-encoded encrypted JSON-serialized data with unique user's
   * payload, data hashes and secrets required for
   * [[IEncryptedPassportElement]] decryption and authentication
   */
  data: string

  /** Base64-encoded data hash for data authentication */
  hash: string

  /**
   * Base64-encoded secret, encrypted with the bot's public RSA key,
   * required for data decryption
   */
  secret: string
}

/**
 * This object represents an error in the Telegram Passport element which
 * was submitted that should be resolved by the user. It should be one
 * of:
 */
export type IPassportElementError =
    IPassportElementErrorDataField |
    IPassportElementErrorFrontSide |
    IPassportElementErrorReverseSide |
    IPassportElementErrorSelfie |
    IPassportElementErrorFile |
    IPassportElementErrorFiles |
    IPassportElementErrorTranslationFile |
    IPassportElementErrorTranslationFiles |
    IPassportElementErrorUnspecified

/**
 * Represents an issue in one of the data fields that was provided by the
 * user. The error is considered resolved when the field's value changes.
 */
export interface IPassportElementErrorDataField {
  /** Error source */
  source: 'data'

  /**
   * The section of the user's Telegram Passport which has the error, one
   * of “personal_details”, “passport”, “driver_license”, “identity_card”,
   * “internal_passport”, “address”
   */
  type: 'personal_details' | 'passport' | 'driver_license' | 'identity_card' | 'internal_passport' | 'address'

  /** Name of the data field which has the error */
  field_name: string

  /** Base64-encoded data hash */
  data_hash: string

  /** Error message */
  message: string
}

/**
 * Represents an issue with the front side of a document. The error is
 * considered resolved when the file with the front side of the document
 * changes.
 */
export interface IPassportElementErrorFrontSide {
  /** Error source */
  source: 'front_side'

  /**
   * The section of the user's Telegram Passport which has the issue, one
   * of “passport”, “driver_license”, “identity_card”, “internal_passport”
   */
  type: 'passport' | 'driver_license' | 'identity_card' | 'internal_passport'

  /** Base64-encoded hash of the file with the front side of the document */
  file_hash: string

  /** Error message */
  message: string
}

/**
 * Represents an issue with the reverse side of a document. The error is
 * considered resolved when the file with reverse side of the document
 * changes.
 */
export interface IPassportElementErrorReverseSide {
  /** Error source */
  source: 'reverse_side'

  /**
   * The section of the user's Telegram Passport which has the issue, one
   * of “driver_license”, “identity_card”
   */
  type: 'driver_license' | 'identity_card'

  /** Base64-encoded hash of the file with the reverse side of the document */
  file_hash: string

  /** Error message */
  message: string
}

/**
 * Represents an issue with the selfie with a document. The error is
 * considered resolved when the file with the selfie changes.
 */
export interface IPassportElementErrorSelfie {
  /** Error source */
  source: 'selfie'

  /**
   * The section of the user's Telegram Passport which has the issue, one
   * of “passport”, “driver_license”, “identity_card”, “internal_passport”
   */
  type: 'passport' | 'driver_license' | 'identity_card' | 'internal_passport'

  /** Base64-encoded hash of the file with the selfie */
  file_hash: string

  /** Error message */
  message: string
}

/**
 * Represents an issue with a document scan. The error is considered
 * resolved when the file with the document scan changes.
 */
export interface IPassportElementErrorFile {
  /** Error source */
  source: 'file'

  /**
   * The section of the user's Telegram Passport which has the issue, one
   * of “utility_bill”, “bank_statement”, “rental_agreement”,
   * “passport_registration”, “temporary_registration”
   */
  type: 'utility_bill' | 'bank_statement' | 'rental_agreement' | 'passport_registration' | 'temporary_registration'

  /** Base64-encoded file hash */
  file_hash: string

  /** Error message */
  message: string
}

/**
 * Represents an issue with a list of scans. The error is considered
 * resolved when the list of files containing the scans changes.
 */
export interface IPassportElementErrorFiles {
  /** Error source */
  source: 'files'

  /**
   * The section of the user's Telegram Passport which has the issue, one
   * of “utility_bill”, “bank_statement”, “rental_agreement”,
   * “passport_registration”, “temporary_registration”
   */
  type: 'utility_bill' | 'bank_statement' | 'rental_agreement' | 'passport_registration' | 'temporary_registration'

  /** List of base64-encoded file hashes */
  file_hashes: string[]

  /** Error message */
  message: string
}

/**
 * Represents an issue with one of the files that constitute the
 * translation of a document. The error is considered resolved when the
 * file changes.
 */
export interface IPassportElementErrorTranslationFile {
  /** Error source */
  source: 'translation_file'

  /**
   * Type of element of the user's Telegram Passport which has the issue,
   * one of “passport”, “driver_license”, “identity_card”,
   * “internal_passport”, “utility_bill”, “bank_statement”,
   * “rental_agreement”, “passport_registration”, “temporary_registration”
   */
  type: 'passport' | 'driver_license' | 'identity_card' | 'internal_passport' | 'utility_bill' | 'bank_statement' | 'rental_agreement' | 'passport_registration' | 'temporary_registration'

  /** Base64-encoded file hash */
  file_hash: string

  /** Error message */
  message: string
}

/**
 * Represents an issue with the translated version of a document. The
 * error is considered resolved when a file with the document translation
 * change.
 */
export interface IPassportElementErrorTranslationFiles {
  /** Error source */
  source: 'translation_files'

  /**
   * Type of element of the user's Telegram Passport which has the issue,
   * one of “passport”, “driver_license”, “identity_card”,
   * “internal_passport”, “utility_bill”, “bank_statement”,
   * “rental_agreement”, “passport_registration”, “temporary_registration”
   */
  type: 'passport' | 'driver_license' | 'identity_card' | 'internal_passport' | 'utility_bill' | 'bank_statement' | 'rental_agreement' | 'passport_registration' | 'temporary_registration'

  /** List of base64-encoded file hashes */
  file_hashes: string[]

  /** Error message */
  message: string
}

/**
 * Represents an issue in an unspecified place. The error is considered
 * resolved when new data is added.
 */
export interface IPassportElementErrorUnspecified {
  /** Error source */
  source: 'unspecified'

  /** Type of element of the user's Telegram Passport which has the issue */
  type: string

  /** Base64-encoded element hash */
  element_hash: string

  /** Error message */
  message: string
}


// Games
// -----

/**
 * This object represents a game. Use BotFather to create and edit games,
 * their short names will act as unique identifiers.
 */
export interface IGame {
  /** Title of the game */
  title: string

  /** Description of the game */
  description: string

  /** Photo that will be displayed in the game message in chats. */
  photo: IPhotoSize[]

  /**
   * Brief description of the game or high scores included in the game
   * message. Can be automatically edited to include current high scores
   * for the game when the bot calls [[setGameScore]], or manually edited
   * using [[editMessageText]]. 0-4096 characters.
   */
  text?: string

  /**
   * Special entities that appear in *text*, such as usernames, URLs, bot
   * commands, etc.
   */
  text_entities?: IMessageEntity[]

  /**
   * Animation that will be displayed in the game message in chats. Upload
   * via [BotFather](https://t.me/botfather)
   */
  animation?: IAnimation
}

/**
 * A placeholder, currently holds no information. Use
 * [BotFather](https://t.me/botfather) to set up your game.
 */
export interface ICallbackGame {
}

/**
 * This object represents one row of the high scores table for a game.
 */
export interface IGameHighScore {
  /** Position in high score table for the game */
  position: integer

  /** User */
  user: IUser

  /** Score */
  score: integer
}


/**
 * Base class for [[Client]]. You should never need to use this class directly.
 */
export abstract class ClientBase {

  protected abstract callMethod (name: string, parameters: object): BluebirdPromise<any>
  protected abstract _streamFile (path: string): BluebirdPromise<IncomingMessage>

  // Getting updates
  // ---------------

  /**
   * Use this method to receive incoming updates using long polling
   * ([wiki](https://en.wikipedia.org/wiki/Push_technology#Long_polling)).
   * An Array of [[IUpdate]] objects is returned.
   *
   * > **Notes**  
   * > **1.** This method will not work if an outgoing webhook is set up.  
   * > **2.** In order to avoid getting duplicate updates, recalculate
   * > *offset* after each server response.
   *
   * @param options - Optional parameters
   */
  public getUpdates (options?: {
    /**
     * Identifier of the first update to be returned. Must be greater by one
     * than the highest among the identifiers of previously received updates.
     * By default, updates starting with the earliest unconfirmed update are
     * returned. An update is considered confirmed as soon as [[getUpdates]]
     * is called with an *offset* higher than its *update_id*. The negative
     * offset can be specified to retrieve updates starting from *-offset*
     * update from the end of the updates queue. All previous updates will
     * forgotten.
     */
    offset?: integer

    /**
     * Limits the number of updates to be retrieved. Values between 1—100 are
     * accepted. Defaults to 100.
     */
    limit?: integer

    /**
     * Timeout in seconds for long polling. Defaults to 0, i.e. usual short
     * polling. Should be positive, short polling should be used for testing
     * purposes only.
     */
    timeout?: integer

    /**
     * List the types of updates you want your bot to receive. For example,
     * specify [“message”, “edited_channel_post”, “callback_query”] to only
     * receive updates of these types. See [[IUpdate]] for a complete list of
     * available update types. Specify an empty list to receive all updates
     * regardless of type (default). If not specified, the previous setting
     * will be used.  
     *   
     * Please note that this parameter doesn't affect updates created before
     * the call to the getUpdates, so unwanted updates may be received for a
     * short period of time.
     */
    allowed_updates?: UpdateKind[]
  }): BluebirdPromise<Update[]> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    if (typeof options.offset !== 'undefined') {
      parameters.offset = options.offset
    }
    if (typeof options.limit !== 'undefined') {
      parameters.limit = options.limit
    }
    if (typeof options.timeout !== 'undefined') {
      parameters.timeout = options.timeout
    }
    if (typeof options.allowed_updates !== 'undefined') {
      parameters.allowed_updates = options.allowed_updates
    }
    return this.callMethod('getUpdates', parameters)
        .then((x: any) => x.map((x: any) => new Update(x, this)))
  }

  /**
   * Use this method to specify a url and receive incoming updates via an
   * outgoing webhook. Whenever there is an update for the bot, we will
   * send an HTTPS POST request to the specified url, containing a
   * JSON-serialized [[IUpdate]]. In case of an unsuccessful request, we
   * will give up after a reasonable amount of attempts. Returns *True* on
   * success.
   *
   * If you'd like to make sure that the Webhook request comes from
   * Telegram, we recommend using a secret path in the URL, e.g.
   * `https://www.example.com/<token>`. Since nobody else knows your bot‘s
   * token, you can be pretty sure it’s us.
   *
   * > **Notes**  
   * > **1.** You will not be able to receive updates using [[getUpdates]]
   * > for as long as an outgoing webhook is set up.  
   * > **2.** To use a self-signed certificate, you need to upload your
   * > [public key certificate](https://core.telegram.org/bots/self-signed)
   * > using *certificate* parameter. Please upload as InputFile, sending a
   * > String will not work.  
   * > **3.** Ports currently supported *for Webhooks*: **443, 80, 88,
   * > 8443**.
   * > 
   * > **NEW!** If you're having any trouble setting up webhooks, please
   * > check out this [amazing guide to
   * > Webhooks](https://core.telegram.org/bots/webhooks).
   *
   * @param url - HTTPS url to send updates to. Use an empty string to
   * remove webhook integration
   * @param options - Optional parameters
   */
  public setWebhook (url: string, options?: {
    /**
     * Upload your public key certificate so that the root certificate in use
     * can be checked. See our [self-signed
     * guide](https://core.telegram.org/bots/self-signed) for details.
     */
    certificate?: InputFile

    /**
     * Maximum allowed number of simultaneous HTTPS connections to the
     * webhook for update delivery, 1-100. Defaults to *40*. Use lower values
     * to limit the load on your bot‘s server, and higher values to increase
     * your bot’s throughput.
     */
    max_connections?: integer

    /**
     * List the types of updates you want your bot to receive. For example,
     * specify [“message”, “edited_channel_post”, “callback_query”] to only
     * receive updates of these types. See [[IUpdate]] for a complete list of
     * available update types. Specify an empty list to receive all updates
     * regardless of type (default). If not specified, the previous setting
     * will be used.  
     *   
     * Please note that this parameter doesn't affect updates created before
     * the call to the setWebhook, so unwanted updates may be received for a
     * short period of time.
     */
    allowed_updates?: UpdateKind[]
  }): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.url = url
    if (typeof options.certificate !== 'undefined') {
      parameters.certificate = options.certificate
    }
    if (typeof options.max_connections !== 'undefined') {
      parameters.max_connections = options.max_connections
    }
    if (typeof options.allowed_updates !== 'undefined') {
      parameters.allowed_updates = options.allowed_updates
    }
    return this.callMethod('setWebhook', parameters)
  }

  /**
   * Use this method to remove webhook integration if you decide to switch
   * back to [[getUpdates]]. Returns *True* on success. Requires no
   * parameters.
   */
  public deleteWebhook (): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    return this.callMethod('deleteWebhook', parameters)
  }

  /**
   * Use this method to get current webhook status. Requires no parameters.
   * On success, returns a [[IWebhookInfo]] object. If the bot is using
   * [[getUpdates]], will return an object with the *url* field empty.
   */
  public getWebhookInfo (): BluebirdPromise<WebhookInfo> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    return this.callMethod('getWebhookInfo', parameters)
        .then((x: any) => new WebhookInfo(x, this))
  }


  // Available methods
  // -----------------

  /**
   * A simple method for testing your bot's auth token. Requires no
   * parameters. Returns basic information about the bot in form of a
   * [[IUser]] object.
   */
  public getMe (): BluebirdPromise<User> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    return this.callMethod('getMe', parameters)
        .then((x: any) => new User(x, this))
  }

  /**
   * Use this method to send text messages. On success, the sent
   * [[IMessage]] is returned.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param text - Text of the message to be sent
   * @param options - Optional parameters
   */
  public sendText (chat: ChatId | string, text: string, options?: {
    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in your
     * bot's message.
     */
    parse_mode?: ParseMode

    /** Disables link previews for links in this message */
    disable_web_page_preview?: boolean

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.text = text
    if (typeof options.parse_mode !== 'undefined') {
      parameters.parse_mode = options.parse_mode
    }
    if (typeof options.disable_web_page_preview !== 'undefined') {
      parameters.disable_web_page_preview = options.disable_web_page_preview
    }
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    parameters.reply_to_message_id = (typeof options.reply_to_message === 'object') ? options.reply_to_message.message_id : options.reply_to_message
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('sendMessage', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to forward messages of any kind. On success, the sent
   * [[IMessage]] is returned.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param message - Specify the original message, with either a
   * [[MessageId]] pair or a [[Message]] object
   * @param options - Optional parameters
   */
  public forwardMessage (chat: ChatId | string, message: MessageId, options?: {
    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.from_chat_id = resolveChatId(message.chat)
    parameters.message_id = message.message_id
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    return this.callMethod('forwardMessage', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to send photos. On success, the sent [[IMessage]] is
   * returned.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param photo - Photo to send. Pass a file_id as String to send a photo
   * that exists on the Telegram servers (recommended), pass an HTTP URL as
   * a String for Telegram to get a photo from the Internet, or upload a
   * new photo using multipart/form-data. 
   * @param options - Optional parameters
   */
  public sendPhoto (chat: ChatId | string, photo: InputFile, options?: {
    /**
     * Photo caption (may also be used when resending photos by *file_id*),
     * 0-1024 characters
     */
    caption?: string

    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in the
     * media caption.
     */
    parse_mode?: ParseMode

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.photo = photo
    if (typeof options.caption !== 'undefined') {
      parameters.caption = options.caption
    }
    if (typeof options.parse_mode !== 'undefined') {
      parameters.parse_mode = options.parse_mode
    }
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    parameters.reply_to_message_id = (typeof options.reply_to_message === 'object') ? options.reply_to_message.message_id : options.reply_to_message
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('sendPhoto', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to send audio files, if you want Telegram clients to
   * display them in the music player. Your audio must be in the .MP3 or
   * .M4A format. On success, the sent [[IMessage]] is returned. Bots can
   * currently send audio files of up to 50 MB in size, this limit may be
   * changed in the future.
   *
   * For sending voice messages, use the [[sendVoice]] method instead.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param audio - Audio file to send. Pass a file_id as String to send an
   * audio file that exists on the Telegram servers (recommended), pass an
   * HTTP URL as a String for Telegram to get an audio file from the
   * Internet, or upload a new one using multipart/form-data. 
   * @param options - Optional parameters
   */
  public sendAudio (chat: ChatId | string, audio: InputFile, options?: {
    /** Audio caption, 0-1024 characters */
    caption?: string

    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in the
     * media caption.
     */
    parse_mode?: ParseMode

    /** Duration of the audio in seconds */
    duration?: integer

    /** Performer */
    performer?: string

    /** Track name */
    title?: string

    /**
     * Thumbnail of the file sent; can be ignored if thumbnail generation for
     * the file is supported server-side. The thumbnail should be in JPEG
     * format and less than 200 kB in size. A thumbnail‘s width and height
     * should not exceed 320. Ignored if the file is not uploaded using
     * multipart/form-data. Thumbnails can’t be reused and can be only
     * uploaded as a new file, so you can pass “attach://<file_attach_name>”
     * if the thumbnail was uploaded using multipart/form-data under
     * <file_attach_name>.
     */
    thumb?: InputFile

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.audio = audio
    if (typeof options.caption !== 'undefined') {
      parameters.caption = options.caption
    }
    if (typeof options.parse_mode !== 'undefined') {
      parameters.parse_mode = options.parse_mode
    }
    if (typeof options.duration !== 'undefined') {
      parameters.duration = options.duration
    }
    if (typeof options.performer !== 'undefined') {
      parameters.performer = options.performer
    }
    if (typeof options.title !== 'undefined') {
      parameters.title = options.title
    }
    if (typeof options.thumb !== 'undefined') {
      parameters.thumb = options.thumb
    }
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    parameters.reply_to_message_id = (typeof options.reply_to_message === 'object') ? options.reply_to_message.message_id : options.reply_to_message
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('sendAudio', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to send general files. On success, the sent
   * [[IMessage]] is returned. Bots can currently send files of any type of
   * up to 50 MB in size, this limit may be changed in the future.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param document - File to send. Pass a file_id as String to send a
   * file that exists on the Telegram servers (recommended), pass an HTTP
   * URL as a String for Telegram to get a file from the Internet, or
   * upload a new one using multipart/form-data. 
   * @param options - Optional parameters
   */
  public sendDocument (chat: ChatId | string, document: InputFile, options?: {
    /**
     * Thumbnail of the file sent; can be ignored if thumbnail generation for
     * the file is supported server-side. The thumbnail should be in JPEG
     * format and less than 200 kB in size. A thumbnail‘s width and height
     * should not exceed 320. Ignored if the file is not uploaded using
     * multipart/form-data. Thumbnails can’t be reused and can be only
     * uploaded as a new file, so you can pass “attach://<file_attach_name>”
     * if the thumbnail was uploaded using multipart/form-data under
     * <file_attach_name>.
     */
    thumb?: InputFile

    /**
     * Document caption (may also be used when resending documents by
     * *file_id*), 0-1024 characters
     */
    caption?: string

    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in the
     * media caption.
     */
    parse_mode?: ParseMode

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.document = document
    if (typeof options.thumb !== 'undefined') {
      parameters.thumb = options.thumb
    }
    if (typeof options.caption !== 'undefined') {
      parameters.caption = options.caption
    }
    if (typeof options.parse_mode !== 'undefined') {
      parameters.parse_mode = options.parse_mode
    }
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    parameters.reply_to_message_id = (typeof options.reply_to_message === 'object') ? options.reply_to_message.message_id : options.reply_to_message
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('sendDocument', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to send video files, Telegram clients support mp4
   * videos (other formats may be sent as [[IDocument]]). On success, the
   * sent [[IMessage]] is returned. Bots can currently send video files of
   * up to 50 MB in size, this limit may be changed in the future.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param video - Video to send. Pass a file_id as String to send a video
   * that exists on the Telegram servers (recommended), pass an HTTP URL as
   * a String for Telegram to get a video from the Internet, or upload a
   * new video using multipart/form-data. 
   * @param options - Optional parameters
   */
  public sendVideo (chat: ChatId | string, video: InputFile, options?: {
    /** Duration of sent video in seconds */
    duration?: integer

    /** Video width */
    width?: integer

    /** Video height */
    height?: integer

    /**
     * Thumbnail of the file sent; can be ignored if thumbnail generation for
     * the file is supported server-side. The thumbnail should be in JPEG
     * format and less than 200 kB in size. A thumbnail‘s width and height
     * should not exceed 320. Ignored if the file is not uploaded using
     * multipart/form-data. Thumbnails can’t be reused and can be only
     * uploaded as a new file, so you can pass “attach://<file_attach_name>”
     * if the thumbnail was uploaded using multipart/form-data under
     * <file_attach_name>.
     */
    thumb?: InputFile

    /**
     * Video caption (may also be used when resending videos by *file_id*),
     * 0-1024 characters
     */
    caption?: string

    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in the
     * media caption.
     */
    parse_mode?: ParseMode

    /** Pass *True*, if the uploaded video is suitable for streaming */
    supports_streaming?: boolean

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.video = video
    if (typeof options.duration !== 'undefined') {
      parameters.duration = options.duration
    }
    if (typeof options.width !== 'undefined') {
      parameters.width = options.width
    }
    if (typeof options.height !== 'undefined') {
      parameters.height = options.height
    }
    if (typeof options.thumb !== 'undefined') {
      parameters.thumb = options.thumb
    }
    if (typeof options.caption !== 'undefined') {
      parameters.caption = options.caption
    }
    if (typeof options.parse_mode !== 'undefined') {
      parameters.parse_mode = options.parse_mode
    }
    if (typeof options.supports_streaming !== 'undefined') {
      parameters.supports_streaming = options.supports_streaming
    }
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    parameters.reply_to_message_id = (typeof options.reply_to_message === 'object') ? options.reply_to_message.message_id : options.reply_to_message
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('sendVideo', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to send animation files (GIF or H.264/MPEG-4 AVC video
   * without sound). On success, the sent [[IMessage]] is returned. Bots
   * can currently send animation files of up to 50 MB in size, this limit
   * may be changed in the future.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param animation - Animation to send. Pass a file_id as String to send
   * an animation that exists on the Telegram servers (recommended), pass
   * an HTTP URL as a String for Telegram to get an animation from the
   * Internet, or upload a new animation using multipart/form-data. 
   * @param options - Optional parameters
   */
  public sendAnimation (chat: ChatId | string, animation: InputFile, options?: {
    /** Duration of sent animation in seconds */
    duration?: integer

    /** Animation width */
    width?: integer

    /** Animation height */
    height?: integer

    /**
     * Thumbnail of the file sent; can be ignored if thumbnail generation for
     * the file is supported server-side. The thumbnail should be in JPEG
     * format and less than 200 kB in size. A thumbnail‘s width and height
     * should not exceed 320. Ignored if the file is not uploaded using
     * multipart/form-data. Thumbnails can’t be reused and can be only
     * uploaded as a new file, so you can pass “attach://<file_attach_name>”
     * if the thumbnail was uploaded using multipart/form-data under
     * <file_attach_name>.
     */
    thumb?: InputFile

    /**
     * Animation caption (may also be used when resending animation by
     * *file_id*), 0-1024 characters
     */
    caption?: string

    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in the
     * media caption.
     */
    parse_mode?: ParseMode

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.animation = animation
    if (typeof options.duration !== 'undefined') {
      parameters.duration = options.duration
    }
    if (typeof options.width !== 'undefined') {
      parameters.width = options.width
    }
    if (typeof options.height !== 'undefined') {
      parameters.height = options.height
    }
    if (typeof options.thumb !== 'undefined') {
      parameters.thumb = options.thumb
    }
    if (typeof options.caption !== 'undefined') {
      parameters.caption = options.caption
    }
    if (typeof options.parse_mode !== 'undefined') {
      parameters.parse_mode = options.parse_mode
    }
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    parameters.reply_to_message_id = (typeof options.reply_to_message === 'object') ? options.reply_to_message.message_id : options.reply_to_message
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('sendAnimation', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to send audio files, if you want Telegram clients to
   * display the file as a playable voice message. For this to work, your
   * audio must be in an .ogg file encoded with OPUS (other formats may be
   * sent as [[IAudio]] or [[IDocument]]). On success, the sent
   * [[IMessage]] is returned. Bots can currently send voice messages of up
   * to 50 MB in size, this limit may be changed in the future.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param voice - Audio file to send. Pass a file_id as String to send a
   * file that exists on the Telegram servers (recommended), pass an HTTP
   * URL as a String for Telegram to get a file from the Internet, or
   * upload a new one using multipart/form-data. 
   * @param options - Optional parameters
   */
  public sendVoice (chat: ChatId | string, voice: InputFile, options?: {
    /** Voice message caption, 0-1024 characters */
    caption?: string

    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in the
     * media caption.
     */
    parse_mode?: ParseMode

    /** Duration of the voice message in seconds */
    duration?: integer

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.voice = voice
    if (typeof options.caption !== 'undefined') {
      parameters.caption = options.caption
    }
    if (typeof options.parse_mode !== 'undefined') {
      parameters.parse_mode = options.parse_mode
    }
    if (typeof options.duration !== 'undefined') {
      parameters.duration = options.duration
    }
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    parameters.reply_to_message_id = (typeof options.reply_to_message === 'object') ? options.reply_to_message.message_id : options.reply_to_message
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('sendVoice', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * As of [v.4.0](https://telegram.org/blog/video-messages-and-telescope),
   * Telegram clients support rounded square mp4 videos of up to 1 minute
   * long. Use this method to send video messages. On success, the sent
   * [[IMessage]] is returned.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param video_note - Video note to send. Pass a file_id as String to
   * send a video note that exists on the Telegram servers (recommended) or
   * upload a new video using multipart/form-data. . Sending video notes by
   * a URL is currently unsupported
   * @param options - Optional parameters
   */
  public sendVideoNote (chat: ChatId | string, video_note: InputFile, options?: {
    /** Duration of sent video in seconds */
    duration?: integer

    /** Video width and height, i.e. diameter of the video message */
    length?: integer

    /**
     * Thumbnail of the file sent; can be ignored if thumbnail generation for
     * the file is supported server-side. The thumbnail should be in JPEG
     * format and less than 200 kB in size. A thumbnail‘s width and height
     * should not exceed 320. Ignored if the file is not uploaded using
     * multipart/form-data. Thumbnails can’t be reused and can be only
     * uploaded as a new file, so you can pass “attach://<file_attach_name>”
     * if the thumbnail was uploaded using multipart/form-data under
     * <file_attach_name>.
     */
    thumb?: InputFile

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.video_note = video_note
    if (typeof options.duration !== 'undefined') {
      parameters.duration = options.duration
    }
    if (typeof options.length !== 'undefined') {
      parameters.length = options.length
    }
    if (typeof options.thumb !== 'undefined') {
      parameters.thumb = options.thumb
    }
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    parameters.reply_to_message_id = (typeof options.reply_to_message === 'object') ? options.reply_to_message.message_id : options.reply_to_message
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('sendVideoNote', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to send a group of photos or videos as an album. On
   * success, an array of the sent [[IMessage]] is returned.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param media - Array describing photos and videos to be sent, must
   * include 2–10 items
   * @param options - Optional parameters
   */
  public sendMediaGroup (chat: ChatId | string, media: (IInputMediaPhoto | IInputMediaVideo)[], options?: {
    /**
     * Sends the messages
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the messages are a reply, ID of the original message */
    reply_to_message?: MessageId | integer
  }): BluebirdPromise<Message[]> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.media = media.map(x => {
      if (x.type === 'photo') {
        return formatInputMediaPhoto({}, x, fdata)
      } else if (x.type === 'video') {
        return formatInputMediaVideo({}, x, fdata)
      } else {
        throw new ValidationError('No subtype matched')
      }
    })
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    parameters.reply_to_message_id = (typeof options.reply_to_message === 'object') ? options.reply_to_message.message_id : options.reply_to_message
    return this.callMethod('sendMediaGroup', parameters)
        .then((x: any) => x.map((x: any) => new Message(x, this)))
  }

  /**
   * Use this method to send point on the map. On success, the sent
   * [[IMessage]] is returned.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param latitude - Latitude of the location
   * @param longitude - Longitude of the location
   * @param options - Optional parameters
   */
  public sendLocation (chat: ChatId | string, latitude: number, longitude: number, options?: {
    /**
     * Period in seconds for which the location will be updated (see [Live
     * Locations](https://telegram.org/blog/live-locations), should be
     * between 60 and 86400.
     */
    live_period?: integer

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.latitude = latitude
    parameters.longitude = longitude
    if (typeof options.live_period !== 'undefined') {
      parameters.live_period = options.live_period
    }
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    parameters.reply_to_message_id = (typeof options.reply_to_message === 'object') ? options.reply_to_message.message_id : options.reply_to_message
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('sendLocation', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to edit live location messages. A location can be
   * edited until its *live_period* expires or editing is explicitly
   * disabled by a call to [[stopMessageLiveLocation]]. On success, if the
   * edited message was sent by the bot, the edited [[IMessage]] is
   * returned, otherwise *True* is returned.
   *
   * @param message - Specify the message to operate on, with either a
   * [[MessageId]] pair or a [[Message]] object. For inline messages, pass
   * the `string` ID directly.
   * @param latitude - Latitude of new location
   * @param longitude - Longitude of new location
   * @param options - Optional parameters
   */
  public editMessageLiveLocation (message: MessageId | string, latitude: number, longitude: number, options?: {
    /**
     * A new [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    if (typeof message === 'string') {
      parameters.inline_message_id = message
    } else {
      parameters.chat_id = resolveChatId(message.chat)
      parameters.message_id = message.message_id
    }
    parameters.latitude = latitude
    parameters.longitude = longitude
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('editMessageLiveLocation', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to stop updating a live location message before
   * *live_period* expires. On success, if the message was sent by the bot,
   * the sent [[IMessage]] is returned, otherwise *True* is returned.
   *
   * @param message - Specify the message to operate on, with either a
   * [[MessageId]] pair or a [[Message]] object. For inline messages, pass
   * the `string` ID directly.
   * @param options - Optional parameters
   */
  public stopMessageLiveLocation (message: MessageId | string, options?: {
    /**
     * A new [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    if (typeof message === 'string') {
      parameters.inline_message_id = message
    } else {
      parameters.chat_id = resolveChatId(message.chat)
      parameters.message_id = message.message_id
    }
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('stopMessageLiveLocation', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to send information about a venue. On success, the
   * sent [[IMessage]] is returned.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param latitude - Latitude of the venue
   * @param longitude - Longitude of the venue
   * @param options - Optional parameters
   */
  public sendVenue (chat: ChatId | string, latitude: number, longitude: number, options: {
    /** Name of the venue */
    title: string

    /** Address of the venue */
    address: string

    /** Foursquare identifier of the venue */
    foursquare_id?: string

    /**
     * Foursquare type of the venue, if known. (For example,
     * “arts_entertainment/default”, “arts_entertainment/aquarium” or
     * “food/icecream”.)
     */
    foursquare_type?: string

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    parameters.latitude = latitude
    parameters.longitude = longitude
    parameters.title = options.title
    parameters.address = options.address
    if (typeof options.foursquare_id !== 'undefined') {
      parameters.foursquare_id = options.foursquare_id
    }
    if (typeof options.foursquare_type !== 'undefined') {
      parameters.foursquare_type = options.foursquare_type
    }
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    parameters.reply_to_message_id = (typeof options.reply_to_message === 'object') ? options.reply_to_message.message_id : options.reply_to_message
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('sendVenue', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to send phone contacts. On success, the sent
   * [[IMessage]] is returned.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param options - Optional parameters
   */
  public sendContact (chat: ChatId | string, options: {
    /** Contact's phone number */
    phone_number: string

    /** Contact's first name */
    first_name: string

    /** Contact's last name */
    last_name?: string

    /**
     * Additional data about the contact in the form of a
     * [vCard](https://en.wikipedia.org/wiki/VCard), 0-2048 bytes
     */
    vcard?: string

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove keyboard or to force a reply from the user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    parameters.phone_number = options.phone_number
    parameters.first_name = options.first_name
    if (typeof options.last_name !== 'undefined') {
      parameters.last_name = options.last_name
    }
    if (typeof options.vcard !== 'undefined') {
      parameters.vcard = options.vcard
    }
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    parameters.reply_to_message_id = (typeof options.reply_to_message === 'object') ? options.reply_to_message.message_id : options.reply_to_message
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('sendContact', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to send a native poll. On success, the sent
   * [[IMessage]] is returned.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param question - Poll question, 1-255 characters
   * @param pollOptions - List of answer options, 2-10 strings 1-100
   * characters each
   * @param options - Optional parameters
   */
  public sendPoll (chat: ChatId | string, question: string, pollOptions: string[], options?: {
    /** True, if the poll needs to be anonymous, defaults to *True* */
    is_anonymous?: boolean

    /** Poll type, “quiz” or “regular”, defaults to “regular” */
    type?: PollType

    /**
     * True, if the poll allows multiple answers, ignored for polls in quiz
     * mode, defaults to *False*
     */
    allows_multiple_answers?: boolean

    /**
     * 0-based identifier of the correct answer option, required for polls in
     * quiz mode
     */
    correct_option_id?: integer

    /** Pass *True*, if the poll needs to be immediately closed */
    is_closed?: boolean

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.question = question
    parameters.options = pollOptions
    if (typeof options.is_anonymous !== 'undefined') {
      parameters.is_anonymous = options.is_anonymous
    }
    if (typeof options.type !== 'undefined') {
      parameters.type = options.type
    }
    if (typeof options.allows_multiple_answers !== 'undefined') {
      parameters.allows_multiple_answers = options.allows_multiple_answers
    }
    if (typeof options.correct_option_id !== 'undefined') {
      parameters.correct_option_id = options.correct_option_id
    }
    if (typeof options.is_closed !== 'undefined') {
      parameters.is_closed = options.is_closed
    }
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    parameters.reply_to_message_id = (typeof options.reply_to_message === 'object') ? options.reply_to_message.message_id : options.reply_to_message
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('sendPoll', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method when you need to tell the user that something is
   * happening on the bot's side. The status is set for 5 seconds or less
   * (when a message arrives from your bot, Telegram clients clear its
   * typing status). Returns *True* on success.
   *
   * > Example: The [ImageBot](https://t.me/imagebot) needs some time to
   * > process a request and upload the image. Instead of sending a text
   * > message along the lines of “Retrieving image, please wait…”, the bot
   * > may use [[sendChatAction]] with *action* = *upload_photo*. The user
   * > will see a “sending photo” status for the bot.
   *
   * We only recommend using this method when a response from the bot will
   * take a **noticeable** amount of time to arrive.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param action - Type of action to broadcast. Choose one, depending on
   * what the user is about to receive: *typing* for [[sendText]],
   * *upload_photo* for [[sendPhoto]], *record_video* or *upload_video* for
   * [[sendVideo]], *record_audio* or *upload_audio* for [[sendAudio]],
   * *upload_document* for [[sendDocument]], *find_location* for
   * [[sendLocation]], *record_video_note* or *upload_video_note* for
   * [[sendVideoNote]].
   */
  public sendChatAction (chat: ChatId | string, action: ChatAction): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    parameters.action = action
    return this.callMethod('sendChatAction', parameters)
  }

  /**
   * Use this method to get a list of profile pictures for a user. Returns
   * a [[IUserProfilePhotos]] object.
   *
   * @param user - Unique identifier of the target user
   * @param options - Optional parameters
   */
  public getUserProfilePhotos (user: UserId, options?: {
    /**
     * Sequential number of the first photo to be returned. By default, all
     * photos are returned.
     */
    offset?: integer

    /**
     * Limits the number of photos to be retrieved. Values between 1—100 are
     * accepted. Defaults to 100.
     */
    limit?: integer
  }): BluebirdPromise<UserProfilePhotos> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.user_id = resolveUserId(user)
    if (typeof options.offset !== 'undefined') {
      parameters.offset = options.offset
    }
    if (typeof options.limit !== 'undefined') {
      parameters.limit = options.limit
    }
    return this.callMethod('getUserProfilePhotos', parameters)
        .then((x: any) => new UserProfilePhotos(x, this))
  }

  /**
   * Use this method to get a (new) [[File]] object for the passed file
   * identifier.
   *
   * This [[File]] object always contains a `file_path` attribute, but may
   * not preserve the original file name and MIME type. You should save the
   * file's MIME type and name if received.
   *
   * It's not necessary to use this method to download files, see
   * [[streamFile]] and [[loadFile]].
   *
   * **Note:** This function may not preserve the original file name and
   * MIME type. You should save the file's MIME type and name (if
   * available) when the File object is received.
   *
   * @param file - File identifier to get info about
   */
  public getFile (file: FileId): BluebirdPromise<File> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.file_id = resolveFileId(file)
    return this.callMethod('getFile', parameters)
        .then((x: any) => new File(x, this))
  }

  /**
   * This method starts downloading a file from Telegram servers. If the
   * passed `file` doesn't contain the `file_path` attribute, [[getFile]]
   * will be called first to obtain it.
   *
   * **Note:** For the moment, bots can download files of up to 20MB in
   * size.
   *
   * **Note:** Telegram only guarantees that download links will be valid
   * for 1 hour. If the passed `file` was received a long time ago, the
   * download may fail. You can first call [[getFile]] manually to get a
   * fresh one.
   *
   * @param file - File to download
   * @returns Promise that resolves with the HTTP response (readable
   * stream). If you want the full body, see [[loadFile]].
   */
  public streamFile (file: FileId): BluebirdPromise<IncomingMessage> {
    let filePromise: BluebirdPromise<File>
    if (typeof (file as File).file_path === 'string') {
      filePromise = BluebirdPromise.resolve(file as File)
    } else {
      filePromise = this.getFile(file)
    }
    return filePromise.then((file) => this._streamFile(file.file_path!))
  }

  /**
   * Convenience method that calls [[streamFile]], collects the file
   * contents into memory and returns them. This is discouraged for big
   * files.
   *
   * @param file - File to download
   * @returns Promise that resolves with the binary contents of the file.
   */
  public loadFile (file: FileId): BluebirdPromise<Buffer> {
    return this.streamFile(file).then((response) => {
      const chunks: Buffer[] = []
      response.on('data', (chunk) => chunks.push(chunk))
      return new BluebirdPromise((resolve, reject, onCancel) => {
        finished(response, (err) => !err ?
            resolve(Buffer.concat(chunks)) : reject(err))
        onCancel && onCancel(() => response.destroy())
      })
    })
  }

  /**
   * Use this method to kick a user from a group, a supergroup or a
   * channel. In the case of supergroups and channels, the user will not be
   * able to return to the group on their own using invite links, etc.,
   * unless [[unbanChatMember]] first. The bot must be an administrator in
   * the chat for this to work and must have the appropriate admin rights.
   * Returns *True* on success.
   *
   * @param chat - Unique identifier for the target group or username of
   * the target supergroup or channel (in the format `@channelusername`)
   * @param user - Unique identifier of the target user
   * @param options - Optional parameters
   */
  public kickChatMember (chat: ChatId | string, user: UserId, options?: {
    /**
     * Date when the user will be unbanned, unix time. If user is banned for
     * more than 366 days or less than 30 seconds from the current time they
     * are considered to be banned forever
     */
    until_date?: Date
  }): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.user_id = resolveUserId(user)
    if (typeof options.until_date !== 'undefined') {
      parameters.until_date = Math.round(options.until_date.getTime() / 1000)
    }
    return this.callMethod('kickChatMember', parameters)
  }

  /**
   * Use this method to unban a previously kicked user in a supergroup or
   * channel. The user will **not** return to the group or channel
   * automatically, but will be able to join via link, etc. The bot must be
   * an administrator for this to work. Returns *True* on success.
   *
   * @param chat - Unique identifier for the target group or username of
   * the target supergroup or channel (in the format `@username`)
   * @param user - Unique identifier of the target user
   */
  public unbanChatMember (chat: ChatId | string, user: UserId): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    parameters.user_id = resolveUserId(user)
    return this.callMethod('unbanChatMember', parameters)
  }

  /**
   * Use this method to restrict a user in a supergroup. The bot must be an
   * administrator in the supergroup for this to work and must have the
   * appropriate admin rights. Pass *True* for all permissions to lift
   * restrictions from a user. Returns *True* on success.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target supergroup (in the format `@supergroupusername`)
   * @param user - Unique identifier of the target user
   * @param permissions - New user permissions
   * @param options - Optional parameters
   */
  public restrictChatMember (chat: ChatId | string, user: UserId, permissions: IChatPermissions, options?: {
    /**
     * Date when restrictions will be lifted for the user, unix time. If user
     * is restricted for more than 366 days or less than 30 seconds from the
     * current time, they are considered to be restricted forever
     */
    until_date?: Date
  }): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.user_id = resolveUserId(user)
    parameters.permissions = permissions
    if (typeof options.until_date !== 'undefined') {
      parameters.until_date = Math.round(options.until_date.getTime() / 1000)
    }
    return this.callMethod('restrictChatMember', parameters)
  }

  /**
   * Use this method to promote or demote a user in a supergroup or a
   * channel. The bot must be an administrator in the chat for this to work
   * and must have the appropriate admin rights. Pass *False* for all
   * boolean parameters to demote a user. Returns *True* on success.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param user - Unique identifier of the target user
   * @param options - Optional parameters
   */
  public promoteChatMember (chat: ChatId | string, user: UserId, options?: {
    /**
     * Pass True, if the administrator can change chat title, photo and other
     * settings
     */
    can_change_info?: boolean

    /**
     * Pass True, if the administrator can create channel posts, channels
     * only
     */
    can_post_messages?: boolean

    /**
     * Pass True, if the administrator can edit messages of other users and
     * can pin messages, channels only
     */
    can_edit_messages?: boolean

    /** Pass True, if the administrator can delete messages of other users */
    can_delete_messages?: boolean

    /** Pass True, if the administrator can invite new users to the chat */
    can_invite_users?: boolean

    /**
     * Pass True, if the administrator can restrict, ban or unban chat
     * members
     */
    can_restrict_members?: boolean

    /** Pass True, if the administrator can pin messages, supergroups only */
    can_pin_messages?: boolean

    /**
     * Pass True, if the administrator can add new administrators with a
     * subset of his own privileges or demote administrators that he has
     * promoted, directly or indirectly (promoted by administrators that were
     * appointed by him)
     */
    can_promote_members?: boolean
  }): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.user_id = resolveUserId(user)
    if (typeof options.can_change_info !== 'undefined') {
      parameters.can_change_info = options.can_change_info
    }
    if (typeof options.can_post_messages !== 'undefined') {
      parameters.can_post_messages = options.can_post_messages
    }
    if (typeof options.can_edit_messages !== 'undefined') {
      parameters.can_edit_messages = options.can_edit_messages
    }
    if (typeof options.can_delete_messages !== 'undefined') {
      parameters.can_delete_messages = options.can_delete_messages
    }
    if (typeof options.can_invite_users !== 'undefined') {
      parameters.can_invite_users = options.can_invite_users
    }
    if (typeof options.can_restrict_members !== 'undefined') {
      parameters.can_restrict_members = options.can_restrict_members
    }
    if (typeof options.can_pin_messages !== 'undefined') {
      parameters.can_pin_messages = options.can_pin_messages
    }
    if (typeof options.can_promote_members !== 'undefined') {
      parameters.can_promote_members = options.can_promote_members
    }
    return this.callMethod('promoteChatMember', parameters)
  }

  /**
   * Use this method to set a custom title for an administrator in a
   * supergroup promoted by the bot. Returns *True* on success.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target supergroup (in the format `@supergroupusername`)
   * @param user - Unique identifier of the target user
   * @param custom_title - New custom title for the administrator; 0-16
   * characters, emoji are not allowed
   */
  public setChatAdministratorCustomTitle (chat: ChatId | string, user: UserId, custom_title: string): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    parameters.user_id = resolveUserId(user)
    parameters.custom_title = custom_title
    return this.callMethod('setChatAdministratorCustomTitle', parameters)
  }

  /**
   * Use this method to set default chat permissions for all members. The
   * bot must be an administrator in the group or a supergroup for this to
   * work and must have the *can_restrict_members* admin rights. Returns
   * *True* on success.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target supergroup (in the format `@supergroupusername`)
   * @param permissions - New default chat permissions
   */
  public setChatPermissions (chat: ChatId | string, permissions: IChatPermissions): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    parameters.permissions = permissions
    return this.callMethod('setChatPermissions', parameters)
  }

  /**
   * Use this method to generate a new invite link for a chat; any
   * previously generated link is revoked. The bot must be an administrator
   * in the chat for this to work and must have the appropriate admin
   * rights. Returns the new invite link as *String* on success.
   *
   * > Note: Each administrator in a chat generates their own invite links.
   * > Bots can't use invite links generated by other administrators. If you
   * > want your bot to work with invite links, it will need to generate its
   * > own link using [[exportChatInviteLink]] – after this the link will
   * > become available to the bot via the [[getChat]] method. If your bot
   * > needs to generate a new invite link replacing its previous one, use
   * > [[exportChatInviteLink]] again.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   */
  public exportChatInviteLink (chat: ChatId | string): BluebirdPromise<string> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    return this.callMethod('exportChatInviteLink', parameters)
  }

  /**
   * Use this method to set a new profile photo for the chat. Photos can't
   * be changed for private chats. The bot must be an administrator in the
   * chat for this to work and must have the appropriate admin rights.
   * Returns *True* on success.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param photo - New chat photo, uploaded using multipart/form-data
   */
  public setChatPhoto (chat: ChatId | string, photo: InputFile): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    parameters.photo = photo
    return this.callMethod('setChatPhoto', parameters)
  }

  /**
   * Use this method to delete a chat photo. Photos can't be changed for
   * private chats. The bot must be an administrator in the chat for this
   * to work and must have the appropriate admin rights. Returns *True* on
   * success.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   */
  public deleteChatPhoto (chat: ChatId | string): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    return this.callMethod('deleteChatPhoto', parameters)
  }

  /**
   * Use this method to change the title of a chat. Titles can't be changed
   * for private chats. The bot must be an administrator in the chat for
   * this to work and must have the appropriate admin rights. Returns
   * *True* on success.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param title - New chat title, 1-255 characters
   */
  public setChatTitle (chat: ChatId | string, title: string): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    parameters.title = title
    return this.callMethod('setChatTitle', parameters)
  }

  /**
   * Use this method to change the description of a group, a supergroup or
   * a channel. The bot must be an administrator in the chat for this to
   * work and must have the appropriate admin rights. Returns *True* on
   * success.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param description - New chat description, 0-255 characters
   */
  public setChatDescription (chat: ChatId | string, description: string | undefined): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    parameters.description = description
    return this.callMethod('setChatDescription', parameters)
  }

  /**
   * Use this method to pin a message in a group, a supergroup, or a
   * channel. The bot must be an administrator in the chat for this to work
   * and must have the ‘can_pin_messages’ admin right in the supergroup or
   * ‘can_edit_messages’ admin right in the channel. Returns *True* on
   * success.
   *
   * @param message - Identifier of a message to pin
   * @param options - Optional parameters
   */
  public pinChatMessage (message: MessageId, options?: {
    /**
     * Pass *True*, if it is not necessary to send a notification to all chat
     * members about the new pinned message. Notifications are always
     * disabled in channels.
     */
    disable_notification?: boolean
  }): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(message.chat)
    parameters.message_id = message.message_id
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    return this.callMethod('pinChatMessage', parameters)
  }

  /**
   * Use this method to unpin a message in a group, a supergroup, or a
   * channel. The bot must be an administrator in the chat for this to work
   * and must have the ‘can_pin_messages’ admin right in the supergroup or
   * ‘can_edit_messages’ admin right in the channel. Returns *True* on
   * success.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   */
  public unpinChatMessage (chat: ChatId | string): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    return this.callMethod('unpinChatMessage', parameters)
  }

  /**
   * Use this method for your bot to leave a group, supergroup or channel.
   * Returns *True* on success.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target supergroup or channel (in the format `@channelusername`)
   */
  public leaveChat (chat: ChatId | string): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    return this.callMethod('leaveChat', parameters)
  }

  /**
   * Use this method to get up to date information about the chat (current
   * name of the user for one-on-one conversations, current username of a
   * user, group or channel, etc.). Returns a [[IChat]] object on success.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target supergroup or channel (in the format `@channelusername`)
   */
  public getChat (chat: ChatId | string): BluebirdPromise<Chat> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    return this.callMethod('getChat', parameters)
        .then((x: any) => new Chat(x, this))
  }

  /**
   * Use this method to get a list of administrators in a chat. On success,
   * returns an Array of [[IChatMember]] objects that contains information
   * about all chat administrators except other bots. If the chat is a
   * group or a supergroup and no administrators were appointed, only the
   * creator will be returned.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target supergroup or channel (in the format `@channelusername`)
   */
  public getChatAdministrators (chat: ChatId | string): BluebirdPromise<ChatMember[]> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    return this.callMethod('getChatAdministrators', parameters)
        .then((x: any) => x.map((x: any) => new ChatMember(x, this)))
  }

  /**
   * Use this method to get the number of members in a chat. Returns *Int*
   * on success.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target supergroup or channel (in the format `@channelusername`)
   */
  public getChatMembersCount (chat: ChatId | string): BluebirdPromise<integer> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    return this.callMethod('getChatMembersCount', parameters)
  }

  /**
   * Use this method to get information about a member of a chat. Returns a
   * [[IChatMember]] object on success.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target supergroup or channel (in the format `@channelusername`)
   * @param user - Unique identifier of the target user
   */
  public getChatMember (chat: ChatId | string, user: UserId): BluebirdPromise<ChatMember> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    parameters.user_id = resolveUserId(user)
    return this.callMethod('getChatMember', parameters)
        .then((x: any) => new ChatMember(x, this))
  }

  /**
   * Use this method to set a new group sticker set for a supergroup. The
   * bot must be an administrator in the chat for this to work and must
   * have the appropriate admin rights. Use the field *can_set_sticker_set*
   * optionally returned in [[getChat]] requests to check if the bot can
   * use this method. Returns *True* on success.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target supergroup (in the format `@supergroupusername`)
   * @param sticker_set_name - Name of the sticker set to be set as the
   * group sticker set
   */
  public setChatStickerSet (chat: ChatId | string, sticker_set_name: string): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    parameters.sticker_set_name = sticker_set_name
    return this.callMethod('setChatStickerSet', parameters)
  }

  /**
   * Use this method to delete a group sticker set from a supergroup. The
   * bot must be an administrator in the chat for this to work and must
   * have the appropriate admin rights. Use the field *can_set_sticker_set*
   * optionally returned in [[getChat]] requests to check if the bot can
   * use this method. Returns *True* on success.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target supergroup (in the format `@supergroupusername`)
   */
  public deleteChatStickerSet (chat: ChatId | string): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    return this.callMethod('deleteChatStickerSet', parameters)
  }

  /**
   * Use this method to send answers to callback queries sent from [inline
   * keyboards](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
   * The answer will be displayed to the user as a notification at the top
   * of the chat screen or as an alert. On success, *True* is returned.
   *
   * > Alternatively, the user can be redirected to the specified Game URL.
   * > For this option to work, you must first create a game for your bot via
   * > [@Botfather](https://t.me/botfather) and accept the terms. Otherwise,
   * > you may use links like `t.me/your_bot?start=XXXX` that open your bot
   * > with a parameter.
   *
   * @param callback_query_id - Unique identifier for the query to be
   * answered
   * @param options - Optional parameters
   */
  public answerCallbackQuery (callback_query_id: string, options?: {
    /**
     * Text of the notification. If not specified, nothing will be shown to
     * the user, 0-200 characters
     */
    text?: string

    /**
     * If *true*, an alert will be shown by the client instead of a
     * notification at the top of the chat screen. Defaults to *false*.
     */
    show_alert?: boolean

    /**
     * URL that will be opened by the user's client. If you have created a
     * [[IGame]] and accepted the conditions via
     * [@Botfather](https://t.me/botfather), specify the URL that opens your
     * game – note that this will only work if the query comes from a
     * [[IInlineKeyboardButton]] button.  
     *   
     * Otherwise, you may use links like `t.me/your_bot?start=XXXX` that open
     * your bot with a parameter.
     */
    url?: string

    /**
     * The maximum amount of time in seconds that the result of the callback
     * query may be cached client-side. Telegram apps will support caching
     * starting in version 3.14. Defaults to 0.
     */
    cache_time?: integer
  }): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.callback_query_id = callback_query_id
    if (typeof options.text !== 'undefined') {
      parameters.text = options.text
    }
    if (typeof options.show_alert !== 'undefined') {
      parameters.show_alert = options.show_alert
    }
    if (typeof options.url !== 'undefined') {
      parameters.url = options.url
    }
    if (typeof options.cache_time !== 'undefined') {
      parameters.cache_time = options.cache_time
    }
    return this.callMethod('answerCallbackQuery', parameters)
  }


  // Updating messages
  // -----------------

  /**
   * Use this method to edit text and
   * [game](https://core.telegram.org/bots/api#games) messages. On success,
   * if edited message is sent by the bot, the edited [[IMessage]] is
   * returned, otherwise *True* is returned.
   *
   * @param message - Specify the message to operate on, with either a
   * [[MessageId]] pair or a [[Message]] object. For inline messages, pass
   * the `string` ID directly.
   * @param text - New text of the message
   * @param options - Optional parameters
   */
  public editMessageText (message: MessageId | string, text: string, options?: {
    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in your
     * bot's message.
     */
    parse_mode?: ParseMode

    /** Disables link previews for links in this message */
    disable_web_page_preview?: boolean

    /**
     * An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    if (typeof message === 'string') {
      parameters.inline_message_id = message
    } else {
      parameters.chat_id = resolveChatId(message.chat)
      parameters.message_id = message.message_id
    }
    parameters.text = text
    if (typeof options.parse_mode !== 'undefined') {
      parameters.parse_mode = options.parse_mode
    }
    if (typeof options.disable_web_page_preview !== 'undefined') {
      parameters.disable_web_page_preview = options.disable_web_page_preview
    }
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('editMessageText', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to edit captions of messages. On success, if edited
   * message is sent by the bot, the edited [[IMessage]] is returned,
   * otherwise *True* is returned.
   *
   * @param message - Specify the message to operate on, with either a
   * [[MessageId]] pair or a [[Message]] object. For inline messages, pass
   * the `string` ID directly.
   * @param options - Optional parameters
   */
  public editMessageCaption (message: MessageId | string, options?: {
    /** New caption of the message */
    caption?: string

    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in the
     * media caption.
     */
    parse_mode?: ParseMode

    /**
     * An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    if (typeof message === 'string') {
      parameters.inline_message_id = message
    } else {
      parameters.chat_id = resolveChatId(message.chat)
      parameters.message_id = message.message_id
    }
    if (typeof options.caption !== 'undefined') {
      parameters.caption = options.caption
    }
    if (typeof options.parse_mode !== 'undefined') {
      parameters.parse_mode = options.parse_mode
    }
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('editMessageCaption', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to edit animation, audio, document, photo, or video
   * messages. If a message is a part of a message album, then it can be
   * edited only to a photo or a video. Otherwise, message type can be
   * changed arbitrarily. When inline message is edited, new file can't be
   * uploaded. Use previously uploaded file via its file_id or specify a
   * URL. On success, if the edited message was sent by the bot, the edited
   * [[IMessage]] is returned, otherwise *True* is returned.
   *
   * @param message - Specify the message to operate on, with either a
   * [[MessageId]] pair or a [[Message]] object. For inline messages, pass
   * the `string` ID directly.
   * @param media - A new media content of the message
   * @param options - Optional parameters
   */
  public editMessageMedia (message: MessageId | string, media: IInputMedia, options?: {
    /**
     * A new [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    if (typeof message === 'string') {
      parameters.inline_message_id = message
    } else {
      parameters.chat_id = resolveChatId(message.chat)
      parameters.message_id = message.message_id
    }
    parameters.media = formatInputMedia({}, media, fdata)
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('editMessageMedia', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to edit only the reply markup of messages. On success,
   * if edited message is sent by the bot, the edited [[IMessage]] is
   * returned, otherwise *True* is returned.
   *
   * @param message - Specify the message to operate on, with either a
   * [[MessageId]] pair or a [[Message]] object. For inline messages, pass
   * the `string` ID directly.
   * @param options - Optional parameters
   */
  public editMessageReplyMarkup (message: MessageId | string, options?: {
    /**
     * An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    if (typeof message === 'string') {
      parameters.inline_message_id = message
    } else {
      parameters.chat_id = resolveChatId(message.chat)
      parameters.message_id = message.message_id
    }
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('editMessageReplyMarkup', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to stop a poll which was sent by the bot. On success,
   * the stopped [[IPoll]] with the final results is returned.
   *
   * @param message - Identifier of the original message with the poll
   * @param options - Optional parameters
   */
  public stopPoll (message: MessageId, options?: {
    /**
     * A new message [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<IPoll> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(message.chat)
    parameters.message_id = message.message_id
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('stopPoll', parameters)
  }

  /**
   * Use this method to delete a message, including service messages, with
   * the following limitations:  
   * - A message can only be deleted if it was sent less than 48 hours ago.  
   * - Bots can delete outgoing messages in private chats, groups, and
   * supergroups.  
   * - Bots can delete incoming messages in private chats.  
   * - Bots granted *can_post_messages* permissions can delete outgoing
   * messages in channels.  
   * - If the bot is an administrator of a group, it can delete any message
   * there.  
   * - If the bot has *can_delete_messages* permission in a supergroup or a
   * channel, it can delete any message there.  
   * Returns *True* on success.
   *
   * @param message - Identifier of the message to delete
   */
  public deleteMessage (message: MessageId): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(message.chat)
    parameters.message_id = message.message_id
    return this.callMethod('deleteMessage', parameters)
  }


  // Stickers
  // --------

  /**
   * Use this method to send static .WEBP or
   * [animated](https://telegram.org/blog/animated-stickers) .TGS stickers.
   * On success, the sent [[IMessage]] is returned.
   *
   * @param chat - Unique identifier for the target chat or username of the
   * target channel (in the format `@channelusername`)
   * @param sticker - Sticker to send. Pass a file_id as String to send a
   * file that exists on the Telegram servers (recommended), pass an HTTP
   * URL as a String for Telegram to get a .webp file from the Internet, or
   * upload a new one using multipart/form-data. 
   * @param options - Optional parameters
   */
  public sendSticker (chat: ChatId | string, sticker: InputFile, options?: {
    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.sticker = sticker
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    parameters.reply_to_message_id = (typeof options.reply_to_message === 'object') ? options.reply_to_message.message_id : options.reply_to_message
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('sendSticker', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to get a sticker set. On success, a [[IStickerSet]]
   * object is returned.
   *
   * @param name - Name of the sticker set
   */
  public getStickerSet (name: string): BluebirdPromise<StickerSet> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.name = name
    return this.callMethod('getStickerSet', parameters)
        .then((x: any) => new StickerSet(x, this))
  }

  /**
   * Use this method to upload a .png file with a sticker for later use in
   * *createNewStickerSet* and *addStickerToSet* methods (can be used
   * multiple times). Returns the uploaded [[IFile]] on success.
   *
   * @param user - User identifier of sticker file owner
   * @param png_sticker - **Png** image with the sticker, must be up to 512
   * kilobytes in size, dimensions must not exceed 512px, and either width
   * or height must be exactly 512px. 
   */
  public uploadStickerFile (user: UserId, png_sticker: InputFile): BluebirdPromise<File> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.user_id = resolveUserId(user)
    parameters.png_sticker = png_sticker
    return this.callMethod('uploadStickerFile', parameters)
        .then((x: any) => new File(x, this))
  }

  /**
   * Use this method to create new sticker set owned by a user. The bot
   * will be able to edit the created sticker set. Returns *True* on
   * success.
   *
   * @param user - User identifier of created sticker set owner
   * @param name - Short name of sticker set, to be used in
   * `t.me/addstickers/` URLs (e.g., *animals*). Can contain only english
   * letters, digits and underscores. Must begin with a letter, can't
   * contain consecutive underscores and must end in *“\_by\_<bot
   * username>”*. *<bot_username>* is case insensitive. 1-64 characters.
   * @param title - Sticker set title, 1-64 characters
   * @param options - Optional parameters
   */
  public createNewStickerSet (user: UserId, name: string, title: string, options: {
    /**
     * **Png** image with the sticker, must be up to 512 kilobytes in size,
     * dimensions must not exceed 512px, and either width or height must be
     * exactly 512px. Pass a *file_id* as a String to send a file that
     * already exists on the Telegram servers, pass an HTTP URL as a String
     * for Telegram to get a file from the Internet, or upload a new one
     * using multipart/form-data.
     */
    png_sticker: InputFile

    /** One or more emoji corresponding to the sticker */
    emojis: string

    /** Pass *True*, if a set of mask stickers should be created */
    contains_masks?: boolean

    /** Position where the mask should be placed on faces */
    mask_position?: IMaskPosition
  }): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.user_id = resolveUserId(user)
    parameters.name = name
    parameters.title = title
    parameters.png_sticker = options.png_sticker
    parameters.emojis = options.emojis
    if (typeof options.contains_masks !== 'undefined') {
      parameters.contains_masks = options.contains_masks
    }
    if (typeof options.mask_position !== 'undefined') {
      parameters.mask_position = options.mask_position
    }
    return this.callMethod('createNewStickerSet', parameters)
  }

  /**
   * Use this method to add a new sticker to a set created by the bot.
   * Returns *True* on success.
   *
   * @param user - User identifier of sticker set owner
   * @param name - Sticker set name
   * @param options - Optional parameters
   */
  public addStickerToSet (user: UserId, name: string, options: {
    /**
     * **Png** image with the sticker, must be up to 512 kilobytes in size,
     * dimensions must not exceed 512px, and either width or height must be
     * exactly 512px. Pass a *file_id* as a String to send a file that
     * already exists on the Telegram servers, pass an HTTP URL as a String
     * for Telegram to get a file from the Internet, or upload a new one
     * using multipart/form-data.
     */
    png_sticker: InputFile

    /** One or more emoji corresponding to the sticker */
    emojis: string

    /** Position where the mask should be placed on faces */
    mask_position?: IMaskPosition
  }): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.user_id = resolveUserId(user)
    parameters.name = name
    parameters.png_sticker = options.png_sticker
    parameters.emojis = options.emojis
    if (typeof options.mask_position !== 'undefined') {
      parameters.mask_position = options.mask_position
    }
    return this.callMethod('addStickerToSet', parameters)
  }

  /**
   * Use this method to move a sticker in a set created by the bot to a
   * specific position . Returns *True* on success.
   *
   * @param sticker - File identifier of the sticker
   * @param position - New sticker position in the set, zero-based
   */
  public setStickerPositionInSet (sticker: string, position: integer): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.sticker = sticker
    parameters.position = position
    return this.callMethod('setStickerPositionInSet', parameters)
  }

  /**
   * Use this method to delete a sticker from a set created by the bot.
   * Returns *True* on success.
   *
   * @param sticker - File identifier of the sticker
   */
  public deleteStickerFromSet (sticker: string): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.sticker = sticker
    return this.callMethod('deleteStickerFromSet', parameters)
  }


  // Inline mode
  // -----------

  /**
   * Use this method to send answers to an inline query. On success, *True*
   * is returned.  
   * No more than **50** results per query are allowed.
   *
   * @param inline_query_id - Unique identifier for the answered query
   * @param results - Array of results for the inline query
   * @param options - Optional parameters
   */
  public answerInlineQuery (inline_query_id: string, results: IInlineQueryResult[], options?: {
    /**
     * The maximum amount of time in seconds that the result of the inline
     * query may be cached on the server. Defaults to 300.
     */
    cache_time?: integer

    /**
     * Pass *True*, if results may be cached on the server side only for the
     * user that sent the query. By default, results may be returned to any
     * user who sends the same query
     */
    is_personal?: boolean

    /**
     * Pass the offset that a client should send in the next query with the
     * same text to receive more results. Pass an empty string if there are
     * no more results or if you don‘t support pagination. Offset length
     * can’t exceed 64 bytes.
     */
    next_offset?: string

    /**
     * If passed, clients will display a button with specified text that
     * switches the user to a private chat with the bot and sends the bot a
     * start message with the parameter *switch_pm_parameter*
     */
    switch_pm_text?: string

    /**
     * [Deep-linking](https://core.telegram.org/bots#deep-linking) parameter
     * for the /start message sent to the bot when user presses the switch
     * button. 1-64 characters, only `A-Z`, `a-z`, `0-9`, `_` and `-` are
     * allowed.  
     *   
     * *Example:* An inline bot that sends YouTube videos can ask the user to
     * connect the bot to their YouTube account to adapt search results
     * accordingly. To do this, it displays a ‘Connect your YouTube account’
     * button above the results, or even before showing any. The user presses
     * the button, switches to a private chat with the bot and, in doing so,
     * passes a start parameter that instructs the bot to return an oauth
     * link. Once done, the bot can offer a [[IInlineKeyboardMarkup]] button
     * so that the user can easily return to the chat where they wanted to
     * use the bot's inline capabilities.
     */
    switch_pm_parameter?: string
  }): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.inline_query_id = inline_query_id
    parameters.results = results
    if (typeof options.cache_time !== 'undefined') {
      parameters.cache_time = options.cache_time
    }
    if (typeof options.is_personal !== 'undefined') {
      parameters.is_personal = options.is_personal
    }
    if (typeof options.next_offset !== 'undefined') {
      parameters.next_offset = options.next_offset
    }
    if (typeof options.switch_pm_text !== 'undefined') {
      parameters.switch_pm_text = options.switch_pm_text
    }
    if (typeof options.switch_pm_parameter !== 'undefined') {
      parameters.switch_pm_parameter = options.switch_pm_parameter
    }
    return this.callMethod('answerInlineQuery', parameters)
  }


  // Payments
  // --------

  /**
   * Use this method to send invoices. On success, the sent [[IMessage]] is
   * returned.
   *
   * @param chat - Unique identifier for the target private chat
   * @param options - Optional parameters
   */
  public sendInvoice (chat: ChatId, options: {
    /** Product name, 1-32 characters */
    title: string

    /** Product description, 1-255 characters */
    description: string

    /**
     * Bot-defined invoice payload, 1-128 bytes. This will not be displayed
     * to the user, use for your internal processes.
     */
    payload: string

    /**
     * Payments provider token, obtained via
     * [Botfather](https://t.me/botfather)
     */
    provider_token: string

    /**
     * Unique deep-linking parameter that can be used to generate this
     * invoice when used as a start parameter
     */
    start_parameter: string

    /**
     * Three-letter ISO 4217 currency code, see [more on
     * currencies](https://core.telegram.org/bots/payments#supported-currencies)
     */
    currency: string

    /**
     * Price breakdown, a list of components (e.g. product price, tax,
     * discount, delivery cost, delivery tax, bonus, etc.)
     */
    prices: ILabeledPrice[]

    /**
     * JSON-encoded data about the invoice, which will be shared with the
     * payment provider. A detailed description of required fields should be
     * provided by the payment provider.
     */
    provider_data?: string

    /**
     * URL of the product photo for the invoice. Can be a photo of the goods
     * or a marketing image for a service. People like it better when they
     * see what they are paying for.
     */
    photo_url?: string

    /** Photo size */
    photo_size?: integer

    /** Photo width */
    photo_width?: integer

    /** Photo height */
    photo_height?: integer

    /** Pass *True*, if you require the user's full name to complete the order */
    need_name?: boolean

    /**
     * Pass *True*, if you require the user's phone number to complete the
     * order
     */
    need_phone_number?: boolean

    /**
     * Pass *True*, if you require the user's email address to complete the
     * order
     */
    need_email?: boolean

    /**
     * Pass *True*, if you require the user's shipping address to complete
     * the order
     */
    need_shipping_address?: boolean

    /** Pass *True*, if user's phone number should be sent to provider */
    send_phone_number_to_provider?: boolean

    /** Pass *True*, if user's email address should be sent to provider */
    send_email_to_provider?: boolean

    /** Pass *True*, if the final price depends on the shipping method */
    is_flexible?: boolean

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     * If empty, one 'Pay `total price`' button will be shown. If not empty,
     * the first button must be a Pay button.
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.chat_id = resolveChatId(chat)
    parameters.title = options.title
    parameters.description = options.description
    parameters.payload = options.payload
    parameters.provider_token = options.provider_token
    parameters.start_parameter = options.start_parameter
    parameters.currency = options.currency
    parameters.prices = options.prices
    if (typeof options.provider_data !== 'undefined') {
      parameters.provider_data = options.provider_data
    }
    if (typeof options.photo_url !== 'undefined') {
      parameters.photo_url = options.photo_url
    }
    if (typeof options.photo_size !== 'undefined') {
      parameters.photo_size = options.photo_size
    }
    if (typeof options.photo_width !== 'undefined') {
      parameters.photo_width = options.photo_width
    }
    if (typeof options.photo_height !== 'undefined') {
      parameters.photo_height = options.photo_height
    }
    if (typeof options.need_name !== 'undefined') {
      parameters.need_name = options.need_name
    }
    if (typeof options.need_phone_number !== 'undefined') {
      parameters.need_phone_number = options.need_phone_number
    }
    if (typeof options.need_email !== 'undefined') {
      parameters.need_email = options.need_email
    }
    if (typeof options.need_shipping_address !== 'undefined') {
      parameters.need_shipping_address = options.need_shipping_address
    }
    if (typeof options.send_phone_number_to_provider !== 'undefined') {
      parameters.send_phone_number_to_provider = options.send_phone_number_to_provider
    }
    if (typeof options.send_email_to_provider !== 'undefined') {
      parameters.send_email_to_provider = options.send_email_to_provider
    }
    if (typeof options.is_flexible !== 'undefined') {
      parameters.is_flexible = options.is_flexible
    }
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    parameters.reply_to_message_id = (typeof options.reply_to_message === 'object') ? options.reply_to_message.message_id : options.reply_to_message
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('sendInvoice', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * If you sent an invoice requesting a shipping address and the parameter
   * *is_flexible* was specified, the Bot API will send an [[IUpdate]] with
   * a *shipping_query* field to the bot. Use this method to reply to
   * shipping queries. On success, True is returned.
   *
   * @param shipping_query_id - Unique identifier for the query to be
   * answered
   * @param ok - Specify True if delivery to the specified address is
   * possible and False if there are any problems (for example, if delivery
   * to the specified address is not possible)
   * @param options - Optional parameters
   */
  public answerShippingQuery (shipping_query_id: string, ok: boolean, options?: {
    /** Required if *ok* is True. Array of available shipping options. */
    shipping_options?: IShippingOption[]

    /**
     * Required if *ok* is False. Error message in human readable form that
     * explains why it is impossible to complete the order (e.g. "Sorry,
     * delivery to your desired address is unavailable'). Telegram will
     * display this message to the user.
     */
    error_message?: string
  }): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.shipping_query_id = shipping_query_id
    parameters.ok = ok
    if (typeof options.shipping_options !== 'undefined') {
      parameters.shipping_options = options.shipping_options
    }
    if (typeof options.error_message !== 'undefined') {
      parameters.error_message = options.error_message
    }
    return this.callMethod('answerShippingQuery', parameters)
  }

  /**
   * Once the user has confirmed their payment and shipping details, the
   * Bot API sends the final confirmation in the form of an [[IUpdate]]
   * with the field *pre_checkout_query*. Use this method to respond to
   * such pre-checkout queries. On success, True is returned. **Note:** The
   * Bot API must receive an answer within 10 seconds after the
   * pre-checkout query was sent.
   *
   * @param pre_checkout_query_id - Unique identifier for the query to be
   * answered
   * @param ok - Specify *True* if everything is alright (goods are
   * available, etc.) and the bot is ready to proceed with the order. Use
   * *False* if there are any problems.
   * @param options - Optional parameters
   */
  public answerPreCheckoutQuery (pre_checkout_query_id: string, ok: boolean, options?: {
    /**
     * Required if *ok* is *False*. Error message in human readable form that
     * explains the reason for failure to proceed with the checkout (e.g.
     * "Sorry, somebody just bought the last of our amazing black T-shirts
     * while you were busy filling out your payment details. Please choose a
     * different color or garment!"). Telegram will display this message to
     * the user.
     */
    error_message?: string
  }): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.pre_checkout_query_id = pre_checkout_query_id
    parameters.ok = ok
    if (typeof options.error_message !== 'undefined') {
      parameters.error_message = options.error_message
    }
    return this.callMethod('answerPreCheckoutQuery', parameters)
  }


  // Telegram Passport
  // -----------------

  /**
   * Informs a user that some of the Telegram Passport elements they
   * provided contains errors. The user will not be able to re-submit their
   * Passport to you until the errors are fixed (the contents of the field
   * for which you returned the error must change). Returns *True* on
   * success.
   *
   * Use this if the data submitted by the user doesn't satisfy the
   * standards your service requires for any reason. For example, if a
   * birthday date seems invalid, a submitted document is blurry, a scan
   * shows evidence of tampering, etc. Supply some details in the error
   * message to make sure the user knows how to correct the issues.
   *
   * @param user - User identifier
   * @param errors - Array describing the errors
   */
  public setPassportDataErrors (user: UserId, errors: IPassportElementError[]): BluebirdPromise<true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    parameters.user_id = resolveUserId(user)
    parameters.errors = errors
    return this.callMethod('setPassportDataErrors', parameters)
  }


  // Games
  // -----

  /**
   * Use this method to send a game. On success, the sent [[IMessage]] is
   * returned.
   *
   * @param chat - Unique identifier for the target chat
   * @param game_short_name - Short name of the game, serves as the unique
   * identifier for the game. Set up your games via
   * [Botfather](https://t.me/botfather).
   * @param options - Optional parameters
   */
  public sendGame (chat: ChatId, game_short_name: string, options?: {
    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     * If empty, one ‘Play game_title’ button will be shown. If not empty,
     * the first button must launch the game.
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    parameters.chat_id = resolveChatId(chat)
    parameters.game_short_name = game_short_name
    if (typeof options.disable_notification !== 'undefined') {
      parameters.disable_notification = options.disable_notification
    }
    parameters.reply_to_message_id = (typeof options.reply_to_message === 'object') ? options.reply_to_message.message_id : options.reply_to_message
    if (typeof options.reply_markup !== 'undefined') {
      parameters.reply_markup = options.reply_markup
    }
    return this.callMethod('sendGame', parameters)
        .then((x: any) => new Message(x, this))
  }

  /**
   * Use this method to set the score of the specified user in a game. On
   * success, if the message was sent by the bot, returns the edited
   * [[IMessage]], otherwise returns *True*. Returns an error, if the new
   * score is not greater than the user's current score in the chat and
   * *force* is *False*.
   *
   * @param message - Specify the message to operate on, with either a
   * [[MessageId]] pair or a [[Message]] object. For inline messages, pass
   * the `string` ID directly.  
   * **Note:** This parameter doesn't accept a `string` value for the chat
   * ID of the message.
   * @param user - User identifier
   * @param score - New score, must be non-negative
   * @param options - Optional parameters
   */
  public setGameScore (message: MessageId | string, user: UserId, score: integer, options?: {
    /**
     * Pass True, if the high score is allowed to decrease. This can be
     * useful when fixing mistakes or banning cheaters
     */
    force?: boolean

    /**
     * Pass True, if the game message should not be automatically edited to
     * include the current scoreboard
     */
    disable_edit_message?: boolean
  }): BluebirdPromise<Message | true> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    options = options || {}
    if (typeof message === 'string') {
      parameters.inline_message_id = message
    } else {
      if (typeof message.chat === 'string') {
        throw new ValidationError('setGameScore.message.chat can\'t be specified as a username string')
      }
      parameters.chat_id = resolveChatId(message.chat)
      parameters.message_id = message.message_id
    }
    parameters.user_id = resolveUserId(user)
    parameters.score = score
    if (typeof options.force !== 'undefined') {
      parameters.force = options.force
    }
    if (typeof options.disable_edit_message !== 'undefined') {
      parameters.disable_edit_message = options.disable_edit_message
    }
    return this.callMethod('setGameScore', parameters)
        .then((x: any) => typeof x === 'object' ? new Message(x, this) : x)
  }

  /**
   * Use this method to get data for high score tables. Will return the
   * score of the specified user and several of his neighbors in a game. On
   * success, returns an *Array* of [[IGameHighScore]] objects.
   *
   * > This method will currently return scores for the target user, plus two
   * > of his closest neighbors on each side. Will also return the top three
   * > users if the user and his neighbors are not among them. Please note
   * > that this behavior is subject to change.
   *
   * @param message - Specify the message to operate on, with either a
   * [[MessageId]] pair or a [[Message]] object. For inline messages, pass
   * the `string` ID directly.  
   * **Note:** This parameter doesn't accept a `string` value for the chat
   * ID of the message.
   * @param user - Target user id
   */
  public getGameHighScores (message: MessageId | string, user: UserId): BluebirdPromise<GameHighScore[]> {
    const parameters: any = {}
    const fdata: FormatData = { parameters, fileId: 0 }
    if (typeof message === 'string') {
      parameters.inline_message_id = message
    } else {
      if (typeof message.chat === 'string') {
        throw new ValidationError('getGameHighScores.message.chat can\'t be specified as a username string')
      }
      parameters.chat_id = resolveChatId(message.chat)
      parameters.message_id = message.message_id
    }
    parameters.user_id = resolveUserId(user)
    return this.callMethod('getGameHighScores', parameters)
        .then((x: any) => x.map((x: any) => new GameHighScore(x, this)))
  }

}

/**
 * Convenience class that reexposes API operations from [[Client]] that
 * operate on a specified Telegram **message**.
 */
export class MessageContext extends Context {

  /** Unique message identifier inside this chat */
  message_id: integer

  /**
   * Identifier of the chat this message was sent on, or username of the
   * target channel (in the format `@channelusername`)
   */
  chat: ChatId | string

  /**
   * Constructs a new context object
   *
   * @param client - API client to use for requests
   * @param id - Identifier of a Telegram message, which can be specified
   * with either a [[MessageId]] pair or a [[Message]] object
   */
  constructor (client: ClientBase, id: MessageId) {
    super(client)
    this.message_id = id.message_id
    this.chat = resolveChatId(id.chat)
  }

  /**
   * Use this method to edit live location messages. A location can be
   * edited until its *live_period* expires or editing is explicitly
   * disabled by a call to [[stopMessageLiveLocation]]. On success, if the
   * edited message was sent by the bot, the edited [[IMessage]] is
   * returned, otherwise *True* is returned.
   *
   * This is equivalent to calling [[Client.editMessageLiveLocation]].
   *
   * @param latitude - Latitude of new location
   * @param longitude - Longitude of new location
   * @param options - Optional parameters
   */
  public editLiveLocation (latitude: number, longitude: number, options?: {
    /**
     * A new [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().editMessageLiveLocation(this, latitude, longitude, options)
  }

  /**
   * Use this method to stop updating a live location message before
   * *live_period* expires. On success, if the message was sent by the bot,
   * the sent [[IMessage]] is returned, otherwise *True* is returned.
   *
   * This is equivalent to calling [[Client.stopMessageLiveLocation]].
   *
   * @param options - Optional parameters
   */
  public stopLiveLocation (options?: {
    /**
     * A new [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().stopMessageLiveLocation(this, options)
  }

  /**
   * Use this method to pin a message in a group, a supergroup, or a
   * channel. The bot must be an administrator in the chat for this to work
   * and must have the ‘can_pin_messages’ admin right in the supergroup or
   * ‘can_edit_messages’ admin right in the channel. Returns *True* on
   * success.
   *
   * This is equivalent to calling [[Client.pinChatMessage]].
   *
   * @param options - Optional parameters
   */
  public pin (options?: {
    /**
     * Pass *True*, if it is not necessary to send a notification to all chat
     * members about the new pinned message. Notifications are always
     * disabled in channels.
     */
    disable_notification?: boolean
  }): BluebirdPromise<true> {
    return this.__getClient().pinChatMessage(this, options)
  }

  /**
   * Use this method to edit text and
   * [game](https://core.telegram.org/bots/api#games) messages. On success,
   * if edited message is sent by the bot, the edited [[IMessage]] is
   * returned, otherwise *True* is returned.
   *
   * This is equivalent to calling [[Client.editMessageText]].
   *
   * @param text - New text of the message
   * @param options - Optional parameters
   */
  public editText (text: string, options?: {
    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in your
     * bot's message.
     */
    parse_mode?: ParseMode

    /** Disables link previews for links in this message */
    disable_web_page_preview?: boolean

    /**
     * An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().editMessageText(this, text, options)
  }

  /**
   * Use this method to edit captions of messages. On success, if edited
   * message is sent by the bot, the edited [[IMessage]] is returned,
   * otherwise *True* is returned.
   *
   * This is equivalent to calling [[Client.editMessageCaption]].
   *
   * @param options - Optional parameters
   */
  public editCaption (options?: {
    /** New caption of the message */
    caption?: string

    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in the
     * media caption.
     */
    parse_mode?: ParseMode

    /**
     * An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().editMessageCaption(this, options)
  }

  /**
   * Use this method to edit animation, audio, document, photo, or video
   * messages. If a message is a part of a message album, then it can be
   * edited only to a photo or a video. Otherwise, message type can be
   * changed arbitrarily. When inline message is edited, new file can't be
   * uploaded. Use previously uploaded file via its file_id or specify a
   * URL. On success, if the edited message was sent by the bot, the edited
   * [[IMessage]] is returned, otherwise *True* is returned.
   *
   * This is equivalent to calling [[Client.editMessageMedia]].
   *
   * @param media - A new media content of the message
   * @param options - Optional parameters
   */
  public editMedia (media: IInputMedia, options?: {
    /**
     * A new [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().editMessageMedia(this, media, options)
  }

  /**
   * Use this method to edit only the reply markup of messages. On success,
   * if edited message is sent by the bot, the edited [[IMessage]] is
   * returned, otherwise *True* is returned.
   *
   * This is equivalent to calling [[Client.editMessageReplyMarkup]].
   *
   * @param options - Optional parameters
   */
  public editReplyMarkup (options?: {
    /**
     * An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().editMessageReplyMarkup(this, options)
  }

  /**
   * Use this method to stop a poll which was sent by the bot. On success,
   * the stopped [[IPoll]] with the final results is returned.
   *
   * This is equivalent to calling [[Client.stopPoll]].
   *
   * @param options - Optional parameters
   */
  public stopPoll (options?: {
    /**
     * A new message [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<IPoll> {
    return this.__getClient().stopPoll(this, options)
  }

  /**
   * Use this method to delete a message, including service messages, with
   * the following limitations:  
   * - A message can only be deleted if it was sent less than 48 hours ago.  
   * - Bots can delete outgoing messages in private chats, groups, and
   * supergroups.  
   * - Bots can delete incoming messages in private chats.  
   * - Bots granted *can_post_messages* permissions can delete outgoing
   * messages in channels.  
   * - If the bot is an administrator of a group, it can delete any message
   * there.  
   * - If the bot has *can_delete_messages* permission in a supergroup or a
   * channel, it can delete any message there.  
   * Returns *True* on success.
   *
   * This is equivalent to calling [[Client.deleteMessage]].
   */
  public delete (): BluebirdPromise<true> {
    return this.__getClient().deleteMessage(this)
  }

  /**
   * Use this method to set the score of the specified user in a game. On
   * success, if the message was sent by the bot, returns the edited
   * [[IMessage]], otherwise returns *True*. Returns an error, if the new
   * score is not greater than the user's current score in the chat and
   * *force* is *False*.
   *
   * This is equivalent to calling [[Client.setGameScore]].
   *
   * @param user - User identifier
   * @param score - New score, must be non-negative
   * @param options - Optional parameters
   */
  public setGameScore (user: UserId, score: integer, options?: {
    /**
     * Pass True, if the high score is allowed to decrease. This can be
     * useful when fixing mistakes or banning cheaters
     */
    force?: boolean

    /**
     * Pass True, if the game message should not be automatically edited to
     * include the current scoreboard
     */
    disable_edit_message?: boolean
  }): BluebirdPromise<Message | true> {
    return this.__getClient().setGameScore(this, user, score, options)
  }

  /**
   * Use this method to get data for high score tables. Will return the
   * score of the specified user and several of his neighbors in a game. On
   * success, returns an *Array* of [[IGameHighScore]] objects.
   *
   * > This method will currently return scores for the target user, plus two
   * > of his closest neighbors on each side. Will also return the top three
   * > users if the user and his neighbors are not among them. Please note
   * > that this behavior is subject to change.
   *
   * This is equivalent to calling [[Client.getGameHighScores]].
   *
   * @param user - Target user id
   */
  public getGameHighScores (user: UserId): BluebirdPromise<GameHighScore[]> {
    return this.__getClient().getGameHighScores(this, user)
  }

}

/**
 * Convenience class that reexposes API operations from [[Client]] that
 * operate on a specified Telegram **file**.
 */
export class FileContext extends Context {

  /**
   * Identifier for this file, which can be used to download or reuse the
   * file
   */
  file_id: string

  /**
   * Constructs a new context object
   *
   * @param client - API client to use for requests
   * @param id - Identifier of a binary file in Telegram servers, which can
   * be specified with either a [[File]] object (or any object with a
   * `file_id`) or its textual ID directly (`string`).
   */
  constructor (client: ClientBase, id: FileId) {
    super(client)
    this.file_id = resolveFileId(id)
  }

  /**
   * Use this method to get a (new) [[File]] object for the passed file
   * identifier.
   *
   * This [[File]] object always contains a `file_path` attribute, but may
   * not preserve the original file name and MIME type. You should save the
   * file's MIME type and name if received.
   *
   * It's not necessary to use this method to download files, see
   * [[streamFile]] and [[loadFile]].
   *
   * **Note:** This function may not preserve the original file name and
   * MIME type. You should save the file's MIME type and name (if
   * available) when the File object is received.
   *
   * This is equivalent to calling [[Client.getFile]].
   */
  public get (): BluebirdPromise<File> {
    return this.__getClient().getFile(this)
  }

  /**
   * This method starts downloading a file from Telegram servers. If the
   * passed `file` doesn't contain the `file_path` attribute, [[getFile]]
   * will be called first to obtain it.
   *
   * **Note:** For the moment, bots can download files of up to 20MB in
   * size.
   *
   * **Note:** Telegram only guarantees that download links will be valid
   * for 1 hour. If the passed `file` was received a long time ago, the
   * download may fail. You can first call [[getFile]] manually to get a
   * fresh one.
   *
   * This is equivalent to calling [[Client.streamFile]].
   *
   * @returns Promise that resolves with the HTTP response (readable
   * stream). If you want the full body, see [[loadFile]].
   */
  public stream (): BluebirdPromise<IncomingMessage> {
    return this.__getClient().streamFile(this)
  }

  /**
   * Convenience method that calls [[streamFile]], collects the file
   * contents into memory and returns them. This is discouraged for big
   * files.
   *
   * This is equivalent to calling [[Client.loadFile]].
   *
   * @returns Promise that resolves with the binary contents of the file.
   */
  public load (): BluebirdPromise<Buffer> {
    return this.__getClient().loadFile(this)
  }

}

/**
 * Convenience class that reexposes API operations from [[Client]] that
 * operate on a specified Telegram **chat**.
 */
export class ChatContext extends Context {

  /**
   * Unique identifier for this chat. This number may be greater than 32
   * bits and some programming languages may have difficulty/silent defects
   * in interpreting it. But it is smaller than 52 bits, so a signed 64 bit
   * integer or double-precision float type are safe for storing this
   * identifier.
   */
  id: integer

  /**
   * Constructs a new context object
   *
   * @param client - API client to use for requests
   * @param id - Identifier of a Telegram chat, which can be specified with
   * either a [[Chat]] object, a [[User]] object or its numeric ID.
   */
  constructor (client: ClientBase, id: ChatId) {
    super(client)
    this.id = resolveChatId(id)
  }

  /**
   * Use this method to send text messages. On success, the sent
   * [[IMessage]] is returned.
   *
   * This is equivalent to calling [[Client.sendText]].
   *
   * @param text - Text of the message to be sent
   * @param options - Optional parameters
   */
  public sendText (text: string, options?: {
    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in your
     * bot's message.
     */
    parse_mode?: ParseMode

    /** Disables link previews for links in this message */
    disable_web_page_preview?: boolean

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().sendText(this.id, text, options)
  }

  /**
   * Use this method to forward messages of any kind. On success, the sent
   * [[IMessage]] is returned.
   *
   * This is equivalent to calling [[Client.forwardMessage]].
   *
   * @param message - Specify the original message, with either a
   * [[MessageId]] pair or a [[Message]] object
   * @param options - Optional parameters
   */
  public forwardMessage (message: MessageId, options?: {
    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean
  }): BluebirdPromise<Message> {
    return this.__getClient().forwardMessage(this.id, message, options)
  }

  /**
   * Use this method to send photos. On success, the sent [[IMessage]] is
   * returned.
   *
   * This is equivalent to calling [[Client.sendPhoto]].
   *
   * @param photo - Photo to send. Pass a file_id as String to send a photo
   * that exists on the Telegram servers (recommended), pass an HTTP URL as
   * a String for Telegram to get a photo from the Internet, or upload a
   * new photo using multipart/form-data. 
   * @param options - Optional parameters
   */
  public sendPhoto (photo: InputFile, options?: {
    /**
     * Photo caption (may also be used when resending photos by *file_id*),
     * 0-1024 characters
     */
    caption?: string

    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in the
     * media caption.
     */
    parse_mode?: ParseMode

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().sendPhoto(this.id, photo, options)
  }

  /**
   * Use this method to send audio files, if you want Telegram clients to
   * display them in the music player. Your audio must be in the .MP3 or
   * .M4A format. On success, the sent [[IMessage]] is returned. Bots can
   * currently send audio files of up to 50 MB in size, this limit may be
   * changed in the future.
   *
   * For sending voice messages, use the [[sendVoice]] method instead.
   *
   * This is equivalent to calling [[Client.sendAudio]].
   *
   * @param audio - Audio file to send. Pass a file_id as String to send an
   * audio file that exists on the Telegram servers (recommended), pass an
   * HTTP URL as a String for Telegram to get an audio file from the
   * Internet, or upload a new one using multipart/form-data. 
   * @param options - Optional parameters
   */
  public sendAudio (audio: InputFile, options?: {
    /** Audio caption, 0-1024 characters */
    caption?: string

    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in the
     * media caption.
     */
    parse_mode?: ParseMode

    /** Duration of the audio in seconds */
    duration?: integer

    /** Performer */
    performer?: string

    /** Track name */
    title?: string

    /**
     * Thumbnail of the file sent; can be ignored if thumbnail generation for
     * the file is supported server-side. The thumbnail should be in JPEG
     * format and less than 200 kB in size. A thumbnail‘s width and height
     * should not exceed 320. Ignored if the file is not uploaded using
     * multipart/form-data. Thumbnails can’t be reused and can be only
     * uploaded as a new file, so you can pass “attach://<file_attach_name>”
     * if the thumbnail was uploaded using multipart/form-data under
     * <file_attach_name>.
     */
    thumb?: InputFile

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().sendAudio(this.id, audio, options)
  }

  /**
   * Use this method to send general files. On success, the sent
   * [[IMessage]] is returned. Bots can currently send files of any type of
   * up to 50 MB in size, this limit may be changed in the future.
   *
   * This is equivalent to calling [[Client.sendDocument]].
   *
   * @param document - File to send. Pass a file_id as String to send a
   * file that exists on the Telegram servers (recommended), pass an HTTP
   * URL as a String for Telegram to get a file from the Internet, or
   * upload a new one using multipart/form-data. 
   * @param options - Optional parameters
   */
  public sendDocument (document: InputFile, options?: {
    /**
     * Thumbnail of the file sent; can be ignored if thumbnail generation for
     * the file is supported server-side. The thumbnail should be in JPEG
     * format and less than 200 kB in size. A thumbnail‘s width and height
     * should not exceed 320. Ignored if the file is not uploaded using
     * multipart/form-data. Thumbnails can’t be reused and can be only
     * uploaded as a new file, so you can pass “attach://<file_attach_name>”
     * if the thumbnail was uploaded using multipart/form-data under
     * <file_attach_name>.
     */
    thumb?: InputFile

    /**
     * Document caption (may also be used when resending documents by
     * *file_id*), 0-1024 characters
     */
    caption?: string

    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in the
     * media caption.
     */
    parse_mode?: ParseMode

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().sendDocument(this.id, document, options)
  }

  /**
   * Use this method to send video files, Telegram clients support mp4
   * videos (other formats may be sent as [[IDocument]]). On success, the
   * sent [[IMessage]] is returned. Bots can currently send video files of
   * up to 50 MB in size, this limit may be changed in the future.
   *
   * This is equivalent to calling [[Client.sendVideo]].
   *
   * @param video - Video to send. Pass a file_id as String to send a video
   * that exists on the Telegram servers (recommended), pass an HTTP URL as
   * a String for Telegram to get a video from the Internet, or upload a
   * new video using multipart/form-data. 
   * @param options - Optional parameters
   */
  public sendVideo (video: InputFile, options?: {
    /** Duration of sent video in seconds */
    duration?: integer

    /** Video width */
    width?: integer

    /** Video height */
    height?: integer

    /**
     * Thumbnail of the file sent; can be ignored if thumbnail generation for
     * the file is supported server-side. The thumbnail should be in JPEG
     * format and less than 200 kB in size. A thumbnail‘s width and height
     * should not exceed 320. Ignored if the file is not uploaded using
     * multipart/form-data. Thumbnails can’t be reused and can be only
     * uploaded as a new file, so you can pass “attach://<file_attach_name>”
     * if the thumbnail was uploaded using multipart/form-data under
     * <file_attach_name>.
     */
    thumb?: InputFile

    /**
     * Video caption (may also be used when resending videos by *file_id*),
     * 0-1024 characters
     */
    caption?: string

    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in the
     * media caption.
     */
    parse_mode?: ParseMode

    /** Pass *True*, if the uploaded video is suitable for streaming */
    supports_streaming?: boolean

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().sendVideo(this.id, video, options)
  }

  /**
   * Use this method to send animation files (GIF or H.264/MPEG-4 AVC video
   * without sound). On success, the sent [[IMessage]] is returned. Bots
   * can currently send animation files of up to 50 MB in size, this limit
   * may be changed in the future.
   *
   * This is equivalent to calling [[Client.sendAnimation]].
   *
   * @param animation - Animation to send. Pass a file_id as String to send
   * an animation that exists on the Telegram servers (recommended), pass
   * an HTTP URL as a String for Telegram to get an animation from the
   * Internet, or upload a new animation using multipart/form-data. 
   * @param options - Optional parameters
   */
  public sendAnimation (animation: InputFile, options?: {
    /** Duration of sent animation in seconds */
    duration?: integer

    /** Animation width */
    width?: integer

    /** Animation height */
    height?: integer

    /**
     * Thumbnail of the file sent; can be ignored if thumbnail generation for
     * the file is supported server-side. The thumbnail should be in JPEG
     * format and less than 200 kB in size. A thumbnail‘s width and height
     * should not exceed 320. Ignored if the file is not uploaded using
     * multipart/form-data. Thumbnails can’t be reused and can be only
     * uploaded as a new file, so you can pass “attach://<file_attach_name>”
     * if the thumbnail was uploaded using multipart/form-data under
     * <file_attach_name>.
     */
    thumb?: InputFile

    /**
     * Animation caption (may also be used when resending animation by
     * *file_id*), 0-1024 characters
     */
    caption?: string

    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in the
     * media caption.
     */
    parse_mode?: ParseMode

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().sendAnimation(this.id, animation, options)
  }

  /**
   * Use this method to send audio files, if you want Telegram clients to
   * display the file as a playable voice message. For this to work, your
   * audio must be in an .ogg file encoded with OPUS (other formats may be
   * sent as [[IAudio]] or [[IDocument]]). On success, the sent
   * [[IMessage]] is returned. Bots can currently send voice messages of up
   * to 50 MB in size, this limit may be changed in the future.
   *
   * This is equivalent to calling [[Client.sendVoice]].
   *
   * @param voice - Audio file to send. Pass a file_id as String to send a
   * file that exists on the Telegram servers (recommended), pass an HTTP
   * URL as a String for Telegram to get a file from the Internet, or
   * upload a new one using multipart/form-data. 
   * @param options - Optional parameters
   */
  public sendVoice (voice: InputFile, options?: {
    /** Voice message caption, 0-1024 characters */
    caption?: string

    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in the
     * media caption.
     */
    parse_mode?: ParseMode

    /** Duration of the voice message in seconds */
    duration?: integer

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().sendVoice(this.id, voice, options)
  }

  /**
   * As of [v.4.0](https://telegram.org/blog/video-messages-and-telescope),
   * Telegram clients support rounded square mp4 videos of up to 1 minute
   * long. Use this method to send video messages. On success, the sent
   * [[IMessage]] is returned.
   *
   * This is equivalent to calling [[Client.sendVideoNote]].
   *
   * @param video_note - Video note to send. Pass a file_id as String to
   * send a video note that exists on the Telegram servers (recommended) or
   * upload a new video using multipart/form-data. . Sending video notes by
   * a URL is currently unsupported
   * @param options - Optional parameters
   */
  public sendVideoNote (video_note: InputFile, options?: {
    /** Duration of sent video in seconds */
    duration?: integer

    /** Video width and height, i.e. diameter of the video message */
    length?: integer

    /**
     * Thumbnail of the file sent; can be ignored if thumbnail generation for
     * the file is supported server-side. The thumbnail should be in JPEG
     * format and less than 200 kB in size. A thumbnail‘s width and height
     * should not exceed 320. Ignored if the file is not uploaded using
     * multipart/form-data. Thumbnails can’t be reused and can be only
     * uploaded as a new file, so you can pass “attach://<file_attach_name>”
     * if the thumbnail was uploaded using multipart/form-data under
     * <file_attach_name>.
     */
    thumb?: InputFile

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().sendVideoNote(this.id, video_note, options)
  }

  /**
   * Use this method to send a group of photos or videos as an album. On
   * success, an array of the sent [[IMessage]] is returned.
   *
   * This is equivalent to calling [[Client.sendMediaGroup]].
   *
   * @param media - Array describing photos and videos to be sent, must
   * include 2–10 items
   * @param options - Optional parameters
   */
  public sendMediaGroup (media: (IInputMediaPhoto | IInputMediaVideo)[], options?: {
    /**
     * Sends the messages
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the messages are a reply, ID of the original message */
    reply_to_message?: MessageId | integer
  }): BluebirdPromise<Message[]> {
    return this.__getClient().sendMediaGroup(this.id, media, options)
  }

  /**
   * Use this method to send point on the map. On success, the sent
   * [[IMessage]] is returned.
   *
   * This is equivalent to calling [[Client.sendLocation]].
   *
   * @param latitude - Latitude of the location
   * @param longitude - Longitude of the location
   * @param options - Optional parameters
   */
  public sendLocation (latitude: number, longitude: number, options?: {
    /**
     * Period in seconds for which the location will be updated (see [Live
     * Locations](https://telegram.org/blog/live-locations), should be
     * between 60 and 86400.
     */
    live_period?: integer

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().sendLocation(this.id, latitude, longitude, options)
  }

  /**
   * Use this method to send information about a venue. On success, the
   * sent [[IMessage]] is returned.
   *
   * This is equivalent to calling [[Client.sendVenue]].
   *
   * @param latitude - Latitude of the venue
   * @param longitude - Longitude of the venue
   * @param options - Optional parameters
   */
  public sendVenue (latitude: number, longitude: number, options: {
    /** Name of the venue */
    title: string

    /** Address of the venue */
    address: string

    /** Foursquare identifier of the venue */
    foursquare_id?: string

    /**
     * Foursquare type of the venue, if known. (For example,
     * “arts_entertainment/default”, “arts_entertainment/aquarium” or
     * “food/icecream”.)
     */
    foursquare_type?: string

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().sendVenue(this.id, latitude, longitude, options)
  }

  /**
   * Use this method to send phone contacts. On success, the sent
   * [[IMessage]] is returned.
   *
   * This is equivalent to calling [[Client.sendContact]].
   *
   * @param options - Optional parameters
   */
  public sendContact (options: {
    /** Contact's phone number */
    phone_number: string

    /** Contact's first name */
    first_name: string

    /** Contact's last name */
    last_name?: string

    /**
     * Additional data about the contact in the form of a
     * [vCard](https://en.wikipedia.org/wiki/VCard), 0-2048 bytes
     */
    vcard?: string

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove keyboard or to force a reply from the user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().sendContact(this.id, options)
  }

  /**
   * Use this method to send a native poll. On success, the sent
   * [[IMessage]] is returned.
   *
   * This is equivalent to calling [[Client.sendPoll]].
   *
   * @param question - Poll question, 1-255 characters
   * @param pollOptions - List of answer options, 2-10 strings 1-100
   * characters each
   * @param options - Optional parameters
   */
  public sendPoll (question: string, pollOptions: string[], options?: {
    /** True, if the poll needs to be anonymous, defaults to *True* */
    is_anonymous?: boolean

    /** Poll type, “quiz” or “regular”, defaults to “regular” */
    type?: PollType

    /**
     * True, if the poll allows multiple answers, ignored for polls in quiz
     * mode, defaults to *False*
     */
    allows_multiple_answers?: boolean

    /**
     * 0-based identifier of the correct answer option, required for polls in
     * quiz mode
     */
    correct_option_id?: integer

    /** Pass *True*, if the poll needs to be immediately closed */
    is_closed?: boolean

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().sendPoll(this.id, question, pollOptions, options)
  }

  /**
   * Use this method when you need to tell the user that something is
   * happening on the bot's side. The status is set for 5 seconds or less
   * (when a message arrives from your bot, Telegram clients clear its
   * typing status). Returns *True* on success.
   *
   * > Example: The [ImageBot](https://t.me/imagebot) needs some time to
   * > process a request and upload the image. Instead of sending a text
   * > message along the lines of “Retrieving image, please wait…”, the bot
   * > may use [[sendChatAction]] with *action* = *upload_photo*. The user
   * > will see a “sending photo” status for the bot.
   *
   * We only recommend using this method when a response from the bot will
   * take a **noticeable** amount of time to arrive.
   *
   * This is equivalent to calling [[Client.sendChatAction]].
   *
   * @param action - Type of action to broadcast. Choose one, depending on
   * what the user is about to receive: *typing* for [[sendText]],
   * *upload_photo* for [[sendPhoto]], *record_video* or *upload_video* for
   * [[sendVideo]], *record_audio* or *upload_audio* for [[sendAudio]],
   * *upload_document* for [[sendDocument]], *find_location* for
   * [[sendLocation]], *record_video_note* or *upload_video_note* for
   * [[sendVideoNote]].
   */
  public sendAction (action: ChatAction): BluebirdPromise<true> {
    return this.__getClient().sendChatAction(this.id, action)
  }

  /**
   * Use this method to kick a user from a group, a supergroup or a
   * channel. In the case of supergroups and channels, the user will not be
   * able to return to the group on their own using invite links, etc.,
   * unless [[unbanChatMember]] first. The bot must be an administrator in
   * the chat for this to work and must have the appropriate admin rights.
   * Returns *True* on success.
   *
   * This is equivalent to calling [[Client.kickChatMember]].
   *
   * @param user - Unique identifier of the target user
   * @param options - Optional parameters
   */
  public kickMember (user: UserId, options?: {
    /**
     * Date when the user will be unbanned, unix time. If user is banned for
     * more than 366 days or less than 30 seconds from the current time they
     * are considered to be banned forever
     */
    until_date?: Date
  }): BluebirdPromise<true> {
    return this.__getClient().kickChatMember(this.id, user, options)
  }

  /**
   * Use this method to unban a previously kicked user in a supergroup or
   * channel. The user will **not** return to the group or channel
   * automatically, but will be able to join via link, etc. The bot must be
   * an administrator for this to work. Returns *True* on success.
   *
   * This is equivalent to calling [[Client.unbanChatMember]].
   *
   * @param user - Unique identifier of the target user
   */
  public unbanMember (user: UserId): BluebirdPromise<true> {
    return this.__getClient().unbanChatMember(this.id, user)
  }

  /**
   * Use this method to restrict a user in a supergroup. The bot must be an
   * administrator in the supergroup for this to work and must have the
   * appropriate admin rights. Pass *True* for all permissions to lift
   * restrictions from a user. Returns *True* on success.
   *
   * This is equivalent to calling [[Client.restrictChatMember]].
   *
   * @param user - Unique identifier of the target user
   * @param permissions - New user permissions
   * @param options - Optional parameters
   */
  public restrictMember (user: UserId, permissions: IChatPermissions, options?: {
    /**
     * Date when restrictions will be lifted for the user, unix time. If user
     * is restricted for more than 366 days or less than 30 seconds from the
     * current time, they are considered to be restricted forever
     */
    until_date?: Date
  }): BluebirdPromise<true> {
    return this.__getClient().restrictChatMember(this.id, user, permissions, options)
  }

  /**
   * Use this method to promote or demote a user in a supergroup or a
   * channel. The bot must be an administrator in the chat for this to work
   * and must have the appropriate admin rights. Pass *False* for all
   * boolean parameters to demote a user. Returns *True* on success.
   *
   * This is equivalent to calling [[Client.promoteChatMember]].
   *
   * @param user - Unique identifier of the target user
   * @param options - Optional parameters
   */
  public promoteMember (user: UserId, options?: {
    /**
     * Pass True, if the administrator can change chat title, photo and other
     * settings
     */
    can_change_info?: boolean

    /**
     * Pass True, if the administrator can create channel posts, channels
     * only
     */
    can_post_messages?: boolean

    /**
     * Pass True, if the administrator can edit messages of other users and
     * can pin messages, channels only
     */
    can_edit_messages?: boolean

    /** Pass True, if the administrator can delete messages of other users */
    can_delete_messages?: boolean

    /** Pass True, if the administrator can invite new users to the chat */
    can_invite_users?: boolean

    /**
     * Pass True, if the administrator can restrict, ban or unban chat
     * members
     */
    can_restrict_members?: boolean

    /** Pass True, if the administrator can pin messages, supergroups only */
    can_pin_messages?: boolean

    /**
     * Pass True, if the administrator can add new administrators with a
     * subset of his own privileges or demote administrators that he has
     * promoted, directly or indirectly (promoted by administrators that were
     * appointed by him)
     */
    can_promote_members?: boolean
  }): BluebirdPromise<true> {
    return this.__getClient().promoteChatMember(this.id, user, options)
  }

  /**
   * Use this method to set a custom title for an administrator in a
   * supergroup promoted by the bot. Returns *True* on success.
   *
   * This is equivalent to calling
   * [[Client.setChatAdministratorCustomTitle]].
   *
   * @param user - Unique identifier of the target user
   * @param custom_title - New custom title for the administrator; 0-16
   * characters, emoji are not allowed
   */
  public setAdministratorCustomTitle (user: UserId, custom_title: string): BluebirdPromise<true> {
    return this.__getClient().setChatAdministratorCustomTitle(this.id, user, custom_title)
  }

  /**
   * Use this method to set default chat permissions for all members. The
   * bot must be an administrator in the group or a supergroup for this to
   * work and must have the *can_restrict_members* admin rights. Returns
   * *True* on success.
   *
   * This is equivalent to calling [[Client.setChatPermissions]].
   *
   * @param permissions - New default chat permissions
   */
  public setPermissions (permissions: IChatPermissions): BluebirdPromise<true> {
    return this.__getClient().setChatPermissions(this.id, permissions)
  }

  /**
   * Use this method to generate a new invite link for a chat; any
   * previously generated link is revoked. The bot must be an administrator
   * in the chat for this to work and must have the appropriate admin
   * rights. Returns the new invite link as *String* on success.
   *
   * > Note: Each administrator in a chat generates their own invite links.
   * > Bots can't use invite links generated by other administrators. If you
   * > want your bot to work with invite links, it will need to generate its
   * > own link using [[exportChatInviteLink]] – after this the link will
   * > become available to the bot via the [[getChat]] method. If your bot
   * > needs to generate a new invite link replacing its previous one, use
   * > [[exportChatInviteLink]] again.
   *
   * This is equivalent to calling [[Client.exportChatInviteLink]].
   */
  public exportInviteLink (): BluebirdPromise<string> {
    return this.__getClient().exportChatInviteLink(this.id)
  }

  /**
   * Use this method to set a new profile photo for the chat. Photos can't
   * be changed for private chats. The bot must be an administrator in the
   * chat for this to work and must have the appropriate admin rights.
   * Returns *True* on success.
   *
   * This is equivalent to calling [[Client.setChatPhoto]].
   *
   * @param photo - New chat photo, uploaded using multipart/form-data
   */
  public setPhoto (photo: InputFile): BluebirdPromise<true> {
    return this.__getClient().setChatPhoto(this.id, photo)
  }

  /**
   * Use this method to delete a chat photo. Photos can't be changed for
   * private chats. The bot must be an administrator in the chat for this
   * to work and must have the appropriate admin rights. Returns *True* on
   * success.
   *
   * This is equivalent to calling [[Client.deleteChatPhoto]].
   */
  public deletePhoto (): BluebirdPromise<true> {
    return this.__getClient().deleteChatPhoto(this.id)
  }

  /**
   * Use this method to change the title of a chat. Titles can't be changed
   * for private chats. The bot must be an administrator in the chat for
   * this to work and must have the appropriate admin rights. Returns
   * *True* on success.
   *
   * This is equivalent to calling [[Client.setChatTitle]].
   *
   * @param title - New chat title, 1-255 characters
   */
  public setTitle (title: string): BluebirdPromise<true> {
    return this.__getClient().setChatTitle(this.id, title)
  }

  /**
   * Use this method to change the description of a group, a supergroup or
   * a channel. The bot must be an administrator in the chat for this to
   * work and must have the appropriate admin rights. Returns *True* on
   * success.
   *
   * This is equivalent to calling [[Client.setChatDescription]].
   *
   * @param description - New chat description, 0-255 characters
   */
  public setDescription (description: string | undefined): BluebirdPromise<true> {
    return this.__getClient().setChatDescription(this.id, description)
  }

  /**
   * Use this method to unpin a message in a group, a supergroup, or a
   * channel. The bot must be an administrator in the chat for this to work
   * and must have the ‘can_pin_messages’ admin right in the supergroup or
   * ‘can_edit_messages’ admin right in the channel. Returns *True* on
   * success.
   *
   * This is equivalent to calling [[Client.unpinChatMessage]].
   */
  public unpinMessage (): BluebirdPromise<true> {
    return this.__getClient().unpinChatMessage(this.id)
  }

  /**
   * Use this method for your bot to leave a group, supergroup or channel.
   * Returns *True* on success.
   *
   * This is equivalent to calling [[Client.leaveChat]].
   */
  public leave (): BluebirdPromise<true> {
    return this.__getClient().leaveChat(this.id)
  }

  /**
   * Use this method to get up to date information about the chat (current
   * name of the user for one-on-one conversations, current username of a
   * user, group or channel, etc.). Returns a [[IChat]] object on success.
   *
   * This is equivalent to calling [[Client.getChat]].
   */
  public get (): BluebirdPromise<Chat> {
    return this.__getClient().getChat(this.id)
  }

  /**
   * Use this method to get a list of administrators in a chat. On success,
   * returns an Array of [[IChatMember]] objects that contains information
   * about all chat administrators except other bots. If the chat is a
   * group or a supergroup and no administrators were appointed, only the
   * creator will be returned.
   *
   * This is equivalent to calling [[Client.getChatAdministrators]].
   */
  public getAdministrators (): BluebirdPromise<ChatMember[]> {
    return this.__getClient().getChatAdministrators(this.id)
  }

  /**
   * Use this method to get the number of members in a chat. Returns *Int*
   * on success.
   *
   * This is equivalent to calling [[Client.getChatMembersCount]].
   */
  public getMembersCount (): BluebirdPromise<integer> {
    return this.__getClient().getChatMembersCount(this.id)
  }

  /**
   * Use this method to get information about a member of a chat. Returns a
   * [[IChatMember]] object on success.
   *
   * This is equivalent to calling [[Client.getChatMember]].
   *
   * @param user - Unique identifier of the target user
   */
  public getMember (user: UserId): BluebirdPromise<ChatMember> {
    return this.__getClient().getChatMember(this.id, user)
  }

  /**
   * Use this method to set a new group sticker set for a supergroup. The
   * bot must be an administrator in the chat for this to work and must
   * have the appropriate admin rights. Use the field *can_set_sticker_set*
   * optionally returned in [[getChat]] requests to check if the bot can
   * use this method. Returns *True* on success.
   *
   * This is equivalent to calling [[Client.setChatStickerSet]].
   *
   * @param sticker_set_name - Name of the sticker set to be set as the
   * group sticker set
   */
  public setStickerSet (sticker_set_name: string): BluebirdPromise<true> {
    return this.__getClient().setChatStickerSet(this.id, sticker_set_name)
  }

  /**
   * Use this method to delete a group sticker set from a supergroup. The
   * bot must be an administrator in the chat for this to work and must
   * have the appropriate admin rights. Use the field *can_set_sticker_set*
   * optionally returned in [[getChat]] requests to check if the bot can
   * use this method. Returns *True* on success.
   *
   * This is equivalent to calling [[Client.deleteChatStickerSet]].
   */
  public deleteStickerSet (): BluebirdPromise<true> {
    return this.__getClient().deleteChatStickerSet(this.id)
  }

  /**
   * Use this method to send static .WEBP or
   * [animated](https://telegram.org/blog/animated-stickers) .TGS stickers.
   * On success, the sent [[IMessage]] is returned.
   *
   * This is equivalent to calling [[Client.sendSticker]].
   *
   * @param sticker - Sticker to send. Pass a file_id as String to send a
   * file that exists on the Telegram servers (recommended), pass an HTTP
   * URL as a String for Telegram to get a .webp file from the Internet, or
   * upload a new one using multipart/form-data. 
   * @param options - Optional parameters
   */
  public sendSticker (sticker: InputFile, options?: {
    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * Additional interface options. An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating),
     * [custom reply keyboard](https://core.telegram.org/bots#keyboards),
     * instructions to remove reply keyboard or to force a reply from the
     * user.
     */
    reply_markup?: IReplyMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().sendSticker(this.id, sticker, options)
  }

  /**
   * Use this method to send invoices. On success, the sent [[IMessage]] is
   * returned.
   *
   * This is equivalent to calling [[Client.sendInvoice]].
   *
   * @param options - Optional parameters
   */
  public sendInvoice (options: {
    /** Product name, 1-32 characters */
    title: string

    /** Product description, 1-255 characters */
    description: string

    /**
     * Bot-defined invoice payload, 1-128 bytes. This will not be displayed
     * to the user, use for your internal processes.
     */
    payload: string

    /**
     * Payments provider token, obtained via
     * [Botfather](https://t.me/botfather)
     */
    provider_token: string

    /**
     * Unique deep-linking parameter that can be used to generate this
     * invoice when used as a start parameter
     */
    start_parameter: string

    /**
     * Three-letter ISO 4217 currency code, see [more on
     * currencies](https://core.telegram.org/bots/payments#supported-currencies)
     */
    currency: string

    /**
     * Price breakdown, a list of components (e.g. product price, tax,
     * discount, delivery cost, delivery tax, bonus, etc.)
     */
    prices: ILabeledPrice[]

    /**
     * JSON-encoded data about the invoice, which will be shared with the
     * payment provider. A detailed description of required fields should be
     * provided by the payment provider.
     */
    provider_data?: string

    /**
     * URL of the product photo for the invoice. Can be a photo of the goods
     * or a marketing image for a service. People like it better when they
     * see what they are paying for.
     */
    photo_url?: string

    /** Photo size */
    photo_size?: integer

    /** Photo width */
    photo_width?: integer

    /** Photo height */
    photo_height?: integer

    /** Pass *True*, if you require the user's full name to complete the order */
    need_name?: boolean

    /**
     * Pass *True*, if you require the user's phone number to complete the
     * order
     */
    need_phone_number?: boolean

    /**
     * Pass *True*, if you require the user's email address to complete the
     * order
     */
    need_email?: boolean

    /**
     * Pass *True*, if you require the user's shipping address to complete
     * the order
     */
    need_shipping_address?: boolean

    /** Pass *True*, if user's phone number should be sent to provider */
    send_phone_number_to_provider?: boolean

    /** Pass *True*, if user's email address should be sent to provider */
    send_email_to_provider?: boolean

    /** Pass *True*, if the final price depends on the shipping method */
    is_flexible?: boolean

    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     * If empty, one 'Pay `total price`' button will be shown. If not empty,
     * the first button must be a Pay button.
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().sendInvoice(this.id, options)
  }

  /**
   * Use this method to send a game. On success, the sent [[IMessage]] is
   * returned.
   *
   * This is equivalent to calling [[Client.sendGame]].
   *
   * @param game_short_name - Short name of the game, serves as the unique
   * identifier for the game. Set up your games via
   * [Botfather](https://t.me/botfather).
   * @param options - Optional parameters
   */
  public sendGame (game_short_name: string, options?: {
    /**
     * Sends the message
     * [silently](https://telegram.org/blog/channels-2-0#silent-messages).
     * Users will receive a notification with no sound.
     */
    disable_notification?: boolean

    /** If the message is a reply, ID of the original message */
    reply_to_message?: MessageId | integer

    /**
     * An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     * If empty, one ‘Play game_title’ button will be shown. If not empty,
     * the first button must launch the game.
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().sendGame(this.id, game_short_name, options)
  }

}

/**
 * Convenience class that reexposes API operations from [[Client]] that
 * operate on a specified Telegram **user**.
 */
export class UserContext extends Context {

  /** Unique identifier for this user or bot */
  id: integer

  /**
   * Constructs a new context object
   *
   * @param client - API client to use for requests
   * @param id - Identifier of a Telegram user, which can be specified with
   * either a [[User]] object or its numeric ID
   */
  constructor (client: ClientBase, id: UserId) {
    super(client)
    this.id = resolveUserId(id)
  }

  /**
   * Use this method to get a list of profile pictures for a user. Returns
   * a [[IUserProfilePhotos]] object.
   *
   * This is equivalent to calling [[Client.getUserProfilePhotos]].
   *
   * @param options - Optional parameters
   */
  public getProfilePhotos (options?: {
    /**
     * Sequential number of the first photo to be returned. By default, all
     * photos are returned.
     */
    offset?: integer

    /**
     * Limits the number of photos to be retrieved. Values between 1—100 are
     * accepted. Defaults to 100.
     */
    limit?: integer
  }): BluebirdPromise<UserProfilePhotos> {
    return this.__getClient().getUserProfilePhotos(this.id, options)
  }

  /**
   * Use this method to upload a .png file with a sticker for later use in
   * *createNewStickerSet* and *addStickerToSet* methods (can be used
   * multiple times). Returns the uploaded [[IFile]] on success.
   *
   * This is equivalent to calling [[Client.uploadStickerFile]].
   *
   * @param png_sticker - **Png** image with the sticker, must be up to 512
   * kilobytes in size, dimensions must not exceed 512px, and either width
   * or height must be exactly 512px. 
   */
  public uploadStickerFile (png_sticker: InputFile): BluebirdPromise<File> {
    return this.__getClient().uploadStickerFile(this.id, png_sticker)
  }

  /**
   * Use this method to create new sticker set owned by a user. The bot
   * will be able to edit the created sticker set. Returns *True* on
   * success.
   *
   * This is equivalent to calling [[Client.createNewStickerSet]].
   *
   * @param name - Short name of sticker set, to be used in
   * `t.me/addstickers/` URLs (e.g., *animals*). Can contain only english
   * letters, digits and underscores. Must begin with a letter, can't
   * contain consecutive underscores and must end in *“\_by\_<bot
   * username>”*. *<bot_username>* is case insensitive. 1-64 characters.
   * @param title - Sticker set title, 1-64 characters
   * @param options - Optional parameters
   */
  public createNewStickerSet (name: string, title: string, options: {
    /**
     * **Png** image with the sticker, must be up to 512 kilobytes in size,
     * dimensions must not exceed 512px, and either width or height must be
     * exactly 512px. Pass a *file_id* as a String to send a file that
     * already exists on the Telegram servers, pass an HTTP URL as a String
     * for Telegram to get a file from the Internet, or upload a new one
     * using multipart/form-data.
     */
    png_sticker: InputFile

    /** One or more emoji corresponding to the sticker */
    emojis: string

    /** Pass *True*, if a set of mask stickers should be created */
    contains_masks?: boolean

    /** Position where the mask should be placed on faces */
    mask_position?: IMaskPosition
  }): BluebirdPromise<true> {
    return this.__getClient().createNewStickerSet(this.id, name, title, options)
  }

  /**
   * Use this method to add a new sticker to a set created by the bot.
   * Returns *True* on success.
   *
   * This is equivalent to calling [[Client.addStickerToSet]].
   *
   * @param name - Sticker set name
   * @param options - Optional parameters
   */
  public addStickerToSet (name: string, options: {
    /**
     * **Png** image with the sticker, must be up to 512 kilobytes in size,
     * dimensions must not exceed 512px, and either width or height must be
     * exactly 512px. Pass a *file_id* as a String to send a file that
     * already exists on the Telegram servers, pass an HTTP URL as a String
     * for Telegram to get a file from the Internet, or upload a new one
     * using multipart/form-data.
     */
    png_sticker: InputFile

    /** One or more emoji corresponding to the sticker */
    emojis: string

    /** Position where the mask should be placed on faces */
    mask_position?: IMaskPosition
  }): BluebirdPromise<true> {
    return this.__getClient().addStickerToSet(this.id, name, options)
  }

  /**
   * Informs a user that some of the Telegram Passport elements they
   * provided contains errors. The user will not be able to re-submit their
   * Passport to you until the errors are fixed (the contents of the field
   * for which you returned the error must change). Returns *True* on
   * success.
   *
   * Use this if the data submitted by the user doesn't satisfy the
   * standards your service requires for any reason. For example, if a
   * birthday date seems invalid, a submitted document is blurry, a scan
   * shows evidence of tampering, etc. Supply some details in the error
   * message to make sure the user knows how to correct the issues.
   *
   * This is equivalent to calling [[Client.setPassportDataErrors]].
   *
   * @param errors - Array describing the errors
   */
  public setPassportDataErrors (errors: IPassportElementError[]): BluebirdPromise<true> {
    return this.__getClient().setPassportDataErrors(this.id, errors)
  }

}

/**
 * Convenience class that reexposes API operations from [[Client]] that
 * operate on the **bot's websocket**.
 */
export class WebsocketContext extends Context {

  /**
   * Constructs a new context object
   *
   * @param client - API client to use for requests
   */
  constructor (client: ClientBase) {
    super(client)
  }

  /**
   * Use this method to specify a url and receive incoming updates via an
   * outgoing webhook. Whenever there is an update for the bot, we will
   * send an HTTPS POST request to the specified url, containing a
   * JSON-serialized [[IUpdate]]. In case of an unsuccessful request, we
   * will give up after a reasonable amount of attempts. Returns *True* on
   * success.
   *
   * If you'd like to make sure that the Webhook request comes from
   * Telegram, we recommend using a secret path in the URL, e.g.
   * `https://www.example.com/<token>`. Since nobody else knows your bot‘s
   * token, you can be pretty sure it’s us.
   *
   * > **Notes**  
   * > **1.** You will not be able to receive updates using [[getUpdates]]
   * > for as long as an outgoing webhook is set up.  
   * > **2.** To use a self-signed certificate, you need to upload your
   * > [public key certificate](https://core.telegram.org/bots/self-signed)
   * > using *certificate* parameter. Please upload as InputFile, sending a
   * > String will not work.  
   * > **3.** Ports currently supported *for Webhooks*: **443, 80, 88,
   * > 8443**.
   * > 
   * > **NEW!** If you're having any trouble setting up webhooks, please
   * > check out this [amazing guide to
   * > Webhooks](https://core.telegram.org/bots/webhooks).
   *
   * This is equivalent to calling [[Client.setWebhook]].
   *
   * @param url - HTTPS url to send updates to. Use an empty string to
   * remove webhook integration
   * @param options - Optional parameters
   */
  public set (url: string, options?: {
    /**
     * Upload your public key certificate so that the root certificate in use
     * can be checked. See our [self-signed
     * guide](https://core.telegram.org/bots/self-signed) for details.
     */
    certificate?: InputFile

    /**
     * Maximum allowed number of simultaneous HTTPS connections to the
     * webhook for update delivery, 1-100. Defaults to *40*. Use lower values
     * to limit the load on your bot‘s server, and higher values to increase
     * your bot’s throughput.
     */
    max_connections?: integer

    /**
     * List the types of updates you want your bot to receive. For example,
     * specify [“message”, “edited_channel_post”, “callback_query”] to only
     * receive updates of these types. See [[IUpdate]] for a complete list of
     * available update types. Specify an empty list to receive all updates
     * regardless of type (default). If not specified, the previous setting
     * will be used.  
     *   
     * Please note that this parameter doesn't affect updates created before
     * the call to the setWebhook, so unwanted updates may be received for a
     * short period of time.
     */
    allowed_updates?: UpdateKind[]
  }): BluebirdPromise<true> {
    return this.__getClient().setWebhook(url, options)
  }

  /**
   * Use this method to remove webhook integration if you decide to switch
   * back to [[getUpdates]]. Returns *True* on success. Requires no
   * parameters.
   *
   * This is equivalent to calling [[Client.deleteWebhook]].
   */
  public delete (): BluebirdPromise<true> {
    return this.__getClient().deleteWebhook()
  }

  /**
   * Use this method to get current webhook status. Requires no parameters.
   * On success, returns a [[IWebhookInfo]] object. If the bot is using
   * [[getUpdates]], will return an object with the *url* field empty.
   *
   * This is equivalent to calling [[Client.getWebhookInfo]].
   */
  public getInfo (): BluebirdPromise<WebhookInfo> {
    return this.__getClient().getWebhookInfo()
  }

}

/**
 * Convenience class that reexposes API operations from [[Client]] that
 * operate on a specified **inline message**.
 */
export class InlineMessageContext extends Context {

  /** Inline message identifier */
  id: string

  /**
   * Constructs a new context object
   *
   * @param client - API client to use for requests
   * @param id - Identifier of an inline message
   */
  constructor (client: ClientBase, id: string) {
    super(client)
    this.id = id
  }

  /**
   * Use this method to edit live location messages. A location can be
   * edited until its *live_period* expires or editing is explicitly
   * disabled by a call to [[stopMessageLiveLocation]]. On success, if the
   * edited message was sent by the bot, the edited [[IMessage]] is
   * returned, otherwise *True* is returned.
   *
   * This is equivalent to calling [[Client.editMessageLiveLocation]].
   *
   * @param latitude - Latitude of new location
   * @param longitude - Longitude of new location
   * @param options - Optional parameters
   */
  public editLiveLocation (latitude: number, longitude: number, options?: {
    /**
     * A new [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().editMessageLiveLocation(this.id, latitude, longitude, options)
  }

  /**
   * Use this method to stop updating a live location message before
   * *live_period* expires. On success, if the message was sent by the bot,
   * the sent [[IMessage]] is returned, otherwise *True* is returned.
   *
   * This is equivalent to calling [[Client.stopMessageLiveLocation]].
   *
   * @param options - Optional parameters
   */
  public stopLiveLocation (options?: {
    /**
     * A new [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().stopMessageLiveLocation(this.id, options)
  }

  /**
   * Use this method to edit text and
   * [game](https://core.telegram.org/bots/api#games) messages. On success,
   * if edited message is sent by the bot, the edited [[IMessage]] is
   * returned, otherwise *True* is returned.
   *
   * This is equivalent to calling [[Client.editMessageText]].
   *
   * @param text - New text of the message
   * @param options - Optional parameters
   */
  public editText (text: string, options?: {
    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in your
     * bot's message.
     */
    parse_mode?: ParseMode

    /** Disables link previews for links in this message */
    disable_web_page_preview?: boolean

    /**
     * An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().editMessageText(this.id, text, options)
  }

  /**
   * Use this method to edit captions of messages. On success, if edited
   * message is sent by the bot, the edited [[IMessage]] is returned,
   * otherwise *True* is returned.
   *
   * This is equivalent to calling [[Client.editMessageCaption]].
   *
   * @param options - Optional parameters
   */
  public editCaption (options?: {
    /** New caption of the message */
    caption?: string

    /**
     * Send [*Markdown*](https://core.telegram.org/bots/api#markdown-style)
     * or [*HTML*](https://core.telegram.org/bots/api#html-style), if you
     * want Telegram apps to show [bold, italic, fixed-width text or inline
     * URLs](https://core.telegram.org/bots/api#formatting-options) in the
     * media caption.
     */
    parse_mode?: ParseMode

    /**
     * An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().editMessageCaption(this.id, options)
  }

  /**
   * Use this method to edit animation, audio, document, photo, or video
   * messages. If a message is a part of a message album, then it can be
   * edited only to a photo or a video. Otherwise, message type can be
   * changed arbitrarily. When inline message is edited, new file can't be
   * uploaded. Use previously uploaded file via its file_id or specify a
   * URL. On success, if the edited message was sent by the bot, the edited
   * [[IMessage]] is returned, otherwise *True* is returned.
   *
   * This is equivalent to calling [[Client.editMessageMedia]].
   *
   * @param media - A new media content of the message
   * @param options - Optional parameters
   */
  public editMedia (media: IInputMedia, options?: {
    /**
     * A new [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().editMessageMedia(this.id, media, options)
  }

  /**
   * Use this method to edit only the reply markup of messages. On success,
   * if edited message is sent by the bot, the edited [[IMessage]] is
   * returned, otherwise *True* is returned.
   *
   * This is equivalent to calling [[Client.editMessageReplyMarkup]].
   *
   * @param options - Optional parameters
   */
  public editReplyMarkup (options?: {
    /**
     * An [inline
     * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
     */
    reply_markup?: IInlineKeyboardMarkup
  }): BluebirdPromise<Message> {
    return this.__getClient().editMessageReplyMarkup(this.id, options)
  }

  /**
   * Use this method to set the score of the specified user in a game. On
   * success, if the message was sent by the bot, returns the edited
   * [[IMessage]], otherwise returns *True*. Returns an error, if the new
   * score is not greater than the user's current score in the chat and
   * *force* is *False*.
   *
   * This is equivalent to calling [[Client.setGameScore]].
   *
   * @param user - User identifier
   * @param score - New score, must be non-negative
   * @param options - Optional parameters
   */
  public setGameScore (user: UserId, score: integer, options?: {
    /**
     * Pass True, if the high score is allowed to decrease. This can be
     * useful when fixing mistakes or banning cheaters
     */
    force?: boolean

    /**
     * Pass True, if the game message should not be automatically edited to
     * include the current scoreboard
     */
    disable_edit_message?: boolean
  }): BluebirdPromise<Message | true> {
    return this.__getClient().setGameScore(this.id, user, score, options)
  }

  /**
   * Use this method to get data for high score tables. Will return the
   * score of the specified user and several of his neighbors in a game. On
   * success, returns an *Array* of [[IGameHighScore]] objects.
   *
   * > This method will currently return scores for the target user, plus two
   * > of his closest neighbors on each side. Will also return the top three
   * > users if the user and his neighbors are not among them. Please note
   * > that this behavior is subject to change.
   *
   * This is equivalent to calling [[Client.getGameHighScores]].
   *
   * @param user - Target user id
   */
  public getGameHighScores (user: UserId): BluebirdPromise<GameHighScore[]> {
    return this.__getClient().getGameHighScores(this.id, user)
  }

}

/**
 * Convenience class that reexposes API operations from [[Client]] that
 * operate on a specified **inline query**.
 */
export class InlineQueryContext extends Context {

  /** Unique identifier for this query */
  id: string

  /**
   * Constructs a new context object
   *
   * @param client - API client to use for requests
   * @param id - Unique identifier for this query
   */
  constructor (client: ClientBase, id: string) {
    super(client)
    this.id = id
  }

  /**
   * Use this method to send answers to an inline query. On success, *True*
   * is returned.  
   * No more than **50** results per query are allowed.
   *
   * This is equivalent to calling [[Client.answerInlineQuery]].
   *
   * @param results - Array of results for the inline query
   * @param options - Optional parameters
   */
  public answer (results: IInlineQueryResult[], options?: {
    /**
     * The maximum amount of time in seconds that the result of the inline
     * query may be cached on the server. Defaults to 300.
     */
    cache_time?: integer

    /**
     * Pass *True*, if results may be cached on the server side only for the
     * user that sent the query. By default, results may be returned to any
     * user who sends the same query
     */
    is_personal?: boolean

    /**
     * Pass the offset that a client should send in the next query with the
     * same text to receive more results. Pass an empty string if there are
     * no more results or if you don‘t support pagination. Offset length
     * can’t exceed 64 bytes.
     */
    next_offset?: string

    /**
     * If passed, clients will display a button with specified text that
     * switches the user to a private chat with the bot and sends the bot a
     * start message with the parameter *switch_pm_parameter*
     */
    switch_pm_text?: string

    /**
     * [Deep-linking](https://core.telegram.org/bots#deep-linking) parameter
     * for the /start message sent to the bot when user presses the switch
     * button. 1-64 characters, only `A-Z`, `a-z`, `0-9`, `_` and `-` are
     * allowed.  
     *   
     * *Example:* An inline bot that sends YouTube videos can ask the user to
     * connect the bot to their YouTube account to adapt search results
     * accordingly. To do this, it displays a ‘Connect your YouTube account’
     * button above the results, or even before showing any. The user presses
     * the button, switches to a private chat with the bot and, in doing so,
     * passes a start parameter that instructs the bot to return an oauth
     * link. Once done, the bot can offer a [[IInlineKeyboardMarkup]] button
     * so that the user can easily return to the chat where they wanted to
     * use the bot's inline capabilities.
     */
    switch_pm_parameter?: string
  }): BluebirdPromise<true> {
    return this.__getClient().answerInlineQuery(this.id, results, options)
  }

}

/**
 * Convenience class that reexposes API operations from [[Client]] that
 * operate on a specified **callback query**.
 */
export class CallbackQueryContext extends Context {

  /** Unique identifier for this query */
  id: string

  /**
   * Constructs a new context object
   *
   * @param client - API client to use for requests
   * @param id - Unique identifier for this query
   */
  constructor (client: ClientBase, id: string) {
    super(client)
    this.id = id
  }

  /**
   * Use this method to send answers to callback queries sent from [inline
   * keyboards](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
   * The answer will be displayed to the user as a notification at the top
   * of the chat screen or as an alert. On success, *True* is returned.
   *
   * > Alternatively, the user can be redirected to the specified Game URL.
   * > For this option to work, you must first create a game for your bot via
   * > [@Botfather](https://t.me/botfather) and accept the terms. Otherwise,
   * > you may use links like `t.me/your_bot?start=XXXX` that open your bot
   * > with a parameter.
   *
   * This is equivalent to calling [[Client.answerCallbackQuery]].
   *
   * @param options - Optional parameters
   */
  public answer (options?: {
    /**
     * Text of the notification. If not specified, nothing will be shown to
     * the user, 0-200 characters
     */
    text?: string

    /**
     * If *true*, an alert will be shown by the client instead of a
     * notification at the top of the chat screen. Defaults to *false*.
     */
    show_alert?: boolean

    /**
     * URL that will be opened by the user's client. If you have created a
     * [[IGame]] and accepted the conditions via
     * [@Botfather](https://t.me/botfather), specify the URL that opens your
     * game – note that this will only work if the query comes from a
     * [[IInlineKeyboardButton]] button.  
     *   
     * Otherwise, you may use links like `t.me/your_bot?start=XXXX` that open
     * your bot with a parameter.
     */
    url?: string

    /**
     * The maximum amount of time in seconds that the result of the callback
     * query may be cached client-side. Telegram apps will support caching
     * starting in version 3.14. Defaults to 0.
     */
    cache_time?: integer
  }): BluebirdPromise<true> {
    return this.__getClient().answerCallbackQuery(this.id, options)
  }

}

/**
 * Convenience class that reexposes API operations from [[Client]] that
 * operate on a specified **shipping query**.
 */
export class ShippingQueryContext extends Context {

  /** Unique query identifier */
  id: string

  /**
   * Constructs a new context object
   *
   * @param client - API client to use for requests
   * @param id - Unique query identifier
   */
  constructor (client: ClientBase, id: string) {
    super(client)
    this.id = id
  }

  /**
   * If you sent an invoice requesting a shipping address and the parameter
   * *is_flexible* was specified, the Bot API will send an [[IUpdate]] with
   * a *shipping_query* field to the bot. Use this method to reply to
   * shipping queries. On success, True is returned.
   *
   * This is equivalent to calling [[Client.answerShippingQuery]].
   *
   * @param ok - Specify True if delivery to the specified address is
   * possible and False if there are any problems (for example, if delivery
   * to the specified address is not possible)
   * @param options - Optional parameters
   */
  public answer (ok: boolean, options?: {
    /** Required if *ok* is True. Array of available shipping options. */
    shipping_options?: IShippingOption[]

    /**
     * Required if *ok* is False. Error message in human readable form that
     * explains why it is impossible to complete the order (e.g. "Sorry,
     * delivery to your desired address is unavailable'). Telegram will
     * display this message to the user.
     */
    error_message?: string
  }): BluebirdPromise<true> {
    return this.__getClient().answerShippingQuery(this.id, ok, options)
  }

}

/**
 * Convenience class that reexposes API operations from [[Client]] that
 * operate on a specified **pre checkout query**.
 */
export class PreCheckoutQueryContext extends Context {

  /** Unique query identifier */
  id: string

  /**
   * Constructs a new context object
   *
   * @param client - API client to use for requests
   * @param id - Unique query identifier
   */
  constructor (client: ClientBase, id: string) {
    super(client)
    this.id = id
  }

  /**
   * Once the user has confirmed their payment and shipping details, the
   * Bot API sends the final confirmation in the form of an [[IUpdate]]
   * with the field *pre_checkout_query*. Use this method to respond to
   * such pre-checkout queries. On success, True is returned. **Note:** The
   * Bot API must receive an answer within 10 seconds after the
   * pre-checkout query was sent.
   *
   * This is equivalent to calling [[Client.answerPreCheckoutQuery]].
   *
   * @param ok - Specify *True* if everything is alright (goods are
   * available, etc.) and the bot is ready to proceed with the order. Use
   * *False* if there are any problems.
   * @param options - Optional parameters
   */
  public answer (ok: boolean, options?: {
    /**
     * Required if *ok* is *False*. Error message in human readable form that
     * explains the reason for failure to proceed with the checkout (e.g.
     * "Sorry, somebody just bought the last of our amazing black T-shirts
     * while you were busy filling out your payment details. Please choose a
     * different color or garment!"). Telegram will display this message to
     * the user.
     */
    error_message?: string
  }): BluebirdPromise<true> {
    return this.__getClient().answerPreCheckoutQuery(this.id, ok, options)
  }

}

/**
 * This object represents an incoming update.  
 * At most **one** of the optional parameters can be present in any given
 * update.
 */
export class Update implements IUpdate {
  /**
   * The update‘s unique identifier. Update identifiers start from a
   * certain positive number and increase sequentially. This ID becomes
   * especially handy if you’re using [[setWebhook]], since it allows you
   * to ignore repeated updates or to restore the correct update sequence,
   * should they get out of order. If there are no new updates for at least
   * a week, then identifier of the next update will be chosen randomly
   * instead of sequentially.
   */
  update_id: integer

  /** New incoming message of any kind — text, photo, sticker, etc. */
  message?: Message

  /** New version of a message that is known to the bot and was edited */
  edited_message?: Message

  /** New incoming channel post of any kind — text, photo, sticker, etc. */
  channel_post?: Message

  /** New version of a channel post that is known to the bot and was edited */
  edited_channel_post?: Message

  /**
   * New incoming [inline](https://core.telegram.org/bots/api#inline-mode)
   * query
   */
  inline_query?: InlineQuery

  /**
   * The result of an
   * [inline](https://core.telegram.org/bots/api#inline-mode) query that
   * was chosen by a user and sent to their chat partner. Please see our
   * documentation on the [feedback
   * collecting](https://core.telegram.org/bots/inline#collecting-feedback)
   * for details on how to enable these updates for your bot.
   */
  chosen_inline_result?: ChosenInlineResult

  /** New incoming callback query */
  callback_query?: CallbackQuery

  /** New incoming shipping query. Only for invoices with flexible price */
  shipping_query?: ShippingQuery

  /**
   * New incoming pre-checkout query. Contains full information about
   * checkout
   */
  pre_checkout_query?: PreCheckoutQuery

  /**
   * New poll state. Bots receive only updates about stopped polls and
   * polls, which are sent by the bot
   */
  poll?: IPoll

  /**
   * A user changed their answer in a non-anonymous poll. Bots receive new
   * votes only in polls that were sent by the bot itself.
   */
  poll_answer?: PollAnswer

  /**
   * Parses a raw [[IUpdate]] object received from Telegram, into Botgram's
   * representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    this.update_id = x.update_id
    if (typeof x.message !== 'undefined') {
      this.message = new Message(x.message, client)
    }
    if (typeof x.edited_message !== 'undefined') {
      this.edited_message = new Message(x.edited_message, client)
    }
    if (typeof x.channel_post !== 'undefined') {
      this.channel_post = new Message(x.channel_post, client)
    }
    if (typeof x.edited_channel_post !== 'undefined') {
      this.edited_channel_post = new Message(x.edited_channel_post, client)
    }
    if (typeof x.inline_query !== 'undefined') {
      this.inline_query = new InlineQuery(x.inline_query, client)
    }
    if (typeof x.chosen_inline_result !== 'undefined') {
      this.chosen_inline_result = new ChosenInlineResult(x.chosen_inline_result, client)
    }
    if (typeof x.callback_query !== 'undefined') {
      this.callback_query = new CallbackQuery(x.callback_query, client)
    }
    if (typeof x.shipping_query !== 'undefined') {
      this.shipping_query = new ShippingQuery(x.shipping_query, client)
    }
    if (typeof x.pre_checkout_query !== 'undefined') {
      this.pre_checkout_query = new PreCheckoutQuery(x.pre_checkout_query, client)
    }
    if (typeof x.poll !== 'undefined') {
      this.poll = x.poll
    }
    if (typeof x.poll_answer !== 'undefined') {
      this.poll_answer = new PollAnswer(x.poll_answer, client)
    }
  }
}

/**
 * Contains information about the current status of a webhook.
 */
export class WebhookInfo implements IWebhookInfo {
  /** Webhook URL, may be empty if webhook is not set up */
  url: string

  /**
   * True, if a custom certificate was provided for webhook certificate
   * checks
   */
  has_custom_certificate: boolean

  /** Number of updates awaiting delivery */
  pending_update_count: integer

  /**
   * Unix time for the most recent error that happened when trying to
   * deliver an update via webhook
   */
  last_error_date?: Date

  /**
   * Error message in human-readable format for the most recent error that
   * happened when trying to deliver an update via webhook
   */
  last_error_message?: string

  /**
   * Maximum allowed number of simultaneous HTTPS connections to the
   * webhook for update delivery
   */
  max_connections?: integer

  /**
   * A list of update types the bot is subscribed to. Defaults to all
   * update types
   */
  allowed_updates?: UpdateKind[]

  /**
   * Parses a raw [[IWebhookInfo]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    this.url = x.url
    this.has_custom_certificate = x.has_custom_certificate
    this.pending_update_count = x.pending_update_count
    if (typeof x.last_error_date !== 'undefined') {
      this.last_error_date = new Date(x.last_error_date * 1000)
    }
    if (typeof x.last_error_message !== 'undefined') {
      this.last_error_message = x.last_error_message
    }
    if (typeof x.max_connections !== 'undefined') {
      this.max_connections = x.max_connections
    }
    if (typeof x.allowed_updates !== 'undefined') {
      this.allowed_updates = x.allowed_updates
    }
  }
}

/**
 * This object represents a Telegram user or bot.
 */
export class User extends UserContext implements IUser {
  /** True, if this user is a bot */
  is_bot: boolean

  /** User‘s or bot’s first name */
  first_name: string

  /** User‘s or bot’s last name */
  last_name?: string

  /** User‘s or bot’s username */
  username?: string

  /**
   * [IETF language tag](https://en.wikipedia.org/wiki/IETF_language_tag)
   * of the user's language
   */
  language_code?: string

  /** True, if the bot can be invited to groups. Returned only in [[getMe]]. */
  can_join_groups?: boolean

  /**
   * True, if [privacy mode](https://core.telegram.org/bots#privacy-mode)
   * is disabled for the bot. Returned only in [[getMe]].
   */
  can_read_all_group_messages?: boolean

  /** True, if the bot supports inline queries. Returned only in [[getMe]]. */
  supports_inline_queries?: boolean

  /**
   * Parses a raw [[IUser]] object received from Telegram, into Botgram's
   * representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, x.id)
    this.is_bot = x.is_bot
    this.first_name = x.first_name
    if (typeof x.last_name !== 'undefined') {
      this.last_name = x.last_name
    }
    if (typeof x.username !== 'undefined') {
      this.username = x.username
    }
    if (typeof x.language_code !== 'undefined') {
      this.language_code = x.language_code
    }
    if (typeof x.can_join_groups !== 'undefined') {
      this.can_join_groups = x.can_join_groups
    }
    if (typeof x.can_read_all_group_messages !== 'undefined') {
      this.can_read_all_group_messages = x.can_read_all_group_messages
    }
    if (typeof x.supports_inline_queries !== 'undefined') {
      this.supports_inline_queries = x.supports_inline_queries
    }
  }
}

/**
 * This object represents a chat.
 */
export class Chat extends ChatContext implements IChat {
  /**
   * Type of chat, can be either “private”, “group”, “supergroup” or
   * “channel”
   */
  type: 'private' | 'group' | 'supergroup' | 'channel'

  /** Title, for supergroups, channels and group chats */
  title?: string

  /** Username, for private chats, supergroups and channels if available */
  username?: string

  /** First name of the other party in a private chat */
  first_name?: string

  /** Last name of the other party in a private chat */
  last_name?: string

  /** Chat photo. Returned only in [[getChat]]. */
  photo?: IChatPhoto

  /**
   * Description, for groups, supergroups and channel chats. Returned only
   * in [[getChat]].
   */
  description?: string

  /**
   * Chat invite link, for groups, supergroups and channel chats. Each
   * administrator in a chat generates their own invite links, so the bot
   * must first generate the link using [[exportChatInviteLink]]. Returned
   * only in [[getChat]].
   */
  invite_link?: string

  /**
   * Pinned message, for groups, supergroups and channels. Returned only in
   * [[getChat]].
   */
  pinned_message?: Message

  /**
   * Default chat member permissions, for groups and supergroups. Returned
   * only in [[getChat]].
   */
  permissions?: IChatPermissions

  /**
   * For supergroups, the minimum allowed delay between consecutive
   * messages sent by each unpriviledged user. Returned only in
   * [[getChat]].
   */
  slow_mode_delay?: integer

  /**
   * For supergroups, name of group sticker set. Returned only in
   * [[getChat]].
   */
  sticker_set_name?: string

  /**
   * True, if the bot can change the group sticker set. Returned only in
   * [[getChat]].
   */
  can_set_sticker_set?: boolean

  /**
   * Parses a raw [[IChat]] object received from Telegram, into Botgram's
   * representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, x.id)
    this.type = x.type
    if (typeof x.title !== 'undefined') {
      this.title = x.title
    }
    if (typeof x.username !== 'undefined') {
      this.username = x.username
    }
    if (typeof x.first_name !== 'undefined') {
      this.first_name = x.first_name
    }
    if (typeof x.last_name !== 'undefined') {
      this.last_name = x.last_name
    }
    if (typeof x.photo !== 'undefined') {
      this.photo = x.photo
    }
    if (typeof x.description !== 'undefined') {
      this.description = x.description
    }
    if (typeof x.invite_link !== 'undefined') {
      this.invite_link = x.invite_link
    }
    if (typeof x.pinned_message !== 'undefined') {
      this.pinned_message = new Message(x.pinned_message, client)
    }
    if (typeof x.permissions !== 'undefined') {
      this.permissions = x.permissions
    }
    if (typeof x.slow_mode_delay !== 'undefined') {
      this.slow_mode_delay = x.slow_mode_delay
    }
    if (typeof x.sticker_set_name !== 'undefined') {
      this.sticker_set_name = x.sticker_set_name
    }
    if (typeof x.can_set_sticker_set !== 'undefined') {
      this.can_set_sticker_set = x.can_set_sticker_set
    }
  }
}

/**
 * This object represents a message.
 */
export class Message extends MessageContext implements IMessage {
  /** Sender, empty for messages sent to channels */
  from?: User

  /** Date the message was sent in Unix time */
  date: Date

  /** Conversation the message belongs to */
  chat: Chat

  /** For forwarded messages, sender of the original message */
  forward_from?: User

  /**
   * For messages forwarded from channels, information about the original
   * channel
   */
  forward_from_chat?: Chat

  /**
   * For messages forwarded from channels, identifier of the original
   * message in the channel
   */
  forward_from_message_id?: integer

  /**
   * For messages forwarded from channels, signature of the post author if
   * present
   */
  forward_signature?: string

  /**
   * Sender's name for messages forwarded from users who disallow adding a
   * link to their account in forwarded messages
   */
  forward_sender_name?: string

  /**
   * For forwarded messages, date the original message was sent in Unix
   * time
   */
  forward_date?: Date

  /**
   * For replies, the original message. Note that the Message object in
   * this field will not contain further *reply_to_message* fields even if
   * it itself is a reply.
   */
  reply_to_message?: Message

  /** Date the message was last edited in Unix time */
  edit_date?: Date

  /** The unique identifier of a media message group this message belongs to */
  media_group_id?: string

  /** Signature of the post author for messages in channels */
  author_signature?: string

  /**
   * For text messages, the actual UTF-8 text of the message, 0-4096
   * characters.
   */
  text?: string

  /**
   * For text messages, special entities like usernames, URLs, bot
   * commands, etc. that appear in the text
   */
  entities?: MessageEntity[]

  /**
   * For messages with a caption, special entities like usernames, URLs,
   * bot commands, etc. that appear in the caption
   */
  caption_entities?: MessageEntity[]

  /** Message is an audio file, information about the file */
  audio?: Audio

  /** Message is a general file, information about the file */
  document?: Document

  /**
   * Message is an animation, information about the animation. For backward
   * compatibility, when this field is set, the *document* field will also
   * be set
   */
  animation?: Animation

  /** Message is a game, information about the game. */
  game?: Game

  /** Message is a photo, available sizes of the photo */
  photo?: PhotoSize[]

  /** Message is a sticker, information about the sticker */
  sticker?: Sticker

  /** Message is a video, information about the video */
  video?: Video

  /** Message is a voice message, information about the file */
  voice?: Voice

  /**
   * Message is a [video
   * note](https://telegram.org/blog/video-messages-and-telescope),
   * information about the video message
   */
  video_note?: VideoNote

  /**
   * Caption for the animation, audio, document, photo, video or voice,
   * 0-1024 characters
   */
  caption?: string

  /** Message is a shared contact, information about the contact */
  contact?: IContact

  /** Message is a shared location, information about the location */
  location?: ILocation

  /** Message is a venue, information about the venue */
  venue?: IVenue

  /** Message is a native poll, information about the poll */
  poll?: IPoll

  /**
   * New members that were added to the group or supergroup and information
   * about them (the bot itself may be one of these members)
   */
  new_chat_members?: User[]

  /**
   * A member was removed from the group, information about them (this
   * member may be the bot itself)
   */
  left_chat_member?: User

  /** A chat title was changed to this value */
  new_chat_title?: string

  /** A chat photo was change to this value */
  new_chat_photo?: PhotoSize[]

  /** Service message: the chat photo was deleted */
  delete_chat_photo?: true

  /** Service message: the group has been created */
  group_chat_created?: true

  /**
   * Service message: the supergroup has been created. This field can‘t be
   * received in a message coming through updates, because bot can’t be a
   * member of a supergroup when it is created. It can only be found in
   * reply_to_message if someone replies to a very first message in a
   * directly created supergroup.
   */
  supergroup_chat_created?: true

  /**
   * Service message: the channel has been created. This field can‘t be
   * received in a message coming through updates, because bot can’t be a
   * member of a channel when it is created. It can only be found in
   * reply_to_message if someone replies to a very first message in a
   * channel.
   */
  channel_chat_created?: true

  /**
   * The group has been migrated to a supergroup with the specified
   * identifier. This number may be greater than 32 bits and some
   * programming languages may have difficulty/silent defects in
   * interpreting it. But it is smaller than 52 bits, so a signed 64 bit
   * integer or double-precision float type are safe for storing this
   * identifier.
   */
  migrate_to_chat_id?: integer

  /**
   * The supergroup has been migrated from a group with the specified
   * identifier. This number may be greater than 32 bits and some
   * programming languages may have difficulty/silent defects in
   * interpreting it. But it is smaller than 52 bits, so a signed 64 bit
   * integer or double-precision float type are safe for storing this
   * identifier.
   */
  migrate_from_chat_id?: integer

  /**
   * Specified message was pinned. Note that the Message object in this
   * field will not contain further *reply_to_message* fields even if it is
   * itself a reply.
   */
  pinned_message?: Message

  /**
   * Message is an invoice for a
   * [payment](https://core.telegram.org/bots/api#payments), information
   * about the invoice.
   */
  invoice?: IInvoice

  /**
   * Message is a service message about a successful payment, information
   * about the payment.
   */
  successful_payment?: ISuccessfulPayment

  /** The domain name of the website on which the user has logged in. */
  connected_website?: string

  /** Telegram Passport data */
  passport_data?: PassportData

  /**
   * Inline keyboard attached to the message. `login_url` buttons are
   * represented as ordinary `url` buttons.
   */
  reply_markup?: IInlineKeyboardMarkup

  /**
   * Parses a raw [[IMessage]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, { message_id: x.message_id, chat: x.chat })
    if (typeof x.from !== 'undefined') {
      this.from = new User(x.from, client)
    }
    this.date = new Date(x.date * 1000)
    this.chat = new Chat(x.chat, client)
    if (typeof x.forward_from !== 'undefined') {
      this.forward_from = new User(x.forward_from, client)
    }
    if (typeof x.forward_from_chat !== 'undefined') {
      this.forward_from_chat = new Chat(x.forward_from_chat, client)
    }
    if (typeof x.forward_from_message_id !== 'undefined') {
      this.forward_from_message_id = x.forward_from_message_id
    }
    if (typeof x.forward_signature !== 'undefined') {
      this.forward_signature = x.forward_signature
    }
    if (typeof x.forward_sender_name !== 'undefined') {
      this.forward_sender_name = x.forward_sender_name
    }
    if (typeof x.forward_date !== 'undefined') {
      this.forward_date = new Date(x.forward_date * 1000)
    }
    if (typeof x.reply_to_message !== 'undefined') {
      this.reply_to_message = new Message(x.reply_to_message, client)
    }
    if (typeof x.edit_date !== 'undefined') {
      this.edit_date = new Date(x.edit_date * 1000)
    }
    if (typeof x.media_group_id !== 'undefined') {
      this.media_group_id = x.media_group_id
    }
    if (typeof x.author_signature !== 'undefined') {
      this.author_signature = x.author_signature
    }
    if (typeof x.text !== 'undefined') {
      this.text = x.text
    }
    if (typeof x.entities !== 'undefined') {
      this.entities = x.entities.map((x: any) => new MessageEntity(x, client))
    }
    if (typeof x.caption_entities !== 'undefined') {
      this.caption_entities = x.caption_entities.map((x: any) => new MessageEntity(x, client))
    }
    if (typeof x.audio !== 'undefined') {
      this.audio = new Audio(x.audio, client)
    }
    if (typeof x.document !== 'undefined') {
      this.document = new Document(x.document, client)
    }
    if (typeof x.animation !== 'undefined') {
      this.animation = new Animation(x.animation, client)
    }
    if (typeof x.game !== 'undefined') {
      this.game = new Game(x.game, client)
    }
    if (typeof x.photo !== 'undefined') {
      this.photo = x.photo.map((x: any) => new PhotoSize(x, client))
    }
    if (typeof x.sticker !== 'undefined') {
      this.sticker = new Sticker(x.sticker, client)
    }
    if (typeof x.video !== 'undefined') {
      this.video = new Video(x.video, client)
    }
    if (typeof x.voice !== 'undefined') {
      this.voice = new Voice(x.voice, client)
    }
    if (typeof x.video_note !== 'undefined') {
      this.video_note = new VideoNote(x.video_note, client)
    }
    if (typeof x.caption !== 'undefined') {
      this.caption = x.caption
    }
    if (typeof x.contact !== 'undefined') {
      this.contact = x.contact
    }
    if (typeof x.location !== 'undefined') {
      this.location = x.location
    }
    if (typeof x.venue !== 'undefined') {
      this.venue = x.venue
    }
    if (typeof x.poll !== 'undefined') {
      this.poll = x.poll
    }
    if (typeof x.new_chat_members !== 'undefined') {
      this.new_chat_members = x.new_chat_members.map((x: any) => new User(x, client))
    }
    if (typeof x.left_chat_member !== 'undefined') {
      this.left_chat_member = new User(x.left_chat_member, client)
    }
    if (typeof x.new_chat_title !== 'undefined') {
      this.new_chat_title = x.new_chat_title
    }
    if (typeof x.new_chat_photo !== 'undefined') {
      this.new_chat_photo = x.new_chat_photo.map((x: any) => new PhotoSize(x, client))
    }
    if (typeof x.delete_chat_photo !== 'undefined') {
      this.delete_chat_photo = x.delete_chat_photo
    }
    if (typeof x.group_chat_created !== 'undefined') {
      this.group_chat_created = x.group_chat_created
    }
    if (typeof x.supergroup_chat_created !== 'undefined') {
      this.supergroup_chat_created = x.supergroup_chat_created
    }
    if (typeof x.channel_chat_created !== 'undefined') {
      this.channel_chat_created = x.channel_chat_created
    }
    if (typeof x.migrate_to_chat_id !== 'undefined') {
      this.migrate_to_chat_id = x.migrate_to_chat_id
    }
    if (typeof x.migrate_from_chat_id !== 'undefined') {
      this.migrate_from_chat_id = x.migrate_from_chat_id
    }
    if (typeof x.pinned_message !== 'undefined') {
      this.pinned_message = new Message(x.pinned_message, client)
    }
    if (typeof x.invoice !== 'undefined') {
      this.invoice = x.invoice
    }
    if (typeof x.successful_payment !== 'undefined') {
      this.successful_payment = x.successful_payment
    }
    if (typeof x.connected_website !== 'undefined') {
      this.connected_website = x.connected_website
    }
    if (typeof x.passport_data !== 'undefined') {
      this.passport_data = new PassportData(x.passport_data, client)
    }
    if (typeof x.reply_markup !== 'undefined') {
      this.reply_markup = x.reply_markup
    }
  }
}

/**
 * This object represents one special entity in a text message. For
 * example, hashtags, usernames, URLs, etc.
 */
export class MessageEntity implements IMessageEntity {
  /**
   * Type of the entity. Can be “mention” (`@username`), “hashtag”
   * (`#hashtag`), “cashtag” (`$USD`), “bot_command” (`/start@jobs_bot`),
   * “url” (`https://telegram.org`), “email” (`do-not-reply@telegram.org`),
   * “phone_number” (`+1-212-555-0123`), “bold” (**bold text**), “italic”
   * (*italic text*), “underline” (underlined text), “strikethrough”
   * (strikethrough text), “code” (monowidth string), “pre” (monowidth
   * block), “text_link” (for clickable text URLs), “text_mention” (for
   * users [without
   * usernames](https://telegram.org/blog/edit#new-mentions))
   */
  type: 'mention' | 'hashtag' | 'cashtag' | 'bot_command' | 'url' | 'email' | 'phone_number' | 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'pre' | 'text_link' | 'text_mention'

  /** Offset in UTF-16 code units to the start of the entity */
  offset: integer

  /** Length of the entity in UTF-16 code units */
  length: integer

  /**
   * For “text_link” only, url that will be opened after user taps on the
   * text
   */
  url?: string

  /** For “text_mention” only, the mentioned user */
  user?: User

  /** For “pre” only, the programming language of the entity text */
  language?: string

  /**
   * Parses a raw [[IMessageEntity]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    this.type = x.type
    this.offset = x.offset
    this.length = x.length
    if (typeof x.url !== 'undefined') {
      this.url = x.url
    }
    if (typeof x.user !== 'undefined') {
      this.user = new User(x.user, client)
    }
    if (typeof x.language !== 'undefined') {
      this.language = x.language
    }
  }
}

/**
 * This object represents one size of a photo or a [[IDocument]] /
 * [[ISticker]] thumbnail.
 */
export class PhotoSize extends FileContext implements IPhotoSize {
  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** Photo width */
  width: integer

  /** Photo height */
  height: integer

  /** File size */
  file_size?: integer

  /**
   * Parses a raw [[IPhotoSize]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, x.file_id)
    this.file_unique_id = x.file_unique_id
    this.width = x.width
    this.height = x.height
    if (typeof x.file_size !== 'undefined') {
      this.file_size = x.file_size
    }
  }
}

/**
 * This object represents an audio file to be treated as music by the
 * Telegram clients.
 */
export class Audio extends FileContext implements IAudio {
  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** Duration of the audio in seconds as defined by sender */
  duration: integer

  /** Performer of the audio as defined by sender or by audio tags */
  performer?: string

  /** Title of the audio as defined by sender or by audio tags */
  title?: string

  /** MIME type of the file as defined by sender */
  mime_type?: string

  /** File size */
  file_size?: integer

  /** Thumbnail of the album cover to which the music file belongs */
  thumb?: PhotoSize

  /**
   * Parses a raw [[IAudio]] object received from Telegram, into Botgram's
   * representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, x.file_id)
    this.file_unique_id = x.file_unique_id
    this.duration = x.duration
    if (typeof x.performer !== 'undefined') {
      this.performer = x.performer
    }
    if (typeof x.title !== 'undefined') {
      this.title = x.title
    }
    if (typeof x.mime_type !== 'undefined') {
      this.mime_type = x.mime_type
    }
    if (typeof x.file_size !== 'undefined') {
      this.file_size = x.file_size
    }
    if (typeof x.thumb !== 'undefined') {
      this.thumb = new PhotoSize(x.thumb, client)
    }
  }
}

/**
 * This object represents a general file (as opposed to [[IPhotoSize]],
 * [[IVoice]] and [[IAudio]]).
 */
export class Document extends FileContext implements IDocument {
  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** Document thumbnail as defined by sender */
  thumb?: PhotoSize

  /** Original filename as defined by sender */
  file_name?: string

  /** MIME type of the file as defined by sender */
  mime_type?: string

  /** File size */
  file_size?: integer

  /**
   * Parses a raw [[IDocument]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, x.file_id)
    this.file_unique_id = x.file_unique_id
    if (typeof x.thumb !== 'undefined') {
      this.thumb = new PhotoSize(x.thumb, client)
    }
    if (typeof x.file_name !== 'undefined') {
      this.file_name = x.file_name
    }
    if (typeof x.mime_type !== 'undefined') {
      this.mime_type = x.mime_type
    }
    if (typeof x.file_size !== 'undefined') {
      this.file_size = x.file_size
    }
  }
}

/**
 * This object represents a video file.
 */
export class Video extends FileContext implements IVideo {
  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** Video width as defined by sender */
  width: integer

  /** Video height as defined by sender */
  height: integer

  /** Duration of the video in seconds as defined by sender */
  duration: integer

  /** Video thumbnail */
  thumb?: PhotoSize

  /** Mime type of a file as defined by sender */
  mime_type?: string

  /** File size */
  file_size?: integer

  /**
   * Parses a raw [[IVideo]] object received from Telegram, into Botgram's
   * representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, x.file_id)
    this.file_unique_id = x.file_unique_id
    this.width = x.width
    this.height = x.height
    this.duration = x.duration
    if (typeof x.thumb !== 'undefined') {
      this.thumb = new PhotoSize(x.thumb, client)
    }
    if (typeof x.mime_type !== 'undefined') {
      this.mime_type = x.mime_type
    }
    if (typeof x.file_size !== 'undefined') {
      this.file_size = x.file_size
    }
  }
}

/**
 * This object represents an animation file (GIF or H.264/MPEG-4 AVC
 * video without sound).
 */
export class Animation extends FileContext implements IAnimation {
  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** Video width as defined by sender */
  width: integer

  /** Video height as defined by sender */
  height: integer

  /** Duration of the video in seconds as defined by sender */
  duration: integer

  /** Animation thumbnail as defined by sender */
  thumb?: PhotoSize

  /** Original animation filename as defined by sender */
  file_name?: string

  /** MIME type of the file as defined by sender */
  mime_type?: string

  /** File size */
  file_size?: integer

  /**
   * Parses a raw [[IAnimation]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, x.file_id)
    this.file_unique_id = x.file_unique_id
    this.width = x.width
    this.height = x.height
    this.duration = x.duration
    if (typeof x.thumb !== 'undefined') {
      this.thumb = new PhotoSize(x.thumb, client)
    }
    if (typeof x.file_name !== 'undefined') {
      this.file_name = x.file_name
    }
    if (typeof x.mime_type !== 'undefined') {
      this.mime_type = x.mime_type
    }
    if (typeof x.file_size !== 'undefined') {
      this.file_size = x.file_size
    }
  }
}

/**
 * This object represents a voice note.
 */
export class Voice extends FileContext implements IVoice {
  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** Duration of the audio in seconds as defined by sender */
  duration: integer

  /** MIME type of the file as defined by sender */
  mime_type?: string

  /** File size */
  file_size?: integer

  /**
   * Parses a raw [[IVoice]] object received from Telegram, into Botgram's
   * representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, x.file_id)
    this.file_unique_id = x.file_unique_id
    this.duration = x.duration
    if (typeof x.mime_type !== 'undefined') {
      this.mime_type = x.mime_type
    }
    if (typeof x.file_size !== 'undefined') {
      this.file_size = x.file_size
    }
  }
}

/**
 * This object represents a [video
 * message](https://telegram.org/blog/video-messages-and-telescope)
 * (available in Telegram apps as of
 * [v.4.0](https://telegram.org/blog/video-messages-and-telescope)).
 */
export class VideoNote extends FileContext implements IVideoNote {
  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /**
   * Video width and height (diameter of the video message) as defined by
   * sender
   */
  length: integer

  /** Duration of the video in seconds as defined by sender */
  duration: integer

  /** Video thumbnail */
  thumb?: PhotoSize

  /** File size */
  file_size?: integer

  /**
   * Parses a raw [[IVideoNote]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, x.file_id)
    this.file_unique_id = x.file_unique_id
    this.length = x.length
    this.duration = x.duration
    if (typeof x.thumb !== 'undefined') {
      this.thumb = new PhotoSize(x.thumb, client)
    }
    if (typeof x.file_size !== 'undefined') {
      this.file_size = x.file_size
    }
  }
}

/**
 * This object represents an answer of a user in a non-anonymous poll.
 */
export class PollAnswer implements IPollAnswer {
  /** Unique poll identifier */
  poll_id: string

  /** The user, who changed the answer to the poll */
  user: User

  /**
   * 0-based identifiers of answer options, chosen by the user. May be
   * empty if the user retracted their vote.
   */
  option_ids: integer[]

  /**
   * Parses a raw [[IPollAnswer]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    this.poll_id = x.poll_id
    this.user = new User(x.user, client)
    this.option_ids = x.option_ids
  }
}

/**
 * This object represent a user's profile pictures.
 */
export class UserProfilePhotos implements IUserProfilePhotos {
  /** Total number of profile pictures the target user has */
  total_count: integer

  /** Requested profile pictures (in up to 4 sizes each) */
  photos: PhotoSize[][]

  /**
   * Parses a raw [[IUserProfilePhotos]] object received from Telegram,
   * into Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    this.total_count = x.total_count
    this.photos = x.photos.map((x: any) => x.map((x: any) => new PhotoSize(x, client)))
  }
}

/**
 * This object represents a file ready to be downloaded. The file can be
 * downloaded via the link
 * `https://api.telegram.org/file/bot<token>/<file_path>`. It is
 * guaranteed that the link will be valid for at least 1 hour. When the
 * link expires, a new one can be requested by calling [[getFile]].
 *
 * > Maximum file size to download is 20 MB
 */
export class File extends FileContext implements IFile {
  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** File size, if known */
  file_size?: integer

  /**
   * File path. Use `https://api.telegram.org/file/bot<token>/<file_path>`
   * to get the file.
   */
  file_path?: string

  /**
   * Parses a raw [[IFile]] object received from Telegram, into Botgram's
   * representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, x.file_id)
    this.file_unique_id = x.file_unique_id
    if (typeof x.file_size !== 'undefined') {
      this.file_size = x.file_size
    }
    if (typeof x.file_path !== 'undefined') {
      this.file_path = x.file_path
    }
  }
}

/**
 * This object represents an incoming callback query from a callback
 * button in an [inline
 * keyboard](https://core.telegram.org/bots#inline-keyboards-and-on-the-fly-updating).
 * If the button that originated the query was attached to a message sent
 * by the bot, the field *message* will be present. If the button was
 * attached to a message sent via the bot (in [inline
 * mode](https://core.telegram.org/bots/api#inline-mode)), the field
 * *inline_message_id* will be present. Exactly one of the fields *data*
 * or *game_short_name* will be present.
 *
 * > **NOTE:** After the user presses a callback button, Telegram clients
 * > will display a progress bar until you call [[answerCallbackQuery]]. It
 * > is, therefore, necessary to react by calling [[answerCallbackQuery]]
 * > even if no notification to the user is needed (e.g., without
 * > specifying any of the optional parameters).
 */
export class CallbackQuery extends CallbackQueryContext implements ICallbackQuery {
  /** Sender */
  from: User

  /**
   * Message with the callback button that originated the query. Note that
   * message content and message date will not be available if the message
   * is too old
   */
  message?: Message

  /**
   * Identifier of the message sent via the bot in inline mode, that
   * originated the query.
   */
  inline_message_id?: string

  /**
   * Global identifier, uniquely corresponding to the chat to which the
   * message with the callback button was sent. Useful for high scores in
   * [games](https://core.telegram.org/bots/api#games).
   */
  chat_instance: string

  /**
   * Data associated with the callback button. Be aware that a bad client
   * can send arbitrary data in this field.
   */
  data?: string

  /**
   * Short name of a [Game](https://core.telegram.org/bots/api#games) to be
   * returned, serves as the unique identifier for the game
   */
  game_short_name?: string

  /**
   * Parses a raw [[ICallbackQuery]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, x.id)
    this.from = new User(x.from, client)
    if (typeof x.message !== 'undefined') {
      this.message = new Message(x.message, client)
    }
    if (typeof x.inline_message_id !== 'undefined') {
      this.inline_message_id = x.inline_message_id
    }
    this.chat_instance = x.chat_instance
    if (typeof x.data !== 'undefined') {
      this.data = x.data
    }
    if (typeof x.game_short_name !== 'undefined') {
      this.game_short_name = x.game_short_name
    }
  }
}

/**
 * This object contains information about one member of a chat.
 */
export class ChatMember implements IChatMember {
  /** Information about the user */
  user: User

  /**
   * The member's status in the chat. Can be “creator”, “administrator”,
   * “member”, “restricted”, “left” or “kicked”
   */
  status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked'

  /** Owner and administrators only. Custom title for this user */
  custom_title?: string

  /**
   * Restricted and kicked only. Date when restrictions will be lifted for
   * this user; unix time
   */
  until_date?: Date

  /**
   * Administrators only. True, if the bot is allowed to edit administrator
   * privileges of that user
   */
  can_be_edited?: boolean

  /**
   * Administrators only. True, if the administrator can post in the
   * channel; channels only
   */
  can_post_messages?: boolean

  /**
   * Administrators only. True, if the administrator can edit messages of
   * other users and can pin messages; channels only
   */
  can_edit_messages?: boolean

  /**
   * Administrators only. True, if the administrator can delete messages of
   * other users
   */
  can_delete_messages?: boolean

  /**
   * Administrators only. True, if the administrator can restrict, ban or
   * unban chat members
   */
  can_restrict_members?: boolean

  /**
   * Administrators only. True, if the administrator can add new
   * administrators with a subset of his own privileges or demote
   * administrators that he has promoted, directly or indirectly (promoted
   * by administrators that were appointed by the user)
   */
  can_promote_members?: boolean

  /**
   * Administrators and restricted only. True, if the user is allowed to
   * change the chat title, photo and other settings
   */
  can_change_info?: boolean

  /**
   * Administrators and restricted only. True, if the user is allowed to
   * invite new users to the chat
   */
  can_invite_users?: boolean

  /**
   * Administrators and restricted only. True, if the user is allowed to
   * pin messages; groups and supergroups only
   */
  can_pin_messages?: boolean

  /**
   * Restricted only. True, if the user is a member of the chat at the
   * moment of the request
   */
  is_member?: boolean

  /**
   * Restricted only. True, if the user is allowed to send text messages,
   * contacts, locations and venues
   */
  can_send_messages?: boolean

  /**
   * Restricted only. True, if the user is allowed to send audios,
   * documents, photos, videos, video notes and voice notes
   */
  can_send_media_messages?: boolean

  /** Restricted only. True, if the user is allowed to send polls */
  can_send_polls?: boolean

  /**
   * Restricted only. True, if the user is allowed to send animations,
   * games, stickers and use inline bots
   */
  can_send_other_messages?: boolean

  /**
   * Restricted only. True, if the user is allowed to add web page previews
   * to their messages
   */
  can_add_web_page_previews?: boolean

  /**
   * Parses a raw [[IChatMember]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    this.user = new User(x.user, client)
    this.status = x.status
    if (typeof x.custom_title !== 'undefined') {
      this.custom_title = x.custom_title
    }
    if (typeof x.until_date !== 'undefined') {
      this.until_date = new Date(x.until_date * 1000)
    }
    if (typeof x.can_be_edited !== 'undefined') {
      this.can_be_edited = x.can_be_edited
    }
    if (typeof x.can_post_messages !== 'undefined') {
      this.can_post_messages = x.can_post_messages
    }
    if (typeof x.can_edit_messages !== 'undefined') {
      this.can_edit_messages = x.can_edit_messages
    }
    if (typeof x.can_delete_messages !== 'undefined') {
      this.can_delete_messages = x.can_delete_messages
    }
    if (typeof x.can_restrict_members !== 'undefined') {
      this.can_restrict_members = x.can_restrict_members
    }
    if (typeof x.can_promote_members !== 'undefined') {
      this.can_promote_members = x.can_promote_members
    }
    if (typeof x.can_change_info !== 'undefined') {
      this.can_change_info = x.can_change_info
    }
    if (typeof x.can_invite_users !== 'undefined') {
      this.can_invite_users = x.can_invite_users
    }
    if (typeof x.can_pin_messages !== 'undefined') {
      this.can_pin_messages = x.can_pin_messages
    }
    if (typeof x.is_member !== 'undefined') {
      this.is_member = x.is_member
    }
    if (typeof x.can_send_messages !== 'undefined') {
      this.can_send_messages = x.can_send_messages
    }
    if (typeof x.can_send_media_messages !== 'undefined') {
      this.can_send_media_messages = x.can_send_media_messages
    }
    if (typeof x.can_send_polls !== 'undefined') {
      this.can_send_polls = x.can_send_polls
    }
    if (typeof x.can_send_other_messages !== 'undefined') {
      this.can_send_other_messages = x.can_send_other_messages
    }
    if (typeof x.can_add_web_page_previews !== 'undefined') {
      this.can_add_web_page_previews = x.can_add_web_page_previews
    }
  }
}

/**
 * Formats [[IInputMedia]] data, from Botgram's representation into an
 * object ready to be sent to Telegram
 *
 * Users should never need to use this method directly.
 *
 * @param result - Object to populate
 * @param x - Data to format
 * @param fdata - Formatting data structure
 */
export function formatInputMedia (result: any, x: IInputMedia, fdata: FormatData): object {
  if (x.type === 'animation') {
    return formatInputMediaAnimation(result, x, fdata)
  } else if (x.type === 'audio') {
    return formatInputMediaAudio(result, x, fdata)
  } else if (x.type === 'document') {
    return formatInputMediaDocument(result, x, fdata)
  } else if (x.type === 'photo') {
    return formatInputMediaPhoto(result, x, fdata)
  } else if (x.type === 'video') {
    return formatInputMediaVideo(result, x, fdata)
  } else {
    throw new ValidationError('No subtype matched')
  }
}

/**
 * Formats [[IInputMediaPhoto]] data, from Botgram's representation into
 * an object ready to be sent to Telegram
 *
 * Users should never need to use this method directly.
 *
 * @param result - Object to populate
 * @param x - Data to format
 * @param fdata - Formatting data structure
 */
export function formatInputMediaPhoto (result: any, x: IInputMediaPhoto, fdata: FormatData): object {
  result.type = x.type
  result.media = extractInputFile(fdata, x.media)
  if (typeof x.caption !== 'undefined') {
    result.caption = x.caption
  }
  if (typeof x.parse_mode !== 'undefined') {
    result.parse_mode = x.parse_mode
  }
  return result
}

/**
 * Formats [[IInputMediaVideo]] data, from Botgram's representation into
 * an object ready to be sent to Telegram
 *
 * Users should never need to use this method directly.
 *
 * @param result - Object to populate
 * @param x - Data to format
 * @param fdata - Formatting data structure
 */
export function formatInputMediaVideo (result: any, x: IInputMediaVideo, fdata: FormatData): object {
  result.type = x.type
  result.media = extractInputFile(fdata, x.media)
  if (typeof x.thumb !== 'undefined') {
    result.thumb = extractInputFile(fdata, x.thumb)
  }
  if (typeof x.caption !== 'undefined') {
    result.caption = x.caption
  }
  if (typeof x.parse_mode !== 'undefined') {
    result.parse_mode = x.parse_mode
  }
  if (typeof x.width !== 'undefined') {
    result.width = x.width
  }
  if (typeof x.height !== 'undefined') {
    result.height = x.height
  }
  if (typeof x.duration !== 'undefined') {
    result.duration = x.duration
  }
  if (typeof x.supports_streaming !== 'undefined') {
    result.supports_streaming = x.supports_streaming
  }
  return result
}

/**
 * Formats [[IInputMediaAnimation]] data, from Botgram's representation
 * into an object ready to be sent to Telegram
 *
 * Users should never need to use this method directly.
 *
 * @param result - Object to populate
 * @param x - Data to format
 * @param fdata - Formatting data structure
 */
export function formatInputMediaAnimation (result: any, x: IInputMediaAnimation, fdata: FormatData): object {
  result.type = x.type
  result.media = extractInputFile(fdata, x.media)
  if (typeof x.thumb !== 'undefined') {
    result.thumb = extractInputFile(fdata, x.thumb)
  }
  if (typeof x.caption !== 'undefined') {
    result.caption = x.caption
  }
  if (typeof x.parse_mode !== 'undefined') {
    result.parse_mode = x.parse_mode
  }
  if (typeof x.width !== 'undefined') {
    result.width = x.width
  }
  if (typeof x.height !== 'undefined') {
    result.height = x.height
  }
  if (typeof x.duration !== 'undefined') {
    result.duration = x.duration
  }
  return result
}

/**
 * Formats [[IInputMediaAudio]] data, from Botgram's representation into
 * an object ready to be sent to Telegram
 *
 * Users should never need to use this method directly.
 *
 * @param result - Object to populate
 * @param x - Data to format
 * @param fdata - Formatting data structure
 */
export function formatInputMediaAudio (result: any, x: IInputMediaAudio, fdata: FormatData): object {
  result.type = x.type
  result.media = extractInputFile(fdata, x.media)
  if (typeof x.thumb !== 'undefined') {
    result.thumb = extractInputFile(fdata, x.thumb)
  }
  if (typeof x.caption !== 'undefined') {
    result.caption = x.caption
  }
  if (typeof x.parse_mode !== 'undefined') {
    result.parse_mode = x.parse_mode
  }
  if (typeof x.duration !== 'undefined') {
    result.duration = x.duration
  }
  if (typeof x.performer !== 'undefined') {
    result.performer = x.performer
  }
  if (typeof x.title !== 'undefined') {
    result.title = x.title
  }
  return result
}

/**
 * Formats [[IInputMediaDocument]] data, from Botgram's representation
 * into an object ready to be sent to Telegram
 *
 * Users should never need to use this method directly.
 *
 * @param result - Object to populate
 * @param x - Data to format
 * @param fdata - Formatting data structure
 */
export function formatInputMediaDocument (result: any, x: IInputMediaDocument, fdata: FormatData): object {
  result.type = x.type
  result.media = extractInputFile(fdata, x.media)
  if (typeof x.thumb !== 'undefined') {
    result.thumb = extractInputFile(fdata, x.thumb)
  }
  if (typeof x.caption !== 'undefined') {
    result.caption = x.caption
  }
  if (typeof x.parse_mode !== 'undefined') {
    result.parse_mode = x.parse_mode
  }
  return result
}

/**
 * This object represents a sticker.
 */
export class Sticker extends FileContext implements ISticker {
  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** Sticker width */
  width: integer

  /** Sticker height */
  height: integer

  /**
   * *True*, if the sticker is
   * [animated](https://telegram.org/blog/animated-stickers)
   */
  is_animated: boolean

  /** Sticker thumbnail in the .webp or .jpg format */
  thumb?: PhotoSize

  /** Emoji associated with the sticker */
  emoji?: string

  /** Name of the sticker set to which the sticker belongs */
  set_name?: string

  /** For mask stickers, the position where the mask should be placed */
  mask_position?: IMaskPosition

  /** File size */
  file_size?: integer

  /**
   * Parses a raw [[ISticker]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, x.file_id)
    this.file_unique_id = x.file_unique_id
    this.width = x.width
    this.height = x.height
    this.is_animated = x.is_animated
    if (typeof x.thumb !== 'undefined') {
      this.thumb = new PhotoSize(x.thumb, client)
    }
    if (typeof x.emoji !== 'undefined') {
      this.emoji = x.emoji
    }
    if (typeof x.set_name !== 'undefined') {
      this.set_name = x.set_name
    }
    if (typeof x.mask_position !== 'undefined') {
      this.mask_position = x.mask_position
    }
    if (typeof x.file_size !== 'undefined') {
      this.file_size = x.file_size
    }
  }
}

/**
 * This object represents a sticker set.
 */
export class StickerSet implements IStickerSet {
  /** Sticker set name */
  name: string

  /** Sticker set title */
  title: string

  /**
   * *True*, if the sticker set contains [animated
   * stickers](https://telegram.org/blog/animated-stickers)
   */
  is_animated: boolean

  /** *True*, if the sticker set contains masks */
  contains_masks: boolean

  /** List of all set stickers */
  stickers: Sticker[]

  /**
   * Parses a raw [[IStickerSet]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    this.name = x.name
    this.title = x.title
    this.is_animated = x.is_animated
    this.contains_masks = x.contains_masks
    this.stickers = x.stickers.map((x: any) => new Sticker(x, client))
  }
}

/**
 * This object represents an incoming inline query. When the user sends
 * an empty query, your bot could return some default or trending
 * results.
 */
export class InlineQuery extends InlineQueryContext implements IInlineQuery {
  /** Sender */
  from: User

  /** Sender location, only for bots that request user location */
  location?: ILocation

  /** Text of the query (up to 512 characters) */
  query: string

  /** Offset of the results to be returned, can be controlled by the bot */
  offset: string

  /**
   * Parses a raw [[IInlineQuery]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, x.id)
    this.from = new User(x.from, client)
    if (typeof x.location !== 'undefined') {
      this.location = x.location
    }
    this.query = x.query
    this.offset = x.offset
  }
}

/**
 * Represents a [[IInlineQueryResult]] of an inline query that was chosen
 * by the user and sent to their chat partner.
 *
 * **Note:** It is necessary to enable [inline
 * feedback](https://core.telegram.org/bots/inline#collecting-feedback)
 * via [@Botfather](https://t.me/botfather) in order to receive these
 * objects in updates.
 */
export class ChosenInlineResult implements IChosenInlineResult {
  /** The unique identifier for the result that was chosen */
  result_id: string

  /** The user that chose the result */
  from: User

  /** Sender location, only for bots that require user location */
  location?: ILocation

  /**
   * Identifier of the sent inline message. Available only if there is an
   * [[IInlineKeyboardMarkup]] attached to the message. Will be also
   * received in [[ICallbackQuery]] and can be used to
   * [edit](https://core.telegram.org/bots/api#updating-messages) the
   * message.
   */
  inline_message_id?: string

  /** The query that was used to obtain the result */
  query: string

  /**
   * Parses a raw [[IChosenInlineResult]] object received from Telegram,
   * into Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    this.result_id = x.result_id
    this.from = new User(x.from, client)
    if (typeof x.location !== 'undefined') {
      this.location = x.location
    }
    if (typeof x.inline_message_id !== 'undefined') {
      this.inline_message_id = x.inline_message_id
    }
    this.query = x.query
  }
}

/**
 * This object contains information about an incoming shipping query.
 */
export class ShippingQuery extends ShippingQueryContext implements IShippingQuery {
  /** User who sent the query */
  from: User

  /** Bot specified invoice payload */
  invoice_payload: string

  /** User specified shipping address */
  shipping_address: IShippingAddress

  /**
   * Parses a raw [[IShippingQuery]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, x.id)
    this.from = new User(x.from, client)
    this.invoice_payload = x.invoice_payload
    this.shipping_address = x.shipping_address
  }
}

/**
 * This object contains information about an incoming pre-checkout query.
 */
export class PreCheckoutQuery extends PreCheckoutQueryContext implements IPreCheckoutQuery {
  /** User who sent the query */
  from: User

  /**
   * Three-letter ISO 4217
   * [currency](https://core.telegram.org/bots/payments#supported-currencies)
   * code
   */
  currency: string

  /**
   * Total price in the *smallest units* of the currency (integer, **not**
   * float/double). For example, for a price of `US$ 1.45` pass `amount =
   * 145`. See the *exp* parameter in
   * [currencies.json](https://core.telegram.org/bots/payments/currencies.json),
   * it shows the number of digits past the decimal point for each currency
   * (2 for the majority of currencies).
   */
  total_amount: integer

  /** Bot specified invoice payload */
  invoice_payload: string

  /** Identifier of the shipping option chosen by the user */
  shipping_option_id?: string

  /** Order info provided by the user */
  order_info?: IOrderInfo

  /**
   * Parses a raw [[IPreCheckoutQuery]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, x.id)
    this.from = new User(x.from, client)
    this.currency = x.currency
    this.total_amount = x.total_amount
    this.invoice_payload = x.invoice_payload
    if (typeof x.shipping_option_id !== 'undefined') {
      this.shipping_option_id = x.shipping_option_id
    }
    if (typeof x.order_info !== 'undefined') {
      this.order_info = x.order_info
    }
  }
}

/**
 * Contains information about Telegram Passport data shared with the bot
 * by the user.
 */
export class PassportData implements IPassportData {
  /**
   * Array with information about documents and other Telegram Passport
   * elements that was shared with the bot
   */
  data: EncryptedPassportElement[]

  /** Encrypted credentials required to decrypt the data */
  credentials: IEncryptedCredentials

  /**
   * Parses a raw [[IPassportData]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    this.data = x.data.map((x: any) => new EncryptedPassportElement(x, client))
    this.credentials = x.credentials
  }
}

/**
 * This object represents a file uploaded to Telegram Passport. Currently
 * all Telegram Passport files are in JPEG format when decrypted and
 * don't exceed 10MB.
 */
export class PassportFile extends FileContext implements IPassportFile {
  /**
   * Unique identifier for this file, which is supposed to be the same over
   * time and for different bots. Can't be used to download or reuse the
   * file.
   */
  file_unique_id: string

  /** File size */
  file_size: integer

  /** Unix time when the file was uploaded */
  file_date: Date

  /**
   * Parses a raw [[IPassportFile]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    super(client, x.file_id)
    this.file_unique_id = x.file_unique_id
    this.file_size = x.file_size
    this.file_date = new Date(x.file_date * 1000)
  }
}

/**
 * Contains information about documents or other Telegram Passport
 * elements shared with the bot by the user.
 */
export class EncryptedPassportElement implements IEncryptedPassportElement {
  /**
   * Element type. One of “personal_details”, “passport”, “driver_license”,
   * “identity_card”, “internal_passport”, “address”, “utility_bill”,
   * “bank_statement”, “rental_agreement”, “passport_registration”,
   * “temporary_registration”, “phone_number”, “email”.
   */
  type: 'personal_details' | 'passport' | 'driver_license' | 'identity_card' | 'internal_passport' | 'address' | 'utility_bill' | 'bank_statement' | 'rental_agreement' | 'passport_registration' | 'temporary_registration' | 'phone_number' | 'email'

  /**
   * Base64-encoded encrypted Telegram Passport element data provided by
   * the user, available for “personal_details”, “passport”,
   * “driver_license”, “identity_card”, “internal_passport” and “address”
   * types. Can be decrypted and verified using the accompanying
   * [[IEncryptedCredentials]].
   */
  data?: string

  /** User's verified phone number, available only for “phone_number” type */
  phone_number?: string

  /** User's verified email address, available only for “email” type */
  email?: string

  /**
   * Array of encrypted files with documents provided by the user,
   * available for “utility_bill”, “bank_statement”, “rental_agreement”,
   * “passport_registration” and “temporary_registration” types. Files can
   * be decrypted and verified using the accompanying
   * [[IEncryptedCredentials]].
   */
  files?: PassportFile[]

  /**
   * Encrypted file with the front side of the document, provided by the
   * user. Available for “passport”, “driver_license”, “identity_card” and
   * “internal_passport”. The file can be decrypted and verified using the
   * accompanying [[IEncryptedCredentials]].
   */
  front_side?: PassportFile

  /**
   * Encrypted file with the reverse side of the document, provided by the
   * user. Available for “driver_license” and “identity_card”. The file can
   * be decrypted and verified using the accompanying
   * [[IEncryptedCredentials]].
   */
  reverse_side?: PassportFile

  /**
   * Encrypted file with the selfie of the user holding a document,
   * provided by the user; available for “passport”, “driver_license”,
   * “identity_card” and “internal_passport”. The file can be decrypted and
   * verified using the accompanying [[IEncryptedCredentials]].
   */
  selfie?: PassportFile

  /**
   * Array of encrypted files with translated versions of documents
   * provided by the user. Available if requested for “passport”,
   * “driver_license”, “identity_card”, “internal_passport”,
   * “utility_bill”, “bank_statement”, “rental_agreement”,
   * “passport_registration” and “temporary_registration” types. Files can
   * be decrypted and verified using the accompanying
   * [[IEncryptedCredentials]].
   */
  translation?: PassportFile[]

  /**
   * Base64-encoded element hash for using in
   * [[IPassportElementErrorUnspecified]]
   */
  hash: string

  /**
   * Parses a raw [[IEncryptedPassportElement]] object received from
   * Telegram, into Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    this.type = x.type
    if (typeof x.data !== 'undefined') {
      this.data = x.data
    }
    if (typeof x.phone_number !== 'undefined') {
      this.phone_number = x.phone_number
    }
    if (typeof x.email !== 'undefined') {
      this.email = x.email
    }
    if (typeof x.files !== 'undefined') {
      this.files = x.files.map((x: any) => new PassportFile(x, client))
    }
    if (typeof x.front_side !== 'undefined') {
      this.front_side = new PassportFile(x.front_side, client)
    }
    if (typeof x.reverse_side !== 'undefined') {
      this.reverse_side = new PassportFile(x.reverse_side, client)
    }
    if (typeof x.selfie !== 'undefined') {
      this.selfie = new PassportFile(x.selfie, client)
    }
    if (typeof x.translation !== 'undefined') {
      this.translation = x.translation.map((x: any) => new PassportFile(x, client))
    }
    this.hash = x.hash
  }
}

/**
 * This object represents a game. Use BotFather to create and edit games,
 * their short names will act as unique identifiers.
 */
export class Game implements IGame {
  /** Title of the game */
  title: string

  /** Description of the game */
  description: string

  /** Photo that will be displayed in the game message in chats. */
  photo: PhotoSize[]

  /**
   * Brief description of the game or high scores included in the game
   * message. Can be automatically edited to include current high scores
   * for the game when the bot calls [[setGameScore]], or manually edited
   * using [[editMessageText]]. 0-4096 characters.
   */
  text?: string

  /**
   * Special entities that appear in *text*, such as usernames, URLs, bot
   * commands, etc.
   */
  text_entities?: MessageEntity[]

  /**
   * Animation that will be displayed in the game message in chats. Upload
   * via [BotFather](https://t.me/botfather)
   */
  animation?: Animation

  /**
   * Parses a raw [[IGame]] object received from Telegram, into Botgram's
   * representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    this.title = x.title
    this.description = x.description
    this.photo = x.photo.map((x: any) => new PhotoSize(x, client))
    if (typeof x.text !== 'undefined') {
      this.text = x.text
    }
    if (typeof x.text_entities !== 'undefined') {
      this.text_entities = x.text_entities.map((x: any) => new MessageEntity(x, client))
    }
    if (typeof x.animation !== 'undefined') {
      this.animation = new Animation(x.animation, client)
    }
  }
}

/**
 * This object represents one row of the high scores table for a game.
 */
export class GameHighScore implements IGameHighScore {
  /** Position in high score table for the game */
  position: integer

  /** User */
  user: User

  /** Score */
  score: integer

  /**
   * Parses a raw [[IGameHighScore]] object received from Telegram, into
   * Botgram's representation.
   *
   * Users should never need to use this constructor directly.
   *
   * @param x - JSON-decoded object to parse
   * @param client - Client that returned contexts will make requests with
   */
  constructor (x: any, client: ClientBase) {
    this.position = x.position
    this.user = new User(x.user, client)
    this.score = x.score
  }
}
