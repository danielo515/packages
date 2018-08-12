require! {
  code: {expect}
  \../lib : sanfu
  lab: Lab
}

{ it:It, experiment: describe } = exports.lab = Lab.script!

describe 'Sanfu takeAction', ->
  It 'Should execute the proper action', ->
    goodUser = name: 'Danielo' age: 19 role: \admin

    defaultAction = -> it
    actions = 
        admin: -> 
          expect it .to.equal goodUser
          it <<< superPowers: true
        user: -> it <<< superPowers: false
    doSomething = ((sanfu.takeAction defaultAction) actions) \role
    expect doSomething goodUser .to.equal (goodUser <<< superPowers: true)
  It 'Should execute the default action', ->
    badUser = name: \Joe age: 99 role: \old-guy
    defaultAction = ->
      expect it .to.shallow.equal badUser
      badUser with banned: true
    actions = 
        admin: -> it <<< superPowers: true
        user: -> it <<< superPowers: false
    doSomething = ((sanfu.takeAction defaultAction) actions) \role
    expect doSomething badUser .to.equal (badUser with banned: true)
    expect doSomething badUser .to.not.shallow.equal badUser
