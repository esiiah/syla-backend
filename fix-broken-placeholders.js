// fix-broken-placeholders.js
const fs = require('fs');
const path = require('path');

const exts = ['.js', '.jsx', '.ts', '.tsx'];
function walk(dir){
  return fs.readdirSync(dir).flatMap(f=>{
    const full = path.join(dir,f);
    return fs.statSync(full).isDirectory() ? walk(full) : full;
  });
}

const files = walk('frontend').filter(f => exts.includes(path.extname(f)));
const fixes = [
  { re: /\{\s*\.(\w+)\s*\}/g, rep: '{ ...$1 }' },                 // { .options } -> { ...options }
  { re: /\[\s*\.(selectedBars)\s*,/g, rep: '[...$1,' },          // [.selectedBars, ...] -> [...selectedBars, ...]
  { re: /\[\s*\.\(local\.gradientStops\s*\|\|\s*\[([^\]]+)\]\)\s*,/g, rep: '...[ (local.gradientStops || [$1]) ],' },
  { re: /\[\s*\.(local\.gradientStops\s*\|\|\s*\[\s*local\.color[^\]]*\]\s*)\]/g, rep: '...(local.gradientStops || [local.color])' },
  { re: /\.new Set\(/g, rep: 'Array.from(new Set(' },             // .new Set(...) -> Array.from(new Set(...))
  { re: /\{\s*\.prev,\s*\.patch\s*\}/g, rep: '{ ...prev, ...patch }' } // defensive
];

files.forEach(file=>{
  let t = fs.readFileSync(file,'utf8');
  let orig = t;
  fixes.forEach(f => { t = t.replace(f.re, f.rep); });
  if (t !== orig) {
    fs.writeFileSync(file, t, 'utf8');
    console.log('fixed', file);
  }
});
console.log('done');
