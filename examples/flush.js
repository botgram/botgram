#!/usr/bin/env node
// Bot that just discards all queued messages and exits.
// Useful when developing, or just to test the auth token.
// Usage: ./flush.sh <auth token>

var botgram = require("..");
var bot = botgram(process.argv[2], {timeout: 1});

bot.on("ready", function () {
  console.log("Authenticated, discarding messages...");
});

bot.on("synced", function () {
  bot.stop();
});
