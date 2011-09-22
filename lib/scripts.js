/**
 *
 *
 * Test script controls for bot
 *
 *
 **/

var spawn = require('child_process').spawn;


//
// runTests(args, callback), where
// args = {
//   pull_url: 'user/reponame',
//   pull_sha: 'fasdf8fs76d5f54',
//   ref_url: 'user/reponame',
//   dest_path: '/path/etc'
// }
// callback(stdout)
//
exports.runTests = function(args, callback){
  var gitProcess, spawnOutput = {stdout:'', stderr:''};  
  
  console.log((new Date())+': running ./run-test', args.pull_url, args.ref_url, args.pull_sha, args.dest_path); 

  //
  // Launch process
  //
  gitProcess = spawn('./run-test', [args.pull_url, args.ref_url, args.pull_sha, args.dest_path])
  gitProcess.stdout.on('data', function(data){
    spawnOutput.stdout += data;
  });
  gitProcess.stderr.on('data', function(data){
    spawnOutput.stderr += data;
  });
  gitProcess.on('exit', function(exitCode){

    //
    // All tests done
    //
    if (callback) callback(spawnOutput.stdout);    

  }); // gitProcess.on('exit')
} // runTests()

