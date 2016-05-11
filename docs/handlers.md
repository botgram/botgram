# Handler types

A handler is a function that processes an incoming message. It
gets passed three arguments:

 - `msg`: The [message object](#message-object) to process.
 - `reply`: The [reply queue](#reply-queue) of the chat the message was sent to.
 - `next`: Callback that the handler must call if it couldn't process the
   message, so that processing will be tried with the next suitable handler.

The different kinds of handler to register are documented below.
The most general one is `all(handler)`, which gets any message
the bot could possibly receive.

A handler is passed the bot object as the value of `this`.


## `all(handler)`

Register a handler that will receive any incoming message.

Calling `all(handler)` is equivalent to `message(true, handler)`,
except that empty messages will also be received if `ignoreEmpty`
is set to `false`.


## `message([alsoUpdates], handler)`

Register a handler that will receive all messages, of any
kind, except [updates](message.md#updates).

~~~ js
bot.message(function (msg, reply, text) {
  reply.text("I just received a: " + msg.type);
});
~~~

If you wish to receive updates as well, pass `true` as `alsoUpdates`:

~~~ js
bot.message(true, function (msg, reply, text) {
  // matches messages of any kind, including updates
});
~~~


## `text([alsoCommands], handler)`

Register a handler that will be called for text messages
**except commands**.

~~~ js
bot.text(function (msg, reply, text) {
  reply.text("You said: " + msg.text);
});
~~~

If you want the handler to receive commands as well, pass `true`
as `alsoCommands`, i.e:

~~~ js
bot.text(true, function (msg, reply, next) {
  // receives all text messages, including commands
});
~~~


## `mention([alsoCommands], [username], handler)`

Equivalent to `text(alsoCommands, handler)` except that it
also filters texts that contain mentions to the bot, or to
`username` if passed. Examples:

~~~ js
bot.mention(function (msg, reply, next) {
  // msg is a mention to my username, and is not a command
});

bot.mention("foobar", function (msg, reply, next) {
  // msg is a mention to @foobar, and not a command
});

bot.mention(true, "foobar", function (msg, reply, next) {
  // msg is a mention to @foobar, and can be a command
});
~~~

In the above example, a text message like `@foobar @<bot username>`
could be accepted by all three handlers. Usernames are checked
case insensitively.


## `command([name...], handler)`

Register a handler that will only receive text messages
that are commands for this bot, matching one of the passed
names case-insensitively:

~~~ js
bot.command("hello", "start", function (msg, reply, next) {
  // will match any of:
  //
  //     /hello world
  //     /HeLLo dear
  //     /START the fricking show
  //     /start@<my username>
  //
  // but not:
  //
  //     /hello@<other username>
  //     /started
});
~~~

Regexes can also be passed for matching
(don't forget the `i` flag):

~~~ js
bot.command("process", /^process_\w+/i, function (msg, reply, next) {
  // will match /process, /process_foo, /process_bar, etc.
});
~~~

If you do not pass anything, the handler will be called for all
commands **directed exclusively to the bot**! This is the correct
way to implement default handlers like:

~~~ js
// handle all known commands here

// then the default handler
bot.command(function (msg, reply, next) {
  reply.text("Invalid command, oops!");
});
~~~

This way, the bot will silently ignore unknown commands in a group
(since they are probably for another bot), but will still answer
if its username is explicitely mentioned, i.e:

    [in group / supergroup chat]
    /unknown@<my username>
    Invalid command, oops!

In private chats, the default handler will also fire even if the
username is not explicitely mentioned, i.e.:

    [in private chat]
    /unknown
    Invalid command, oops!

If you want to catch all commands to this bot, even if not
exclusively for it, pass `true`:

~~~ js
bot.command(true, function (msg, reply, next) {
  // will match any unhandled command, even if on a group. use with care!
});
~~~


TODO: document rest of handlers
