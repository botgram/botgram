/// <reference types="node">

import { Agent } from "https";
import * as model from "./model";

declare function botgram(authToken: string, options?: botgram.BotOptions): botgram.Bot;

declare namespace botgram {

    // Bot object

    interface BotOptions {
        agent?: Agent;
        timeout?: number;
        strict?: boolean;
        autodetect?: boolean;
        retryInterval?: number;
        immediate?: boolean;
        ignoreUnknown?: boolean;
    }

    interface Bot extends HandlerQueue, CallbackHandlerQueue {

        options: BotOptions;
        get(key: string): any;
        set(key: string, value: any): void;
        callMethod(method: string, parameters: object[], callback: (error: RequestError | null, result?: any) => any): void;
        autodetect(callback: (error: RequestError | null) => any): void;
        ready(): Promise<void>;
        ready(callback: () => any): void;
        synced(): Promise<void>;
        synced(callback: () => any): void;
        stop(): void;
        processUpdate(update: Update): any;

        edited: HandlerQueue;
        reply(chat: model.ChatLike): ReplyQueue;

        // misc methods

        fileGet(file: model.FileLike): Promise<File>;
        fileGet(file: model.FileLike, callback: (error: RequestError | null, result?: File) => any): void;
        fileLink(path: File | string): string;
        fileStream(file: model.FileLike): Promise<ReadableStream>;
        fileStream(file: model.FileLike, callback: (error: RequestError | Error | null, result?: ReadableStream) => any): void;
        fileLoad(file: model.FileLike): Promise<Buffer>;
        fileLoad(file: model.FileLike, callback: (error: RequestError | Error | null, result?: Buffer) => any): void;

        getChat(chat: model.ChatLike): Promise<Chat>;
        getChat(chat: model.ChatLike, callback: (error: RequestError | null, result?: Chat) => any): void;
        getProfilePhotos(user: model.ChatLike, range?: [number, number] | null): Promise<model.Photo & { total: number; }>;
        getProfilePhotos(user: model.ChatLike, callback: (error: RequestError | null, result?: model.Photo & { total: number; }) => any): void;
        getProfilePhotos(user: model.ChatLike, range: [number, number] | null, callback: (error: RequestError | null, result?: model.Photo & { total: number; }) => any): void;
        setChatPhoto(chat: model.ChatLike, file: model.InputFile): Promise<void>;
        setChatPhoto(chat: model.ChatLike, file: model.InputFile, callback: (error: RequestError | null) => any): void;
        deleteChatPhoto(chat: model.ChatLike): Promise<void>;
        deleteChatPhoto(chat: model.ChatLike, callback: (error: RequestError | null) => any): void;
        setChatTitle(chat: model.ChatLike, title: string): Promise<void>;
        setChatTitle(chat: model.ChatLike, title: string, callback: (error: RequestError | null) => any): void;
        setChatDescription(chat: model.ChatLike, description: string | false): Promise<void>;
        setChatDescription(chat: model.ChatLike, description: string | false, callback: (error: RequestError | null) => any): void;
        pinChatMessage(chat: model.ChatLike, message: model.MessageLike, options: PinChatMessageOptions): Promise<void>;
        pinChatMessage(chat: model.ChatLike, message: model.MessageLike, options: PinChatMessageOptions, callback: (error: RequestError | null) => any): void;
        unpinChatMessage(chat: model.ChatLike): Promise<void>;
        unpinChatMessage(chat: model.ChatLike, callback: (error: RequestError | null) => any): void;

