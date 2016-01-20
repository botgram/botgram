# Reply queues

the reply passed to command is single for a chat
Reply is a single queue.
Reply methods can accept optional chatId
bot.reply() creates queue.
Everything (bot, reply) is chainable, returns this by default.


- custom keyboard
- force reply
- forward msg, id, [msg, id]

- message(msg, reforward)

 -> Send message described by msg. REPLY STATUS IS LOST.
    If reforward is passed and `true`, and `msg` is a forwarded
    message, it will be reforwarded instead of resent.

to upload: buffer, stream, id
