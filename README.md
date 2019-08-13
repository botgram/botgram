[![Botgram](https://botgram.js.org/docs/splash.png)](https://botgram.js.org)

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

- Intuitive: Simple API and powerful introspection system with
  Typescript typings for requests and input data, and useful
  utilities like editable messages, templating and localization.

- Efficient: Connections to Telegram servers are reused by default,
  and an optimized version of `form-data` is employed, reducing
  latency and resource usage.

- Light: Has very few dependencies, weighting around 3MB in total.

- Extensible: Powerful [Express]-style message handling allows
  incorporating additional functionality through middleware such
  as loggers, state-saving and more.

- Support for webhooks, and integration with [AWS Lambda][lambda],
  [Cloud Functions][cloudFunctions], [Express] and more.

Bots API version implemented: **4.4**

### Install

~~~ bash
npm install botgram
~~~

**Follow the [tutorial], take a look at more [examples],
or consult the [documentation].**



[bots]: https://core.telegram.org/bots
[express]: https://expressjs.com
[lambda]: https://aws.amazon.com/lambda
[cloudFunctions]: https://cloud.google.com/functions

[tutorial]: https://github.com/botgram/botgram/blob/master/docs/tutorial.md
[examples]: https://github.com/botgram/botgram/tree/master/examples
[documentation]: https://github.com/botgram/botgram/blob/master/docs/index.md
