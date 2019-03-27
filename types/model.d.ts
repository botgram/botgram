import { RequestError } from "./botgram";

// Chat / User types

export type Chat =
    chatUser |
    chatGroup |
    chatSupergroup |
    chatChannel;

interface ChatBase {
    id: number;
    type: string;
    name: string;
    username?: string;

    smallPhoto?: File;
    bigPhoto?: File;
}

export interface chatUser extends ChatBase {
    type: "user";
    firstname: string;
    lastname: string | null;
    language?: string;
}

export interface chatGroup extends ChatBase {
    type: "group";
    title: string;
    allMembersAreAdmins?: boolean;
}

export interface chatSupergroup extends ChatBase {
    type: "supergroup";
    title: string;
    description?: string;
    inviteLink?: string;
}

export interface chatChannel extends ChatBase {
    type: "channel";
    title: string;
    description?: string;
    inviteLink?: string;
}

export type User = chatUser;

// Message types

export type Message =
    messageText |
    messageAudio |
    messageDocument |
    messagePhoto |
    messageSticker |
    messageVideo |
    messageVideoNote |
    messageVoice |
    messageContact |
    messageLocation |
    messageVenue |
    messageGame |
    messageUpdate;

interface MessageBase {
    id: number;
    type: string | undefined;
    date: Date;
    editDate?: Date;
    queued: boolean;
    edited?: boolean;

    chat: Chat;
    user?: chatUser;
    group?: chatGroup | chatSupergroup;

    from?: User;
    forward?: {
        date: Date;
        id?: string;
        chat?: Chat;
        from?: User;
    };
    reply?: Message;
}

interface messageTextBase extends MessageBase {
    type: "text";
    text: string;
    entities: MessageEntity[];
    mentions(): string[];
    hashtags(): string[];
    mentions(x: string): number;
    hashtags(x: string): number;
}

export type messageText = messageNonCommand | messageCommand;

export interface messageNonCommand extends messageTextBase {
    command: false;
}

export interface messageCommand extends messageTextBase {
    command: string;
    args(): string;
    args(N: number): string[];
    username: string | null;
    mine: boolean;
    exclusive: boolean;
}

export interface messageAudio extends MessageBase {
    type: "audio";
    duration: number;
    file: File;
    performer?: string;
    title?: string;
}

export interface messageDocument extends MessageBase {
    type: "document";
    file: File;
    filename?: string;
    thumbnail?: Image;
}

export interface messagePhoto extends MessageBase, Photo {
    type: "photo";
    caption?: string;
}

export interface messageSticker extends MessageBase, Sticker {
    type: "sticker";
}

export interface messageVideo extends MessageBase {
    type: "video";
    file: File;
    width: number;
    height: number;
    duration: number;
    thumbnail?: Image;
    caption?: string;
}

export interface messageVideoNote extends MessageBase {
    type: "videoNote";
    length: number;
    duration: number;
    file: File;
    thumbnail?: Image;
}

export interface messageVoice extends MessageBase {
    type: "voice";
    duration: number;
    file: File;
}

export interface messageContact extends MessageBase {
    type: "contact";
    phone: string;
    firstname: string;
    lastname?: string;
    userId?: number;
}

export interface messageLocation extends MessageBase, Location {
    type: "location";
}

export interface messageVenue extends MessageBase {
    type: "venue";
    location: Location;
    title: string;
    address: string;
    foursquareId?: string;
}

export interface messageGame extends MessageBase {
    type: "game";
    title: string;
    description: string;
    photo: Photo;
    text?: string;
    entities?: MessageEntity[];
    animation?: Animation;
}

export type messageUpdate =
    messageUpdateMember |
    messageUpdateTitle |
    messageUpdatePhoto |
    messageUpdateChat;

export interface messageUpdateMember extends MessageBase {
    type: "update";
    subject: "member";
    action: "new" | "leave";
    member?: User;
    members?: User[];
}

export interface messageUpdateTitle extends MessageBase {
    type: "update";
    subject: "title";
    action: "new";
    title?: String;
}

export interface messageUpdatePhoto extends MessageBase {
    type: "update";
    subject: "photo";
    action: "new" | "delete";
    photo?: Photo;
}

export interface messageUpdateChat extends MessageBase {
    type: "update";
    subject: "chat";
    action: "create" | "migrateTo" | "migrateFrom";
    toId?: number;
    fromId?: number;
}

export interface messageUpdateMessage extends MessageBase {
    type: "update";
    subject: "message";
    action: "pin";
    message?: Message;
}

/**
 * This is not included in Message union because it prevents TS from inferring correctly.
 * If you need to process unknown messages, cast manually.
 */
export interface messageUnknown extends MessageBase {
    type: undefined;
    unparsed: any;
}

// MessageEntity

export type MessageEntity =
    messageEntityMention |
    messageEntityHashtag |
    messageEntityBotCommand |
    messageEntityUrl |
    messageEntityEmail |
    messageEntityBold |
    messageEntityItalic |
    messageEntityCode |
    messageEntityPre |
    messageEntityTextLink |
    messageEntityTextMention;

