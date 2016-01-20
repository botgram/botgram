#!/usr/bin/env node
// This bot hashes your text messages, or files you send.
// Demostrates: context, replies, streaming, chat actions.
// Usage: ./hasher.js <auth token>

var crypto = require("crypto");
var botgram = require("botgram");
var bot = botgram(process.argv[2]);

var algs = ["SHA512", "SHA256", "SHA1", "DSA", "MD5", "MD4"];
bot.context({ alg: "MD5", choosing: false });

bot.message(function (msg, reply, next) {
  if (msg.context.choosing && msg.text && !msg.command)
    return chooseAlgorithm(msg.text, msg.context, reply);
  msg.context.choosing = false;
  next();
});

bot.command("start", "help", function (msg, reply, next) {
  reply.text("Hi! Send me messages and I'll hash them with "+msg.context.alg+".\nUse /alg to change the hashing algorithm.");
});

bot.command("alg", function (msg, reply, next) {
  if (msg.args())
    return chooseAlgorithm(msg.args(), msg.context, reply);
  reply.text("What algorithm do you want to use?");
  msg.context.choosing = true;
});

function chooseAlgorithm(alg, context, reply) {
  if (algs.indexOf(alg) == -1)
    return reply.text("Huh? I don't know of any algorithm named "+alg+"...");
  context.choosing = false;
  context.alg = alg;
  reply.text("Okay, I'll hash with "+alg+" from now on.");
}

bot.text(function (msg, reply, next) {
  var hash = crypto.createHash(msg.context.alg);
  hash.update(msg.text, "utf-8");
  reply.reply(msg).text(msg.context.alg + ": " + hash.digest("hex"));
});

bot.document(function (msg, reply, next) {
  reply.action("typing");
  var hash = crypto.createHash(msg.context.alg);
  bot.fileStream(msg.file, function (err, stream) {
    if (err) throw err;
    stream.pipe(hash).on("readable", hashDone);
  });
  function hashDone() {
    var digest = hash.read().toString("hex");
    reply.reply(msg).text(msg.context.alg + ": " + digest);
  }
});
