// Entry point for the library. Implements the bot object,
// get / set, lifecycle management, API calling and the
// `getUpdates` loop.
var util = require("util");
var utils = require("./utils");
var stream = require("stream");
var EventEmitter = require("events");
var FormData = require("form-data");

var model = require("./model");
var misc = require("./misc");
var message = require("./message");
var reply = require("./reply");

// TODO
function NetworkError(err) { this.err = err; }
function TelegramError(err) { this.err = err; }

function Bot(authToken, options) {
  if (!(this instanceof Bot)) return new Bot(authToken, options);
  EventEmitter.call(this);

  if (options === undefined) options = {};
  if (!options.hasOwnProperty("timeout")) options.timeout = 10 * 60;
  if (!options.hasOwnProperty("strict")) options.strict = true; //FIXME: use, set to false
  if (!options.hasOwnProperty("actionInterval")) options.actionInterval = 3000;
  if (!options.hasOwnProperty("autodetect")) options.autodetect = true;
  if (!options.hasOwnProperty("retryInterval")) options.retryInterval = 2000;

  if (!utils.isStr(authToken)) throw new Error("Invalid auth token specified");

  this.options = options;
  this.authToken = authToken;
  this.data = {};

  message.initMessage.call(this);
  misc.initMisc.call(this);
  reply.initReply.call(this);

  this.on("ready", startLoop);
  process.nextTick(firstDetection.bind(this));
}

util.inherits(Bot, EventEmitter);

Bot.prototype.get = function get(name) {
  return this.data[name];
};

Bot.prototype.set = function set(name, value) {
  this.data[name] = value;
};

// FIXME: wrap errors of form, req and res in NetworkError
Bot.prototype.callMethod = function (method, parameters, cb) {
  if (cb === undefined) cb = parameters, parameters = {};

  // Prepare the body
  var form = new FormData(), setPlaceholder = true;
  form.on("error", handleResponse);
  Object.keys(parameters).forEach(function (key) {
    var value = parameters[key];
    if (value === null || value === undefined) return;
    setPlaceholder = false;

    if (utils.isNum(value) || utils.isBool(value) || utils.isStr(value))
      return form.append(key, value.toString());
    if (utils.isBuffer(value) || utils.isReadable(value))
      return form.append(key, value, value.options);
    form.append(key, JSON.stringify(value));
  });
  if (setPlaceholder) form.append("placeholder", "placeholder");

  // Make the request
  form.submit({
    agent: this.options.agent,
    protocol: "https:",
    host: "api.telegram.org",
    path: "/bot" + this.authToken + "/" + method,
    headers: { accept: "application/json" }
  }, handleResponse);

  // Parse the response
  function handleResponse(err, res) {
    if (err) return cb(new NetworkError(err));

    if (res.headers["content-type"] !== "application/json") {
      res.resume();
      return cb(new NetworkError("API response not in JSON"));
    }

    // FIXME: not the most efficient way to collect output
    var body = Buffer(0);
    res.on("error", handleResponse);
    res.on("readable", function () {
      var chunk = res.read();
      if (chunk) body = Buffer.concat([body, chunk]);
    });
    res.on("end", function () { handleBody(body, res.statusCode); });
  }

  function handleBody(body, status) {
    try {
      body = JSON.parse(body);
    } catch (err) { return cb(err); }
    if (!utils.isBool(body.ok))
      return cb(new NetworkError("ok field not a boolean in API response"));
    if (body.ok !== (status === 200))
      return cb(new NetworkError("ok field not matching JSON response"));
    if (body.ok) return cb(null, body.result);
    cb(new TelegramError(body));
  }
};

Bot.prototype.autodetect = function autodetect(cb) {
  if (!cb) cb = function () {};
  this.callMethod("getMe", function (err, result) {
    if (err) return cb(err);

    this.set("id", result.id);
    this.set("username", result.username);
    this.set("firstname", result.first_name);
    this.set("lastname", result.last_name);
    cb();
  }.bind(this));
};

function firstDetection() {
  if (this.stopped) return;

  if (this.options.autodetect)
    return this.autodetect(function (err) {
      if (err) {
        this.emit("error", err);
        return setTimeout(firstDetection.bind(this), this.options.retryInterval);
      }
      this.emit("ready");
    }.bind(this));

  if (!utils.isInt(this.get("id"))) {
    console.error("Bot was not initialized!");
    process.exit(1);
  }
  this.emit("ready");
}

function startLoop() {
  if (this.stopped) return;

  this.callMethod("getUpdates", {
    offset: this.offset,
    timeout: this.firstCycleDone ? this.options.timeout : 0,
  }, function (err, result) {
    if (err) {
      this.emit("error", err);
      return setTimeout(startLoop.bind(this), this.options.retryInterval);
    }

    result.forEach(this.processUpdate.bind(this));

    if (!this.firstCycleDone && result.length == 0) {
      this.firstCycleDone = true;
      this.emit("synced");
    }
    startLoop.call(this);
  }.bind(this));
}

Bot.prototype.ready = function ready(cb) {
  if (utils.isInt(this.get("id")))
    return cb();
  this.on("ready", cb);
};

Bot.prototype.synced = function synced(cb) {
  if (this.firstCycleDone)
    return cb();
  this.on("synced", cb);
};

Bot.prototype.stop = function stop() {
  if (this.stopped) return;
  this.stopped = true;
  this.emit("stopped");
};

Bot.prototype.processUpdate = function processUpdate(update) {
  var id = utils.checkInt(update.update_id);
  delete update.update_id;
  this.offset = id + 1;

  if (update.message !== undefined) {
    this.processMessage(update.message);
    delete update.message;
  } else if (update.inline_query !== undefined) {
    // TODO
    delete update.inline_query;
  } else if (update.chosen_inline_result !== undefined) {
    // TODO
    delete update.chosen_inline_result;
  } else if (this.options.strict) {
    throw new Error("Unknown update type!");
  }

  if (this.options.strict && Object.keys(update).length > 0)
    throw new Error("Unknown fields in update");
};



// FIXME: reexport everything else (review manually)
Bot.NetworkError = NetworkError;
Bot.TelegramError = TelegramError;
module.exports = Bot;
