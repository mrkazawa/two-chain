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

console.log("create database table 2FA codes");
db.run('CREATE TABLE IF NOT EXISTS codes( \
  id INTEGER PRIMARY KEY AUTOINCREMENT, \
  code TEXT NOT NULL UNIQUE, \
  date_created INTEGER NOT NULL, \
  date_expired INTEGER NOT NULL, \
  user_id INTEGER NOT NULL); \
');

// close the database connection
db.close((err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Close the database connection.');
});