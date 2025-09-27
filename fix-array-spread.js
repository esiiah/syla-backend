// fix-array-spread.js
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "frontend");

function walk(dirPath) {
  return fs.readdirSync(dirPath).flatMap(f => {
    const full = path.join(dirPath, f);
    return fs.statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(dir).filter(f => /\.(jsx?|tsx?)$/.test(f));

files.forEach(file => {
  let src = fs.readFileSync(file, "utf8");
  let fixed = src.replace(/\[\.\./g, "[...");
  if (fixed !== src) {
    fs.writeFileSync(file, fixed, "utf8");
    console.log("fixed:", file);
  }
});

console.log("✅ Sweep complete.");
