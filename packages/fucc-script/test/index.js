'use strict';

const { parser } = require('../src/parser')();

const program = `
JB x y ->
  sum x y 1 2 3
`;

parser.feed (program);

console.dir (parser.results, { depth: 12 });
console.log( parser.results.length );