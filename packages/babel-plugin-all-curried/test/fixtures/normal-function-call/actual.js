'use strict';

const map = fn => arr => arr.map(fn);
map ( i => i + i, [1,2,3,]);