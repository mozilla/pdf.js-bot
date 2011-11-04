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
 
// Modules
var fs = require('fs'),
    net = require('net'),
    express = require('express'),
    app = express.createServer(),
    path = require('path'),
    request = require('request'),
    exec = require('child_process').exec,
    github = require('./lib/github'),
    queue = require('./lib/queue');

var config = {},
    configFile = 'config.json';
    
//
// Environment vars
//
if (!process.env.GITHUB_CREDENTIALS) {
  console.log('Environment variable GITHUB_CREDENTIALS not configured');
  console.log('Example: GITHUB_CREDENTIALS=pdfjsbot:password123\n');
  process.exit();
}

if (process.env.PDFJSBOT_STAGING === 'yes') {
  configFile = 'config_staging.json';
}

console.log((new Date())+': reading configurations from file "'+configFile+'"');
config = JSON.parse( fs.readFileSync(configFile).toString() );
config.github_creds = process.env.GITHUB_CREDENTIALS;

//
// Main loop
//
setupServer(function(){
  processNewCommands(); // first call
  setInterval(function(){
    processNewCommands();
  }, config.check_interval_secs*1000);
});

//
// Set up server, etc
//
function setupServer(callback){
  // HTTP server
  app.use(express.bodyParser());
  app.use(app.router);
  app.use(express.static(__dirname+'/'+config.tmp_path));
  app.listen(config.server_port);

  // POST /newmerge handler
  app.post('/newmerge', function(req, res){
    var payload = JSON.parse(req.body.payload);

    if (payload.ref !== 'refs/heads/master')
      return;      
    
    queue.push(function(){      
      runScript(
        {
          script: 'web',
          main_url: 'git://github.com/'+config.main_repo+'.git',
          pull_url: '',
          pull_sha: '',
          ref_url: '',
          tmp_path: '',
          timeout: config.process_timeout_mins*60*1000,
        }, 
        function(output){
          queue.next();
        }
      );
    }); // queue push
  }); // POST /newmerge

  getPublicIP(function(){
    config.server_url = 'http://'+config.server_host+':'+config.server_port;
    console.log((new Date())+': Server listening at '+config.server_url+', serving dir '+config.tmp_path);

    // Github-specific
    github.setConfig(config);
    github.buildWhitelist(function(){
      console.log((new Date())+': found '+config.whitelist.length+' whitelisted users');
      
      if (callback) callback();
    }); // buildWhitelist
  }); // getPublicIP
}; // setupServer

//
// getPublicIP()
//
function getPublicIP(callback){
  request.get('http://ifconfig.me/ip', function(error, response, body){
    config.server_host = body.replace(/\s|\n/g, '');
    if (callback) callback();
  });
};

