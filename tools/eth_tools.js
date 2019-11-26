const prompts = require('prompts');
const EthCrypto = require('eth-crypto');
const fs = require('fs');

const keyPath = './keys/user.json';
const questions = [
  {
    type: 'select',
    name: 'value',
    message: 'Heya, what do you want to do?',
    choices: [{
        title: 'Generate a new address',
        value: 1
      },{
        title: 'Sign a new message',
        value: 2
      }
    ]
  },{
    type: prev => prev == 2 ? 'text' : null,
    name: 'message',
    message: 'Okay, what message do you want to sign?',
    validate: message => message == '' ? 'Put your message' : true
  }
];

(async () => {
  const response = await prompts(questions);

  if (response["value"] == 1) {
    const identity = EthCrypto.createIdentity();
    let data = JSON.stringify(identity);
    fs.writeFileSync(keyPath, data);

    console.log('We made a new identity in ', keyPath);
  } else {
    if (fs.existsSync(keyPath)) {
      let rawdata = fs.readFileSync(keyPath);
      let user = JSON.parse(rawdata);
      let message = response["message"];
      
      let messageHash = EthCrypto.hash.keccak256(message);
      let signature = EthCrypto.sign(user.privateKey, messageHash);

      console.log('Here is the signature of your message:');
      console.log(signature);
    } else {
      console.log('ERROR! Seems like you have not created any address yet');
    }
  }
})();