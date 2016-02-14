#!/usr/bin/env node
// Bot that runs commands locally and replies with their
// output in real time, allowing the user to send input
// as well. Only messages from <username> will be
// processed, for security reasons.
// Usage: ./shell.js <auth token> <username>
var botgram = require("botgram");
var escapeHtml = require("escape-html");
var spawn = require("child_process").spawn;
var bot = botgram(process.argv[2]);

bot.message(function (msg, reply, next) {
  if (msg.from.username === "jmendeth") return next();
});
bot.context({ env: Object.create(process.env) });

bot.text(true, function (msg, reply, next) {
  if (!msg.reply || msg.reply.from.id !== bot.get("id")) return next();

  if (msg.context.command)
    msg.context.command.process.stdin.write(msg.text + "\n");
  else
    reply.html("</strong>No command running.</strong>");
});

bot.command("help", "start", function (msg, reply, next) {
  reply.text("Use /sh <command> and I'll execute it for you. Use /kill to terminate it.");
});

bot.command("sh", function (msg, reply, next) {
  if (msg.context.command) return reply.text("Command is already running: "+msg.context.command.text+"\nUse /kill to terminate it.");
  var args = msg.args();
  if (args.trim().length == 0) return next();
  
  var command = { text: args };
  msg.context.command = command;
  reply.html("<strong>$ "+escapeHtml(args)+"</strong>");

  var queue = new ChunkQueue(reply, { chunkTime: 310, globalTime: 2000, maxLength: 900 });
  command.queue = queue;
  command.process = spawn("sh", ["-c", args], {env: msg.context.env});
  command.process.stdout.on("data", readChunk.bind(this, "out"));
  command.process.stderr.on("data", readChunk.bind(this, "err"));
  command.process.on("close", function (code, signal) {
    msg.context.command = null;
    queue.flush();
    if (signal)
      reply.html("\uD83D\uDC80 <strong>Killed</strong> by "+signal+".");
    else if (code === 0)
      reply.html("\u2705 <strong>Exited</strong> correctly.");
    else
      reply.html("\u26D4 <strong>Exited</strong> with "+code+".");
  });
  command.process.on("error", function (err) {
    msg.context.command = null;
    reply.html("<strong>Couldn't run shell:</strong> "+err.code);
  });

  function readChunk(type, chunk) {
    queue.chunk({ type: type, data: chunk.toString() });
  }
});

bot.command("kill", function (msg, reply, next) {
  if (!msg.context.command) return reply.html("<strong>No command running.</strong>");
  msg.context.command.process.kill();
});

bot.command("end", function (msg, reply, next) {
  if (!msg.context.command) return reply.html("<strong>No command running.</strong>");
  msg.context.command.process.stdin.end();
});

bot.command("env", function (msg, reply, next) {
  var args = msg.args();
  if (!args) return next();
  if (args.indexOf("\0") !== -1)
    return reply.html("<strong>Malformed argument.</strong>");

  if (args.indexOf("=") === -1) {
    var name = args.toUpperCase();
    var value = msg.context.env[name];
    if (value === undefined)
      return reply.html("<strong>No such variable.</strong>");
    reply.html("<strong>"+escapeHtml(name)+"</strong>: "+escapeHtml(value));
  } else {
    var name = args.substring(0, args.indexOf("=")).toUpperCase();
    var value = args.substring(name.length + 1);
    if (value.length === 0) value = undefined;
    msg.context.env[name] = value;
    return reply.html("<strong>Variable set.</strong>");
  }
});

bot.command(function (msg, reply, next) {
  reply.html("<strong>No such command.</strong>");
});

// TODO: perform subsitution on leading / trailing newlines
// TODO: allow not replying in private chats, enforce reply to valid msg
// TODO: /shell
// FIXME: /sh in two steps (force reply)
// TODO: silent mode
// TODO: strip escape sequences
// FIXME: cannot /kill ping, setuid? make /kill accept optional signal



function ChunkQueue(reply, options) {
  this.reply = reply;
  this.options = options;
  this.chunks = [];
  this.accumulatedLength = 0;
}

ChunkQueue.prototype.chunk = function chunk(c) {
  if (c.data.length == 0) return;

  // If we just flushed, notify the user there are now pending chunks
  if (this.chunks.length == 0) this.reply.action("typing");

  // Add chunk to queue
  this.chunks.push(c);
  this.accumulatedLength += c.data.length;

  // Flush if maximum length has been exceeded
  if (this.accumulatedLength > this.options.maxLength)
    return this.flush();

  // Place a global timer if not present
  if (!this.globalTimer)
    this.globalTimer = setTimeout(this.globalTimerCallback.bind(this), this.options.globalTime);

  // Reset chunk timer
  if (this.chunkTimer) clearTimeout(this.chunkTimer);
  this.chunkTimer = setTimeout(this.chunkTimerCallback.bind(this), this.options.chunkTime);
};

ChunkQueue.prototype.globalTimerCallback = function globalTimerCallback() {
  this.globalTimer = null;
  this.flush();
};

ChunkQueue.prototype.chunkTimerCallback = function chunkTimerCallback() {
  this.chunkTimer = null;
  this.flush();
};

ChunkQueue.prototype.flush = function flush() {
  if (this.chunks.length == 0) return;

  // Cancel timers
  if (this.globalTimer) clearTimeout(this.globalTimer);
  if (this.chunkTimer) clearTimeout(this.chunkTimer);
  this.globalTimer = this.chunkTimer = null;

  // Strip last line feed if present
  var lastChunk = this.chunks[this.chunks.length - 1];
  var endsWithLine = lastChunk.data[lastChunk.data.length - 1] == "\n";
  if (endsWithLine && this.accumulatedLength > 1)
    lastChunk.data = lastChunk.data.substring(0, lastChunk.data.length - 1);

  // Render chunks to HTML
  var html = [];
  this.chunks.forEach(function (c) {
    var content = escapeHtml(c.data);
    if (c.type === "err") html.push("<em>"+content+"</em>");
    else html.push(content);
  });
  html = html.join("");
  if (!endsWithLine) html += "\uD83D\uDD38";

  // Send to user
  if (html.trim().length > 0)
    this.reply.html(html);

  // Clear queue
  this.chunks = [];
  this.accumulatedLength = 0;
};
