# Botgram

Microframework to build Telegram bots.

~~~ js
const botgram = require("botgram")
const bot = botgram("<auth token>")

bot.command("start", "help", (msg, reply) =>
  reply.text("To schedule an alert, do: /alert <seconds> <text>"))

bot.command("alert", (msg, reply) => {
  var [ seconds, text ] = msg.args(2)
  if (!seconds.match(/^\d+$/) || !text) return next()

  setTimeout(() => reply.text(text), Number(seconds) * 1000)
})

bot.command((msg, reply) =>
  reply.text("Invalid command."))
~~~

Main features:

 - Simple, intuitive API.
 - Quick setup; just put your auth token and you're in business.
 - Powerful, [connect]-style message handling and filtering.
 - Exposes all functionality in the Bot API 2.3.1, including custom
   keyboards, inline keyboards, force reply, chat actions, deep
   linking, kicking users, editing messages, notifications...
 - Ability to stream downloads and uploads.

Bots API version implemented: December 4, 2016

**Follow the [tutorial], take a look at more [examples],
or consult the [documentation].**



[connect]: https://github.com/senchalabs/connect

[tutorial]: https://github.com/jmendeth/node-botgram/blob/master/docs/tutorial.md
[examples]: https://github.com/jmendeth/node-botgram/tree/master/examples
[documentation]: https://github.com/jmendeth/node-botgram/blob/master/docs/index.md
