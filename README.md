# <img src="logo.svg" alt="ApeSwap" height="160px">

# ApeSwap Pools & Pool Factory
This repository contains the Solidity Smart Contract code for ApeSwap pools along with a factory contract to easily deploy new pool contracts on chain.

## Installation
Clone locally then run: `yarn`  

### `.env`
Copy `.env.example` as `.env` and provide the environment variables to deploy and verify contracts (if needed).  

## Deploy Contracts
Compile the smart contracts:  
`yarn compile`    

Migrate to BSC:  
`yarn migrate:bsc`  

Verify contracts:  
`verify:bsc`  


## Reflect Staking Tokens
ApeSwap typically runs staking pools which allow [BANANA](https://bscscan.com/address/0x603c7f932ED1fc6575303D8Fb018fDCBb0f39a95#code) or [GNANA](https://bscscan.com/address/0xdDb3Bd8645775F59496c821E4F55A7eA6A6dc299#code) to be staked when used on BSC.  

As `GNANA` is a reflect token, the reflect fees which are sent to the pool cannot be allocated to stakers. The pool keeps track of the `totalStaked` amount and allows the owner of the pool to skim excess reflect fees earned for burning or other purposes as per governance.   

