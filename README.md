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

**Github-specific**

0. Set up Github `ssh` key for `@pdfjsbot` user, as per Github docs (bot needs ssh authority to push to ref repo)
1. Configure Github environment variable: `$export GITHUB_CREDENTIALS=pdfjsbot:<password_here>`

**Installs**

1. Install `node.js` and `npm` (prefer stable binary packages if available)
2. Install required node packages: `$ npm install` in the root of `pdf.js-bot/`
3. Clone repo: `git clone` to `pdf.js-bot/` dir
5. Configure bot with right parameters: `$ vim config.json`
6. Start bot with `forever server.js`
