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
  event EntityRevoked(address sender);

  modifier entityMustExist(address entity) {
    require(entities[entity].isValue, "entity must exist");
    _;
  }

  modifier entityMustNotExist(address entity) {
    require(!entities[entity].isValue, "entity must not exist");
    _;
  }

  modifier entityMustNotRevoked(address entity) {
    require(!entities[entity].isRevoked, "entity must not revoked");
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

  function revokeEntity() public
  entityMustExist(msg.sender)
  entityMustNotRevoked(msg.sender) {
    entities[msg.sender].isRevoked = true;

    emit EntityRevoked(msg.sender);
  }

  function isEntityRevoked(address entity) public view
  returns (bool) {
    return (entities[entity].isRevoked == true);
  }

  function isEntityExist(address entity) public view
  returns (bool) {
    return (entities[entity].isValue == true);
  }
}