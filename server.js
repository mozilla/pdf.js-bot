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
    config = JSON.parse( fs.readFileSync('config.json').toString() ),
    github = require('./github'),
    scripts = require('./scripts');

// Sanity check
if (!process.env.GITHUB_CREDENTIALS) {
  console.log('Environment variable GITHUB_CREDENTIALS not configured');
  console.log('Example: GITHUB_CREDENTIALS=pdfjsbot:password123\n');
  process.exit();
}

// Pass config object to github.js
config.github_creds = process.env.GITHUB_CREDENTIALS;
github.setConfig(config);

// 
// Main routine
// 
github.buildWhitelist(function(){
  github.forEachNewCommand(function(cmd){
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

            // Tests done
            if (output.search(/All tests passed/) > -1) {
              github.postEndMessage(cmd, (new Date())-t1, '**All tests passed.**\n\nOutput:\n\n'+output);
            }
            else {
              github.postEndMessage(cmd, (new Date())-t1, '**WARNING: Tests did NOT pass.**\n\nOutput:\n\n'+output);
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

