const LiveScript = require('livescript');
module.exports = [
    { ext: ".ls"
    , transform: (content, filename) => LiveScript.compile(content, { filename })
    }
];