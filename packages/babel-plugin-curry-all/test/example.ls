require! {
    \babel-core : babel
    \../lib : plugin
}

functionDeclaration = '''
function sum (a,b){
    return a + b
}

async function sum3 (a,b,c){
    return a + b + await c
}

async function log4 (a,b,c,d){
    console.log(a, b, await c, d)
}
'''

fnInVariableDeclarator = ''' 
const add = function(a,b) {
    return a + b
}

const inc = (a, b) => a + b + 1
'''

fnInAssignmentExpression = '''
var sum;
sum = function(a,b) {
    return a + b
}
''' 



console.log (babel.transform functionDeclaration, plugins: [plugin]).code
console.log (babel.transform fnInVariableDeclarator, plugins: [plugin]).code
console.log (babel.transform fnInAssignmentExpression, plugins: [plugin]).code
