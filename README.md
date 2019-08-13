[![Botgram](./docs/splash.png)](https://botgram.js.org)

[Bots] are special Telegram users controlled with an HTTP API. Botgram
aims to expose the capabilities of this API with a very clear and minimal
syntax, so you can create Telegram bots easily.

~~~ js
const botgram = require('botgram')
const bot = botgram('<auth token>')

bot.onCommand('start', 'help', ({ chat }) =>
  chat.sendText('To schedule an alert, do: /alert <seconds> <text>'))

bot.onCommand('alert', ({ chat, command }, next) => {
  const args = command.args.match(/^(\d+) (.+)/)
  if (!args) return next()
  const seconds = Number(args[1])
  setTimeout(() => chat.sendText(args[2]), seconds * 1000)
})

bot.onCommand(({ chat }) =>
  chat.sendText('Invalid command.'))

bot.listen()
~~~

### Features

 - Simple, intuitive API.
 - Quick setup; just put your auth token and you're in business.
 - Exposes all functionality in the Bot API 2.3.1, including custom
   keyboards, inline keyboards, force reply, chat actions, deep
   linking, kicking users, editing messages, notifications...
 - Ability to stream downloads and uploads.
 - Powerful, [connect]-style message handling and filtering.

Bots API version implemented: December 4, 2016

### Install

~~~ bash
npm install botgram
~~~

**Follow the [tutorial], take a look at more [examples],
or consult the [documentation].**



[bots]: https://core.telegram.org/bots
[connect]: https://github.com/senchalabs/connect

[tutorial]: https://github.com/botgram/botgram/blob/master/docs/tutorial.md
[examples]: https://github.com/botgram/botgram/tree/master/examples
[documentation]: https://github.com/botgram/botgram/blob/master/docs/index.md
