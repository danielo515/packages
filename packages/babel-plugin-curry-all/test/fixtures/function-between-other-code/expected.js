const myThing = {
    noCurried() {
        console.log('Object methods are not curried');
    }
};

const add = function add(a) {
    return b => {
        return a + b;
    };
};

var x;
x = a => b => a + b;