require! {
    inquirer
    ejs
    fluture: {node, encaseN2, encaseN3, encaseN, parallel}
    fs: {readdir, readFile, writeFile, mkdir}
    path: {join}
}

writeFile = encaseN3 writeFile
readDir = encaseN readdir
readFile = encaseN2 readFile
mkdir = encaseN mkdir
renderFile = encaseN2 ejs.renderFile

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
    # * type: 
    #   name:
    #   message:
    #   filter:

templates = 
    root: join __dirname, \templates
    ls: join __dirname, \templates/livescript-pkg

function createPkgFolder base, name
    dirname = join base, \packages name
    mkdir dirname
    .map -> dirname

makeKeywords = ({pkg:{keywords}, meta: {babel}}) ->
    if babel 
    then keywords.concat [\babel, \babel-plugin]
    else keywords

function renderTemplate file, data
    renderFile file.template, data
        .map -> Object.assign {content: it}, file

function copyTemplates pkgFolder, answers
    console.log 'Copying to:' pkgFolder
    readDir templates.ls
        .map -> it.map -> template: (join templates.ls, it), name: it
        .chain -> parallel it.length, it.map renderTemplate _, answers
        .chain -> parallel it.length, it.map -> writeFile (join pkgFolder, it.name), it.content, \utf-8


inquirer.prompt questions
    .then ({pkg}:answers) ->
            createPkgFolder process.cwd!, pkg.name
                .chain copyTemplates _, answers
                .fork console.log, console.error