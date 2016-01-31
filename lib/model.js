// Models entities from the Telegram API, provides methods
// to parse responses into our models. Also provides methods
// to "resolve" IDs of entities.

var utils = require("./utils");
var checkObj = utils.checkObj;
var checkStr = utils.checkStr;
var checkBool = utils.checkBool;
var checkArr = utils.checkArr;
var checkInt = utils.checkInt;
var checkNum = utils.checkNum;

function Message() {}
function Chat() {}
function File() {}
function Image() {}

Message.prototype.parse = function parse(msg, options) {
  checkObj(msg);
  
  this.id = checkInt(msg.message_id);
  delete msg.message_id;

  this.date = new Date(checkInt(msg.date) * 1000);
  delete msg.date;

  this.chat = new Chat().parse(msg.chat, options);
  delete msg.chat;

  this.from = new Chat().parseUser(msg.from, options);
  delete msg.from;

  if (msg.forward_date !== undefined) {
    // FIXME: verify that if forwarded_from is a channel, it won't be present
    this.forward = {
      from: new Chat().parseUser(msg.forward_from, options),
      date: new Date(checkInt(msg.forward_date) * 1000)
    };
    delete msg.forward_from;
    delete msg.forward_date;
  }

  if (msg.reply_to_message !== undefined) {
    this.reply = new Message().parse(msg.reply_to_message, options);
    delete msg.reply_to_message;
  }

  if (this.chat.type === "group" || this.chat.type === "supergroup") {
    this.group = this.chat;
  } else if (this.chat.type === "user") {
    this.user = this.chat;
  }

  for (type in messageTypes) {
    if (!messageTypes.hasOwnProperty(type)) continue;
    if (!messageTypes[type].call(this, msg, options)) continue;
    if (this.type) throw new Error("duplicate types found in message!");
    this.type = type;
    if (!options.strict) break;
  }
  if (!this.type && options.strict) throw new Error("unknown message type");

  if (options.strict && Object.keys(msg).length)
    throw new Error("unknown fields in message");
  return this;
};