        exportChatInviteLink(chat: model.ChatLike): Promise<string>;
        exportChatInviteLink(chat: model.ChatLike, callback: (error: RequestError | null, result?: string) => any): void;
        kickMember(chat: model.ChatLike, user: model.ChatLike, until?: Date | number): Promise<void>;
        kickMember(chat: model.ChatLike, user: model.ChatLike, callback: (error: RequestError | null) => any): void;
        kickMember(chat: model.ChatLike, user: model.ChatLike, until: Date | number | undefined, callback: (error: RequestError | null) => any): void;
        unbanMember(chat: model.ChatLike, user: model.ChatLike): Promise<void>;
        unbanMember(chat: model.ChatLike, user: model.ChatLike, callback: (error: RequestError | null) => any): void;
        leaveChat(chat: model.ChatLike): Promise<void>;
        leaveChat(chat: model.ChatLike, callback: (error: RequestError | null) => any): void;
        getChatAdministrators(chat: model.ChatLike): Promise<ChatMember[]>;
        getChatAdministrators(chat: model.ChatLike, callback: (error: RequestError | null, result?: ChatMember[]) => any): void;
        getChatMembersCount(chat: model.ChatLike): Promise<number>;
        getChatMembersCount(chat: model.ChatLike, callback: (error: RequestError | null, result?: number) => any): void;
        getChatMember(chat: model.ChatLike, user: model.ChatLike): Promise<ChatMember>;
        getChatMember(chat: model.ChatLike, user: model.ChatLike, callback: (error: RequestError | null, result?: ChatMember) => any): void;
        promoteChatMember(chat: model.ChatLike, user: model.ChatLike, privileges: model.ChatMemberPermissions): Promise<void>;
        promoteChatMember(chat: model.ChatLike, user: model.ChatLike, privileges: model.ChatMemberPermissions, callback: (error: RequestError | null) => any): void;
        restrictChatMember(chat: model.ChatLike, user: model.ChatLike, privileges: model.ChatMemberRestrictions, until?: Date | number): Promise<void>;
        restrictChatMember(chat: model.ChatLike, user: model.ChatLike, privileges: model.ChatMemberRestrictions, callback: (error: RequestError | null) => any): void;
        restrictChatMember(chat: model.ChatLike, user: model.ChatLike, privileges: model.ChatMemberRestrictions, until: Date | number | undefined, callback: (error: RequestError | null) => any): void;

        linkGame(gameShortName: string): string;
        setGameScore(user: model.ChatLike, score: number, options: GameScoreMessage & GameScoreOptions): Promise<Message | true>;
        setGameScore(user: model.ChatLike, score: number, options: GameScoreMessage & GameScoreOptions, callback: (error: RequestError | null, result?: Message | true) => any): void;
        getGameHighScores(user: model.ChatLike, options: GameScoreMessage): Promise<GameHighScore[]>;
        getGameHighScores(user: model.ChatLike, options: GameScoreMessage, callback: (error: RequestError | null, result?: GameHighScore[]) => any): void;

        getStickerSet(name: string): Promise<StickerSet>;
        getStickerSet(name: string, callback: (error: RequestError | null, result?: StickerSet) => any): void;
        uploadStickerFile(user: model.ChatLike, file: model.InputFile): Promise<File>;
        uploadStickerFile(user: model.ChatLike, file: model.InputFile, callback: (error: RequestError | null, result?: File) => any): void;
        createNewStickerSet(user: model.ChatLike, name: string, options: StickerSetOptions & StickerOptions): Promise<void>;
        createNewStickerSet(user: model.ChatLike, name: string, options: StickerSetOptions & StickerOptions, callback: (error: RequestError | null) => any): void;
        addStickerToSet(user: model.ChatLike, stickerSet: model.StickerSetLike, options: StickerOptions): Promise<void>;
        addStickerToSet(user: model.ChatLike, stickerSet: model.StickerSetLike, options: StickerOptions, callback: (error: RequestError | null) => any): void;
        setStickerPositionInSet(sticker: model.StickerLike, position: number): Promise<void>;
        setStickerPositionInSet(sticker: model.StickerLike, position: number, callback: (error: RequestError | null) => any): void;
        deleteStickerFromSet(sticker: model.StickerLike): Promise<void>;
        deleteStickerFromSet(sticker: model.StickerLike, callback: (error: RequestError | null) => any): void;