interface MessageEntityBase {
    type: string;
    offset: number;
    length: number;
}

export interface messageEntityMention extends MessageEntityBase {
    type: "mention";
}

export interface messageEntityHashtag extends MessageEntityBase {
    type: "hashtag";
}

export interface messageEntityBotCommand extends MessageEntityBase {
    type: "bot_command";
}

export interface messageEntityUrl extends MessageEntityBase {
    type: "url";
}

export interface messageEntityEmail extends MessageEntityBase {
    type: "email";
}

export interface messageEntityBold extends MessageEntityBase {
    type: "bold";
}

export interface messageEntityItalic extends MessageEntityBase {
    type: "italic";
}

export interface messageEntityCode extends MessageEntityBase {
    type: "code";
}

export interface messageEntityPre extends MessageEntityBase {
    type: "pre";
}

export interface messageEntityTextLink extends MessageEntityBase {
    type: "text_link";
    url: string;
}

export interface messageEntityTextMention extends MessageEntityBase {
    type: "text_mention";
    user: User;
}

// Other types

export interface Image {
    file: File;
    width: number;
    height: number;
}

export interface Location {
    longitude: number;
    latitude: number;
}

export interface File {
    id: string;
    size?: number;
    mime?: string;
    path?: string;
}

export interface Photo {
    sizes: Image[];
    image: Image;
}

export interface Animation {
    file: File;
    filename?: string;
    thumbnail?: Image;
}

export interface GameHighScore {
    position: number;
    user: User;
    score: number;
}

export interface ChatMember {
    user: User,
    status: "creator" | "administrator" | "member" | "restricted" | "left" | "kicked",
    until?: Date;
    editAllowed?: boolean;
    privileges: ChatMemberPrivileges;
}

export type ChatMemberPrivileges = ChatMemberPermissions & ChatMemberRestrictions;

export interface ChatMemberPermissions {
    changeInfo?: boolean;
    messagePost?: boolean;
    messageEdit?: boolean;
    messageDelete?: boolean;
    userInvite?: boolean;
    memberRestrict?: boolean;
    messagePin?: boolean;
    memberPromote?: boolean;
}

export interface ChatMemberRestrictions {
    messageSend?: boolean;
    messageSendMedia?: boolean;
    messageSendOther?: boolean;
    webPreviewAllow?: boolean;
}

export type KeyboardButton = string | {
    text: string;
    request?: "contact" | "location";
};

export type KeyboardRow = KeyboardButton | KeyboardButton[];

export interface InlineKeyboardButton {
    text: string;
    url?: string;
    callback_data?: string;
    switch_inline_query?: string;
    switch_inline_query_current_chat?: string;
    callback_game?: {};
    pay?: boolean;
}

// Stickers

export interface Sticker {
    file: File;
    width: number;
    height: number;
    emoji?: string;
    setName?: string;
    thumbnail?: Image;
    maskPosition?: MaskPosition;
}

export interface StickerSet {
    name: string;
    title: string;
    containsMasks: boolean;
    stickers: Sticker[];
}

export interface MaskPosition {
    point: "forehead" | "eyes" | "mouth" | "chin";
    shift: { x: number; y: number; };
    scale: number;
}

// Callback queries

export interface CallbackQuery {
    id: string;
    from: User;
    message?: Message;
    inlineMessageId?: string;
    chatInstance?: string;
    data?: string;
    gameShortName?: string;
    // extra fields added on facility
    queued: boolean;
    answer(options?: CallbackQueryAnswerOptions, callback?: (error: RequestError | null, result: true) => any): void;
}

export interface CallbackQueryAnswerOptions {
    alert?: boolean;
    text?: string;
    url?: string;
    cacheTime?: number;
}

// Inline queries

export interface InlineQuery {
    id: string;
    from: User;
    location?: Location;
    query: string;
    offset: string;
}

export interface ChosenInlineResult {
    id: string;
    from: User;
    location?: Location;
    inlineMessageId?: string;
    query: string;
}

// Functions! (resolvers / parsers / utilities)

export type FileLike = string | File;
export type StickerLike = FileLike | Sticker;
export type ChatLike = number | Chat;
export type MessageLike = number | Message;
export type StickerSetLike = string | StickerSet;
export type CallbackQueryLike = string | CallbackQuery;

export function resolveFile(x: FileLike): string;
export function resolveChat(x: ChatLike): number;
export function resolveMessage(x: MessageLike): number;
export function resolveSticker(x: StickerLike): string;
export function resolveStickerSet(x: StickerSetLike): string;

export function parsePhoto(photo: object, options: any): Photo;
export function parseCommand(msg: messageTextBase): messageCommand;
export function formatCommand(username: string | null | undefined | false, command: string, args?: string | string[]): string;
export function formatKeyboard(keys: KeyboardRow[]): object;
