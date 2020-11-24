const RegistryContract = artifacts.require("RegistryContract");
const truffleAssert = require('truffle-assertions');

contract('Revoking Entity Test', (accounts) => {
  const callerAddress = accounts[1]; // transaction caller address
  const userAddress = accounts[2]; // user address
  let RC;

  beforeEach('deploy contract and register entity', async () => {
    RC = await RegistryContract.new();
    await RC.storeNewEntity({
      from: userAddress
    });
  });

  it('ANYONE can revoke his address', async () => {
    let status = await RC.isEntityRevoked(userAddress, {
      from: callerAddress
    });
    assert.equal(status, false, 'entity is not revoked');

    let tx = await RC.revokeEntity({
      from: userAddress
    });
    truffleAssert.eventEmitted(tx, 'EntityRevoked', {
      sender: userAddress
    });

    status = await RC.isEntityRevoked(userAddress, {
      from: callerAddress
    });
    assert.equal(status, true, 'entity is now revoked');
  });

  it('ANYONE can NOT revoke the entity due to INVALID USER', async () => {
    // callerAddress has not been registered in the contract yet
    await truffleAssert.reverts(
      RC.revokeEntity({
        from: callerAddress
      }), 'entity must exist'
    );
  });

  it('ANYONE can NOT revoke the entity due to ALREADY REVOKED', async () => {
    await RC.revokeEntity({
      from: userAddress
    });

    // cannot revoked twice
    await truffleAssert.reverts(
      RC.revokeEntity({
        from: userAddress
      }), 'entity must not revoked'
    );
  });
});