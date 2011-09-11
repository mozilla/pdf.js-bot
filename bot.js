/**
 *
 *
 * pdf.js bot server
 *
 * Copyright (c) 2011 Mozilla Foundation
 * Please see LICENSE file for license information.
 *
 *
 **/
 
// Libs
var request = require('request'),
    spawn = require('child_process').spawn,
    path = require('path'),
    fs = require('fs'),
    config = JSON.parse( fs.readFileSync('config.json').toString() ),
    globals = {};

// Constants
var GITHUB_CREDENTIALS = process.env.GITHUB_CREDENTIALS; // Github credentials, format 'user:password123'    

// Sanity check
if (!GITHUB_CREDENTIALS) {
  console.log('Environment variable GITHUB_CREDENTIALS not configured');
  console.log('Example: GITHUB_CREDENTIALS=yourname:password123\n');
  process.exit();
}


//
// getWhitelist()
// Get list of repo collaborators, place them in globals.whitelist
//
var getCollaborators = function(callback){
  request.get('https://github.com/api/v2/json/repos/show/'+config.main_repo+'/collaborators', function(error, response, body) {
    if (response.statusCode !== 200) {
      console.log((new Date())+': error: status code = ', response.statusCode);
      return;
    } 
    globals.whitelist = JSON.parse(body).collaborators;
    console.log((new Date())+': found '+globals.whitelist.length+' whitelisted users');
    callback();
  });
}; // getCollaborators()


//
// checkAndRunTests()
// Check all @-mentions and fires corresponding tests
//
var checkAndRunTests = function(){
  //
  // Get all (open) pull requests for repo
  //
  request.get('https://github.com/api/v2/json/pulls/'+config.main_repo+'/open', function(error, response, body) {
    if (response.statusCode !== 200) {
      console.log((new Date())+': error: status code = ', response.statusCode);
      return;
    }
  
    var pulls = JSON.parse(body).pulls;
    console.log((new Date())+': found '+pulls.length+' open pull requests')
    pulls.forEach(function(pullBrief){
    
      //
      // Get pull request details (incl comments)
      //
      request.get('https://github.com/api/v2/json/pulls/'+config.main_repo+'/'+pullBrief.number, function(error, response, body) {
        if (response.statusCode !== 200) {
          console.log((new Date())+': error: status code = ', response.statusCode);
          return;
        }
      
        var pull = JSON.parse(body).pull,
            sha = pull.head.sha, // sha1 of most recent commit
            pullUrl = pull.head.repository.url, // url of repo to be pulled in
            comments = pull.discussion;

        var hasBotCommand = false,
            targetDir = config.pulls_path+'/tests/'+sha,
            gitProcess, t1;

        // 
        // Scan comments for bot command
        // 
        comments.forEach(function(comment){
          var bodyMatches = comment.body ? comment.body.match(new RegExp(config.botname)) : false,
              isWhitelisted = globals.whitelist.indexOf(comment.user.login) > -1;
          if (comment.type === 'IssueComment' && bodyMatches && isWhitelisted) {
            hasBotCommand = true;
          }
          if (comment.type === 'IssueComment' && bodyMatches && !isWhitelisted) {
            console.log((new Date())+': denying request by non-whitelisted user (@'+comment.user.login+')');
          }
        });

        if (hasBotCommand) {
        
          //
          // Has bot command
          //        
          console.log((new Date())+': pull #'+pull.number+': found bot command');        
          if (!path.existsSync(targetDir)) { // have we run/started the test already?
            console.log((new Date())+': target directory clear. spawning script...');          
            t1 = new Date();

            // Notify start of tests
            request.post({
              url:'https://'+GITHUB_CREDENTIALS+'@github.com/api/v2/json/issues/comment/'+config.main_repo+'/'+pullBrief.number,
              json:{comment:'Starting tests... Results will be reported as a comment here.'}
            }, function(error, response, body){
              if (response.statusCode !== 200) {
                console.log((new Date())+': error: status code = ', response.statusCode);
                return;
              }
            });
          
            //
            // Fetch git repo, checkout sha1, run tests
            //
            var refUrl = 'git://github.com/'+config.ref_repo+'.git';
            gitProcess = spawn('./fetch-repo-run-tests', [pullUrl, refUrl, sha, config.pulls_path]);
            gitProcess.on('exit', function(code){
              var t2 = new Date(),
                  timeInMins = ((t2-t1)/(1000*60)).toFixed(2);

              //
              // All tests done!
              //                        
              if (!path.existsSync(targetDir+'/test/eq.log')) {              
              
                //
                // Tests passed
                //              
                console.log((new Date())+': all tests passed. took '+timeInMins+' mins');
                            
                // Notify end of tests
                request.post({
                  url:'https://'+GITHUB_CREDENTIALS+'@github.com/api/v2/json/issues/comment/'+config.main_repo+'/'+pullBrief.number,
                  json:{comment:'All tests passed. Test time: '+timeInMins+' mins'}
                }, function(error, response, body){
                  if (response.statusCode !== 200) {
                    console.log((new Date())+': error: status code = ', response.statusCode);
                    return;
                  }
                });
              }
              else {

                //
                // Tests did NOT pass
                //
                console.log((new Date())+': tests DID NOT pass. took '+timeInMins+' mins');
              
                // Notify end of tests
                request.post({
                  url:'https://'+GITHUB_CREDENTIALS+'@github.com/api/v2/json/issues/comment/'+config.main_repo+'/'+pullBrief.number,
                  json:{comment:'Tests **DID NOT** pass. Test time: '+timeInMins+' mins'}
                }, function(error, response, body){
                  if (response.statusCode !== 200) {
                    console.log((new Date())+': error: status code = ', response.statusCode);
                    return;
                  }
                });
              } // if !passed tests
            
            });        
          }
          else {
            console.log((new Date())+': pull #'+pull.number+': target directory already exists');
          } // if !path exists
        
        } // if hasBotCommand

      }); // GET pull details
    }); // forEach pull
  }); //GET pulls
}; // checkTests()


//
// Main routine
//
getCollaborators(function(){
  checkAndRunTests();
});
