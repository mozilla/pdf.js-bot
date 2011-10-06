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
    github = require('./lib/github'),
    scripts = require('./lib/scripts'),
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
// Set up server config, etc
//
function setupServer(callback){
  // HTTP server
  app.use(express.bodyParser());
  app.use(app.router);
  app.use(express.static(__dirname+'/'+config.dest_path));
  app.listen(config.server_port);
  console.log((new Date())+': HTTP server listening on port '+config.server_port+', serving dir '+config.dest_path);

  getPublicIP(function(){        
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
    console.log((new Date())+': using public IP '+config.server_host);

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
    var t1 = new Date();
    
    console.log((new Date())+': processing new command "'+cmd.command+'" in Pull #'+cmd.pull_number+' from @'+cmd.user+' (id:'+cmd.id+'), queue size: '+queue.size());    
    github.postStartMessage(cmd, 'Processing command **'+(cmd.command||'(empty)')+'** by user _'+cmd.user+'_. Queue size: '+queue.size()+'\n\n'+
                                 'Live script output is available at: '+'http://'+config.server_host+':'+config.server_port+'/'+cmd.pull_sha+'.txt');
    
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
          scripts.runTest(
            {
              main_url: 'git://github.com/'+config.main_repo+'.git',
              pull_url: cmd.pull_url,
              pull_sha: cmd.pull_sha,
              ref_url: 'git://github.com/'+config.ref_repo+'.git',
              dest_path: config.dest_path,
              timeout: config.process_timeout_mins*60*1000
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

                if (path.existsSync(config.dest_path+'/tests/'+cmd.pull_sha+'/eq.log')) {
                  
                  var url = 'http://'+config.server_host+':'+config.server_port+'/tests/'+cmd.pull_sha+'/reftest-analyzer.xhtml'+
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
          scripts.runMakeref(
            {
              main_url: 'git://github.com/'+config.main_repo+'.git',
              pull_url: cmd.pull_url,
              pull_sha: cmd.pull_sha,
              ref_url: 'git://github.com/'+config.ref_repo+'.git',
              dest_path: config.dest_path,
              timeout: config.process_timeout_mins*60*1000
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

