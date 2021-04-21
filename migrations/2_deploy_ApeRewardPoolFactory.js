const ApeRewardPoolFactoryProxy = artifacts.require("ApeRewardPoolFactoryProxy");
const ApeRewardPoolFactory = artifacts.require("ApeRewardPoolFactory");
const { getNetworkConfig } = require('../deploy-config')

module.exports = async function (deployer, network, accounts) {
  const deployConfig = getNetworkConfig(network, accounts);

  console.log("Deploying ApePoolFactory with config:");
  console.dir(deployConfig);

  const { factoryAdmin, proxyAdmin, apePairFactory, feeToken, feeAmount } = deployConfig;

  await deployer.deploy(ApeRewardPoolFactory);

  const initializeInputs = [factoryAdmin, apePairFactory, feeToken, feeAmount];

  const abiEncodeData = web3.eth.abi.encodeFunctionCall({
    "inputs": [
      {
        "internalType": "address",
        "name": "ownerIn",
        "type": "address"
      },
      {
        "internalType": "contract PairFactory",
        "name": "apePairFactoryIn",
        "type": "address"
      },
      {
        "internalType": "contract IBEP20",
        "name": "feeTokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "feeAmountIn",
        "type": "uint256"
      },
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }, initializeInputs);

  await deployer.deploy(ApeRewardPoolFactoryProxy, ApeRewardPoolFactory.address, proxyAdmin, abiEncodeData);

  await ApeRewardPoolFactory.at(ApeRewardPoolFactoryProxy.address);

};