//
// processNewCommands()
// Scan Github for commands in open pull requests and process them
//
function processNewCommands(){  
  // Loop over every new command in all monitored pull requests
  github.forEachNewCommand(function(cmd){
    var t1 = new Date(),
        liveOutputFile = cmd.id+'.txt';
    
    console.log((new Date())+': processing new command "'+cmd.command+'" in Pull #'+cmd.pull_number+' from @'+cmd.user+' (id:'+cmd.id+'), queue size: '+queue.size());    
    github.postStartMessage(cmd, 'Processing command **'+(cmd.command||'(empty)')+'** by user _'+cmd.user+'_. Queue size: '+queue.size()+'\n\n'+
                                 'Live script output is available (after queueing is done) at: '+config.server_url+'/'+liveOutputFile);
    
    //
    // Process each command in queue
    // *** DON'T forget to add queue.next() after the innermost callback of each command/script!
    //
    queue.push(function(){
      var endMessage = '';

      switch (cmd.command) {
        //
        // Process 'test' command
        //      
        case 'test':
          runScript(
            {
              script: cmd.command,
              main_url: 'git://github.com/'+config.main_repo+'.git',
              pull_url: cmd.pull_url,
              pull_sha: cmd.pull_sha,
              ref_url: config.ref_repo,
              tmp_path: config.tmp_path,
              timeout: config.process_timeout_mins*60*1000,
              output_file: liveOutputFile
            }, 
            function(output){
              var msg = '';
              output = '\n'+output; // hack to get first line into code below
              output = output.replace(/\n/g, '\n    '); // reformat output as Github/Markdown code
              
              // Tests passed?
              if (output.search("All tests passed") > -1 && // 'make test'
                  output.search("files checked, no errors found") > -1) { // 'make lint'
                                  
                if (output.search("WARNING") < 0) {
                  msg = '**All tests passed.**';
                }
                else {
                  msg = '**All tests passed,** but with **WARNING(s)**.';
                  msg += '\n\nMake sure to _read them!_ :).';
                }
              }
              // Tests DID NOT pass
              else {

                msg = '**ERROR(s) found**';

                if (path.existsSync(config.tmp_path+'/tests/'+cmd.pull_sha+'/eq.log')) {                  
                  var url = config.server_url+'/tests/'+cmd.pull_sha+'/reftest-analyzer.xhtml'+
                            '#web=/tests/'+cmd.pull_sha+'/eq.log';
                  msg += '\n\n**ATTENTION:** There was a _snapshot difference:_\n'+url;
                }
              } // if !tests passed

              msg += '\n\nOutput:\n\n'+output              
              github.postEndMessage(cmd, (new Date())-t1, msg);
              console.log((new Date())+': done processing command "'+cmd.command+'" in Pull #'+cmd.pull_number+' from @'+cmd.user+' (id:'+cmd.id+')');
            
              queue.next();
            }
          ); // runTest()
          break;
  
        //
        // Process 'makeref' command
        //      
        case 'makeref':
          runScript(
            {
              script: cmd.command,
              main_url: 'git://github.com/'+config.main_repo+'.git',
              pull_url: cmd.pull_url,
              pull_sha: cmd.pull_sha,
              ref_url: config.ref_repo,
              tmp_path: config.tmp_path,
              timeout: config.process_timeout_mins*60*1000,
              output_file: liveOutputFile              
            }, 
            function(output){
              var msg = '';
              output = '\n'+output; // hack to get first line into code below
              output = output.replace(/\n/g, '\n    '); // reformat output as Github/Markdown code
              
              // Makeref OK?
              if (output.search("All tests passed") > -1 && // 'make test'
                  output.search("files checked, no errors found") > -1) { // 'make lint'
                
                msg = '**References generated**';
                msg += '\n\nImages pushed to `'+config.ref_repo+'`';
                if (output.search("WARNING") > -1) 
                  msg += '\n\n**WARNING:** Some WARNING messages found! Make sure to _read them_ :)';

              }
              // Makeref NOT ok
              else {
                
                msg = '**ERROR(s) found!**';

              }; // if tests !passed

              msg += '\n\nOutput:\n\n'+output
              github.postEndMessage(cmd, (new Date())-t1, msg);
              console.log((new Date())+': done processing command "'+cmd.command+'" in Pull #'+cmd.pull_number+' from @'+cmd.user+' (id:'+cmd.id+')');

              queue.next();
            }
          ); // runMakeref()
          break;
  
        //
        // Process unknown command
        //      
        default:
          // Timeout hack to ensure Github response comes after "Processing" message
          setTimeout(function(){
            github.postEndMessage(cmd, (new Date())-t1, 'Unknown command: ' + (cmd.command || '(empty)'));
            queue.next();
          }, 2000);
          
      }; // switch
    }); // queue.push
  }); // forEachNewCommand
}; // checkNewMessages()

//
// runScript()
//
function runScript(args, callback){
  var child,
      outputFile = args.output_file ? args.tmp_path+'/'+args.output_file : undefined,
      script = './run-'+args.script,
      cmd = 'mkdir -p '+args.tmp_path+'; '+
            script+' '+args.main_url+' '+args.pull_url+' '+args.pull_sha+' '+args.ref_url+' '+args.tmp_path+' 2>&1'+
            (outputFile ? ' | tee '+outputFile : '');

  console.log((new Date())+': running: '+cmd); 

  //
  // Launch process
  //
  child = exec(cmd, 
    {
      timeout: args.timeout || undefined
    },
    function(error, stdout, stderr){
      //
      // Script done
      //
      if (error && error.killed) {
        exec('kill -TERM '+child.pid); // just in case Node messed up
        stdout += '\n\n***\nProcess killed (timeout).\n';
      }
      if (callback) callback(stdout+'\n\n_____________________________ stderr:\n\n'+stderr);
    }
  );
}; // runScript()
