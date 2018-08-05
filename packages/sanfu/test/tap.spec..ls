require! {
  code: {expect}
  \../lib : sanfu
  lab: Lab
}

{ it:It, experiment: describe } = exports.lab = Lab.script!

describe 'Sanfu tap', ->
  It 'Should execute the function and return the value', ->
      expected = 99
      tapped = sanfu.tap console.log
      (expect tapped 99).to.equal expected
