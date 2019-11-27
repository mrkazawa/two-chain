const prompts = require('prompts');
const chalk = require('chalk');
const EthCrypto = require('eth-crypto');
const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const contractABIPath = '../build/contracts/RegistryContract.json';
const contractPath = './keys/contract.json';
const keyPath = './keys/user.json';
const questions = [{
  type: 'select',
  name: 'value',
  message: 'Heya, what do you want to do?',
  choices: [{
    title: 'Register an address',
    value: 1
  }, {
    title: 'Sign a code',
    value: 2
  }]
}, {
  type: prev => prev == 2 ? 'text' : null,
  name: 'message',
  message: 'Okay, what code do you want to sign?',
  validate: message => message == '' ? 'Put your code' : true
}];

(async () => {
  const response = await prompts(questions);

  // registering address
  if (response["value"] == 1) {
    if (!fs.existsSync(contractPath)) {
      console.log(chalk.red('ERROR! Seems like your contract info is missing'));
    } else if (!fs.existsSync(contractABIPath)) {
      console.log(chalk.red('ERROR! Seems like you have not deploy the contract yet'));
    } else {

      let rawContractInfo = fs.readFileSync(contractPath);
      let info = JSON.parse(rawContractInfo);
      let rawContractABI = fs.readFileSync(contractABIPath);
      let abi = JSON.parse(rawContractABI);

      const RC = new web3.eth.Contract(abi.abi, info.address);

      let rawUser = fs.readFileSync(keyPath);
      let user = JSON.parse(rawUser);
      let userAddress = web3.utils.toChecksumAddress(user.address);

      let tx = await RC.methods.storeNewEntity().send({
        from: userAddress,
        gas: 1000000
      });
      
      if (typeof tx.events.NewEntityAdded !== 'undefined') {
        const event = tx.events.NewEntityAdded;
        console.log('We store this address in the blockchain');
        console.log(chalk.black.bgYellow(event.returnValues['sender']));
      } else {
        console.log(chalk.red('ERROR! Cannot store entity Tx to blockchain!'));
      }
    }

  // signing messages
  } else {
    if (fs.existsSync(keyPath)) {
      let rawdata = fs.readFileSync(keyPath);
      let user = JSON.parse(rawdata);
      let message = response["message"];

      let messageHash = EthCrypto.hash.keccak256(message);
      let signature = EthCrypto.sign(user.privateKey, messageHash);

      console.log('Here is the signature of your message:');
      console.log(chalk.black.bgYellow(signature));
    } else {
      console.log(chalk.red('ERROR! Seems like you have not created any address yet'));
    }
  }
})();