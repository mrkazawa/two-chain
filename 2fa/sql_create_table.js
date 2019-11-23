const sqlite3 = require('sqlite3').verbose();

// open database in memory
let db = new sqlite3.Database('../auth.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the in-memory SQlite database.');
});

// create required TABLES
console.log("create database table users");
db.run('CREATE TABLE IF NOT EXISTS users( \
  id INTEGER PRIMARY KEY AUTOINCREMENT, \
  email TEXT NOT NULL UNIQUE, \
  password TEXT NOT NULL, \
  mfa_enabled INTEGER DEFAULT 0, \
  eth_address TEXT); \
');

// close the database connection
db.close((err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Close the database connection.');
});