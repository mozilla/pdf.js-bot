/**
 *
 *
 * Test script controls for bot
 *
 *
 **/

var exec = require('child_process').exec;

//
// runTest(args, callback), where
// args = {
//   pull_url: 'user/reponame',
//   pull_sha: 'fasdf8fs76d5f54',
//   ref_url: 'user/reponame',
//   dest_path: '/path/etc'
// }
// callback(stdout)
//
exports.runTest = function(args, callback){
  var outputFile = args.dest_path+'/'+args.pull_sha+'.txt'
      cmd = 'mkdir -p '+args.dest_path+'; ./run-test '+args.main_url+' '+args.pull_url+' '+args.pull_sha+' '+args.ref_url+' '+args.dest_path+' | tee '+outputFile;

  console.log((new Date())+': running '+cmd); 

  //
  // Launch process
  //
  
  exec(cmd, 
    {
      timeout: args.timeout || undefined
    },
    function(error, stdout, stderr){
      //
      // Test done
      //
      if (error && error.killed) {
        stdout += '\n\n***\nProcess killed (timeout).\n';
      }
      if (callback) callback(stdout+'\n\n_____________________________ stderr:\n\n'+stderr);
    }
  );
}; // runTest()

//
// runMakeref(args, callback), where
// args = {
//   pull_url: 'user/reponame',
//   pull_sha: 'fasdf8fs76d5f54',
//   ref_url: 'user/reponame',
//   dest_path: '/path/etc'
// }
// callback(stdout)
//
exports.runMakeref = function(args, callback){
  var outputFile = args.dest_path+'/'+args.pull_sha+'.txt',
      cmd = 'mkdir -p '+args.dest_path+'; ./run-makeref '+args.main_url+' '+args.pull_url+' '+args.pull_sha+' '+args.ref_url+' '+args.dest_path+' | tee '+outputFile;

  console.log((new Date())+': running '+cmd); 

  //
  // Launch process
  //
  exec(cmd,
    {
      timeout: args.timeout || undefined
    },
    function(error, stdout, stderr){
      //
      // Test done
      //
      if (error && error.killed) {
        stdout += '\n\n***\nProcess killed (timeout).\n';
      }
      if (callback) callback(stdout+'\n\n_____________________________ stderr:\n\n'+stderr);
    }
  );
}; // runMakeref()
