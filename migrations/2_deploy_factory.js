const RewardApeFactoryV2 = artifacts.require("RewardApeFactoryV2");
const { getNetworkConfig } = require('../deploy-config')

module.exports = async function (deployer, network, accounts) {
    let { adminAddress, poolManager } = getNetworkConfig(network, accounts);
    await deployer.deploy(RewardApeFactoryV2, adminAddress, poolManager);
    const rewardApeFactory = await RewardApeFactoryV2.at(RewardApeFactoryV2.address);
    await rewardApeFactory.transferOwnership(adminAddress);
    const owner = await rewardApeFactory.owner();

    const output = {
        RewardApeFactoryV2: RewardApeFactoryV2.address,
        owner,
    }
    console.dir(output, { depth: null, colors: true })
};