/**
 *
 * queue.js - Stupidly simple function queueing
 * Copyright (c) 2011 Mozilla Foundation
 * Please see LICENSE file for license information.
 *
 * Author: Artur Adib, 2011
 * 
 * Usage: 
 *
 * Let func1() and func2() be two functions that take on a callback
 * function as argument (e.g. some I/O function). The code below will
 * immediately execute func1(), and only execute func2() after 
 * func1() is done.
 * 
 * This is particularly useful when the functions to be called are
 * anonymous and/or defined in different parts of the code.
 * 
 *        queue = require('./queue');
 *        queue.push(function(){ func1(queue.next) });
 *        queue.push(function(){ func2(queue.next) });
 *
 *
 **/

var stack = []; // private, contains the functions to be executed

//
// .push() 
//
exports.push = function(f){
  // First call executes function; subsequent calls happen through user-called .next()
  if (stack.length===0) {
    f();
  }
  stack.push(f);
};

//
// .next()
//
exports.next = function(){
  stack.shift(); // pops first element
  if (stack.length>0) {
    stack[0].call(this);
  }
};

//
// .size()
//
exports.size = function(){
  return stack.length;
};
