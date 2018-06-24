# babel-plugin-curry-all

This plugin transform all your normal functions to curried functions
so they are easily composable because each function only takes one argument.
This requires functional programming knowledge and being familiar with currying, how to use it on javascript and how to call actually curried functions.

Please note that functions are actually curried, not magically curried. 
This means that, if you are familiar with functions curried `Ramda` style this ones are not of that kind. This is more in line with [sanctuary](https://sanctuary.js.org/)
Curried functions are invoked this way:

```js
sum (1) (2)
```

If you find calling curried functions awkward you may be interested on my other
babel plugin, `all-curried` which transforms all function calls to calls to curried functions.

## Example

**In**

```js

function sum3(a,b,c){
  return a + b + c
}
```

**Out**

```js
"use strict";

function sum3(a){
  return b => c => {
    return a + b + c
  }
}
```

## Installation

```sh
$ npm install babel-plugin-curry-all
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["curry-all"]
}
```

### Via CLI

```sh
$ babel --plugins curry-all script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["curry-all"]
});
```

## Dev comments

This plugin is built using [livescript](http://livescript.net), so you need to
understand it if you want to contribute to the source code.
Test are also on livescript, but they are directly executed by the livescript interpreter. There is a `build:test` npm command to compile them down to javascript if you need to review the generated code.