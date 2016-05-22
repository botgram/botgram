#!/usr/bin/env node
// This bot echoes back whatever you send to it, similar to
// the echo example, but also replays edits you make to your
// messages.
// Usage: ./edit_echo.js <auth token>

var botgram = require("..");
var bot = botgram(process.argv[2]);

// Maps received messages to sent messages. `sent_messages[id]`
// is a promise for our (last edit of) user's message with `id`.
var sentMessages = {};

bot.message(function (msg, reply, next) {
  sentMessages[msg.id] = promiseForResult(reply.message(msg));
});

// Receive edits to messages
bot.edited.all(function (msg, reply, next) {
  // If we didn't echo this message, we can't edit it either
  if (!sentMessages[msg.id]) return;

  // If this is a text message, edit it
  if (msg.text) {
    sentMessages[msg.id] = sentMessages[msg.id].then(function (ownMsg) {
      return promiseForResult(reply.editText(ownMsg, msg.text));
    });
  }

  // If the message has a caption, edit it
  if (msg.caption) {
    sentMessages[msg.id] = sentMessages[msg.id].then(function (ownMsg) {
      return promiseForResult(reply.editCaption(ownMsg, msg.caption));
    });
  }
});


// Returns a promise for the returned message, parsed into a Message object.
function promiseForResult(reply) {
  return new Promise(function (resolve, reject) {
    reply.then(function (err, result, next) {
      if (err) reject(err);
      else resolve(new botgram.Message().parse(result, bot.options));
      next();
    });
  });
}
