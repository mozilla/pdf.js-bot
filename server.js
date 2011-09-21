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
var fs = require('fs'),
    net = require('net'),
    config = JSON.parse( fs.readFileSync('config.json').toString() ),
    express = require('express'),
    app = express.createServer(),
    path = require('path'),
    request = require('request'),
    github = require('./github'),
    scripts = require('./scripts');
    
// Sanity check
if (!process.env.GITHUB_CREDENTIALS) {
  console.log('Environment variable GITHUB_CREDENTIALS not configured');
  console.log('Example: GITHUB_CREDENTIALS=pdfjsbot:password123\n');
  process.exit();
}
config.github_creds = process.env.GITHUB_CREDENTIALS;

//
// Main routine
//
setupServer(function(){
  checkNewMessages();
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

  getPublicIP(callback);
};

//
// Get public IP
//
function getPublicIP(callback){
  request.get('http://ifconfig.me/ip', function(error, response, body){
    config.server_host = body.replace(/\s|\n/g, '');
    console.log((new Date())+': using public IP '+config.server_host);

    if (callback) callback();
  });
};

//
// Scan Github for commands in open pull requests and process them
//
function checkNewMessages(){
  github.setConfig(config);
  github.buildWhitelist(function(){
    console.log((new Date())+': found '+config.whitelist.length+' whitelisted users');
    
    github.forEachNewCommand(function(cmd){
      console.log((new Date())+': processing new command "'+cmd.command+'" in Pull #'+cmd.pull_number+' from @'+cmd.user);
      github.postStartMessage(cmd, 'Processing command **'+(cmd.command||'(empty)')+'** by user _'+cmd.user+'_...', function(){
        var endMessage = '',
            t1 = new Date();
      
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
            }, function(output){
              output = output.replace(/\n/, '\n    '); // reformat output as Github/Markdown code

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
              }

            }); // scripts.runTests()
            break;
        
          //
          // Process 'ref' command
          //      
          case 'ref':
            break;
        
          //
          // Process unknown command
          //      
          default:
            github.postEndMessage(cmd, (new Date())-t1, 'Unknown command: ' + (cmd.command || '(empty)'));
        } // switch
      }); // postStart
    }); // forEachNewCommand
  }); // buildWhitelist
}; // checkNewMessages()

