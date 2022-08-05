const RewardApeFactory = artifacts.require("RewardApeFactory");
const { getNetworkConfig } = require('../deploy-config')

module.exports = async function (deployer, network, accounts) {
    let { adminAddress } = getNetworkConfig(network, accounts);
    await deployer.deploy(RewardApeFactory, adminAddress);
};