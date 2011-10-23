var http = require('http'),
   cookie = require('../');

cookie.secret = "50m3thing-l0ng-@nd-r@nd0m-th@t-n0-0n3-will-gu355";

http.createServer(function (req, res) {
  var rdm = req.getSecureCookie("rdm");
  if (!rdm) res.setSecureCookie("rdm", (Math.random()*1e9).toString(36));
  res.writeHead(200, {"Content-Type": "text/html"});	
  if (rdm) res.write("Cookie has value: " + rdm);
  res.end();
}).listen(8080);

console.log('Server running at http://127.0.0.1:8080/');
