require! {
  code: {expect}
  \../lib : sanfu
  lab: Lab
}

{ it:It, experiment: describe } = exports.lab = Lab.script!

describe 'Sanfu spy', ->
  It 'Should log the arguments the function will take', ->
    sumOne = (+ 1)
    logger = (a,b) ->
        expect a .to.equal 'You are the logger'
        expect b .to.equal 1
      
    inspector = (sanfu.spy logger) 'You are the logger'
    expect (inspector sumOne) 1 .to.equal 2
