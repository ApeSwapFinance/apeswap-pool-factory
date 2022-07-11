// SPDX-License-Identifier: HORNEY

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./Authorizable.sol";
import "./interfaces/IRewardPool.sol";

contract PoolManager is Authorizable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    EnumerableSet.AddressSet private fullPoolList;
    EnumerableSet.AddressSet private legacyPoolList;
    IERC20 public governanceToken;

    event AddPools(address[] pools, bool isLegacy);
    event AddPool(address pool, bool isLegacy);
    event RemovePools(address[] pools, bool isLegacy);
    event GovernanceTokenChange(IERC20 newGovernanceToken);

    constructor(IERC20 _governanceToken) {
        governanceToken = _governanceToken;
    }

    /*
        Write Functions - Permissioned
    */

    function addPool(address _pool, bool _isLegacy) public onlyAuthorized {
        if (_isLegacy) {
            if (!legacyPoolList.contains(_pool)) {
                legacyPoolList.add(_pool);
            }
        } else {
            if (!fullPoolList.contains(_pool)) {
                fullPoolList.add(_pool);
            }
        }

        emit AddPool(_pool, _isLegacy);
    }

    function addPools(address[] calldata _pools, bool _isLegacy) public onlyAuthorized {
        if (_isLegacy) {
            for (uint i = 0; i < _pools.length; i++) { 
                if (!legacyPoolList.contains(_pools[i])) {
                    legacyPoolList.add(_pools[i]);
                }
            }
        } else {
            for (uint i = 0; i < _pools.length; i++) { 
                if (!fullPoolList.contains(_pools[i])) {
                    fullPoolList.add(_pools[i]);
                }
            }
        }

        emit AddPools(_pools, _isLegacy);
    }

    function removePools(address[] calldata _pools, bool _isLegacy) public onlyAuthorized {
        if (_isLegacy) {
            for (uint i = 0; i < _pools.length; i++) { 
                legacyPoolList.remove(_pools[i]);
            }
        } else {
            for (uint i = 0; i < _pools.length; i++) { 
                fullPoolList.add(_pools[i]);
            }
        }

        emit RemovePools(_pools, _isLegacy);
    }

    function changeGovernanceToken(IERC20 _governanceToken) public onlyOwner {
        governanceToken = _governanceToken;

        emit GovernanceTokenChange(_governanceToken);
    }

    /*
        Read Functions - Public 
    */

    function allPools() external view returns (address[] memory) {
        return fullPoolList.values();
    }

    function allLegacyPools() external view returns (address[] memory) {
        return legacyPoolList.values();
    }

    function viewTotalGovernanceHoldings(address userAddress) external view returns (uint256) {
        uint256 stakedBalance;
        uint256 holdingBalance = governanceToken.balanceOf(userAddress);
        address[] memory activePools = this.allActivePools();
        
        for (uint256 i = 0; i < activePools.length; i++) { 
            IRewardPool pool = IRewardPool(activePools[i]);
            if (legacyPoolList.contains(activePools[i])) {
                if (pool.stakeToken() == address(governanceToken)) {
                    IRewardPool.UserInfo memory userInfo = pool.userInfo(userAddress);
                    uint256 stakedAmount = userInfo.amount;
                    stakedBalance += stakedAmount;
                }
            } else {
                if (pool.STAKE_TOKEN() == address(governanceToken)) {
                    IRewardPool.UserInfo memory userInfo = pool.userInfo(userAddress);
                    uint256 stakedAmount = userInfo.amount;
                    stakedBalance += stakedAmount;
                }
            }
        }

        return holdingBalance + stakedBalance;
    }

    function getActivePoolCount() external view returns (uint) {
        uint256 count = 0;

        for (uint256 i = 0; i < fullPoolList.length(); i++) { 
            address pool = fullPoolList.at(i);
            uint256 endBlock = IRewardPool(pool).bonusEndBlock();
            if (endBlock > block.number) {
                ++count;
            }
        }

        return count;
    }

    function allActivePools() external view returns (address[] memory) {
        address[] memory _activePoolList = new address[](this.getActivePoolCount());
        uint256 count = 0;

        for (uint256 i = 0; i < fullPoolList.length(); i++) { 
            address pool = fullPoolList.at(i);
            uint256 endBlock = IRewardPool(pool).bonusEndBlock();
            if (endBlock > block.number) {
                _activePoolList[count] = pool;
                ++count;
            }
        }

        return _activePoolList;
    }
}