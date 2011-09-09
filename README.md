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

1. Install `node.js` and `npm` (prefer stable binary packages if available)
2. Run `npm install` in the root of `pdf.js-bot/`
3. Clone repo: `git clone` to `pdf.js-bot`
4. Configure: `export GITHUB_CREDENTIALS=pdfjsbot:<password_here>`
5. Configure more: edit `globals.json`
6. Start bot with `forever bot.js`

The bot will generate the following directories:

    data-test/              stores commits to be tested ('make test')
    data-master/            stores commits for generating reference snapshots ('make master')
