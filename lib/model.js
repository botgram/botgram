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
    if (options.strict && this.chat.id !== this.from.id)
      throw new Error("Message was sent on private chat, but chat != from");
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

    // TODO: parse command and mentions

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



}


}



exports.Message = Message;
exports.Chat = Chat;
exports.File = File;
exports.Image = Image;
exports.resolveFile = resolveFile;
exports.resolveChat = resolveChat;
