# pdf.js-tryserver

**Work in progress**

These files are used at Mozilla to run the cloud regression tests for the project [pdf.js](https://github.com/andreasgal/pdf.js).


## Workflow

**Users**

1. User submits pull request to main repo
2. Admin mentions '@pdfjsbot' if test is deemed necessary
3. @pdfjsbot comments back with the result of tests

**Generating reference snapshots (private)**

1. Admin pushes stable repo to `pdf.js-refs`, at our git server
2. Git server generates all reference snapshots, saves them for future tests



## Setting up the cloud server

The root dir should have the following contents:

    pdf.js-refs/                bare git repo for receiving pushes to generate refs
    pdf.js-tryserver/           bot and etc, cloned from Github

**Git server for refs (pdf.js-refs/)**

1. `git init --bare` in the root dir
2. Create symlink from `pdf.js/hooks/post-receive` to `pdf.js-tryserver/git-hooks/post-receive`

**Bot (pdf.js-tryserver/)**

1. Install `node` and `npm` (prefer binary packages if available)
2. Run `npm install` in the root of `pdf.js-tryserver/`

