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
    config = JSON.parse( fs.readFileSync('config.json').toString() ),
    express = require('express'),
    app = express.createServer(),
    path = require('path'),
    request = require('request'),    
    github = require('./lib/github'),
    scripts = require('./lib/scripts'),
    queue = require('./lib/queue');
    
// Vars
var processedBuffer = [], // buffer of processed commands to avoid concurrency/race conditions
    maxBufferLength = 1000;

// Sanity check
if (!process.env.GITHUB_CREDENTIALS) {
  console.log('Environment variable GITHUB_CREDENTIALS not configured');
  console.log('Example: GITHUB_CREDENTIALS=pdfjsbot:password123\n');
  process.exit();
}
config.github_creds = process.env.GITHUB_CREDENTIALS;

//
// Main loop
//
setupServer(function(){
  processNewCommands(); // first call
  setInterval(function(){
    processNewCommands();
  }, config.check_interval*1000);
});

//
// Set up server config, etc
//
function setupServer(callback){
  // HTTP server
  app.use(express.bodyParser());
  app.use(app.router);
  app.use(express.static(__dirname+'/'+config.dest_path+'/tests'));
  app.listen(config.server_port);
  console.log((new Date())+': HTTP server listening on port '+config.server_port+', serving dir '+config.dest_path+'/tests');

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
  console.log((new Date())+': checking for new commands. queue size: '+queue.size());
  
  // Loop over every new command in all monitored pull requests
  github.forEachNewCommand(function(cmd){
    var t1;

    if (processedBuffer.indexOf(cmd.id) > -1) {
      //
      // Using a buffer here to double-check we're not reprocessing a command.
      // This can happen for different reasons, one being weird concurrency/race
      // conditions, delays in marking a command as "processed" on the server, etc.
      //
      console.log((new Date())+': skipping already processed command id '+cmd.id+' (from buffer)');
      return; // can't process a command already processed
    }
    processedBuffer.push(cmd.id);
    if (processedBuffer.length > maxBufferLength) {
      processedBuffer.shift();
    }
    
    console.log((new Date())+': processing new command "'+cmd.command+'" in Pull #'+cmd.pull_number+' from @'+cmd.user+' (id:'+cmd.id+'), queue size: '+queue.size());    
    github.postStartMessage(cmd, 'Processing command **'+(cmd.command||'(empty)')+'** by user _'+cmd.user+'_. Queue size: '+queue.size());
    t1 = new Date();
    
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
          scripts.runTests({
            pull_url: cmd.pull_url,
            pull_sha: cmd.pull_sha,
            ref_url: 'git://github.com/'+config.ref_repo+'.git',
            dest_path: config.dest_path
          }, 
          function(output){
            output = '\n'+output; // hack to get first line into code below
            output = output.replace(/\n/g, '\n    '); // reformat output as Github/Markdown code
            // Tests passed?
            if (output.search(/All tests passed/) > -1) {
              github.postEndMessage(cmd, (new Date())-t1, '**All tests passed.**\n\nOutput:\n\n'+output);
            }
            // Tests DID NOT pass
            else {
              if (path.existsSync(config.dest_path+'/tests/'+cmd.pull_sha+'/eq.log')) {
                var url = 'http://'+config.server_host+':'+config.server_port+'/'+cmd.pull_sha+'/reftest-analyzer.xhtml';
                url += '#web=/'+cmd.pull_sha+'/eq.log';
                github.postEndMessage(cmd, (new Date())-t1, '**WARNING: Tests did NOT pass (eq).**\n\nView ref analyzer:\n'+url+'\n\nOutput:\n\n'+output);
              }
              else {
                github.postEndMessage(cmd, (new Date())-t1, '**WARNING: Tests did NOT pass (load).**\n\nOutput:\n\n'+output);
              }
              console.log((new Date())+': done processing command "'+cmd.command+'" in Pull #'+cmd.pull_number+' from @'+cmd.user+' (id:'+cmd.id+')');
            } // if tests !passed

            queue.next();
          }); // scripts.runTests()
          break;
  
        //
        // Process 'ref' command
        //      
        case 'ref':
          queue.next();
          break;
  
        //
        // Process unknown command
        //      
        default:
          github.postEndMessage(cmd, (new Date())-t1, 'Unknown command: ' + (cmd.command || '(empty)'));
          queue.next();
      } // switch
    }); // queue.push
  }); // forEachNewCommand
}; // checkNewMessages()

