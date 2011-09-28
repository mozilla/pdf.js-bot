# pdf.js-bot

This bot is used by pdf.js reviewers to run regression tests. The bot lives in `server.js` and requires node.js. See instructions below on how to set it up.


## Reviewer workflow

**Performing regression test**

1. User submits pull request to main repo
2. Reviewer leaves comment `@pdfjsbot test`
3. `@pdfjsbot` pulls most recent SHA of the pull request, runs test against `pdf.js-ref` repo, and comments back with the results of test

**Generating reference snapshots**

1. User submits pull request to main repo containing new features
1. Reviewer leaves comment `@pdfjsbot makeref`
2. `@pdfjsbot` pulls most recent SHA of the pull request, generates snapshots, and pushes them to the `pdf.js-ref` repo


## Setting up bot server

**Distro and basics**

The instructions below assume **Ubuntu 11.04**. See http://alestic.com/ for a list of EC2 images.

1. `$ sudo apt-get update`
1. Install via apt-get: `make`, `g++`

**Browser, Xvfb**

1. Install via apt-get: `firefox`, `xvfb` (necessary as we will run browsers without a display)
1. Test `xvfb` via `$ xvfb-run firefox`. Firefox shouldn't bail out with a no-display message.
1. Configure `xvfb` by adding to `/etc/profile`:

        Xvfb :1 1>/dev/null 2>/dev/null &
        export DISPLAY=:1

1. `$ sudo reboot`

**Git, Github**

1. Install via apt-get: `git`
1. Create Github ssh key in `~/.ssh`: `$ ssh-keygen -t rsa -C "pdfjsbot@gmail.com"`
1. Log into Github as @pdfjsbot, add public ssh key from file `~/.ssh/id_rsa.pub`
1. Test ssh key: `$ ssh -T git@github.com`
1. Set up ssh agent to avoid repeated password entry: `$ exec ssh-agent bash`, `$ ssh-add ~/.ssh/id_rsa`
1. Configure git signatures: `$ git config --global user.name "pdfjs bot"`, `git config --global user.email "pdfjsbot@gmail.com"`
1. Set Github API credentials: `$ export GITHUB_CREDENTIALS=pdfjsbot:<password_here>`

**Node.js**

1. Install `nodejs` and `nodejs-dev` from binaries: https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager
1. Make sure `nodejs-dev` and `g++` are installed before proceeding!
1. Install node.js package manager npm: `$ curl http://npmjs.org/install.sh | sudo sh`
1. Install global node utility forever: `$ sudo npm install -g forever`


**Bot**

1. Clone repo into home dir: `$ git clone <pdf.js-bot-URL>`
1. Install required node packages: `$ cd pdf.js-bot; npm install`
1. Configure parameters: `config.json`
1. Configure browser manifest file: `test-files/browser_manifest.json`
1. Start bot with `$ forever server.js > /tmp/bot.log`
