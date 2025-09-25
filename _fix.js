const fs = require('fs');
const path = 'modules_meshcore/winpatch.js';
let src = fs.readFileSync(path, 'utf8');
src = src.replace("    ($_ | Out-String).Trim()'\n                    '", "    ($_ | Out-String).Trim()',\n                    '");
fs.writeFileSync(path, src);
