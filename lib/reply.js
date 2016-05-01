// Implements reply queues and message sending in general.

var utils = require("./utils");
var model = require("./model");

// Entry point for the reply queues facility.
// Each reply queue is a queue of actions, where each action is
// a function accepting a callback to call when it finishes.

function initReply() {
  // A queue is implemented with a single-linked list, where
  // `this.queues[id]` points to the head of the queue, aka the
  // last action that was queued. The head is empty only if no
  // action is being executed, or queued.
  this.queues = {};

  // User-facing API to get a reply queue externally
  this.reply = getReplyQueue;

  // Timers for chat actions
  this.chatActionTimers = {};
}

// Core logic that enqueues an action to a reply queue, starting
// the queue if it was empty, and handles dequeuing of actions as
// they finish executing.

function callAction(id, action) {
  return action.call(this, nextAction.bind(this, id, action));
}

function enqueue(id, action) {
  if (this.options.immediate)
    return action.call(this, function () {});

  if (this.queues[id] === undefined) {
    // Queue is empty, enqueue action and call it to start the queue!
    this.queues[id] = action;
    return callAction.call(this, id, action);
  }

  // Queue is running, just enqueue action
  this.queues[id].next = action;
  this.queues[id] = action;
}

function nextAction(id, action) {
  if (action.next) return callAction.call(this, id, action.next);
  // No more actions to run, delete head to mark queue as idle.
  delete this.queues[id];
}

// Notice the queues have no way of signaling failure. The following
// code wraps an action so that it may call `next` with an error object.
// In this case, the user callback will be called if it was registered,
// or an `error` event will be emitted.

function enqueueError(id, action) {
  var realAction = function enqueueError(next) {
    action.call(this, function enqueueError(err, result) {
      if (realAction.then) return realAction.then.call(this, err, result, next);
      if (err) this.emit("error", err);
      return next();
    }.bind(this));
  };
  return enqueue.call(this, id, realAction);
}

// The reply queue 'object' has the user-facing API and embedded queue
// ID and destination so the user doesn't have to pass that everytime.

function ReplyQueue(bot, id, destination) {
  this.bot = bot;
  this.id = id;
  this.destination = destination;
  this.parameters = {};
}

function getReplyQueue(id) {
  return new ReplyQueue(this, id, id);
}

function sendGeneric(method, additionalParameters) {
  var parameters = this.parameters;
  this.parameters = {};
  parameters.chat_id = this.destination;
  Object.keys(additionalParameters).forEach(function (key) {
    parameters[key] = additionalParameters[key];
  });

  enqueueError.call(this.bot, this.id, this.bot.callMethod.bind(this.bot, method, parameters));
  return this;
}

// Basic methods, for sending simple messages

ReplyQueue.prototype.forward = function forward(id, chatId) {
  if (id instanceof model.Message) {
    // FIXME: is this correct?
    if (chatId === undefined) chatId = id.forward.from.id || id.from.id;
    id = msg.id;
  }
  return sendGeneric.call(this, "forwardMessage", {message_id: id, from_chat_id: chatId});
};

ReplyQueue.prototype.text = function text(text, mode) {
  return sendGeneric.call(this, "sendMessage", {text: text, parse_mode: mode});
};

ReplyQueue.prototype.markdown = function markdown(text) {
  return this.text(text, "Markdown");
};

ReplyQueue.prototype.html = function html(text) {
  return this.text(text, "HTML");
};

ReplyQueue.prototype.photo = function photo(file, caption) {
  if (file instanceof model.File) file = file.id;
  return sendGeneric.call(this, "sendPhoto", {photo: file, caption: caption});
};

ReplyQueue.prototype.audio = function audio(file, duration, performer, title) {
  if (file instanceof model.File) file = file.id;
  return sendGeneric.call(this, "sendAudio", {audio: file, duration: duration, performer: performer, title: title});
};

ReplyQueue.prototype.document = function document(file) {
  if (file instanceof model.File) file = file.id;
  return sendGeneric.call(this, "sendDocument", {document: file});
};

