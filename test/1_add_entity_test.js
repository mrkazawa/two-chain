const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

contract('Storing Entity Test', (accounts) => {
  const userAddress = accounts[1]; // user address
  let RC;

  beforeEach('deploy contract', async () => {
    RC = await RegistryContract.new();
  });

  it('ANYONE can register his address', async () => {
    let tx = await RC.storeNewEntity({
      from: userAddress
    });
    truffleAssert.eventEmitted(tx, 'NewEntityAdded', {
      sender: userAddress
    });
  });

  it('ANYONE can NOT register his address twice', async () => {
    await RC.storeNewEntity({
      from: userAddress
    });
    // mistakenly store the same address twice
    await truffleAssert.reverts(
      RC.storeNewEntity({
        from: userAddress
      }), 'entity must not exist'
    );
  });
});