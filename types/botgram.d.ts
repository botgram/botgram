// <reference types="node">

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
        callMethod(method: string, parameters: object[], callback: (error: RequestError | null, result: any) => any): void;
        autodetect(callback: () => any): void;
        ready(callback: () => any): void;
        synced(callback: () => any): void;
        stop(): void;
        processUpdate(update: Update): any;

        edited: HandlerQueue;
        reply(chat: model.ChatLike): ReplyQueue;

        // TODO: misc methods

    }

    interface NetworkError {

    }

    interface TelegramError {

    }

    type RequestError = TelegramError | NetworkError;

    type Update = object; // FIXME

    // Handlers

    interface HandlerQueue {
        all(handler: Handler<Message>): HandlerQueue;
        message(handler: Handler<Message>): HandlerQueue;
        message(alsoUpdates: boolean, handler: Handler<Message>): HandlerQueue;
        text(handler: Handler<model.messageNonCommand>): HandlerQueue;
        text(alsoCommands: boolean, handler: Handler<model.messageText>): HandlerQueue;
        mention(...username: string[], handler: Handler<model.messageNonCommand>): HandlerQueue;
        mention(alsoCommands: boolean, ...username: string[], handler: Handler<model.messageText>): HandlerQueue;
        command(...name: (string | RegExp)[], handler: Handler<model.messageCommand>): HandlerQueue;
        command(all: true, handler: Handler<model.messageCommand>): HandlerQueue;
        audio(handler: Handler<model.messageAudio>): HandlerQueue;
        document(...name: (string | RegExp)[], handler: Handler<model.messageDocument>): HandlerQueue;
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
    }
    type Handler<T> = (msg: T, reply: ReplyQueue, next: () => any) => any;

    // Callback / inline queries

    interface CallbackHandlerQueue {
        callback(handler: (query: model.CallbackQuery, next: NextCallback) => any): CallbackHandlerQueue;
    }

    // Reply queue

    interface ReplyQueue {
        text(text: string, mode?: ParseMode): this;
        html(text: string, ...args: string[]): this;
        markdown(text: string): this;
        photo(file: FileContent, caption?: string, captionMode?: ParseMode): this;
        audio(file: FileContent, duration?: number, performer?: string, title?: string, caption?: string, captionMode?: ParseMode): this;
        document(file: FileContent, caption?: string, captionMode?: ParseMode): this;
        sticker(file: FileContent): this;
        video(file: FileContent, duration?: number, width?: number, height?: number, caption?: string, captionMode?: ParseMode, streaming?): this;
        videoNote(file: FileContent, duration?: number, length?: number): this;
        voice(file: FileContent, duration?: number, caption?: string, captionMode?: ParseMode): this;
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
        keyboard(keys: string[][] | false, resize?: boolean, oneTime?: boolean): this;
        reply(msg?: model.MessageLike | false): this;
        inlineKeyboard(keys): this;

        action(action?: ChatAction): this;
        editText(msg: model.MessageLike, text: string, mode?: ParseMode): this;
        editHTML(msg: model.MessageLike, text: string): this;
        editMarkdown(msg: model.MessageLike, text: string): this;
        editReplyMarkup(msg: model.MessageLike): this;
        editCaption(msg: model.MessageLike, caption: string): this;
        deleteMessage(msg: model.MessageLike): this;

        then(): Promise<any>;
        then(callback: (err: RequestError | null, result: any) => any): this;
        to(chat: model.ChatLike): ReplyQueue;
    }

    type FileContent = model.FileLike | string /* URL */ | ReadableStream | Buffer;
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

    type Message = model.Message;
    type MessageEntity = model.MessageEntity;
    type Chat = model.Chat;
    type File = model.File;
    type Image = model.Image;
    type InlineQuery = model.InlineQuery;
    type ChosenInlineResult = model.ChosenInlineResult;
    type Location = model.Location;
    type CallbackQuery = model.CallbackQuery;
    type ChatMember = model.ChatMember;
    type Animation = model.Animation;
    type GameHighScore = model.GameHighScore;
    type MaskPosition = model.MaskPosition;
    type Sticker = model.Sticker;
    type StickerSet = model.StickerSet;
    type resolveFile = model.resolveFile;
    type resolveChat = model.resolveChat;
    type resolveMessage = model.resolveMessage;
    type resolveSticker = model.resolveSticker;
    type resolveStickerSet = model.resolveStickerSet;
    type parsePhoto = model.parsePhoto;
    type parseCommand = model.parseCommand;
    type formatCommand = model.formatCommand;
    type formatKeyboard = model.formatKeyboard;

}

export = botgram;
