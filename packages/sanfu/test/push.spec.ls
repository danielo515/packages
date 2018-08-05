require! {
  code: {expect}
  \../lib : sanfu
  lab: Lab
}

{ it:It, experiment: describe } = exports.lab = Lab.script!

describe 'Sanfu push', ->
  It 'Should insert one value into the provided array', ->
      values = [1,2,3]
      expected = [1,2,3,4]
      (expect (sanfu.push values) 4).to.equal expected
      (expect (sanfu.push values) 4).to.not.shallow.equal values
