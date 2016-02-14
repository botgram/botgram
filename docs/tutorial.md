# Tutorial

This document will walk you through creating your first
Telegram bot with Botgram. Before we begin, you should
install Telegram if you don't have it already,
[talk to the BotFather](https://telegram.me/BotFather)
and register your first bot.

It takes less than a minute, and you will be given an **auth
token**, which looks like this:

    123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

You'll need this auth token to be able to run the snippets
and examples.


## Hello world!

To use Botgram, you first create a Bot object:

~~~ js
var bot = botgram("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11");
~~~

Then, to start receiving Telegram messages, register some handlers:

~~~ js
bot.command("start", function (msg, reply, next) {
  console.log("Received a /start command from", msg.from.username);
});

bot.text(function (msg, reply, next) {
  console.log("Received a text message:", msg.text);
});
~~~

Handlers are functions that react to some kind of message.
In the above example, we've registered three handlers: one for
`start` commands and another for texts.

When the bot receives a message, it calls the first handler that
matches it, passing it the message as the first parameter `msg`.
If no handlers match, the message will be silently ignored.

Try running that code (remember to put your actual auth token in it)
and talk to your bot!


## Sending replies

Printing to the console is okay, but not very interesting. Let's
actually reply to the user when they send us a text, using the
`reply` object:

~~~ js
bot.text(function (msg, reply, next) {
  reply.text("hello!");
});
~~~


## More message types

In Telegram, messages aren't limited to just texts: they can be stickers,
media, attached files, locations, contacts... Botgram allows you to recieve
them just fine:

~~~ js
bot.contact(function (msg, reply, next) {
  console.log("User %s sent us a contact:", msg.from.firstname);
  console.log(" * Phone: %s", msg.phone);
  console.log(" * Name: %s %s", msg.firstname, msg.lastname);
  reply.text("Ok, got that contact.");
});

bot.video(function (msg, reply, next) {
  reply.text("That's a " + msg.width + "x" + msg.height + " video.");
});

bot.location(function (msg, reply, next) {
  reply.text("You seem to be at " + msg.latitude + ", " + msg.longitude);
});
~~~

Curious about the attributes of `msg`? [Look here][message] for
a complete reference of them, for every type of message.

Curious about the different kinds of handlers you can register?
[Look here][handlers] for a complete reference of them.


## Richer replies

Just like you can receive them, you can send them. Here's a
quick example:

~~~ js
bot.command("whereareyou", function (msg, reply, next) {
  reply.text("I'm at:");
  reply.location(38.8976763, -77.0387185);
});

bot.photo(function (msg, reply, next) {
  reply.sticker("BQADAgAD3gAD9HsZAAFphGBFqImfGAI");
});
~~~

Curious about `reply` methods? [Look here][reply] for a
complete reference of them, and their parameters.


## Downloading files

For photo messages and other media, `msg` doesn't contain the
actual binary contents, only a `file` object with some kind of ID.
You have to call `bot.fileGet` like this:

~~~ js
bot.voice(function (msg, reply, next) {
  bot.fileGet(msg.file, function (err, info) {
    if (err) throw err;
    console.log("We got the link:", info.link);
  });
});
~~~

Now, whenever someone sends a voice note to the bot, it'll print something like:

    We got the link: https://api.telegram.org/file/bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11/document/file_0.webp

This link lets you download the actual audio file.
You can also do it in one step with `bot.fileLoad`:

~~~ js
bot.voice(function (msg, reply, next) {
  bot.fileLoad(msg.file, function (err, buffer) {
    if (err) throw err;
    console.log("Downloaded! Writing to disk...");
    require("fs").writeFile("voice.ogg", buffer);
  });
});
~~~

This example will write the binary contents (stored at `buffer`)
into a file `voice.ogg`.

This is just a silly example. While using `bot.fileLoad` is
convenient sometimes, it's fairly limited (you can't get updates
on the download progress, for instance) and it stores the *whole
file into memory*, which is bad practice.

So most times it's better to either download
the file yourself, or use [`fileStream`][fileStream].
See the [`hasher.js` example](../examples/hasher.js).


## Sending media

TODO: write this section when uploading is decided


## Fallthrough

TODO: write this section



[message]: message.md
[handlers]: handlers.md
[reply]: reply.md
