#!/usr/bin/env node
// This bot echoes back whatever you send to it.
// Usage: ./echo.js <auth token>

var botgram = require("botgram");
var bot = botgram(process.argv[2]);

bot.message(function (msg, reply, next) {
  reply.text("You said:");
  reply.message(msg);
});
