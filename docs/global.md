## Bot instance

A bot object is created by calling `botgram` with the bot's
username as first argument, and the authentication token
as the second one.

An options object may be passed as the third argument;
the following options are supported:

 - `timeout`: Use a different timeout, in seconds, for long polling (default: 10 minutes).
 - `agent`: Agent to use when making requests to Telegram (default: `undefined`, use Node.JS default).
 - `strict`: Enable strict mode (throw errors whenever we see unknown fields in the
   responses, do extra steps to verify responses are as we expect; default: no)
 - `actionInterval`: Interval, in milliseconds, at which to resend chat actions (default: 3000).
 - `autodetect`: Make a `getMe` call to the API, to test the auth token and get the bot's
   username, id and names. If autodetection is disabled, the user should manually set them (default: yes).
 - `retryInterval`: When a network error occurs, Botgram will wait this time, in milliseconds, before retrying (default: 2000).
 - `ignoreEmpty`: Telegram might theoretically send an empty message (containing only id, timestamp and chat).
   If this option is set, such a message will be ignored, otherwise it'll be delivered to `all()` handlers. (default: yes)


## Handlers (missing)

When the bot receives a message, each applicable handler is tried,
in the order they were registered. If no handler could process the
message, no action is taken.

.from
.original
.forwarded
.channel
.group
.user

TODO: talk about privacy mode, filtering and chat ID resolving, how it's
better to work with ID from the start up, or at least resolve at start. also
catchall handlers should only be for users, not groups.

It's common for handlers to just augment `msg` or `reply` with additional
fields or even overwrite some of them, and then calling `next()`.

TODO: context example


## Concepts

A chat is something messages are sent to. Messages can be texts, photos,
stickers and documents to name a few. A chat can be a *group*,
a *supergroup*, a *channel* or a single *user*.

Every chat has an unique ID, which is an integer.  
This means no group can have the same ID as another group, supergroup,
channel, or user, and so on... Bots count as users and have an ID as well.

Messages also have unique IDs.

Similarily, any file that is uploaded to Telegram servers gets a file
ID, which may be used to download or resend that file later without
having to upload again.

A file ID is associated with the binary contents, and MIME type.
If any of these has to change, the file has to be uploaded again.



## Miscellaneous

- upload media if not there
- bot.fileGet(file, callback(err, info))
- bot.fileStream(file, callback(err, stream))
- bot.fileLoad(file, callback(err, buffer))

-[static] parse text message
-[static] reexported emoji substitution
- set error callback instead of panicking

- deep link (bot.link("payload"), bot.linkGroup("payload"))

- bot.get(X): currently only "username", "firstname", "lastname", "id"
  CAVEAT: not available immediately, see .ready
- bot.test(callback): x

- getProfilePictures
- context

- kickMember
- unbanMember


- ready


- stop

- callMethod

- formatCommand



## Things not exposed

While we try and cover the whole API, there are a couple of
things that have been intentionally left not exposed.

### Webhooks

Botgram cannot make use of webhooks, it always uses long polling.
Webhooks are extremely unconvenient to setup and get working,
they are error prone, unauthenticated (no secret to verify it's
Telegram calling it), insecure (unless you setup and maintain HTTPS),
and do not seem to provide efficiency as soon as the bot gets
some decent traffic.

Long polling, on the other hand, is really easy to implement and
requires zero configuration from either side.

### Update IDs

Update IDs are there only to verify that updates are received in
the correct order, and ensure there are no lost updates. Because
botgram handles update receiving for the user, exposing them
is useless.


TODO: make everything chainable
