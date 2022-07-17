// SPDX-License-Identifier: HORNEY

pragma solidity ^0.8.0;

interface IRewardPool {
    struct UserInfo {
        uint256 amount;    
        uint256 rewardDebt; 
    }

    function bonusEndBlock() external view returns (uint256);

    function userInfo(address) external view returns (UserInfo memory);

    function STAKE_TOKEN() external view returns (address);

    // Legacy Stake Token Function
    function stakeToken() external view returns (address);
}
