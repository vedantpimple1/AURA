const http = require('http');

http.get('http://localhost:3000/api/test-rbac?role=ADMIN&userId=dummyId', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => { console.log("ADMIN:", data); });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});

http.get('http://localhost:3000/api/test-rbac?role=SUPERADMIN&userId=dummyId', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => { console.log("SUPERADMIN:", data); });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
