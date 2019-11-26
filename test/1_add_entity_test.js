const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

contract('Storing Entity Test', (accounts) => {
  const userAddress = accounts[1]; // user address
  const callerAddress = accounts[2]; // caller address
  let RC;

  beforeEach('deploy contract', async () => {
    RC = await RegistryContract.new();
  });

  it('ANYONE can register his address', async () => {
    let status = await RC.isEntityExist(userAddress, {
      from: callerAddress
    });
    assert.equal(status, false, 'entity does not exist');

    let tx = await RC.storeNewEntity({
      from: userAddress
    });
    truffleAssert.eventEmitted(tx, 'NewEntityAdded', {
      sender: userAddress
    });

    status = await RC.isEntityExist(userAddress, {
      from: callerAddress
    });
    assert.equal(status, true, 'entity exists');
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