var messageTypes = {

  "text": function (msg, options) {
    if (msg.text === undefined) return false;

    this.text = checkStr(msg.text);
    delete msg.text;

    parseCommand(this);
    parseMentions(this);

    return true;
  },

  "audio": function (msg, options) {
    if (msg.audio === undefined) return false;
    var audio = checkObj(msg.audio);
    delete msg.audio;

    this.duration = checkInt(audio.duration);
    delete audio.duration;

    this.file = new File().parseLight(audio, options);

    if (audio.performer !== undefined) {
      this.performer = checkStr(audio.performer);
      delete audio.performer;
    }

    if (audio.title !== undefined) {
      this.title = checkStr(audio.title);
      delete audio.title;
    }

    if (options.strict && Object.keys(audio).length)
      throw new Error("unknown fields in audio");
    return true;
  },

  "document": function (msg, options) {
    if (msg.document === undefined) return false;
    var document = checkObj(msg.document);
    delete msg.document;

    this.file = new File().parseLight(document, options);

    if (document.file_name !== undefined) {
      this.filename = checkStr(document.file_name);
      delete document.file_name;
    }

    if (document.thumb !== undefined) {
      this.thumbnail = new Image().parse(document.thumb, options);
      delete document.thumb;
    }

    if (options.strict && Object.keys(document).length)
      throw new Error("unknown fields in document");
    return true;
  },

  "photo": function (msg, options) {
    if (msg.photo === undefined) return false;
    var photo = checkArr(msg.photo);
    delete msg.photo;

    if (photo.length === 0)
      throw new Error("Photo contains no sizes");

    this.sizes = photo.map(function (size) {
      return new Image().parse(size, options);
    });

    if (msg.caption !== undefined) {
      this.caption = checkStr(msg.caption);
      if (options.strict && this.caption.length > 200)
        throw new Error("Caption too long.");
      delete msg.caption;
    }

    this.image = this.sizes.reduce(function (a, b) {
      var areaA = a.width * a.height, areaB = b.width * b.height;
      if (options.strict && areaA === areaB)
        throw new Error("Areas of two sizes match!");
      return (areaB > areaA) ? b : a;
    });

    return true;
  },

  "sticker": function (msg, options) {
    if (msg.sticker === undefined) return false;
    var sticker = checkObj(msg.sticker);
    delete msg.sticker;

    this.file = new File().parseLight(sticker, options);

    this.width = checkInt(sticker.width);
    delete sticker.width;

    this.height = checkInt(sticker.height);
    delete sticker.height;

    if (sticker.thumb !== undefined) {
      this.thumbnail = new Image().parse(sticker.thumb, options);
      delete sticker.thumb;
    }

    if (options.strict && Object.keys(sticker).length)
      throw new Error("unknown fields in sticker");
    return true;
  },

  "video": function (msg, options) {
    if (msg.video === undefined) return false;
    var video = checkObj(msg.video);
    delete msg.video;

    this.file = new File().parseLight(video, options);

    this.width = checkInt(video.width);
    delete video.width;

    this.height = checkInt(video.height);
    delete video.height;

    this.duration = checkInt(video.duration);
    delete video.duration;

    if (video.thumb !== undefined) {
      this.thumbnail = new Image().parse(video.thumb, options);
      delete video.thumb;
    }

    if (msg.caption !== undefined) {
      this.caption = checkStr(msg.caption);
      if (options.strict && this.caption.length > 200)
        throw new Error("Caption too long.");
      delete msg.caption;
    }

    if (options.strict && Object.keys(video).length)
      throw new Error("unknown fields in video");
    return true;
  },

  "voice": function (msg, options) {
    if (msg.voice === undefined) return false;
    var voice = checkObj(msg.voice);
    delete msg.voice;

    this.file = new File().parseLight(voice, options);

    this.duration = checkInt(voice.duration);
    delete voice.duration;

    if (options.strict && Object.keys(voice).length)
      throw new Error("unknown fields in voice");
    return true;
  },

  "contact": function (msg, options) { 
    if (msg.contact === undefined) return false;
    var contact = checkObj(msg.contact);
    delete msg.contact;

    this.phone = checkStr(contact.phone_number);
    delete contact.phone_number;

    this.firstname = checkStr(contact.first_name);
    delete contact.first_name;

    if (contact.last_name !== undefined) {
      this.lastname = checkStr(contact.last_name);
      delete contact.last_name;
    }

    if (contact.user_id !== undefined) {
      this.userId = checkStr(contact.user_id);
      delete contact.user_id;
    }

    if (options.strict && Object.keys(contact).length)
      throw new Error("unknown fields in contact");
    return true;
  },

  "location": function (msg, options) { 
    if (msg.location === undefined) return false;
    var location = checkObj(msg.location);
    delete msg.location;

    this.longitude = checkNum(location.longitude);
    delete location.longitude;

    this.latitude = checkNum(location.latitude);
    delete location.latitude;

    if (options.strict && Object.keys(location).length)
      throw new Error("unknown fields in location");
    return true;
  },

  "update": function (msg, options) {
    if (msg.new_chat_participant !== undefined) {
      this.subject = "participant", this.action = "new";
      this.participant = new Chat().parseUser(msg.new_chat_participant, options);
      delete msg.new_chat_participant;
      return true;
    }

    if (msg.left_chat_participant !== undefined) {
      this.subject = "participant", this.action = "leave";
      this.participant = new Chat().parseUser(msg.left_chat_participant, options);
      delete msg.left_chat_participant;
      return true;
    }

    if (msg.new_chat_title !== undefined) {
      this.subject = "title", this.action = "new";
      this.title = checkStr(msg.new_chat_title);
      delete msg.new_chat_title;
      return true;
    }

    if (msg.new_chat_photo !== undefined) {
      this.subject = "photo", this.action = "new";
      // TODO: parse photo
      delete msg.new_chat_photo;
      return true;
    }

    if (msg.delete_chat_photo !== undefined) {
      this.subject = "photo", this.action = "delete";
      if (msg.delete_chat_photo !== true) throw new Error("Expected true");
      delete msg.delete_chat_photo;
      return true;
    }

    if (msg.group_chat_created !== undefined) {
      this.subject = "chat", this.action = "create";
      if (msg.group_chat_created !== true) throw new Error("Expected true");
      if (this.chat.type !== "group") throw new Error("Expected group chat");
      delete msg.group_chat_created;
      return true;
    }

    if (msg.supergroup_chat_created !== undefined) {
      this.subject = "chat", this.action = "create";
      if (msg.supergroup_chat_created !== true) throw new Error("Expected true");
      if (this.chat.type !== "supergroup") throw new Error("Expected supergroup chat");
      delete msg.supergroup_chat_created;
      return true;
    }

    if (msg.channel_chat_created !== undefined) {
      this.subject = "chat", this.action = "create";
      if (msg.channel_chat_created !== true) throw new Error("Expected true");
      if (this.chat.type !== "channel") throw new Error("Expected channel chat");
      delete msg.channel_chat_created;
      return true;
    }

    if (msg.migrate_to_chat_id !== undefined) {
      this.subject = "chat", this.action = "migrate";
      this.toId = checkInt(msg.migrate_to_chat_id);
      this.fromId = checkInt(msg.migrate_from_chat_id);
      delete msg.migrate_to_chat_id;
      delete msg.migrate_from_chat_id;
      return true;
    }

    return false;
  },

};
Message.types = Object.keys(messageTypes);

