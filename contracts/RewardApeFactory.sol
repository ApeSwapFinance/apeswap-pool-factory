// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./BEP20RewardApeV4.sol";
import "./interfaces/IPoolManager.sol";

contract RewardApeFactory is Ownable {
  address public defaultOwner;
  IPoolManager public poolManager;

  event DeployedPoolContract(
      address indexed pool,
      address stakeToken,
      address rewardToken,
      uint256 rewardPerBlock,
      uint256 startBlock,
      uint256 bonusEndBlock,
      address owner);

  constructor (address _defaultOwner, IPoolManager _poolManager) {
    defaultOwner = _defaultOwner;
    poolManager = _poolManager;
  }

  function deployDefaultPoolContract(
        IERC20 _stakeToken,
        IERC20 _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _startBlock,
        uint256 _bonusEndBlock) public {
    deployPoolContract(_stakeToken, _rewardToken, _rewardPerBlock, _startBlock, _bonusEndBlock, defaultOwner);
  }

  function deployPoolContract(
        IERC20 _stakeToken,
        IERC20 _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _startBlock,
        uint256 _bonusEndBlock,
        address _owner) public onlyOwner {
    BEP20RewardApeV4 pool = new BEP20RewardApeV4();

    pool.initialize(_stakeToken, _rewardToken, _rewardPerBlock, _startBlock, _bonusEndBlock);

    pool.transferOwnership(_owner);

    poolManager.addPool(address(pool), false);

    emit DeployedPoolContract(address(pool), address(_stakeToken), address(_rewardToken), _rewardPerBlock, _startBlock, _bonusEndBlock, _owner);
  }

  function deployComputedPoolContract(
        IERC20 _stakeToken,
        IERC20 _rewardToken,
        uint256 _startBlock,
        uint256 _blocksDuration,
        uint256 _totalRewards,
        address _owner) public {
    (uint256 rewardPerBlock, uint256 bonusEndBlock) = calculatedConfig(_totalRewards, _startBlock, _blocksDuration);
    deployPoolContract(_stakeToken, _rewardToken, rewardPerBlock, _startBlock, bonusEndBlock, _owner);
  }

  function calculatedConfig(
    uint256 _totalRewards,
    uint256 _startBlock,
    uint256 _blocksDuration) public pure returns (uint256 rewardsPerBlock, uint256 bonusEndBlock) {

    rewardsPerBlock = _totalRewards / _blocksDuration;
    bonusEndBlock = _startBlock + _blocksDuration;

    return (rewardsPerBlock, bonusEndBlock);
  }

  function updateDeafultOwner(address _defaultOwner) public onlyOwner {
    defaultOwner = _defaultOwner;
  }

  function updatePoolManager(IPoolManager _poolManager) public onlyOwner {
    poolManager = _poolManager;
  }

}