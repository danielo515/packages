require! {
  code: {expect}
  \../lib : sanfu
  lab: Lab
}

{ it:It, experiment: describe } = exports.lab = Lab.script!

describe 'Sanfu index by', ->
  It 'Should turn an array of objects into an indexed object', ->
      values = [{name:'joe', age: 12 },{name:'peter', age:15}]
      expected = {"joe": {"age": 12, "name": "joe"}, "peter": {"age": 15, "name": "peter"}}
      (expect (sanfu.indexBy 'name') values).to.equal expected
