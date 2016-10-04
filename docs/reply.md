# Reply queues

the reply passed to command is single for a chat
Reply is a single queue.
bot.reply() creates queue.
Everything (bot, reply) is chainable, returns this by default.


- custom keyboard
- force reply
- disable link preview
- silent
- forward id, chatId
  forward msg

  ignores modifiers

- message(msg, reforward)

 -> Send message described by msg. REPLY STATUS IS LOST.
    If reforward is passed and `true`, and `msg` is a forwarded
    message, it will be reforwarded instead of resent.
 -> Updates cannot be sent, but there are other message types
    that a bot can't currently send (at the time of this writing,
    `contact` only). So it's a good idea to use try / catch...

to upload: buffer, stream, id

reply has a then method accepting (err) {
  callback
}
err is propagated from previous action.
if action throws error and no then callback following,
'user error' is emitted

calling then without accompanying action will just enqueue


Talk about file size limit for bots, and HTML / markdown limitations
at the time of this writing, link to telegram api manual.

Modifiers are lost after a message send method is called, even if not
applicable to that message.

talk about HTTP URLs when uploading files, and file upload limits in
both cases
