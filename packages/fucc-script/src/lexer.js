const moo = require('moo');
const { get } = require('lodash');

const lexer = moo.compile(require('./tokens'));

lexer._reset = lexer.reset;
lexer.reset = function (string) {
  this.lastIndent = 0;
  return this._reset(string);
};

lexer._next = lexer.next;
lexer.next = function () {
  let nextToken = this._next();
  if (get(nextToken, 'type') === 'INDENT') {
    const nextIndent = nextToken.value.length
    if (nextIndent < this.lastIndent) {
      nextToken.type = 'DEDENT';
    } else if (nextIndent === this.lastIndent) {
      return this.next();
    }
    this.lastIndent = get(nextToken, 'value.length', 0);
  }

  return nextToken;
};

module.exports = lexer;