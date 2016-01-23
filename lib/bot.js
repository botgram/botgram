// Entry point for the library. Implements the bot object,
// get / set, lifecycle management, API calling and the
// `getUpdates` loop.
var util = require("util");
var utils = require("./utils");
var stream = require("stream");
var EventEmitter = require("events");
var FormData = require("form-data");

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

  // TODO: panic on error emitted
  this.on("ready", startLoop);
  firstDetection.call(this);
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
  var form = new FormData();
  form.on("error", handleResponse);
  Object.keys(parameters).forEach(function (key) {
    var value = parameters[key];
    if (value === null || value === undefined)
      return;
    if (utils.isNum(value) || utils.isBool(value) || utils.isStr(value))
      return form.append(key, value.toString());
    if (utils.isBuffer(value) || utils.isReadable(value))
      return form.append(key, value, value.options);
    form.append(key, JSON.stringify(value));
  });

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
    res.on("readable", function () { body = Buffer.concat(body, res.read()); });
    res.on("end", function () { handleBody(body, res.statusCode); });
  }

  function handleBody(body, status) {
    try {
      body = JSON.parse(body);
      if (!utils.isBool(body.ok))
        return cb(new NetworkError("ok field not a boolean in API response"));
      if (body.ok !== (status === 200))
        return cb(new NetworkError("ok field not matching JSON response"));
      if (body.ok) return cb(null, body.result);
      cb(new TelegramError(body));
    } catch (err) { cb(err); }
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
    this.autodetect(function (err) {
      if (err) {
        this.emit("error", err);
        return setTimeout(firstDetection.bind(this), this.options.retryInterval);
      }
      this.emit("ready");
    });
  else
    process.nextTick(function () {
      if (!utils.isInt(this.get("id"))) {
        console.error("Bot was not initialized!");
        process.exit(1);
      }
      this.emit("ready");
    }.bind(this));
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

Bot.prototype.ready = function ready(cb) {
  if (utils.isInt(this.get("id")))
    return cb();
  this.on("ready", cb);
};

Bot.prototype.stop = function stop() {
  if (this.stopped) return;
  this.stopped = true;
  this.emit("stopped");
};



Bot.NetworkError = NetworkError;
Bot.TelegramError = TelegramError;
module.exports = Bot;
