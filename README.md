oftn-bot
========

This is the repository for both of the IRC bots oftn-bot (in #oftn on freenode) and ecmabot (in ##javascript on freenode). This was originally created as a replacement for v8bot (http://github.com/eisd/v8bot). Over time, it changed to include a full-featured IRC bot library.


Features
--------

* Manages bot commands with an easy API
* Support for "intents" which is when you append "@ user" after a bot command, so the bot can reply to that person
* Context object provides information about bot command invocations, including:
  * Who invoked the command
  * Who was it "intended" for
  * Was this invoked in the channel or in a private message?
* Can listen for regular expression matches
* Control logging amount to standard out
* Inherits from Node.js's built-in EventEmitter
* Manages user lists and recognizes mode changes
* Don't worry about flooding the channel with built-in support for truncation
* Default option is to strip control codes and colors
* Each channel and user is represented as a unique JavaScript object with extra information, e.g. channel topic, or user op status
* Includes extra optional libraries:
  * FactoidServ: Manages a list of factoids which are saved and loaded to disk automatically
  * FeelingLucky: Performs a quick Google "I'm Feeling Lucky" search
  * JSONSaver: Saves and loads arbitrary JavaScript objects to disk automatically (used by FactoidServ)
  * Sandbox: Runs JavaScript in a seperate process to allow for users to run code. (Uses v8, but a compiled SpiderMonkey "shovel" is available that uses js185 shared libraries)

API
---

The underlying IRCBot library has methods which make it easy to add functionality.

### Bot(profile)
@profile: An array of objects representing each server to connect to.

This is the main constructor for the bot. It is suggested that you inherit from this object when creating your bot, but you don't have to.

A profile is an array of objects. Each object has the properties:

* host: The domain name or IP of an IRC server to connect to. Default: "localhost"
* port: A port number. Default: 6667.
* nick: A string nick name to try to connect as. Default: "guest"
* password: The password used to connect (This is not NickServ). Default: null
* user: Your IRC username
* real: Your 'real name' on IRC
* channels: An array of channel names to connect to. (e.g. ["#stuff", "##mychannel", "#yomama"])


### bot.init()
Goes through each server in the profile and begins connecting and registering event listeners.

### bot.register_listener(regex, callback)
Adds a regular expression listeners to incoming traffic on all servers. When the messages match, callback is called with the arguments:

* context: A context object
* text: The full message
* 1st subpattern
* 2nd subpattern
* ...

### bot.register_command(command, callback, options)
Adds a command.

* command: A string value for the command
* callback: A function to call when the command is run
* options: An object with the keys: allow_intentions and hidden.

When the command is called, the callback is called with the arguments:

* context: A context object
* text: The command arguments


Additional Documentation
------------------------

This bot AND/OR bot library is still being developed, but those are some of the basic commands. Look at your-bot-here.js for a simple example of an IRC bot using this API, or ecmabot.js for a more complex and featured example.

