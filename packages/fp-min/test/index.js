const { pipeAcc, inspect, push } = require('..')


const x = pipeAcc([ 
    inspect('First')(([a]) => a + 1 )
    , ([, b]) => b * 2
    , ([, , c]) => c - 1
 ]);

x(2).then(console.log)

const adder = push([]);

console.log(adder(55));