require! {
    \babel-core : babel
    \../lib : plugin
}

example = '''
var foo = 1;
if (foo) {
    console.log(foo,12)
};

max(1,2,3,4,5)
arr = [1,2,3,4]
Math.max(...arr)
def ( 
    'lib/stuff'
    , {}
    , [$.Number,$.Number]
    , (a,b) => a + b
    )
'''


console.log (babel.transform example, plugins: [plugin]).code