        link(options?: LinkOptions | string, group?: boolean): string;
        linkGroup(options?: LinkOptions | string): string;
        formatCommand(username: string | boolean, command: string, ...args: string[]): string;
        formatCommand(username: string | boolean, command: string, args: string[]): string;

    }

    interface NetworkError extends Error {
        req: RequestInfo;
    }

    interface TelegramError {
        req: RequestInfo;
    }

    type RequestError = TelegramError | NetworkError;

    interface RequestInfo {
        method: string;
        parameters: object[];
        stack: string;
    }

    type Update = object; // FIXME

    interface PinChatMessageOptions {
        disableNotification?: boolean;
    }

    type GameScoreMessage =
        { chat: model.ChatLike, message: model.MessageLike; } | { message: string; };

    interface GameScoreOptions {
        disableEditMessage?: boolean;
        force?: boolean;
    }

    interface StickerSetOptions {
        title: string;
        containsMasks?: boolean;
    }

    interface StickerOptions {
        sticker: model.InputFile;
        emojis: string;
        maskPosition?: {
            point: model.MaskPosition["point"],
            x_shift: number;
            y_shift: number;
            scale: number;
        };
    }

    interface LinkOptions {
        payload?: string;
        group?: boolean;
        old?: boolean;
        game?: string;
    }

    // Handlers

    interface HandlerQueue {
        all(handler: Handler<Message>): HandlerQueue;
        message(handler: Handler<Message>): HandlerQueue;
        message(alsoUpdates: boolean, handler: Handler<Message>): HandlerQueue;
        text(handler: Handler<model.messageNonCommand>): HandlerQueue;
        text(alsoCommands: boolean, handler: Handler<model.messageText>): HandlerQueue;
        mention(handler: Handler<model.messageNonCommand>): HandlerQueue;
        mention(username: string, handler: Handler<model.messageNonCommand>): HandlerQueue;
        mention(...usernamesAndHandler: (string | Handler<model.messageNonCommand>)[]): HandlerQueue;
        mention(alsoCommands: boolean, handler: Handler<model.messageText>): HandlerQueue;
        mention(alsoCommands: boolean, username: string, handler: Handler<model.messageText>): HandlerQueue;
        mention(alsoCommands: boolean, ...usernamesAndHandler: (string | Handler<model.messageText>)[]): HandlerQueue;
        command(handler: Handler<model.messageCommand>): HandlerQueue;
        command(name: (string | RegExp), handler: Handler<model.messageCommand>): HandlerQueue;
        command(...namesAndHandler: ((string | RegExp) | Handler<model.messageCommand>)[]): HandlerQueue;
        command(all: true, handler: Handler<model.messageCommand>): HandlerQueue;
        audio(handler: Handler<model.messageAudio>): HandlerQueue;
        document(handler: Handler<model.messageDocument>): HandlerQueue;
        document(name: (string | RegExp), handler: Handler<model.messageDocument>): HandlerQueue;
        document(...namesAndHandler: ((string | RegExp) | Handler<model.messageDocument>)[]): HandlerQueue;
        photo(handler: Handler<model.messagePhoto>): HandlerQueue;
        video(handler: Handler<model.messageVideo>): HandlerQueue;
        videoNote(handler: Handler<model.messageVideoNote>): HandlerQueue;
        voice(handler: Handler<model.messageVoice>): HandlerQueue;
        contact(handler: Handler<model.messageContact>): HandlerQueue;
        location(handler: Handler<model.messageLocation>): HandlerQueue;
        venue(handler: Handler<model.messageVenue>): HandlerQueue;
        game(handler: Handler<model.messageGame>): HandlerQueue;
        update(handler: Handler<model.messageUpdate>): HandlerQueue;
        update(subject: model.messageUpdate["subject"], handler: Handler<model.messageUpdate>): HandlerQueue;
        update(subject: model.messageUpdate["subject"], action: model.messageUpdate["action"], handler: Handler<model.messageUpdate>): HandlerQueue;

        context(initial?: () => any | object): ReplyQueue;
    }
    type Handler<T> = (msg: T, reply: ReplyQueue, next: () => any) => any;

