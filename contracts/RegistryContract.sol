pragma solidity >=0.4.25 <0.6.0;

contract RegistryContract {
    struct Identity {
    bool isValue; // true when payload is stored
    bool isRevoked; // true when it is revoked
	}

  address public owner;
  // key: address, value: Identity struct
  mapping (address => Identity) public entities;

  event NewEntityAdded(address sender);

  modifier entityMustExist(address entity) {
    require(entities[entity].isValue, "entity must exist");
    _;
  }

  modifier entityMustNotExist(address entity) {
    require(!entities[entity].isValue, "entity must not exist");
    _;
  }

  constructor() public {
		owner = msg.sender;
	}

  function storeNewEntity() public
  entityMustNotExist(msg.sender) {
    Identity storage i = entities[msg.sender];
    i.isValue = true;
    i.isRevoked = false;

    emit NewEntityAdded(msg.sender);
  }
}