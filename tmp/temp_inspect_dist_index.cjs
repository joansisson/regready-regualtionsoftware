const fs = require("fs");

const s = fs.readFileSync("dist/index.js", "utf8");
const needle = "@vitejs/plugin-react";
const i = s.indexOf(needle);

if (i === -1) {
  console.log("NOT FOUND");
  process.exit(0);
}

const before = s.slice(0, i);
const lineStart = before.split("\n").length - 1;

const lines = s.split("\n");
const startLine = Math.max(0, lineStart - 10);
const endLine = Math.min(lines.length - 1, lineStart + 20);

console.log({ lineStart, startLine, endLine, needleIndex: i });
for (let ln = startLine; ln <= endLine; ln++) {
  console.log(String(ln + 1).padStart(5, " ") + ": " + lines[ln]);
}
