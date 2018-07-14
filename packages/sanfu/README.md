# SANFU: Sanctuary Functional utilities

We do love [sanctuary](https://sanctuary-js.org), don't you ?
But sometimes we miss some utilities, and, you guessed, that's this library is all about.

This library contains a random but useful list of functional utils that are indeed type checked.
Just as sanctuary does, all functions checks that their input and their output is correct while you are developing.
When your code runs on production (`NODE_ENV=production`) type-checking is deactivated and you will get raw performance.

All our functions are curried, not partially applicable, curried. That means that every function takes just one argument and returns a function that takes the next argument until all arguments have been provided. If you are used to ramda this may shock you, but for performance and consistency we think this is the best. Also, if you find this annoying why don't you have a look at our helping babel plugins ? they make calling and creating curried functions a breeze: [curry all](https://www.npmjs.com/package/babel-plugin-curry-all) and [all curried](https://www.npmjs.com/package/babel-plugin-all-curried). This library uses them!

This library is very new, and we are just adding utilities as we need them, but if you miss anything don't hesitate to open an issue and tell us.