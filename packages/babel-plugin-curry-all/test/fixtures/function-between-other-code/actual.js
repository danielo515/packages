const myThing = {
    noCurried () {
        console.log('Object methods are not curried')
    }
}

const add = function (a, b) {
    return a + b
}

var x;
x = a => b => a + b