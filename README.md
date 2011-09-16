# pdf.js-bot

These files are used by pdf.js reviewers to run cloud regression tests.


## Workflow

**Performing regression test**

1. User submits pull request to main repo
2. Reviewer mentions `@pdfjsbot` if test is deemed necessary
3. `@pdfjsbot` comments back with the results of test

Once mentioned in a pull request, `@pdfjsbot` will continue to check the issue for newer commits, and will fire off the tests every time a new commit is detected.


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
