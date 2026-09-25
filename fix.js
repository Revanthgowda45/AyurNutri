const fs = require('fs');
const p = 'ayurnutri-web/app/dashboard/meal-detail/page.tsx';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.split('\\`').join('`');
txt = txt.split('\\${').join('${');

fs.writeFileSync(p, txt);
