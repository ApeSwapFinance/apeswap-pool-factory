const BEP20RewardApeObie = artifacts.require("BEP20RewardApeObie");

module.exports = async function(deployer) {
    const HOUR = 1200;
    const BANANA = '0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95';
    const OBIE = '0xa18509D20Fd01B4990734Fd04ba53bAd02922787';
    
    const CURRENT_BLOCK = await web3.eth.getBlock("latest");
    const START_BLOCK = CURRENT_BLOCK.number + 18*HOUR;
    const END_BLOCK = START_BLOCK + 30*24*HOUR;

    const REWARD_PER_BLOCK = Math.floor((5000*10**18 / (END_BLOCK - START_BLOCK))).toString();
    
    await deployer.deploy(BEP20RewardApeObie);
    const bep20RewardApeObie = await BEP20RewardApeObie.deployed();
    await bep20RewardApeObie.initialize(
        OBIE, //IERC20 _stakeToken,
        BANANA, //IERC20 _rewardToken,
        REWARD_PER_BLOCK, //uint256 _rewardPerBlock,
        START_BLOCK, //uint256 _startBlock,
        END_BLOCK, //uint256 _bonusEndBlock
    );
};