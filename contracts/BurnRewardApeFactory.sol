// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./BEP20RewardApeBurn.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RewardApeFactory {
  address public defaultOwner;

  event DeployedPoolContract(
      address indexed pool,
      address stakeToken,
      address rewardToken,
      uint256 rewardPerBlock,
      uint256 startBlock,
      uint256 bonusEndBlock,
      uint256 lockBlock,
      address owner);

  constructor (address _defaultOwner) {
    defaultOwner = _defaultOwner;
  }

  function deployDefaultPoolContract(
        IERC20 _stakeToken,
        IERC20 _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _startBlock,
        uint256 _bonusEndBlock,
        uint256 _lockBlock) public {
    deployPoolContract(_stakeToken, _rewardToken, _rewardPerBlock, _startBlock, _bonusEndBlock, _lockBlock, defaultOwner);
  }

  function deployPoolContract(
        IERC20 _stakeToken,
        IERC20 _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _startBlock,
        uint256 _bonusEndBlock,
        uint256 _lockBlock,
        address _owner) public {
    BEP20RewardApeBurn pool = new BEP20RewardApeBurn();

    pool.initialize(_stakeToken, _rewardToken, _rewardPerBlock, _startBlock, _bonusEndBlock, _lockBlock);

    pool.transferOwnership(_owner);

    emit DeployedPoolContract(address(pool), address(_stakeToken), address(_rewardToken), _rewardPerBlock, _startBlock, _bonusEndBlock, _lockBlock, _owner);
  }

  function deployComputedPoolContract(
        IERC20 _stakeToken,
        IERC20 _rewardToken,
        uint256 _startBlock,
        uint256 _blocksDuration,
        uint256 _lockBlock,
        uint256 _totalRewards,
        address _owner) public {
    (uint256 rewardPerBlock, uint256 bonusEndBlock) = calculatedConfig(_totalRewards, _startBlock, _blocksDuration);
    deployPoolContract(_stakeToken, _rewardToken, rewardPerBlock, _startBlock, bonusEndBlock, _lockBlock, _owner);
  }

  function calculatedConfig(
    uint256 _totalRewards,
    uint256 _startBlock,
    uint256 _blocksDuration) public pure returns (uint256 rewardsPerBlock, uint256 bonusEndBlock) {

    rewardsPerBlock = _totalRewards / _blocksDuration;
    bonusEndBlock = _startBlock + _blocksDuration;

    return (rewardsPerBlock, bonusEndBlock);
  }

}