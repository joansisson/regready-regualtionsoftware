const http = require("http");

const req = http.request(
  "http://localhost:5000/",
  { method: "HEAD" },
  (res) => {
    console.log("STATUS=" + res.statusCode);
    process.exit(0);
  },
);

req.on("error", (e) => {
  console.log("ERROR=" + e.message);
  process.exit(1);
});

req.end();
