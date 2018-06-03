'use strict';

// Creates a token function. If it matches returns an object indicating its type, the value and an array of possible next inputs
const token = ( matcher, next ) => (value, pos ) => {
    const match = matcher.match(value)
    return match ? { value, pos, next } : false
}
const tokenize = (input) => {
    const length = input.length;
    let pos,col,line = 0;
    const tokens = [];
    const step = () => {
        pos++; col++;
    }
    while(pos < length){
        const matched = tokenizers.reduce( (_, t) => t(input[pos], pos) );
        if( matched ){
            tokens.push(matched);
        }
        step();
    }
    return tokens;
}