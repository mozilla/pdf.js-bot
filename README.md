# WORK IN PROGRESS

These files are used at Mozilla to run the cloud regression tests for the project [pdf.js](https://github.com/andreasgal/pdf.js).


## Workflow

**Performing regression test**

1. User submits pull request to main repo
2. Reviewer mentions `@pdfjsbot` if test is deemed necessary
3. `@pdfjsbot` comments back with the results of test

**Generating reference snapshots**

1. Reviewer attaches tag `ref` to desired commit
2. `@pdfjsbot` detects new tag position, generates snapshots, and pushes them to snapshot repo `pdf.js-ref`


## Setting up bot server

1. `git clone` bot repo to `pdf.js-bot`
2. `export GITHUB_CREDENTIALS=pdfjsbot:<password_here>`
3. Install `node.js` and `npm` (prefer stable binary packages if available)
4. Run `npm install` in the root of `pdf.js-bot/`
5. Start bot with `forever bot.js`
