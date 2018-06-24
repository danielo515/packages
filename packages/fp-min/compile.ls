ls = require \livescript-next
fs = require \fs

code = fs.readFileSync \./index.ls \utf8
console.log (ls.compile code).code