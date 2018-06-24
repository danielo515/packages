require! {
    \babel-core : babel
    \../lib : plugin
    path
    fs
}

map = (f) -> -> it.map(f)
filter = (f) -> -> it.filter(f)

fixturesDir = path.join __dirname, 'fixtures'
(fs.readdirSync fixturesDir)
|> filter (!= '.babelrc')
|> map (caseName) ->
        fixtureDir = path.join fixturesDir, caseName
        actualPath = path.join fixtureDir, 'actual.js'
        console.log babel.transformFileSync(actualPath, plugins: [plugin]).code;
