const RewardApeFactory = artifacts.require("RewardApeFactory");

module.exports = async function(deployer, network, accounts) {
    // mainnet
    const adminAddress = '0x6c905b4108A87499CEd1E0498721F2B831c6Ab13';
    await deployer.deploy(RewardApeFactory, adminAddress);
};