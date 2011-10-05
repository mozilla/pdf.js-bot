/**
 *
 *
 * Test script controls for bot
 *
 *
 **/

var exec = require('child_process').exec,
    fs = require('fs');


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
  var child, output = '';

  console.log((new Date())+': running ./run-test', args.main_url, args.pull_url, args.pull_sha, args.ref_url, args.dest_path); 

  //
  // Launch process
  //
  child = exec('./run-test '+args.main_url+' '+args.pull_url+' '+args.pull_sha+' '+args.ref_url+' '+args.dest_path, 
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

  child.stdout.on('data', function(data){
    output += data.toString();
    fs.writeFileSync(args.dest_path+'/tests/'+args.pull_sha+'.out', output);
  });

  child.stderr.on('data', function(data){
    output += data.toString();
    fs.writeFileSync(args.dest_path+'/tests/'+args.pull_sha+'.out', output);
  });
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
  var child, output = '';

  console.log((new Date())+': running ./run-makeref', args.main_url, args.pull_url, args.pull_sha, args.ref_url, args.dest_path); 

  //
  // Launch process
  //
  child = exec('./run-makeref '+args.main_url+' '+args.pull_url+' '+args.pull_sha+' '+args.ref_url+' '+args.dest_path, 
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

  child.stdout.on('data', function(data){
    output += data.toString();
    fs.writeFileSync(args.dest_path+'/refs/'+args.pull_sha+'.out', output);
  });

  child.stderr.on('data', function(data){
    output += data.toString();
    fs.writeFileSync(args.dest_path+'/refs/'+args.pull_sha+'.out', output);
  });
}; // runMakeref()
