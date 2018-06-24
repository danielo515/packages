
require! livescript
babelOptions = parserOpts: parser: \livescript-next
delete require.extensions\.ls
require \babel-register <| babelOptions
require! \./index.ls