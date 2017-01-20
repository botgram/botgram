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

  // New action becomes the head of the queue
  if (typeof id === "object") {
    // Self-contained (detached) queue
    var previousAction = id.queue;
    id.queue = action;
  } else {
    // Standard, shared queue
    var previousAction = this.queues[id];
    this.queues[id] = action;
  }

  if (previousAction === undefined) {
    // Queue was empty, start it by calling the action!
    return callAction.call(this, id, action);
  } else {
    // Queue was running, just enqueue action
    previousAction.next = action;
  }
}

function nextAction(id, action) {
  if (action.next) return callAction.call(this, id, action.next);

  // No more actions to run, delete head to mark queue as idle.
  if (typeof id === "object")
    delete id.queue;
  else
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
// ID and bot object so the user doesn't have to pass that everytime.

function ReplyQueue(bot, id) {
  this.bot = bot;
  this.id = id;
  this.parameters = {};
}

function getReplyQueue(id) {
  if (typeof id !== "number") throw new Error("Invalid ID used for queue");
  return new ReplyQueue(this, id);
}

function sendGeneric(method, additionalParameters) {
  var parameters = this.parameters;
  this.parameters = {};
  parameters.chat_id = this.id;
  Object.keys(additionalParameters).forEach(function (key) {
    parameters[key] = additionalParameters[key];
  });

  enqueueError.call(this.bot, this.id, this.bot.callMethod.bind(this.bot, method, parameters));
  return this;
}

// Basic methods, for sending simple messages

ReplyQueue.prototype.forward = function forward(id, chat) {
  if (id instanceof model.Message) {
    chat = id.chat;
    id = id.id;
  }
  chat = model.resolveChat(chat);
  return sendGeneric.call(this, "forwardMessage", {message_id: id, from_chat_id: chat});
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
  file = model.resolveFile(file);
  return sendGeneric.call(this, "sendPhoto", {photo: file, caption: caption});
};

ReplyQueue.prototype.audio = function audio(file, duration, performer, title, caption) {
  file = model.resolveFile(file);
  return sendGeneric.call(this, "sendAudio", {audio: file, duration: duration, performer: performer, title: title, caption: caption});
};

ReplyQueue.prototype.document = function document(file) {
  file = model.resolveFile(file);
  return sendGeneric.call(this, "sendDocument", {document: file});
};

ReplyQueue.prototype.sticker = function sticker(file) {
  file = model.resolveFile(file);
  return sendGeneric.call(this, "sendSticker", {sticker: file});
};

ReplyQueue.prototype.video = function video(file, duration, width, height, caption) {
  file = model.resolveFile(file);
  return sendGeneric.call(this, "sendVideo", {video: file, duration: duration, caption: caption, width: width, height: height });
};

ReplyQueue.prototype.voice = function voice(file, duration, caption) {
  file = model.resolveFile(file);
  return sendGeneric.call(this, "sendVoice", {voice: file, duration: duration, caption: caption});
};

ReplyQueue.prototype.location = function location(latitude, longitude) {
  return sendGeneric.call(this, "sendLocation", {latitude: latitude, longitude: longitude});
};

ReplyQueue.prototype.venue = function venue(latitude, longitude, title, address, foursquareId) {
  return sendGeneric.call(this, "sendVenue", {latitude: latitude, longitude: longitude, title: title, address: address, foursquare_id: foursquareId});
};

ReplyQueue.prototype.contact = function contact(phone, firstname, lastname) {
  return sendGeneric.call(this, "sendContact", {phone_number: phone, first_name: firstname, last_name: lastname});
};

ReplyQueue.prototype.game = function game(gameShortName) {
  return sendGeneric.call(this, "sendGame", {game_short_name: gameShortName});
};

ReplyQueue.prototype.command = function command(explicit, command, args) {
  var args = Array.prototype.slice.call(arguments);
  explicit = args.shift();
  if (typeof explicit !== "boolean") {
    command = explicit;
    explicit = this.id < 0;
  } else command = args.shift();
  if (args[0] instanceof Array) args = args[0];
  return this.text(this.bot.formatCommand(explicit, command, args));
};

// Chat actions involve interval timers, they require care

// TODO: implement them correctly (timers...)
ReplyQueue.prototype.action = function action(action) {
  if (action === undefined) action = "typing";
  return sendGeneric.call(this, "sendChatAction", {action: action});
};

// Modifiers and high-level methods

ReplyQueue.prototype.reply = function reply(msg) {
  if (msg) msg = model.resolveMessage(msg);
  else msg = undefined;
  this.parameters["reply_to_message_id"] = msg;
  return this;
};

ReplyQueue.prototype.to = function to(chat) {
  return new ReplyQueue(this.bot, model.resolveChat(chat));
};

ReplyQueue.prototype.message = function message(msg, reforward) {
  if (reforward && msg.forward) return this.forward(msg);
  if (msg.type === "text") return this.text(msg.text);
  if (msg.type === "audio") return this.audio(msg.file, msg.duration, msg.performer, msg.title);
  if (msg.type === "document") return this.document(msg.file);
  if (msg.type === "photo") return this.photo(msg.image.file, msg.caption);
  if (msg.type === "sticker") return this.sticker(msg.file);
  if (msg.type === "video") return this.video(msg.file, msg.duration, msg.width, msg.height, msg.caption);
  if (msg.type === "voice") return this.voice(msg.file, msg.duration);
  if (msg.type === "location") return this.location(msg.latitude, msg.longitude);
  if (msg.type === "venue") return this.venue(msg.latitude, msg.longitude, msg.title, msg.address, msg.foursquareId);
  if (msg.type === "contact") return this.contact(msg.phone, msg.firstname, msg.lastname);
  if (msg.type === "game") return this.game(msg.gameShortName); // FIXME: potentially fail if the game is not ours?
  if (msg.type === "update") throw new Error("Updates cannot be resent");
  throw new Error("Unknown message");
};

ReplyQueue.prototype.selective = function selective(selective) {
  if (selective === undefined) selective = true;
  if (!this.parameters["reply_markup"]) this.parameters["reply_markup"] = {};
  var markup = this.parameters["reply_markup"];

  markup.selective = selective;
  return this;
}

ReplyQueue.prototype.forceReply = function forceReply(force) {
  if (force === undefined) force = true;
  if (!this.parameters["reply_markup"]) this.parameters["reply_markup"] = {};
  var markup = this.parameters["reply_markup"];

  markup.force_reply = force;
  return this;
}

ReplyQueue.prototype.keyboard = function keyboard(keys, resize, oneTime) {
  if (!this.parameters["reply_markup"]) this.parameters["reply_markup"] = {};
  var markup = this.parameters["reply_markup"];

  if (!keys) {
    delete markup.keyboard;
    markup.remove_keyboard = true;
    return this;
  }

  delete markup.remove_keyboard;
  markup.keyboard = keys;
  markup.resize = !!resize;
  markup.one_time_keyboard = !!oneTime;
  return this;
};

ReplyQueue.prototype.inlineKeyboard = function inlineKeyboard(keys) {
  if (!this.parameters["reply_markup"]) this.parameters["reply_markup"] = {};
  var markup = this.parameters["reply_markup"];

  if (!keys) {
    delete markup.inline_keyboard;
    return this;
  }

  markup.inline_keyboard = keys;
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

ReplyQueue.prototype.editText = function editText(msg, text, mode) {
  var parameters = {text: text, parse_mode: mode};
  if (utils.isStr(msg)) parameters.inline_message_id = msg;
  else parameters.message_id = model.resolveMessage(msg);
  return sendGeneric.call(this, "editMessageText", parameters);
};

ReplyQueue.prototype.editMarkdown = function editMarkdown(msg, text) {
  return this.editText(msg, text, "Markdown");
};

ReplyQueue.prototype.editHTML = function editHTML(msg, text) {
  return this.editText(msg, text, "HTML");
};

ReplyQueue.prototype.editCaption = function editCaption(msg, caption) {
  var parameters = {caption: caption};
  if (utils.isStr(msg)) parameters.inline_message_id = msg;
  else parameters.message_id = model.resolveMessage(msg);
  return sendGeneric.call(this, "editMessageCaption", parameters);
};

ReplyQueue.prototype.editReplyMarkup = function editReplyMarkup(msg) {
  var parameters = {};
  if (utils.isStr(msg)) parameters.inline_message_id = msg;
  else parameters.message_id = model.resolveMessage(msg);
  return sendGeneric.call(this, "editMessageReplyMarkup", parameters);
};

// Queue functions

ReplyQueue.prototype.then = function then(cb) {
  if (typeof this.id === "object")
    var action = this.id.queue;
  else
    var action = this.bot.queues[this.id];

  if (action === undefined)
    return enqueue.call(this.bot, this.id, cb.bind(this.bot, null, null));
  action.then = cb;
  return this;
};



exports.initReply = initReply;
exports.ReplyQueue = ReplyQueue;
