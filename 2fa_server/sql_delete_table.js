const sqlite3 = require('sqlite3').verbose();

// open database in memory
let db = new sqlite3.Database('../auth.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the in-memory SQlite database.');
});

// delete required TABLES
console.log("delete database table users");
db.run('DROP TABLE users');

console.log("delete database table codes");
db.run('DROP TABLE 2fa_codes');

// close the database connection
db.close((err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Close the database connection.');
});