Chat.prototype.parse = function parse(chat, options) {
  checkObj(chat);

  this.id = checkInt(chat.id);
  delete chat.id;

  this.type = chatTypes[checkStr(chat.type)];
  if (options.strict && !this.type)
    throw new Error("Unknown chat type");
  delete chat.type;

  if (chat.title !== undefined) {
    this.title = checkStr(chat.title);
    delete chat.title;
  }

  if (chat.first_name !== undefined) {
    this.firstname = checkStr(chat.first_name);
    delete chat.first_name;
  }

  if (chat.last_name !== undefined) {
    this.lastname = checkStr(chat.last_name);
    delete chat.last_name;
  }

  if (chat.username !== undefined) {
    this.username = checkStr(chat.username);
    delete chat.username;
  }

  this.name = this.title;
  if (!this.name) {
    this.name = this.firstname;
    if (this.lastname) this.name += " " + this.lastname;
  }

  if (options.strict && this.verify() === false)
    throw new Error("Unexpected fields in " + this.type + " chat.");
  if (options.strict && Object.keys(chat).length)
    throw new Error("unknown fields in chat");
  return this;
};

Chat.prototype.verify = function () {
  if (this.type === "user")
    return this.title === undefined && this.firstname !== undefined;
  if (this.type === "group" || this.type === "supergroup")
    return this.firstname === undefined && this.lastname === undefined && this.username === undefined;
  if (this.type === "channel")
    return this.firstname === undefined && this.lastname === undefined && this.username !== undefined;
  return true;
};

Chat.prototype.parseUser = function parseUser(user, options) {
  checkObj(user);
  user.type = "private";
  return this.parse(user, options);
};

var chatTypes = {
  "private": "user",
  "group": "group",
  "supergroup": "supergroup",
  "channel": "channel"
};
Chat.types = Object.keys(chatTypes).map(function (key) { return chatTypes[key]; });

File.prototype.parseLight = function parseLight(file, options) {
  checkObj(file);

  this.id = checkStr(file.file_id);
  delete file.file_id;

  if (file.file_size !== undefined) {
    this.size = checkInt(file.file_size);
    delete file.file_size;
  }

  if (file.mime_type !== undefined) {
    this.mime = checkStr(file.mime_type);
    delete file.mime_type;
  }

  if (file.file_path !== undefined) {
    this.path = checkStr(file.file_path);
    delete file.file_path;
  }

  return this;
};

Image.prototype.parse = function parse(size, options) {
  checkObj(size);

  this.file = new File().parseLight(size);

  this.width = checkInt(size.width);
  delete size.width;

  this.height = checkInt(size.height);
  delete size.height;

  if (options.strict && Object.keys(size).length)
    throw new Error("unknown fields in photo size");
  return this;
};

// Resolving functions

function resolveFile(file) {
  if (file instanceof File) file = file.id;
  if (!utils.isStr(file))
    throw new Error("Invalid file ID");
  return file;
}

function resolveChat(chat) {
  if (chat instanceof Chat) chat = chat.id;
  if (!utils.isInt(chat))
    throw new Error("Invalid chat ID");
  return chat;
}

// Unspecified parsing -- just trying to guess...

var isValidUsername = /^[a-z]\w*(_\w+)*$/i;
var isPunctOrWhitespace = /[ \f\n\r\t\v\u00A0\u2028\u2029\$\uFFE5\^\+=`~<>{}\[\]|\u3000-\u303F!-#%-\x2A,-/:;\x3F@\x5B-\x5D_\x7B}\u00A1\u00A7\u00AB\u00B6\u00B7\u00BB\u00BF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u0AF0\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166D\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E3B\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]/;

function parseMentions(msg) {
  var text = msg.text, i, mentions = [];
  while ((i = text.indexOf("@")) !== -1) {
    if (i === 0 || isPunctOrWhitespace.test(text.charAt(i-1))) {
      text = text.substring(i+1);
      var username = text.match(/^[a-z]\w*(_\w+)*/i);
      if (!username) continue;
      username = username[0], text = text.substring(username.length);
      if (text.length == 0 || isPunctOrWhitespace.test(text.charAt(0))) mentions.push(username);
    } else text = text.substring(i+1);
  }

  var func = function mentions(x) {
    if (!x) return func.raw;
    var n = 0;
    func.raw.forEach(function (username) {
      if (utils.equalsIgnoreCase(username, x)) n++;
    });
    return n;
  };
  func.raw = mentions;
  msg.mentions = func;
}

function parseCommand(msg) {
  var text = msg.text;
  var match = /^\/([a-z0-9_]+)(\@[a-z]\w*(_\w+)*)?([ \f\n\r\t\v\u00A0\u2028\u2029]+(.*))?$/i.exec(text);
  if (!match) return;

  msg.command = match[1];
  if (match[2]) msg.username = match[2].substring(1);

  var args = match[5] || "";
  var func = function args(x) {
    if (!x) return func.raw;
    var str = func.raw, ret = [], idx;
    while (--x > 0 && (idx = str.search(/\s/)) !== -1) {
      if (idx) ret.push(str.substring(0, idx));
      str = str.substring(idx + 1);
    }
    ret.push(str);
    return ret;
  };
  func.raw = args;
  msg.args = func;
}



exports.Message = Message;
exports.Chat = Chat;
exports.File = File;
exports.Image = Image;
exports.resolveFile = resolveFile;
exports.resolveChat = resolveChat;
exports.parseMentions = parseMentions;
exports.parseCommand = parseCommand;
