
const utils = function ( logger ) {

    const add = function (a, b) {
        return a + b
    }

    const x = a => b => a + b;

    return {
        add, x
    }
}