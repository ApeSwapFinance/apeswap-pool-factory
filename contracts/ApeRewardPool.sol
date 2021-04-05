// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/*
 * ApeSwapFinance 
 * App:             https://apeswap.finance
 * Medium:          https://ape-swap.medium.com    
 * Twitter:         https://twitter.com/ape_swap 
 * Telegram:        https://t.me/ape_swap
 * Announcements:   https://t.me/ape_swap_news
 * GitHub:          https://github.com/ApeSwapFinance
 */

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './FactoryOwnable.sol';
import './BEP20/IBEP20.sol';

// TODO: add functionality to accurately calculate stake tokens values 
contract ApeRewardPool is Initializable, FactoryOwnable {
    using SafeMath for uint256;
    using SafeERC20 for IBEP20;

    // Info of each user.
    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
    }

    // Info of each pool.
    struct PoolInfo {
        IBEP20 lpToken;           // Address of LP token contract.
        uint256 allocPoint;       // How many allocation points assigned to this pool. Rewards to distribute per block.
        uint256 lastRewardBlock;  // Last block number that Rewards distribution occurs.
        uint256 accRewardTokenPerShare; // Accumulated Rewards per share, times 1e12. See below.
    }

    // The stake token
    IBEP20 public stakeToken;
    // The reward token
    address public rewardToken;
    // 
    bool public isBNBRewardPool = false;

    // Reward tokens created per block.
    uint256 public rewardPerBlock = 0;
    // Keep track of total rewards assigned
    uint256 internal totalRewards = 0;
    // Total Reward Debt 
    uint256 internal totalRewardDebt = 0;


    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping (address => UserInfo) public userInfo;
    // Total allocation poitns. Must be the sum of all allocation points in all pools.
    uint256 private totalAllocPoint = 0;
    // The block number when Reward mining starts.
    uint256 public startBlock;
	// The block number when mining ends.	
    uint256 public bonusEndBlock;

    event Harvest(address indexed user, uint256 amount);
    event Deposit(address indexed user, uint256 amount);
    event DepositRewards(uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event UpdateRewardPerBlock(uint256 amount);
    event UpdateBonusEndBlock(uint256 endBlock);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event EmergencyRewardWithdraw(address indexed user, uint256 amount);
    event EmergencySweepWithdraw(address indexed user, IBEP20 indexed token, uint256 amount);

    // TEST: this cannot be called twice
    function initialize(
        IBEP20 _stakeToken,
        address _rewardToken,
        uint256 _startBlock,
        uint256 _bonusEndBlock
    ) public initializer {
        stakeToken = _stakeToken;
        rewardToken = _rewardToken;
        // TEST: that address 0 works
        if(rewardToken == address(0)) {
            isBNBRewardPool = true;
        }
        startBlock = _startBlock;
        bonusEndBlock = _bonusEndBlock;

        // staking pool
        poolInfo.push(PoolInfo({
            lpToken: _stakeToken,
            allocPoint: 1000,
            lastRewardBlock: startBlock,
            accRewardTokenPerShare: 0
        }));

        totalAllocPoint = 1000;
        // TEST: that the proper factory is calling this
        transferFactoryInternal(_msgSender());
    }

    // View function to see pending Reward on frontend.
    function pendingReward(address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[_user];
        uint256 accRewardTokenPerShare = pool.accRewardTokenPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            // token reward share of this pool
            uint256 tokenReward = multiplier.mul(rewardPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
            // Calculate the reward per lp staked
            accRewardTokenPerShare = accRewardTokenPerShare.add(tokenReward.mul(1e12).div(lpSupply));
        }
        // Multiply the user amount of staked tokens multiplied by the 
        return user.amount.mul(accRewardTokenPerShare).div(1e12).sub(user.rewardDebt);
    }

    /* Public Functions */

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (lpSupply == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 tokenReward = multiplier.mul(rewardPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
        totalRewards = totalRewards.add(tokenReward);
        pool.accRewardTokenPerShare = pool.accRewardTokenPerShare.add(tokenReward.mul(1e12).div(lpSupply));
        pool.lastRewardBlock = block.number;
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    /// @dev Harvest currently earned rewards
    function harvest() external {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[msg.sender];
        updatePool(0);
        harvestInternal(msg.sender);
        /// @dev Set the user reward debt to the latest pool.accRewardTokenPerShare so rewards
        ///  cannot be double harvested
        user.rewardDebt = user.amount.mul(pool.accRewardTokenPerShare).div(1e12);
        
    }

    /// @dev Transfers pending rewards to address
    /// @notice This function does not do important updates to save on gas:
    ///  - update the pool before hand 
    ///  - update the users rewardDebt afterward 
    function harvestInternal(address _toHarvest) internal {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[_toHarvest];
        // If user.amount is zero then no rewards can be transferred 
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accRewardTokenPerShare).div(1e12).sub(user.rewardDebt);
            if(pending > 0) {
                uint256 currentRewardBalance = rewardBalance();
                if(currentRewardBalance > 0) {
                    if(pending > currentRewardBalance) {
                        _safeTransferReward(_toHarvest, currentRewardBalance);
                        emit Harvest(_toHarvest, currentRewardBalance);
                    } else {
                        _safeTransferReward(_toHarvest, pending);
                        emit Harvest(_toHarvest, pending);
                    }
                }
            }
        }
    }

    /// Deposit staking token into the contract to earn rewards. 
    /// @dev Since this contract needs to be supplied with rewards we are 
    ///  sending the balance of the contract if the pending rewards are higher
    /// @param _amount The amount of staking tokens to deposit
    function deposit(uint256 _amount) public {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[msg.sender];
        updatePool(0);
        // Harvest senders rewards before their reward debt is updated below.
        harvestInternal(msg.sender);
        // Deposit stake tokens
        uint256 finalDepositAmount = 0;
        if(_amount > 0) {
            uint256 preStakeBalance = totalStakeTokenBalance();
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            // Reflect tokens may remove a portion of the transfer for fees. This ensures only the
            //  amount deposited into the contract counds for staking
            finalDepositAmount = totalStakeTokenBalance().sub(preStakeBalance);
            totalStaked = totalStaked.add(finalDepositAmount);
            user.amount = user.amount.add(finalDepositAmount);
        }
        /// @dev Set the user reward debt to the latest pool.accRewardTokenPerShare so rewards
        ///  cannot be double harvested
        user.rewardDebt = user.amount.mul(pool.accRewardTokenPerShare).div(1e12);

        emit Deposit(msg.sender, _amount);
    }

    /// Withdraw rewards and/or staked tokens. Pass a 0 amount to withdraw only rewards 
    /// @param _amount The amount of staking tokens to withdraw
    function withdraw(uint256 _amount) public {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool(0);
        // Harvest senders rewards before their reward debt is updated below.
        harvestInternal(msg.sender);
        // Withdraw stake tokens
        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
        }
        /// @dev Set the user reward debt to the latest pool.accRewardTokenPerShare so rewards
        ///  cannot be double harvested
        user.rewardDebt = user.amount.mul(pool.accRewardTokenPerShare).div(1e12);

        emit Withdraw(msg.sender, _amount);
    }

    /// @notice Update the reward per block based on the endblock and current rewards in contract
    /// @dev This function is PUBLIC so that anyone can update the rewards per block. 
    ///   This may be useful for reflect tokens or other deviations
    function updateRewardPerBlock() public {
        uint256 blockDiff = bonusEndBlock.sub(getNextRewardBlock());
        rewardPerBlock = availableRewards().div(blockDiff);
        emit UpdateRewardPerBlock(rewardPerBlock);
    }

    /* Public View Functions */

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        if (_to <= bonusEndBlock) {
            return _to.sub(_from);
        } else if (_from >= bonusEndBlock) {
            return 0;
        } else {
            return bonusEndBlock.sub(_from);
        }
    }

    /// Obtain the reward balance of this contract
    /// @return wei balace of conract
    function rewardBalance() public view returns (uint256) {
        if(isBNBRewardPool) {
            // TEST: return BNB balance of this contract
            // Return BNB balance
            return payable(address(this)).balance;
        } else {
            // Return BEO20 balance
            return IBEP20(rewardToken).balanceOf(address(this));
        }
    }

    /// Get the amount of rewards that are left to be paid out
    function rewardsLeftToPay() public view returns (uint256) {
        return totalRewards.sub(totalRewardDebt);
    }

    /// Amount of rewards that are left to be paid in the contract
    function availableRewards() public view returns (uint256) {
        return rewardBalance().sub(rewardsLeftToPay());
    }

    function getNextRewardBlock() public view returns (uint256) {
        uint256 currentBlock = block.number;
        if(startBlock > currentBlock) {
            return startBlock;
        } else {
            return currentBlock;
        }
    }

    /* External Functions */

    // TEST: test
    // Deposit BEP20 Rewards into contract
    function depositBEP20Rewards(uint256 _amount) external {
        require(!isBNBRewardPool, 'Cannot deposit BEP20 rewards into a BNB reward pool');
        require(_amount > 0, 'Deposit value must be greater than 0.');
        IBEP20(rewardToken).safeTransferFrom(address(msg.sender), address(this), _amount);
        updateRewardPerBlock();
        emit DepositRewards(_amount);
    }

    // TEST:
    // Deposit BNB Rewards into contract
    function depositBNBRewards() external payable {
        require(isBNBRewardPool, 'Cannot deposit BNB rewards into a BEP20 reward pool');
        require(msg.value > 0, 'Message has no BNB value to deposit into contract.');
        // TEST that this updates the reward per block automatically
        updateRewardPerBlock();
        emit DepositRewards(msg.value);
    }

    /* Internal Functions */

    /// @param _to address to send reward token to
    /// @param _amount value of reward token to transfer
    function _safeTransferReward(address _to, uint256 _amount) internal {
        if(isBNBRewardPool) {
            // TEST: transfer BNB
            // Transfer BNB to address
            (bool success, ) = _to.call{gas: 23000, value: _amount}("");
            require(success, 'TransferHelper: BNB_TRANSFER_FAILED'); 
        } else {
            // Transfer BEP20 to address
            totalRewardDebt = totalRewardDebt.add(_amount);
            IBEP20(rewardToken).safeTransfer(_to, _amount);
        }
    }


    /* Owner Functions */
    
    /// @notice Update the block where rewards end
    /// @param  _bonusEndBlock The block when rewards will end
    function updateBonusEndBlock(uint256 _bonusEndBlock) external onlyFactoryOwner {
        require(_bonusEndBlock > getNextRewardBlock(), 'new bonus end block must be greater than the next reward block');
        bonusEndBlock = _bonusEndBlock;
        updateRewardPerBlock();
        emit UpdateBonusEndBlock(bonusEndBlock);
    }

    /* Emergency Functions */ 

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw() external {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[msg.sender];
        pool.lpToken.safeTransfer(address(msg.sender), user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
        emit EmergencyWithdraw(msg.sender, user.amount);
    }

    // Withdraw reward. EMERGENCY ONLY.
    function emergencyRewardWithdraw(uint256 _amount) external onlyFactoryOwner {
        require(_amount <= rewardBalance(), 'not enough rewards');
        // Withdraw rewards
        _safeTransferReward(address(msg.sender), _amount);
        emit EmergencyRewardWithdraw(msg.sender, _amount);
    }

    /// @notice A public function to sweep accidental BEP20 transfers to this contract. 
    ///   Tokens are sent to owner
    /// @param token The address of the BEP20 token to sweep
    function sweepToken(IBEP20 token) external onlyFactoryOwner {
        require(address(token) != address(stakeToken), "can not sweep stake token");
        uint256 balance = token.balanceOf(address(this));
        token.transfer(msg.sender, balance);
        emit EmergencySweepWithdraw(msg.sender, token, balance);
    }
}