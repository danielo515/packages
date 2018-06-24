# babel-plugin-all-curried

This plugin transform all your functions calls into calls to curried functions.
This requires functional programming knowledge and being familiar with currying, how to use it on javascript and how to curried functions works.

This plugin plays nice with [sanctuary](https://sanctuary.js.org/) because all their functions are curried this way.
While this will work also with functions curried `Ramda` style we discourage the usage of magically curried functions, and instead we recommend to use
actually (also called manually) curried functions.

Curried functions are invoked this way:

```js
sum (1) (2)
```

If you want to fully commit to curried style you may be interested on my other babel plugin, `curry-all` which transforms 
all your function definitions to curried functions.

## Example

**In**

```js
// You have a curried function
const sum3 = a => b => c =>
    a + b + c
// You call them normally
sum3(1,2,3)
```

**Out**

```js
"use strict";
// You have a curried function
const sum3 = a => b => c =>
    a + b + c
// It gets transformed to a curried function invocation
sum3(1)(2)(3)
```

If you are using my other plugin `babel-plugin-curry-all` along with this one you will have all the benefits of curried functions
without the runtime overhead of magically curried functions neither the weird-looking code required to use them:

```js
// This will be automatically curried by `babel-plugin-curry-all`
const sum3 = function(a,b,c){
    return a + b + c
}
// This will be transformed by `babel-plugin-all-curried`
sum3(1,2,3)
```

```js
"use strict";

const sum3 = function(a){ 
  return b => c => a + b + c
}
// Curried function invocation
sum3(1)(2)(3)
```

## Installation

```sh
$ npm install babel-plugin-all-curried
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["all-curried"]
}
```

### Via CLI

```sh
$ babel --plugins all-curried script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["all-curried"]
});
```

## Dev comments

This plugin is built using [livescript](http://livescript.net), so you need to
understand it if you want to contribute to the source code.
Test are also on livescript, but they are directly executed by the livescript interpreter. There is a `build:test` npm command to compile them down to javascript if you need to review the generated code.