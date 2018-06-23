require! {
    \babel-core : babel
    \../lib : plugin
}

functionDeclaration = '''
function sum (a,b){
    return a + b
}
'''

functionExpression = ''' 
const add = function(a,b) {
    return a + b
}

var sum;
sum = function(a,b) {
    return a + b
}
''' 



console.log (babel.transform functionDeclaration, plugins: [plugin]).code
console.log (babel.transform functionExpression, plugins: [plugin]).code
