const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const crypto = require('crypto');
const EthCrypto = require('eth-crypto');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const contractABIPath = '../build/contracts/RegistryContract.json';
const contractPath = './contract.json';
const serverPath = './server.json';

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

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

//------------------------------------ Login ------------------------------------//

/**
 * Display login page.
 */
app.get('/login', isNotLoggedIn, function (request, response) {
  response.render('login');
});

/**
 * Run after submission on the login page.
 */
app.post('/do_login', isNotLoggedIn, function (request, response) {
  var email = request.body.email;
  var password = request.body.password;

  let sql = `SELECT id, email, mfa_enabled FROM users WHERE email = ? and password = ?`;
  let placeholder = [email, password]

  // first row only
  db.get(sql, placeholder, (err, row) => {
    if (err) {
      response.send('Fails to query data to the database!');
      return console.error(err.message);
    }

    // login using username and password successful
    if (row) {
      // when 2fa is enabled
      if (row.mfa_enabled == 1) {
        console.log("masuk sini");
        request.session.userId = row.id;
        response.redirect('/verify_mfa');
      } else {
        request.session.loggedIn = true;
        request.session.username = row.email;
        request.session.userId = row.id;
        response.redirect('/');
      }
    } else {
      response.redirect('/failed_login');
    }
  });
});

app.get('/failed_login', isNotLoggedIn, function (request, response) {
  response.render('failed_login');
});

//------------------------------------ Register ------------------------------------//

/**
 * Display register page.
 */
app.get('/register', isNotLoggedIn, function (request, response) {
  response.render('register');
});

/**
 * Run after submission on the register page.
 */
app.post('/do_register', isNotLoggedIn, function (request, response) {
  var email = request.body.email;
  var password = request.body.password;

  // insert to database
  var placeholder = [email, password]
  db.run(`INSERT INTO users(email,password) VALUES(?,?)`, placeholder, function (err) {
    if (err) {
      response.send('Fails to insert data to the database!');
      return console.log(err.message);
    }
    // get the last insert id
    console.log(`A row has been inserted with rowid ${this.lastID}`);

    request.session.loggedIn = true;
    request.session.username = email;
    request.session.userId = this.lastID;
    response.redirect('/');
  });
});

//------------------------------------ Setting ------------------------------------//

/**
 * Render the setting page.
 */
app.get('/setting', isLoggedIn, function (request, response) {
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
      return console.error(`Not matched userId ${id}`);
    }
  });
});

/**
 * Run after submission on the setting page.
 */
app.post('/do_setting', isLoggedIn, function (request, response) {
  var email = request.body.email;
  var password = request.body.password;
  var mfaEnabled = request.body.enable_mfa;
  var ethAddress = request.body.eth_address;
  var userId = request.session.userId;

  // update to database
  var placeholder = [email, password, mfaEnabled, ethAddress, userId]
  db.run(`UPDATE users SET email = ?, password = ?, mfa_enabled = ?, eth_address = ? WHERE id = ?`, placeholder, function (err) {
    if (err) {
      response.send('Fails to insert data to the database!');
      return console.log(err.message);
    }

    console.log(`Row(s) updated: ${this.changes}`);
    response.redirect('/success_setting');
  });
});

app.get('/success_setting', isLoggedIn, function (request, response) {
  response.render('success_setting');
});

//------------------------------------ 2FA related ------------------------------------//

/**
 * Render the setup mfa page.
 */
app.get('/setup_mfa', isLoggedIn, function (request, response) {
  let id = request.session.userId;
  let sql = `SELECT id FROM users WHERE id = ?`;
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
      };
      response.render('setup_mfa', data);
    } else {
      response.send('Not matched userId');
      return console.error(`Not matched userId ${id}`);
    }
  });
});

/**
 * Run after submission on the setup mfa page.
 */
app.post('/do_register_mfa', isLoggedIn, function (request, response) {
  var ethAddress = request.body.eth_address;
  var userId = request.session.userId;
  var mfaEnabled = 1;

  // update to database
  var placeholder = [mfaEnabled, ethAddress, userId]
  db.run(`UPDATE users SET mfa_enabled = ?, eth_address = ? WHERE id = ?`, placeholder, function (err) {
    if (err) {
      response.send('Fails to insert data to the database!');
      return console.log(err.message);
    }

    console.log(`Row(s) updated: ${this.changes}`);
    response.redirect('/success_setup');
  });
});

app.get('/success_setup', isLoggedIn, function (request, response) {
  response.render('success_setup');
});

/**
 * Render the verify mfa page.
 */
