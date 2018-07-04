const { pipeAcc, inspect, push, pick } = require('..')


const x = pipeAcc([ 
    ([a]) => a + 1
    , ([, b]) => b * 2
    , ([, , c]) => c - 1
 ]);

x(2).then(console.log)

const adder = push([]);

console.log(adder(55));

console.log(
    'PICK:',
    pick(['a', 'b']) ({ a:1, b:2, c:3 })
)