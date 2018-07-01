async function sum3(a) {
    return b => async c => {
        return a + b + (await c);
    };
}

async function log4(a) {
    return b => c => async d => {
        console.log(a, b, (await c), d);
    };
}