require! {
  code: {expect}
  \../lib : sanfu
  lab: Lab
}

{ it:It, experiment: describe } = exports.lab = Lab.script!

describe 'Sanfu starling (S combinator)', ->
  It 'Should use the unary function to complement the binary one', ->
      binary = (a) -> (b) -> 
        expect b .to.equal 4
        a + b
      unary = (a) ->
        expect a .to.equal 1
        a + 3
      sum = (sanfu.S binary) unary
      (expect sum 1).to.equal 5
