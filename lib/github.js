/**
 *
 *
 * Github-specific bot functions
 *
 *
 **/
 
var request = require('request'),
    config = {},
    processedBuffer = [], // buffer of processed message ids to avoid concurrency/race conditions on server
    maxBufferLength = 1000;

//
// setConfig()
//
exports.setConfig = function(cfg){
  config = cfg;
};

//
// buildWhitelist()
// Get list of repo collaborators, place them in config.whitelist
//
exports.buildWhitelist = function(callback){
  request.get('https://github.com/api/v2/json/repos/show/'+config.main_repo+'/collaborators', function(error, response, body) {
    if (response.statusCode !== 200) {
      console.log((new Date())+': error: status code = ', response.statusCode);
      return;
    } 
    config.whitelist = JSON.parse(body).collaborators;
    callback();
  });
}; // buildWhitelist()

//
// forEachNewCommand(callback)
//   with callback(command_object)
//
exports.forEachNewCommand = function(callback){  

  // Checks if comments contain a "processed" mark for a given comment id
  var isProcessed = function(id, comments){
    var found = false;  
    // Using a buffer here as Github might not be 100% reliable due to
    // weird concurrency/race conditions, delays in marking a command 
    // as "processed" on the server, etc.
    if (processedBuffer.indexOf(id) > -1) {
      return true; // can't process a command already processed
    };  
    comments.forEach(function(comment){
      var matches = comment.body ? comment.body.match(new RegExp('\\[bot:processed:'+id+'\\]')) : false;
      if (matches) {
        found = true;
      }      
    });
    return found;
  };
  
  if (!callback) throw 'forEachNewCommand() needs a callback!';
  
  forEachOpenPullReq(function(pullBrief){
    getPullReqDetails(pullBrief.number, function(pull){

      var comments = pull.discussion;
      comments.forEach(function(comment){
        var bodyMatches, isWhitelisted;
        
        //
        // Ignore all entries but issue comments
        //
        if (comment.type !== 'IssueComment') return;
        
        //
        // Matches commands like "@pdfjsbot test"
        //
        bodyMatches = comment.body ? comment.body.match(new RegExp(config.botname + '\\s*(\\w*)')) : false;
        if (!bodyMatches) return;

        //
        // Only processes commands by whitelisted users
        //
        isWhitelisted = config.whitelist.indexOf(comment.user.login) > -1;
        if (!isWhitelisted) return;

        // 
        // Only proceeds if message not already processed
        //
        if (isProcessed(comment.id, comments)) return;
        
        //
        // Mark as processed in buffer -- USER STILL NEEDS TO CALL postStartMessage() TO PERMANENTLY MARK ON GITHUB!
        //
        processedBuffer.push(comment.id);
        if (processedBuffer.length > maxBufferLength) {
          processedBuffer.shift();
        }        

        callback({
          id: comment.id,
          pull_number: pullBrief.number,
          pull_url: pull.head.repository.url,
          pull_sha: pull.head.sha, // sha1 of most recent commit in pull request
          command: bodyMatches[1],
          user: comment.user.login
        }); // callback()
      }); // forEach comment

    }); // getPullReqDetails
  }); // forEach open pull

}; // forEachNewCommand()

//
// postStartMessage()
//
exports.postStartMessage = function(cmd, body, callback){
  body += '\n\n[bot:processed:'+cmd.id+']';
  postComment(cmd.pull_number, body, callback);
};

//
// postEndMessage()
//
exports.postEndMessage = function(cmd, timeDiff, body, callback){
  var timeInMins = ( timeDiff / (1000*60) ).toFixed(2);
  body += '\n\nBot response time: '+timeInMins+' mins';
  postComment(cmd.pull_number, body, callback);
};



/**
 *
 * Private functions
 *
 **/


//
// forEachOpenPullReq(callback)
//   with callback(pull_object)
//
function forEachOpenPullReq(callback){
  //
  // Get all (open) pull requests for repo
  //
  request.get('https://github.com/api/v2/json/pulls/'+config.main_repo+'/open', function(error, response, body) {
    if (response.statusCode !== 200) {
      console.log((new Date())+': error: status code = ', response.statusCode);
      return;
    }  
    var pulls = JSON.parse(body).pulls;

    pulls.forEach(callback);  
  }); // request.get
};


//
// getPullReqDetails(pullNumber, callback)
//   with callback(pull_object)
//
function getPullReqDetails(pullNumber, callback){
  //
  // Get pull request details (incl comments)
  //
  request.get('https://github.com/api/v2/json/pulls/'+config.main_repo+'/'+pullNumber, function(error, response, body) {
    if (response.statusCode !== 200) {
      console.log((new Date())+': error: status code = ', response.statusCode);
      return;
    }

    var pull = JSON.parse(body).pull;
    callback(pull);
  }); // request.get
};

//
// postComment()
//
function postComment(pullNumber, body, callback){
  request.post({
    url:'https://'+config.github_creds+'@github.com/api/v2/json/issues/comment/'+config.main_repo+'/'+pullNumber,
    json:{comment:body}
  }, function(error, response, body){
    if (response.statusCode !== 201) {
      console.log((new Date())+': error: status code = ', response.statusCode);
      return;
    }
    
    if (callback) callback();
  });
};
