# pdf.js-bot

This bot is used by pdf.js reviewers to run regression tests. The bot lives in `server.js` and requires node.js. See instructions below on how to set it up.


## Getting started

To issue bot requests use the commands below as comments in open pull requests (PR). Here's an example:

+ https://github.com/andreasgal/pdf.js/pull/603

Note that the bot only listens for commands from repo collaborators (auto-whitelist). Currently our tests are taking approximately **25-30 mins** (including our very long pdf.pdf test file), and we've implemented a 60-min timeout for tests that for some reason hang.

+ `@pdfjsbot test` : This will run the full suite of tests on the PR, including image comparison tests against the reference repo at `arturadib/pdf.js-ref`. In case there are any image differences, a URL/link will be provided in a comment to the pull request to allow reviewers and requesters to inspect the images and their differences.

+ `@pdfjsbot makeref` : This will generate reference images using the pull request source code and push the resulting images to the reference repo. Note that THIS WILL OVERWRITE any existing images, so only do this if you definitely approve all the visual changes introduced in the PR.


## The nitty-gritty:

Here are a few things you might want to know, might have to know in the near future when certain WARNING flags come up, or might never need to know simply because you're so lucky and things just work for you!

+ **Commands are run in a queue** : The bot currently doesn't support concurrent tests. Your order in the queue is reported by the bot upon command recognition.

+ **By default, test files come from upstream** : To ensure we are always testing new code against the latest and most comprehensive regression tests, by default the bot checks out `test/` from upstream into the PR clone. The exception is when the pull request itself has new/modified files in `test/`, in which case the bot uses `test/` files from the PR and issues a WARNING explaining it's not using upstream for tests. (This fallback is in place to allow PRs to introduce new tests).

    If there's any suspicion that the PR tests will miss important tests from upstream, the reviewer should ask the requester to merge upstream into the PR branch, and run the test again.

+ **Reference images are not versioned** : Because of their size we don't version our images repo. This means that a pull request might get compared against images with new features that are not present in the requester's branch. In this case the bot will issue a WARNING explaining the situation.

    If the tests pass, it shouldn't be a problem. If they don't, the reviewer should ask the requester to merge upstream into their PR and try again, as the regression might be due to a missing commit.


## Troubleshooting

**Logging into EC2**

To log into the server:

    $ ssh -i <ssh_key_file.pem> ubuntu@<ec2_machine_address>

The two unknowns above should be known by the bot collaborators.

**Log file**

This is the first place to take a peek at:

    /tmp/bot.log

(TODO: place file in `/var/log` and configure `logrotate`)

**Updating and restarting bot**

There's a script for that:

    $ cd pdf.js-bot/
    $ ./update
    
**Restarting bot**

    $ cd pdf.js-bot/
    $ forever stop 0
    $ forever start -o /tmp/bot.log server.js

And cross your fingers :)


## Setting up bot server

**Distro and basics**

The instructions below assume we'll be deploying on **Ubuntu 11.04**. See http://alestic.com/ for a list of EC2 images.

1. `$ sudo apt-get update`
1. Install via apt-get: `make`, `g++`

**Browser, Xvfb**

1. Install via apt-get: `firefox`, `xvfb` (necessary as we will run browsers without a display)
1. Test `xvfb` via `$ xvfb-run firefox`. Firefox shouldn't bail out with a no-display message.
1. Configure `xvfb` by appending to `/etc/profile`:

        /usr/bin/Xvfb :1 1>/dev/null 2>/dev/null &
        export DISPLAY=:1

**Git, Github**

1. Install via apt-get: `git`
1. Create Github ssh key in `~/.ssh`: `$ ssh-keygen -t rsa -C "pdfjsbot@gmail.com"`
1. _DO NOT ADD AN SSH PASSWORD TO THE KEY._ This requires setting up `ssh-agent` and a password prompt upon every boot.
1. Log into Github as @pdfjsbot, add public ssh key from file `~/.ssh/id_rsa.pub`
1. Test ssh key: `$ ssh -T git@github.com`
1. Set up ssh agent to avoid repeated password entry: `$ exec ssh-agent bash`, `$ ssh-add ~/.ssh/id_rsa`
1. Configure git signatures: `$ git config --global user.name "pdfjs bot"`, `git config --global user.email "pdfjsbot@gmail.com"`
1. Set Github API credentials by appending to `/etc/profile`:

        export GITHUB_CREDENTIALS=pdfjsbot:<password_here>

1. Run `$ /etc/profile`, or `$ sudo reboot` to effect profile changes


**Node.js**

1. Install `nodejs` and `nodejs-dev` from binaries: https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager
1. Make sure `nodejs-dev` and `g++` are installed before proceeding!
1. Install node.js package manager npm: `$ curl http://npmjs.org/install.sh | sudo sh`
1. Install global node utility forever: `$ sudo npm install -g forever`

**Bot**

1. Clone repo into home dir: `$ git clone <pdf.js-bot-URL>`
1. Install required node packages: `$ cd pdf.js-bot; npm install`
1. Configure browser manifest file: `test-files/browser_manifest.json`

**Launch: Production**

1. Check if default parameters are OK: `config.json`
1. Start bot with `$ forever start -o /tmp/bot.log server.js`
1. (You can stop server with `$ forever stop 0`)

**Launch: Staging**

_(Use this for local tests)_

1. Configure parameters for your own tests in: `config_staging.json`
1. Set environment variable `$ export PDFJSBOT_STAGING=yes`
1. Start bot with `$ node server.js`

