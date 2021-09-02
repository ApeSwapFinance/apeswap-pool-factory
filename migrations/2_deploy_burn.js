const BEP20RewardApeBurn = artifacts.require("BEP20RewardApeBurn");

module.exports = async function(deployer) {
    const HOUR = 1200;
    const BANANA = '0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95';
    const GNANA = '0xddb3bd8645775f59496c821e4f55a7ea6a6dc299';
    const USDC = '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d';
    
    const CURRENT_BLOCK = await web3.eth.getBlock("latest");
    const START_BLOCK = CURRENT_BLOCK.number + 120
    const LOCK_BLOCK = START_BLOCK + 24*HOUR; 
    const END_BLOCK = LOCK_BLOCK + 24*HOUR;

    const REWARD_PER_BLOCK = Math.floor((10*10**18 / (END_BLOCK - START_BLOCK))).toString();
    
    await deployer.deploy(BEP20RewardApeBurn);
    const bep20RewardApeBurn = await BEP20RewardApeBurn.deployed();
    await bep20RewardApeBurn.initialize(
        BANANA, //IERC20 _stakeToken,
        USDC, //IERC20 _rewardToken,
        REWARD_PER_BLOCK, //uint256 _rewardPerBlock,
        START_BLOCK, //uint256 _startBlock,
        END_BLOCK, //uint256 _bonusEndBlock,
        START_BLOCK + HOUR, //uint256 _lockBlock
    );
};