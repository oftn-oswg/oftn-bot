vbotjr
======

vbotjr was originally made as a replacement for v8bot (http://github.com/eisd/v8bot). Over time the IRC library progressed to not be so buggy and added support for listeners and commands.

API
---

The underlying IRCBot library has methods which make it easy to add functionality.

### IRCBot(profile)
@profile: An array of objects representing each server to connect to.

This is the main constructor for the IRCBot. It is recommend to inherit from this object when creating your bot.

A profile is an array of objects. Each object has the properties:

* host: The domain name or IP of an IRC server to connect to. Default: "localhost"
* port: A port number. Default: 6667.
* nick: A string nick name to try to connect as. Default: "guest"
* password: The password used to connect (This is not NickServ). Default: null
* user: Your IRC username
* real: Your 'real name' on IRC
* channels: An array of channel names to connect to. (e.g. ["#stuff", "##mychannel", "#yomama"])


### this.init()
Goes through each server in the profile and begins connecting and registering event listeners.

### this.register_listener(regex, callback)
Adds a regular expression listeners to incoming traffic on all servers. When the messages match, callback is called with the arguments:

* context: A context object
* text: The full message
* 1st subpattern
* 2nd subpattern
* ...

### this.register_command(command, callback)
Adds a command. When the command is called, the callback is called with the arguments:

* context: A context object
* text: The command arguments


Additional Documentation
------------------------

This bot AND/OR bot library is still being developed, but those are some of the basic commands. Look at javascriptbot.js for an example usage.

