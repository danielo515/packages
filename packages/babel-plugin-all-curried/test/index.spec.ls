require! {
  fs
  path
  code: {expect}
  'babel-core': { transformFileSync }
  \../lib : plugin
  lab: Lab
}

{ it, experiment: describe } = exports.lab = Lab.script!

trim = -> it.replace(/^\s+|\s+$/, '')
map = (f) -> -> it.map(f)
filter = (f) -> -> it.filter(f)

describe 'Babel plugin all curried', ->

  fixturesDir = path.join __dirname, 'fixtures'
  (fs.readdirSync fixturesDir)
  |> filter (!= '.babelrc')
  |> map (caseName) ->

    it "should transform to curried call: #{caseName.split('-').join(' ')}", ->

      fixtureDir = path.join fixturesDir, caseName
      actualPath = path.join fixtureDir, 'actual.js'
      actual = transformFileSync(actualPath,  plugins: [plugin]).code;

      expected = fs.readFileSync(
        path.join fixtureDir, 'expected.js'
      ).toString!

      expect( trim actual ).to.equal( trim expected )

