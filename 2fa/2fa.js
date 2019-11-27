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
        request.session.userId = row.id;
        response.redirect('/verify_2fa');
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
        loggedIn: request.session.loggedIn,
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
  var userId = request.session.userId;

  // update to database
  var placeholder = [email, password, userId]
  db.run(`UPDATE users SET email = ?, password = ? WHERE id = ?`, placeholder, function (err) {
    if (err) {
      response.send('Fails to update data to the database!');
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
 * Render the setup 2fa page.
 */
app.get('/setup_2fa', isLoggedIn, function (request, response) {
  let id = request.session.userId;

  let data = {
    loggedIn: request.session.loggedIn,
    userId: id,
  };
  response.render('setup_2fa', data);
});

/**
 * Run after submission on the setup 2fa page.
 */
app.post('/do_setup_2fa', isLoggedIn, function (request, response) {
  var ethAddress = request.body.eth_address;
  var userId = request.session.userId;
  var mfaEnabled = 1;

  // update to database
  var placeholder = [mfaEnabled, ethAddress, userId]
  db.run(`UPDATE users SET mfa_enabled = ?, eth_address = ? WHERE id = ?`, placeholder, function (err) {
    if (err) {
      response.send('Fails to update data to the database!');
      return console.log(err.message);
    }

    console.log(`Row(s) updated: ${this.changes}`);
    response.redirect('/success_setup_2fa');
  });
});

app.get('/success_setup_2fa', isLoggedIn, function (request, response) {
  response.render('success_setup_2fa');
});

/**
 * Render the verify 2fa page.
 */
app.get('/verify_2fa', isNotLoggedIn, function (request, response) {
  let id = request.session.userId;
  let code = randomValueBase64(16);
  let currentTime = Math.floor(new Date() / 1000); // in epoch time UNIX
  let mockDate = getDateInTheNextMinute(5);
  let expiryTime = Math.floor(mockDate / 1000); // in epoch time UNIX

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
          loggedIn: request.session.loggedIn,
          code: code,
          ethAddress: row.eth_address,
          email: row.email
        };
        response.render('verify_2fa', data);
      } else {
        response.send('Not matched userId');
        return console.error(`Not matched userId ${id}`);
      }
    });
  });
});

/**
 * Run after submission on the verify 2fa page.
 */
app.post('/do_verify_2fa', isNotLoggedIn, async (request, response) => {
  var ethAddress = request.body.eth_address;
  var code = request.body.code;
  var signature = request.body.signature;

  let rawContractInfo = fs.readFileSync(contractPath);
  let info = JSON.parse(rawContractInfo);
  let rawContractABI = fs.readFileSync(contractABIPath);
  let abi = JSON.parse(rawContractABI);

  const RC = new web3.eth.Contract(abi.abi, info.address);

  let rawServer = fs.readFileSync(serverPath);
  let server = JSON.parse(rawServer);
  let serverAddress = web3.utils.toChecksumAddress(server.address);

  const exist = await RC.methods.isEntityExist(ethAddress).call({
    from: serverAddress
  });

  // address is registered in the blockchain
  if (exist) {
    let codeHash = EthCrypto.hash.keccak256(code);
    let signerAddress = EthCrypto.recover(signature, codeHash);

    // signature is valid
    if (signerAddress == ethAddress) {
      let id = request.session.userId;
      let sql = `SELECT email, eth_address FROM users WHERE id = ?`;
      let placeholder = [id];

      // first row only
      db.get(sql, placeholder, (err, row) => {
        if (err) {
          response.send('Fails to query data to the database!');
          return console.error(err.message);
        }

        if (row) {
          var email = row.email;

          // the eth address is correctly for the given user
          if (ethAddress == row.eth_address) {
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
                // code is not expired
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
            // failed due to eth address is not for given user
          }
        } else {
          response.send('Not matched code');
          return console.error(`Not matched userId ${id}`);
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
      loggedIn: request.session.loggedIn,
      username: request.session.username,
      userId: request.session.userId
    });
  } else {
    response.render('index', {
      loggedIn: request.session.loggedIn
    });
  }
});

//------------------------------------ Tools ------------------------------------//

/**
 * Filter to intercept request to allow only logged in users to go through.
 * 
 * @param {*} request 
 * @param {*} response 
 * @param {*} next 
 */
function isLoggedIn(request, response, next) {
  if (request.session.loggedIn) {
    return next();
  }
  response.redirect('/');
}

/**
 * Filter to intercept request to allow only loggged out users to go through.
 * 
 * @param {*} request 
 * @param {*} response 
 * @param {*} next 
 */
function isNotLoggedIn(request, response, next) {
  if (!request.session.loggedIn) {
    return next();
  }
  response.redirect('/');
}

/**
 * Generate a random base 64 character.
 * 
 * @param {int} len   the length of the random character to generate
 */
function randomValueBase64(len) {
  return crypto
    .randomBytes(Math.ceil((len * 3) / 4))
    .toString('base64') // convert to base64 format
    .slice(0, len) // return required number of characters
    .replace(/\+/g, '0') // replace '+' with '0'
    .replace(/\//g, '0') // replace '/' with '0'
}

/**
 * Get the date object in the next given minutes.
 * 
 * @param {int} minutes   the number of minutes in the future
 */
function getDateInTheNextMinute(minutes) {
  var now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  return new Date(now);
}

//------------------------------------ Main ------------------------------------//

app.listen(port, () => console.log(`Example app listening on port ${port}!`));