    // Callback / inline queries

    interface CallbackHandlerQueue {
        callback(handler: (query: model.CallbackQuery, next: () => any) => any): CallbackHandlerQueue;
    }

    // Reply queue

    interface ReplyQueue {
        text(text: string, mode?: ParseMode): this;
        html(text: string, ...args: string[]): this;
        markdown(text: string): this;
        photo(file: model.InputFile, caption?: string, captionMode?: ParseMode): this;
        audio(file: model.InputFile, duration?: number, performer?: string, title?: string, caption?: string, captionMode?: ParseMode): this;
        document(file: model.InputFile, caption?: string, captionMode?: ParseMode): this;
        sticker(file: model.InputFile): this;
        video(file: model.InputFile, duration?: number, width?: number, height?: number, caption?: string, captionMode?: ParseMode, streaming?: boolean): this;
        videoNote(file: model.InputFile, duration?: number, length?: number): this;
        voice(file: model.InputFile, duration?: number, caption?: string, captionMode?: ParseMode): this;
        location(latitude: number, longitude: number): this;
        venue(latitude: number, longitude: number, title: string, address: string, foursquareId?: string): this;
        contact(phone: string, firstname: string, lastname?: string): this;
        game(gameShortName: string): this;
        command(command: string, ...args: string[]): this;
        command(explicit: boolean, command: string, ...args: string[]): this;

        forward(id: number, chat: model.ChatLike): this;
        forward(msg: Message): this;
        message(msg: Message, reforward?: boolean): this;

        silent(silent?: boolean): this;
        disablePreview(disable?: boolean): this;
        selective(selective?: boolean): this;
        forceReply(force?: boolean): this;
        keyboard(keys: model.KeyboardRow[] | false | null, resize?: boolean, oneTime?: boolean): this;
        reply(msg?: model.MessageLike | false): this;
        inlineKeyboard(keys: model.InlineKeyboardButton[][]): this;

        action(action?: ChatAction): this;
        editText(msg: model.MessageLike | string, text: string, mode?: ParseMode): this;
        editHTML(msg: model.MessageLike | string, text: string, ...args: string[]): this;
        editMarkdown(msg: model.MessageLike | string, text: string): this;
        editReplyMarkup(msg: model.MessageLike | string): this;
        editCaption(msg: model.MessageLike | string, caption: string): this;
        deleteMessage(msg: model.MessageLike): this;

        then(): Promise<any>;
        then(callback: (err: RequestError | null, result?: any) => any): this;
        to(chat: model.ChatLike): ReplyQueue;
    }

    type ParseMode = null | "Markdown" | "HTML";
    type ChatAction =
        "typing" |
        "find_location" |
        "upload_photo" |
        "record_video" |
        "upload_video" |
        "record_audio" |
        "upload_audio" |
        "record_video_note" |
        "upload_video_note" |
        "upload_document";

    // Model

    export import Message = model.Message;
    export import MessageEntity = model.MessageEntity;
    export import Chat = model.Chat;
    export import File = model.File;
    export import Image = model.Image;
    export import InlineQuery = model.InlineQuery;
    export import ChosenInlineResult = model.ChosenInlineResult;
    export import Location = model.Location;
    export import CallbackQuery = model.CallbackQuery;
    export import ChatMember = model.ChatMember;
    export import Animation = model.Animation;
    export import GameHighScore = model.GameHighScore;
    export import MaskPosition = model.MaskPosition;
    export import Sticker = model.Sticker;
    export import StickerSet = model.StickerSet;
    export import resolveFile = model.resolveFile;
    export import resolveChat = model.resolveChat;
    export import resolveMessage = model.resolveMessage;
    export import resolveSticker = model.resolveSticker;
    export import resolveStickerSet = model.resolveStickerSet;
    export import parsePhoto = model.parsePhoto;
    export import parseCommand = model.parseCommand;
    export import formatCommand = model.formatCommand;
    export import formatKeyboard = model.formatKeyboard;

}

export = botgram;
