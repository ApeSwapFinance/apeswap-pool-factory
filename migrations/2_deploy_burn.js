const BEP20RewardApeBurn = artifacts.require("BEP20RewardApeBurn");

module.exports = async function(deployer) {
    await deployer.deploy(BEP20RewardApeBurn);
    const bep20RewardApeBurn = await BEP20RewardApeBurn.deployed();
    await bep20RewardApeBurn.initialize(
        '', //IERC20 _stakeToken,
        '', //IERC20 _rewardToken,
        100000000000, //uint256 _rewardPerBlock,
        0, //uint256 _startBlock,
        0, //uint256 _bonusEndBlock,
        0, //uint256 _lockBlock
    );
};