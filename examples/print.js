#!/usr/bin/env node
// Bot that flushes queued messages and displays the first received
// message. Useful when developing, or just to test the auth token.
// Usage: ./print.sh <auth token>

var botgram = require("..");
var bot = botgram(process.argv[2], {timeout: 1});
var util = require("util");

bot.on("synced", function () {
  console.log("Talk to me: %s", bot.link());
  console.log("Waiting for a message...");
});

bot.all(function (msg, reply, next) {
  if (msg.queued) return;
  printMessage(msg);
  bot.stop();
});

function printMessage(msg) {
  console.log("Got a message from %s %s (%s):\n", msg.chat.type, msg.chat.id, msg.chat.name);
  console.log(util.inspect(msg, {colors: true, depth: null}));
}
