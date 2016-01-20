// Entry point for the library. Implements the bot object,
// exports methods as necessary.
var util = require("util");
var https = require("https");
var stream = require("stream");
var EventEmitter = require("events");
var FormData = require("form-data");
var Readable = stream.Readable;

function Bot(authToken, options) {
  if (!(this instanceof Bot)) return new Bot(authToken, options);
  EventEmitter.call(this);

  if (options === undefined) options = {};
  if (!options.hasOwnProperty("timeout")) options.timeout = 10 * 60;
  if (!options.hasOwnProperty("strict")) options.strict = true; //TODO: use, set to false
  if (!options.hasOwnProperty("actionInterval")) options.actionInterval = 3000;
  if (!options.hasOwnProperty("autodetect")) options.autodetect = true;
  if (!options.hasOwnProperty("retryInterval")) options.retryInterval = 2000;

  if (!(authToken instanceof String))
    throw new Error("Invalid auth token specified");

  this.options = options;
  this.authToken = authToken;
  this.data = {};

  // TODO: panic on error emitted
  this.on("ready", startLoop);
  firstDetection.call(this);
}

util.inherit(Bot, EventEmitter);

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
  var form = new FormData();
  form.on("error", cb);
  Object.keys(parameters).forEach(function (key) {
    var value = parameters[key];
    if (typeof value === "null" || typeof value === "undefined")
      return;
    if (typeof value === "number" || typeof value === "boolean")
      value = value.toString();
    if (!(value instanceof String || value instanceof Buffer || value instanceof Readable))
      value = JSON.stringify(value);
    form.append(value);
  });

  // Make the request
  var req = https.request({
    agent: this.options.agent,
    method: "POST",
    hostname: "api.telegram.org",
    path: "bot" + this.authToken + "/" + method,
    headers: { accept: "application/json" }
  }, handleResponse);
  req.on("error", cb);
  form.pipe(req);

  function handleResponse(res) {
    if (res.headers["content-type"] !== "application/json") {
      res.resume();
      return cb(new NetworkError("API response not in JSON"));
    }

    // FIXME: not the most efficient way to collect output
    var body = Buffer();
    res.on("error", cb);
    res.on("readable", function () { body = Buffer.concat(body, res.read()); });
    res.on("end", function () { handleBody(body, res.statusCode); });
  }

  function handleBody(body, status) {
    try {
      body = JSON.parse(body);
      if (typeof body.ok !== "boolean")
        return cb(new NetworkError("ok field not a boolean in API response"));
      if (body.ok !== (status === 200))
        return cb(new NetworkError("ok field not matching JSON response"));
      if (body.ok) return cb(null, body.result);
      cb(new TelegramError(body));
    } catch (err) { cb(err); }
  }
};

bot.prototype.autodetect = function autodetect(cb) {
  if (!cb) cb = function () {};
  this.callMethod("getMe", function (err, result) {
    if (err) return cb(err);

    this.set("id", result.id);
    this.set("username", result.username);
    this.set("firstname", result.first_name);
    this.set("lastname", result.last_name);
    cb();
  });
};

function firstDetection() {
  if (this.stopped) return;

  if (this.options.autodetect)
    this.autodetect(function (err) {
      if (err) {
        this.emit("error", err);
        return setTimeout(firstDetection.bind(this), this.options.retryInterval);
      }
      this.emit("ready");
    });
  else
    process.nextTick(function () {
      if (typeof this.get("id") !== "number") {
        console.error("Bot was not initialized!");
        process.exit(1);
      }
      this.emit("ready");
    });
}

function startLoop() {
  if (this.stopped) return;

  this.callMethod("getUpdates", {
    offset: this.offset,
    timeout: this.options.timeout
  }, function (err, result) {
    if (err) {
      this.emit("error", err);
      return setTimeout(startLoop.bind(this), this.options.retryInterval);
    }

    result.forEach(this.processUpdate.bind(this));
    this.accumulatedDone = true;
    if (result.length > 0)
      this.offset = result[result.length-1].update_id + 1;
    startLoop();
  });
}

bot.prototype.ready = function ready(cb) {
  if (typeof this.get("id") === "number")
    return cb();
  this.on("ready", cb);
};

bot.prototype.stop = function stop() {
  if (this.stopped) return;
  this.stopped = true;
  this.emit("stopped");
};



Bot.NetworkError = NetworkError;
Bot.TelegramError = TelegramError;
module.exports = Bot;
