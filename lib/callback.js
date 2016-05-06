// Callback query facility. This handles incoming callback queries.

var utils = require("./utils");
var Minimatch = require("minimatch").Minimatch;

var model = require("./model");

// Entry point for the callback query facility. This initializes everything
// and registers the processCallbackQuery method so we can be called to
// process queries as they arrive.
function initCallback() {
  // Create handler queue, reexport methods
  this.callbackHandlerQueue = new HandlerQueue();
  Object.keys(HandlerQueue.prototype).forEach(function (key) {
    this[key] = HandlerQueue.prototype[key].bind(this.callbackHandlerQueue);
  }, this);

  // Export processCallbackQuery so we can be called
  this.processCallbackQuery = processCallbackQuery;
}

function processCallbackQuery(query) {
  query = new model.CallbackQuery().parse(query, this.options);
  query.queued = !this.firstCycleDone;
  query.answer = answer.bind(this, query);
  callHandler.call(this.callbackHandlerQueue, this, 0, query, function () {});
}

function answer(query, text, alert, callback) {
  return this.callMethod("answerCallbackQuery", {
    callback_query_id: query.id,
    text: text,
    show_alert: alert,
  }, callback || function (err, result) {
    if (err) throw err;
  });
}

// Core logic that holds the handlers and calls them in order.

function HandlerQueue() {
  this.handlers = [];
}

function callHandler(bot, i, query, next) {
  if (i < this.handlers.length)
    return this.handlers[i].call(bot, query, callHandler.bind(this, bot, i+1, query, next));
  return next();
}

// Handler registers: this is the user-facing API.

HandlerQueue.prototype.callback = function callback(handler) {
  this.handlers.push(handler);
  return this;
};



exports.initCallback = initCallback;
