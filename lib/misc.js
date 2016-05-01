// Implements miscellaneous functions on the bot object.

var utils = require("./utils");
var https = require("https");
var model = require("./model");

function initMisc() {
  this.fileGet = fileGet;
  this.fileStream = fileStream;
  this.fileLoad = fileLoad;
  this.kickMember = kickMember;
  this.unbanMember = unbanMember;
  this.context = context;
}

function fileGet(file, cb) {
  // Undocumented feature: sometimes the file_path property may be
  // given to you without having to call getFile [again].
  if (file instanceof model.File && file.size && file.path) return cb(null, file);

  this.callMethod("getFile", {file_id: model.resolveFile(file)}, function (err, result) {
    if (err) return cb(err);
    // FIXME: parse this in model
    cb(null, {
      id: result.file_id, size: result.file_size, path: result.file_path,
      link: "https://api.telegram.org/file/bot" + this.authToken + "/" + result.file_path,
    });
  }.bind(this));
}

function fileStream(file, cb) {
  this.fileGet(file, function (err, info) {
    if (err) return cb(err);
    https.get({
      host: "api.telegram.org",
      path: "/file/bot" + this.authToken + "/" + info.path,
      agent: this.options.agent,
    }, function (res) {
      cb(null, res);
    }).on("error", cb);
  }.bind(this));
}

function fileLoad(file, cb) {
  this.fileStream(file, function (err, stream) {
    if (err) return cb(err);
    var chunks = [];
    stream.on("error", cb);
    stream.on("readable", function () {
      var chunk = stream.read();
      if (chunk) chunks.push(chunk);
    });
    stream.on("end", function () {
      cb(null, Buffer.concat(chunks));
    });
  }.bind(this));
}

// TODO: getProfilePhotos

function kickMember(chat, user, cb) {
  this.callMethod("kickChatMember", {chat_id: model.resolveChat(chat), user_id: model.resolveChat(user)}, function (err, result) {
    if (err) return cb(err);
    if (result !== true) return cb(new Error("Expected true, found " + result));
    cb();
  });
}

function unbanMember(chat, user, cb) {
  this.callMethod("unbanChatMember", {chat_id: model.resolveChat(chat), user_id: model.resolveChat(user)}, function (err, result) {
    if (err) return cb(err);
    if (result !== true) return cb(new Error("Expected true, found " + result));
    cb();
  });
}

function context(initial) {
  if (initial === undefined) {
    initial = function () { return {}; };
  } else if (!utils.isFunc(initial)) {
    var initialObj = initial;
    initial = function () { return Object.create(initialObj); };
  }
  var contexts = {};
  this.all(function (msg, reply, next) {
    var id = msg.chat.id;
    if (!(id in contexts)) contexts[id] = initial(msg);
    msg.context = contexts[id];
    next();
  });
}



exports.initMisc = initMisc;
