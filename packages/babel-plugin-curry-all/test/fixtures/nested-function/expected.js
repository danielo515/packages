const utils = function (logger) {

    const add = function add(a) {
        return b => {
            return a + b;
        };
    };

    const x = a => b => a + b;

    return {
        add, x
    };
};