app.get('/verify_mfa', isNotLoggedIn, function (request, response) {
  let id = request.session.userId;
  let code = randomValueBase64(16);
  let currentTime = Math.floor(new Date() / 1000);
  let mockDate = getDateInTheNextMinute(5);
  let expiryTime = Math.floor(mockDate / 1000);

  var placeholder = [code, currentTime, expiryTime, id];
  db.run(`INSERT INTO codes(code, date_created, date_expired, user_id) VALUES(?,?,?,?)`, placeholder, function (err) {
    if (err) {
      response.send('Fails to insert data to the database!');
      return console.log(err.message);
    }
    // get the last insert id
    console.log(`A row has been inserted with rowid ${this.lastID}`);

    let sql = `SELECT email, eth_address FROM users WHERE id = ?`;
    let placeholder = [id];

    // first row only
    db.get(sql, placeholder, (err, row) => {
      if (err) {
        response.send('Fails to query data to the database!');
        return console.error(err.message);
      }

      if (row) {
        let data = {
          loggedIn: false,
          code: code,
          ethAddress: row.eth_address,
          email: row.email
        };
        response.render('verify_mfa', data);
      } else {
        response.send('Not matched userId');
        return console.error(`Not matched userId ${id}`);
      }
    });
  });
});

/**
 * Run after submission on the verify mfa page.
 */
app.post('/do_verify_mfa', isNotLoggedIn, async (request, response) => {
  var ethAddress = request.body.eth_address;
  var code = request.body.code;
  var signature = request.body.signature;
  var email = request.body.email;

  let rawContractInfo = fs.readFileSync(contractPath);
  let info = JSON.parse(rawContractInfo);
  let rawContractABI = fs.readFileSync(contractABIPath);
  let abi = JSON.parse(rawContractABI);

  let rawServer = fs.readFileSync(serverPath);
  let server = JSON.parse(rawServer);
  let serverAddress = web3.utils.toChecksumAddress(server.address);

  const RC = new web3.eth.Contract(abi.abi, info.address);

  const exist = await RC.methods.isEntityExist(ethAddress).call({
    from: serverAddress
  });

  // address is registered in the blockchain
  if (exist) {
    let codeHash = EthCrypto.hash.keccak256(code);
    let signerAddress = EthCrypto.recover(signature, codeHash);

    // signature is valid
    if (signerAddress == ethAddress) {
      let sql = `SELECT date_expired FROM codes WHERE code = ?`;
      let placeholder = [code];

      // first row only
      db.get(sql, placeholder, (err, row) => {
        if (err) {
          response.send('Fails to query data to the database!');
          return console.error(err.message);
        }

        if (row) {
          let currentTime = Math.floor(new Date() / 1000);
          if (currentTime < row.date_expired) {
            request.session.username = email;
            request.session.loggedIn = true;
            response.redirect('/');
          } else {
            // failed due to expired
          }
        } else {
          response.send('Not matched code');
          return console.error(`Not matched code ${code}`);
        }
      });
    } else {
      // failed due to invalid signature
    }
  } else {
    // failed due to not registered yet
  }
});

//------------------------------------ Logout ------------------------------------//

/**
 * Run when clicking logout button.
 */
app.get('/do_logout', isLoggedIn, function (request, response) {
  request.session.loggedIn = false;
  request.session.username = '';
  request.session.userId = '';
  response.redirect('/');
});

//------------------------------------ Home ------------------------------------//

/**
 * Render the home page.
 */
app.get('/', function (request, response) {
  if (request.session.loggedIn) {
    response.render('index', {
      loggedIn: true,
      username: request.session.username,
      userId: request.session.userId
    });
  } else {
    response.render('index', {
      loggedIn: false
    });
  }
});

//------------------------------------ Tools ------------------------------------//

function isLoggedIn(request, response, next) {
  if (request.session.loggedIn) {
    return next();
  }
  response.redirect('/');
}

function isNotLoggedIn(request, response, next) {
  if (!request.session.loggedIn) {
    return next();
  }
  response.redirect('/');
}

function randomValueBase64(len) {
  return crypto
    .randomBytes(Math.ceil((len * 3) / 4))
    .toString('base64') // convert to base64 format
    .slice(0, len) // return required number of characters
    .replace(/\+/g, '0') // replace '+' with '0'
    .replace(/\//g, '0') // replace '/' with '0'
}

function getDateInTheNextMinute(minutes) {
  var now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  return new Date(now);
}

//------------------------------------ Main ------------------------------------//

app.listen(port, () => console.log(`Example app listening on port ${port}!`));