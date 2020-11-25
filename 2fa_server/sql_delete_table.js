const sqlite3 = require('sqlite3').verbose();

// open database in memory
let db = new sqlite3.Database('../auth.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the in-memory SQlite database.');
});

db.run('DROP TABLE users');
console.log("Table 'users' is deleted!");

db.run('DROP TABLE codes');
console.log("Table 'codes' is deleted!");

// close the database connection
db.close((err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Close the database connection.');
});