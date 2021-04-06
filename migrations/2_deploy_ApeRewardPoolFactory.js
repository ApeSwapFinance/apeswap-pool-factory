const ApeRewardPoolFactory = artifacts.require("ApeRewardPoolFactory");
const { getNetworkConfig } = require('../deploy-config')

module.exports = async function (deployer, network, accounts) {
  const deployConfig = getNetworkConfig(network);

  console.log("Deploying ApePoolFactory with config:");
  console.dir(deployConfig);

  const { apePairFactory, feeToken, feeAmount } = deployConfig;

  await deployer.deploy(ApeRewardPoolFactory, apePairFactory, feeToken, feeAmount);
};
