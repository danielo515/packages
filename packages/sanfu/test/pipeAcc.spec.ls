require! {
  code: {expect}
  \../lib : sanfu
  lab: Lab
}

{ it:It, experiment: describe } = exports.lab = Lab.script!

describe 'Sanfu pipeAcc', ->
  It 'Should execute the list of functions passing acc values as an array', ->
      f1 = ([a]) ->
        expect a .to.equal 1
        2
      f2 = ([a,b]) ->
        expect a .to.equal 1
        expect b .to.equal 2
        3
      f3 = ([a,b,c]) ->
        expect a .to.equal 1
        expect b .to.equal 2
        expect c .to.equal 3
        4

      show = (sanfu.spy console.log) 'F2 receives...'
      pipe = sanfu.pipeAcc [f1, (show f2), f3]

      expect pipe .to.be.a.function!
      # expect pipe 1 .to.be.instanceOf Promise
      pipe 1
        .then -> expect it .to.equal 4
