# ApeSwap Pool Factory
This is a set of EVM compatible smart contracts which acts as a factory to create new staking pool contracts in a decentralized way. 

## Concepts 
- Provide a fee token address which can be used by public addresses to create pool contracts
- Staking tokens for publicly created pools must adhere be one of the following:
  - Fee token
  - LP Pairs which have the `factory` that matches the factory address of this pool factory
  - Any other whitelisted address added by the owner of the pool factory contract

## Style 
Please adhere to the Solidity style guidelines. 

https://docs.soliditylang.org/en/v0.8.0/style-guide.html 