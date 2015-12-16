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


Install
-----------------------

Clone the repo:

```sh
# clone without all of the history
git clone --depth=1 https://github.com/oftn/oftn-bot.git my-bot-directory
```

If you want to build on ecmabot.js, copy sample-profile.js to ecmabot-profile.js and edit options. `nickserv` and `password` can be removed for development.

To run the bot: `node ecmabot.js`.

Currently the only way to update the bot is a full restart.

### REPL

ecmabot can run code in a sandbox. It uses [docker][docker], which you'll need to [install][docker-install]. If you don't install docker, the code execution will silently fail. 

If docker is installed, it'll automatically download [js-eval][js-eval], which provides node, and node+babel for executing code. Each code snippet is run in a fresh container with limited memory, cpu usage, no network access, and a user that owns no files or has any special permissions ([see the docker run command][docker-opts]). Keep docker up to date in case any critical security vulnerabilities are found.

To update the [js-eval][js-eval] version, run `docker pull brigand/js-eval`. This will get you the latest node stable and babel version. You don't need to restart the bot when you do this. The lazy way to do this:

```sh
# check for updates every 3 hours (a build occurs at least once every 12 hours)
screen -dmS 'update-js-eval' bash -c 'while true; do sleep 10800; docker pull brigand/js-eval; done'
```

#### Examples

node:

```yaml
user: n> require('path').join('foo', 'bar')
bot: (okay) foo/bar
```

babel:

```yaml
user: b> const [foo, ...bar] = ['a', 'b', 'c'].entries(); bar
bot: (okay) [ [ 1, 'b' ], [ 2, 'c' ] ]
```

[docker]: https://www.docker.com/
[docker-install]: https://docs.docker.com/installation/
[js-eval]: https://registry.hub.docker.com/u/brigand/js-eval/
[docker-opts]: https://github.com/brigand/oftn-bot/blob/es6/lib/sandbox/index.js#L143

Additional Documentation
------------------------

This bot AND/OR bot library is still being developed, but those are some of the basic commands. Look at your-bot-here.js for a simple example of an IRC bot using this API, or ecmabot.js for a more complex and featured example.

