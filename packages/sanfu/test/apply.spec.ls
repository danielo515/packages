require! {
  code: {expect}
  \../lib : sanfu
  lab: Lab
}

{ it:It, experiment: describe } = exports.lab = Lab.script!

describe 'Sanfu apply', ->
  It 'Should execute the function with the array as arguments', ->
      applyMe = (a,b,c) ->
        expect a .to.equal 1
        expect b .to.equal 2
        expect c .to.equal 3
    
      aplicator = sanfu.apply applyMe
      expect aplicator .to.be.a.function!
      aplicator [1,2,3]
