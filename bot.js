//
// pdf.js tryserver bot
//
// This bot monitors pull requests in a given GitHub REPO for comments that match a BOT_COMMAND.
// If there's a match, a test is launched and results are reported back to the pull request as comments.
//

// Libs
var request = require('request'),
    spawn = require('child_process').spawn,
    path = require('path');

// Constants
var GITHUB_CREDENTIALS = process.env.GITHUB_CREDENTIALS; // Github credentials, format 'user:password123'
var BOT_COMMAND = new RegExp('@pdfjsbot'); // if this string is found in pull request comments, the bot will be triggered
var REPO = 'arturadib/pdf.js'; // format: user/repo
var DEST_PATH = 't'; // where repos to be tested will be stored

if (!GITHUB_CREDENTIALS) {
  console.log('Environment variable GITHUB_CREDENTIALS not configured');
  console.log('Example: GITHUB_CREDENTIALS=yourname:password123\n');
  process.exit();
}

//
// Get all (open) pull requests for repo
//
request.get('https://github.com/api/v2/json/pulls/'+REPO+'/open', function(error, response, body) {
  var pulls = JSON.parse(body).pulls;
  console.log('[bot.js] found '+pulls.length+' open pull requests')
  pulls.forEach(function(pullBrief){
    
    //
    // Get pull request details (incl comments)
    //
    request.get('https://github.com/api/v2/json/pulls/'+REPO+'/'+pullBrief.number, function(error, response, body) {
      
      //
      // Pull details
      //
      var pull = JSON.parse(body).pull,
          sha = pull.head.sha, // sha1 of most recent commit
          url = pull.head.repository.url, // url of repo
          comments = pull.discussion;

      var hasBotCommand = false,
          targetDir = DEST_PATH+'/'+sha,
          gitProcess, t1;

      // 
      // Scan comments for bot command
      // 
      comments.forEach(function(comment){
        var bodyMatches = comment.body ? comment.body.match(BOT_COMMAND) : false;
        if (comment.type === 'IssueComment' && bodyMatches) {
          hasBotCommand = true;
        }
      });

      if (hasBotCommand) {
        
        //
        // Has bot command
        //        
        console.log('[bot.js] pull #'+pull.number+': found bot command');        
        if (!path.existsSync(targetDir)) { // have we run/started the test already?
          console.log('[bot.js] target directory clear. spawning script...');          
          t1 = new Date();

          // Notify start of tests
          request.post({
            url:'https://'+GITHUB_CREDENTIALS+'@github.com/api/v2/json/issues/comment/'+REPO+'/'+pullBrief.number,
            json:{comment:'Starting tests... Results will be reported as a comment here.'}
          });
          
          //
          // Fetch git repo, checkout sha1, run tests
          //
          gitProcess = spawn('./fetch-repo-run-tests', [url, sha, targetDir]);
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
              console.log('[bot.js] all tests passed. took '+timeInMins+' mins');
                            
              // Notify end of tests
              request.post({
                url:'https://'+GITHUB_CREDENTIALS+'@github.com/api/v2/json/issues/comment/'+REPO+'/'+pullBrief.number,
                json:{comment:'All tests passed. Test time: '+timeInMins+' mins'}
              });
            }
            else {

              //
              // Tests did NOT pass
              //
              console.log('[bot.js] tests DID NOT pass. took '+timeInMins+' mins');
              
              // Notify end of tests
              request.post({
                url:'https://'+GITHUB_CREDENTIALS+'@github.com/api/v2/json/issues/comment/'+REPO+'/'+pullBrief.number,
                json:{comment:'Tests **DID NOT** pass. Test time: '+timeInMins+' mins'}
              });
            } // if !passed tests
            
          });        
        }
        else {
          console.log('[bot.js] pull #'+pull.number+': target directory already exists');
        } // if !path exists
        
      } // if hasBotCommand

    }); // GET pull details
  }); // forEach pull
}); //GET pulls