ReplyQueue.prototype.sticker = function sticker(file) {
  if (file instanceof model.File) file = file.id;
  return sendGeneric.call(this, "sendSticker", {sticker: file});
};

ReplyQueue.prototype.video = function video(file, duration, caption) {
  if (file instanceof model.File) file = file.id;
  return sendGeneric.call(this, "sendVideo", {video: file, duration: duration, caption: caption});
};

ReplyQueue.prototype.voice = function voice(file, duration) {
  if (file instanceof model.File) file = file.id;
  return sendGeneric.call(this, "sendVoice", {voice: file, duration: duration});
};

ReplyQueue.prototype.location = function location(latitude, longitude) {
  return sendGeneric.call(this, "sendLocation", {latitude: latitude, longitude: longitude});
};

// Chat actions involve interval timers, they require care

// TODO: implement them correctly (timers...)
ReplyQueue.prototype.action = function action(action) {
  if (action === undefined) action = "typing";
  return sendGeneric.call(this, "sendChatAction", {action: action});
};

// Modifiers and high-level methods

ReplyQueue.prototype.reply = function reply(message) {
  if (message instanceof model.Message) message = message.id;
  this.parameters["reply_to_message_id"] = message;
  return this;
};

ReplyQueue.prototype.to = function to(chat) {
  if (chat instanceof model.Chat) chat = chat.id;
  return new ReplyQueue(this.bot, this.id, chat);
};

ReplyQueue.prototype.message = function message(msg, reforward) {
  if (msg.type === "text") return this.text(msg.text);
  if (msg.type === "audio") return this.audio(msg.file, msg.duration, msg.performer, msg.title);
  if (msg.type === "document") return this.document(msg.file); //FIXME: verify filename kept
  if (msg.type === "photo") return this.photo(msg.image.file, msg.caption);
  if (msg.type === "sticker") return this.sticker(msg.file);
  if (msg.type === "video") return this.video(msg.file, msg.duration, msg.caption);
  if (msg.type === "voice") return this.voice(msg.file, msg.duration);
  if (msg.type === "contact") throw new Error("Cannot send Contact messages yet");
  if (msg.type === "location") return this.location(msg.latitude, msg.longitude);
  if (msg.type === "update") throw new Error("Updates cannot be resent");
  throw new Error("Unknown message");
};

ReplyQueue.prototype.forceReply = function forceReply(selective) {
  if (!this.parameters["reply_markup"]) this.parameters["reply_markup"] = {};
  var markup = this.parameters["reply_markup"];
  if (selective !== undefined) markup.selective = !!selective;

  markup.force_reply = true;
  return this;
}

ReplyQueue.prototype.keyboard = function keyboard(keys, resize, oneTime, selective) {
  if (!this.parameters["reply_markup"]) this.parameters["reply_markup"] = {};
  var markup = this.parameters["reply_markup"];
  if (selective !== undefined) markup.selective = !!selective;

  if (!keys) {
    delete markup.keyboard;
    markup.hide_keyboard = true;
    return this;
  }

  delete markup.hide_keyboard;
  markup.keyboard = keys;
  markup.resize = !!resize;
  markup.one_time_keyboard = !!oneTime;
  return this;
};

ReplyQueue.prototype.disablePreview = function disablePreview(disable) {
  if (disable === undefined) disable = true;
  this.parameters["disable_web_page_preview"] = disable;
  return this;
};

ReplyQueue.prototype.silent = function silent(silent) {
  if (silent === undefined) silent = true;
  this.parameters["disable_notification"] = silent;
  return this;
};

ReplyQueue.prototype.then = function then(cb) {
  var action = this.bot.queues[this.id];
  if (action === undefined)
    return enqueue.call(this.bot, cb.bind(this.bot, null, null));
  action.then = cb;
  return this;
};



exports.initReply = initReply;
exports.ReplyQueue = ReplyQueue;
