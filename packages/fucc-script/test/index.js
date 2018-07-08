'use strict';

const { parser } = require('../src/parser')();

const program = `JB x y -> map 5`;

parser.feed (program);

console.dir (parser.results, { depth: 12 });