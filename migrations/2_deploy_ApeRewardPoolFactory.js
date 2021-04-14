const ApeRewardPoolFactory = artifacts.require("ApeRewardPoolFactory");
const { getNetworkConfig } = require('../deploy-config')

// TODO: Add proxy deployment
module.exports = async function (deployer, network, accounts) {
  const deployConfig = getNetworkConfig(network);

  console.log("Deploying ApePoolFactory with config:");
  console.dir(deployConfig);

  const { apePairFactoryOwner, apePairFactory, feeToken, feeAmount } = deployConfig;

  await deployer.deploy(ApeRewardPoolFactory, apePairFactory, feeToken, feeAmount);
  const apeRewardPoolFactory =  await ApeRewardPoolFactory.at(ApeRewardPoolFactory.address);
  await apeRewardPoolFactory.transferOwnership(apePairFactoryOwner);
  
};
