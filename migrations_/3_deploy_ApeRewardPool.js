const ApeRewardPool = artifacts.require("ApeRewardPool");

const deployConfigs = [
  {
    stakeToken: '0x0491648C910ad2c1aFaab733faF71D30313Df7FC', 
    rewardToken: '0x0491648C910ad2c1aFaab733faF71D30313Df7FC',
    startBlock: '7755906',
    bonusEndBlock: '11390295' 
  },
]

module.exports = async function (deployer) {

  for (const deployConfig of deployConfigs) {
    const { stakeToken, rewardToken, startBlock, bonusEndBlock } = deployConfig;

    console.log("Deploying ApeRewardPool with config:");
    console.dir(deployConfig);

    await deployer.deploy(ApeRewardPool)
    const apeRewardPool = await ApeRewardPool.at(ApeRewardPool.address);
    await apeRewardPool.initialize(stakeToken, rewardToken, startBlock, bonusEndBlock);
  }
};
