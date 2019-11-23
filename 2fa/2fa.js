const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('../auth.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the SQlite database.');
});
const app = express();
const port = 3000;

app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.set('views',  __dirname + '/views')
app.set('view engine', 'ejs')

/**
 * Display login page.
 */
app.get('/login', function (request, response) {
  response.sendFile(path.join(__dirname + '/login.html'));
});

/**
 * Run after submission on the login page.
 */
app.post('/do_login', function (request, response) {
  var email = request.body.email;
  var password = request.body.password;

  // check if there is a value
  if (email && password) {
    let sql = `SELECT id, email FROM users WHERE email = ? and password = ?`;
    let placeholder = [email, password]

    // first row only
    db.get(sql, placeholder, (err, row) => {
      if (err) {
        response.send('Fails to query data to the database!');
        return console.error(err.message);
      }

      if (row) {
        request.session.loggedIn = true;
        request.session.username = row.email;
        request.session.userId = row.id;
				response.redirect('/');
      } else {
        response.send('Username or Password wrong!');
        response.end();
      }
    });
  } else {
    response.send('Please enter Username and Password!');
    response.end();
  }
});

/**
 * Run when clicking logout button
 */
app.get('/do_logout', function (request, response) {
  request.session.loggedIn = false;
  request.session.username = '';
  request.session.userId = '';
  response.redirect('/');
});

/**
 * Display register page.
 */
app.get('/register', function (request, response) {
  response.sendFile(path.join(__dirname + '/register.html'));
});

/**
 * Run after submission on the register page.
 */
app.post('/do_register', function (request, response) {
  var email = request.body.email;
  var password = request.body.password;

  // check if there is a value
  if (email && password) {
    // insert to database
    var placeholder = [email, password]
    db.run(`INSERT INTO users(email,password) VALUES(?,?)`, placeholder, function (err) {
      if (err) {
        response.send('Fails to insert data to the database!');
        return console.log(err.message);
      }
      // get the last insert id
      console.log(`A row has been inserted with rowid ${this.lastID}`);
     
      response.send('Username and Password Received!');
      response.end();
    });
  } else {
    response.send('Please enter Username and Password!');
    response.end();
  }
});

/**
 * Render the setting page.
 */
app.get('/setting', function (request, response) {
  let id = request.session.userId;
  let sql = `SELECT * FROM users WHERE id = ?`;
  let placeholder = [id];

  // first row only
  db.get(sql, placeholder, (err, row) => {
    if (err) {
      response.send('Fails to query data to the database!');
      return console.error(err.message);
    }

    if (row) {
      let data = {
        loggedIn: true,
        userId: row.id,
        email: row.email,
        password: row.password,
        mfaEnabled: row.mfa_enabled,
        ethAddress: row.eth_address
      };
      response.render('setting', data);
    } else {
      response.send('Not matched userId');
      response.end();
    }
  });
});

/**
 * Run after submission on the setting page.
 */
app.post('/do_setting', function (request, response) {
  var email = request.body.email;
  var password = request.body.password;
  var mfaEnabled = request.body.enable_mfa;
  var ethAddress = request.body.pub_key;
  var userId = request.body.userId;

  // check if there is a value
  if (email && password) {
    // insert to database
    var placeholder = [email, password, mfaEnabled, ethAddress, userId]
    db.run(`UPDATE users SET email = ?, password = ?, mfa_enabled = ?, eth_address = ? WHERE id = ?`, placeholder, function (err) {
      if (err) {
        response.send('Fails to insert data to the database!');
        return console.log(err.message);
      }
      console.log(`Row(s) updated: ${this.changes}`);
     
      response.send('Updated successfully!');
      response.end();
    });
  } else {
    response.send('Please enter Username and Password!');
    response.end();
  }
});

/**
 * Render the home page.
 */
app.get('/', function (request, response) {
  if (request.session.loggedIn) {
    response.render('index', {
      loggedIn:true,
      username:request.session.username});
  } else {
    // development only, set to true to bypass login procedure
    request.session.loggedIn = true;
    request.session.username = 'admin@2fa.com';
    request.session.userId = 1;
    response.render('index', {
      loggedIn:true,
      username:request.session.username});
  }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));