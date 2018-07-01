async function sum3 (a,b,c){
    return a + b + await c
}

async function log4 (a,b,c,d){
    console.log(a, b, await c, d)
}