'use strict';
/**
 * READY FOR BE COMPILED WITH PARCEL
 */

const compile = require('../nearley/index');
const example = `PORT       = PORT      | 3000                   :: Int                                
HOST       = HOST      | 'satan.com'            :: String   
DB_URL     = URL       | 'http://HOST:PORT'     :: String   
`;
console.log(compile(example));