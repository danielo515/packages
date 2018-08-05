require! {
  code: {expect}
  \../lib : sanfu
  lab: Lab
}

{ it:It, experiment: describe } = exports.lab = Lab.script!

describe 'Sanfu pick', ->
  It 'Should pick the specified properties', ->
      props = [\age \name]
      expected = age: 19 name: \John
      value = age: 19 name: \John zip: 2819 color: \red sex: \male
      (expect (sanfu.pick props) value).to.equal expected
      (expect (sanfu.pick props) value).to.not.shallow.equal value
