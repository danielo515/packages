require! {
    inquirer
    ejs
    fluture: {node, encaseN2, encaseN3, encaseN, encaseP, parallel}
    fs: {readdir, readFile, writeFile, mkdir}
    path: {join}
    lodash: {pick}
    \partial.lenses : {get,prop,compose,over,set, collect, elems, concat, branches,valueOr, assign, foldl}
    sanctuary: {T, chain, map, K, reduce }
}

writeFile = encaseN3 writeFile
readDir = encaseN readdir
readFile = encaseN2 readFile
mkdir = encaseN mkdir
renderFile = encaseN2 ejs.renderFile

ObjMonoid = 
    empty: -> {}
    concat: -> Object.assign ...

function readPackages
    readDir \packages
    .map -> it.filter (!= /^\./) .map (join \../, _, \package.json)
    .map -> it.map require

function propsAt
    get [ it, valueOr (it):{} ]

makeQuestions = ({dependencies, devDependencies}) ->
    questions =
        * type: \input
          name: \pkg.name
          message: 'Name the package'
          filter: (.split ' ' .join \- .toLowerCase!)
        * type: \confirm
          name: \meta.babel
          message: 'Is this a babel plugin ?'
          default: false
        * type: \input
          name: \pkg.keywords
          message: 'Comma separated list of keywords for npm. Do not include babel ones'
          filter: (.split ',' .map (.trim!) )
        * type: \list
          name: \pkg.language
          message: 'Which language do you want to use ?'
          choices:
              \livescript
              \javascript
        * type: \confirm
          name: \lsNext
          message: 'Do you want to use livescript-next?'
          default: false
          when: (.pkg.language == 'livescript')
        * type: \checkbox
          name: \pkg.dependencies
          choices: Object.keys dependencies
          filter: -> pick dependencies, it
          message: 'Selec one or many of the available dependencies'
        * type: \checkbox
          name: \pkg.devDependencies
          choices: Object.keys devDependencies
          filter: -> pick devDependencies, it
          message: 'Selec one or many of the available dev-dependencies'

templates = 
    root: join __dirname, \templates
    ls: join __dirname, \templates/livescript-pkg

function createPkgFolder base, name
    dirname = join base, \packages name
    mkdir dirname
    .map -> dirname

makeKeywords = ({pkg:{keywords}, meta: {babel}}) ->
    if babel 
    then keywords.concat [\babel, \babel-plugin ]
    else keywords
makeKeDeps = ({pkg:{deps}, meta: {babel}}) ->
    if babel 
    then keywords.concat [\babel, \babel-plugin ]
    else keywords

setKeywords = set [ \pkg \keywords ]

setDeps = set [ \pkg \dependencies ]

function renderTemplate file, data
    renderFile file.template, data
        .map -> Object.assign {content: it}, file

function copyTemplates targetFolder, answers
    console.log 'Copying to:' targetFolder
    readDir templates.ls
        .map -> it.map -> template: (join templates.ls, it), name: it
        .chain -> parallel it.length, it.map renderTemplate _, answers
        .chain -> parallel it.length, it.map -> writeFile (join targetFolder, it.name), it.content, \utf-8

pickDeps = 
    foldl do
        (acc, val, key) -> assign key, val, acc
        {}
        [elems, branches \dependencies \devDependencies]

readPackages!
    .map pickDeps
    .map makeQuestions
    .chain encaseP inquirer.prompt
    .map -> setKeywords (makeKeywords it), it
    .fork (console.dir _ , depth: 5), console.error

# inquirer.prompt questions
#     .then ({pkg}:answers) ->
#             answers
#             |> -> setKeywords (makeKeywords it), it
#             |> -> 
#                 createPkgFolder process.cwd!, pkg.name
#                     .chain copyTemplates _, it
#                     .fork console.log, console.error