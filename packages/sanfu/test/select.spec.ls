require! {
  code: {expect}
  \../lib : sanfu
  lab: Lab
}

{ it:It, experiment: describe } = exports.lab = Lab.script!

describe 'Sanfu select', ->
  It 'Should select the proper value based on the given property', ->
    goodUser = name: 'Danielo' age: 19 role: \admin
    
    options = 
        admin: 'Hello mister admin'
        user: 'Bah, a regular user'
    
    doSomething = ((sanfu.select 'Who are you') options) \role
    expect doSomething goodUser .to.equal ('Hello mister admin')
  
  It 'Should select the default action', ->
    badUser = name: \Joe age: 99 role: \old-guy


    options = 
        admin: 'Hello mister admin'
        user: 'Bah, a regular user'

    doSomething = ((sanfu.select 'Who are you') options) \role
    expect doSomething badUser .to.equal 'Who are you'
