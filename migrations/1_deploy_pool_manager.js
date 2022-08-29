const PoolManager = artifacts.require("PoolManager");
const RewardApeFactory = artifacts.require("RewardApeFactory");
const { getNetworkConfig } = require('../deploy-config')

module.exports = async function (deployer, network, accounts) {
    /*
        Step 0: Confooger zeee varyoobles
    */
    let { adminAddress, poolManager } = getNetworkConfig(network, accounts);

    /*
        Step 1: Deploy Pool Manager & Add authorized members
    */
    let poolManagerContract = null;
    if (poolManager == "" || poolManager == "0x") {
        await deployer.deploy(PoolManager);
        poolManagerContract = await PoolManager.at(PoolManager.address);
        await poolManagerContract.addAuthorized(adminAddress);
    } else {
        poolManagerContract = await PoolManager.at(poolManager);
    }

    /*
        Step 2: Deploy Pool Factory
    */
    await deployer.deploy(RewardApeFactory, adminAddress, poolManagerContract.address);
    const rewardApeFactory = await RewardApeFactory.at(RewardApeFactory.address);

    /*
        Step 3: Give Pool Factory Permission on the Pool Manager then transfer pool manager ownership to admin
    */
    if (poolManager == "" || poolManager == "0x") {
        await poolManagerContract.addAuthorized(rewardApeFactory.address);
        await poolManagerContract.transferOwnership(adminAddress);
    }

    console.log('wow it all worky');
};