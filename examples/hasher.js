#!/usr/bin/env node
// This bot hashes your text messages, or files you send.
// Demostrates: context, replies, streaming, chat actions,
// custom keyboards, fallthrough.
// Usage: ./hasher.js <auth token>

var crypto = require("crypto");
var botgram = require("..");
var bot = botgram(process.argv[2]);

var algs = [["SHA512", "SHA256", "SHA1"], ["DSA", "MD5", "MD4"]];
var flatAlgs = Array.prototype.concat.apply([], algs);
bot.context({ alg: "MD5", choosing: false });

bot.message(function (msg, reply, next) {
  if (!msg.user) return;

  if (msg.context.choosing && msg.text && !msg.command)
    return chooseAlgorithm(msg.text, msg.context, reply);
  msg.context.choosing = false;
  next();
});

bot.command("start", "help", function (msg, reply, next) {
  reply.text("Hi! Send me messages or files and I'll hash them with "+msg.context.alg+".\nUse /alg to change the hashing algorithm.");
});

bot.command("alg", function (msg, reply, next) {
  if (msg.args())
    return chooseAlgorithm(msg.args(), msg.context, reply);
  reply.keyboard(algs).text("What algorithm do you want to use?");
  msg.context.choosing = true;
});

function chooseAlgorithm(alg, context, reply) {
  if (flatAlgs.indexOf(alg) == -1)
    return reply.text("Huh? I don't know of any algorithm named "+alg+"...");
  context.choosing = false;
  context.alg = alg;
  reply.keyboard().text("Okay, I'll hash with "+alg+" from now on.");
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
    var digest = hash.read();
    if (!digest) return;
    reply.reply(msg).text(msg.context.alg + ": " + digest.toString("hex"));
  }
});
