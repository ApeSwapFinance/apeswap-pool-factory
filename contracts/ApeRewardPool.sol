// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

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
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import './InitOwnable.sol';
import './BEP20/IBEP20.sol';

// TODO: Change "BNB" to "Native" 
contract ApeRewardPool is Initializable, InitOwnable, ReentrancyGuard {
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
        uint256 accRewardTokenPerShare; // Accumulated Rewards per share, times 1e30. See below.
    }

    // The stake token
    IBEP20 public stakeToken;
    // The reward token
    IBEP20 public rewardToken;
    // 
    bool public isBNBRewardPool = false;


    // Balance of rewards in contract.
    uint256 public rewardBalance = 0;
    // Balance of rewards left to pay in contract.
    uint256 public rewardsLeftToPay = 0;
    // Reward tokens created per block.
    uint256 public rewardPerBlock = 0;
    // Keep track of number of tokens staked in case the contract earns reflect fees
    uint256 public totalStaked = 0;



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
    // participators
    address[] public addressList;

    event Harvest(address indexed user, uint256 amount);
    event Deposit(address indexed user, uint256 amount);
    event DepositRewards(uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event UpdateRewardPerBlock(uint256 amount);
    event UpdateBonusEndBlock(uint256 endBlock);
    event SkimStakeTokenFees(address indexed user, uint256 amount);
    event SkimRewardTokenFees(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event EmergencyRewardWithdraw(address indexed user, uint256 amount);
    event EmergencySweepWithdraw(address indexed user, IBEP20 indexed token, uint256 amount);

    /// @dev A factory is able to deploy this contract without constructor arguments, which then
    ///  calls initilize as the contstructor which can only be called once
    function initialize(
        IBEP20 _stakeToken,
        IBEP20 _rewardToken,
        uint256 _startBlock,
        uint256 _bonusEndBlock,
        address _owner
    ) public initializer {
        stakeToken = _stakeToken;
        rewardToken = _rewardToken;
        /// @dev address(0) turns this contract into a BNB staking pool
        if(address(rewardToken) == address(0)) {
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
        initOwnershipInternal(_owner);
    }

    /// @dev View function to see pending Reward on frontend.
    function pendingReward(address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[_user];
        uint256 accRewardTokenPerShare = pool.accRewardTokenPerShare;

        if (block.number > pool.lastRewardBlock && totalStaked != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            // token reward share of this pool
            uint256 tokenReward = multiplier.mul(rewardPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
            // Calculate the reward per lp staked
            accRewardTokenPerShare = accRewardTokenPerShare.add(tokenReward.mul(1e30).div(totalStaked));
        }
        // Multiply the user amount of staked tokens multiplied by the 
        return user.amount.mul(accRewardTokenPerShare).div(1e30).sub(user.rewardDebt);
    }

    /* Public Functions */

    /// @dev Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }

        /// @dev totalStaked may be less than the stake token balance of this contract because of 
        ///   reflect fees. With this approach, the reflect fees do not count towards rewards
        if (totalStaked == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 tokenReward = multiplier.mul(rewardPerBlock).mul(pool.allocPoint).div(totalAllocPoint);
        rewardsLeftToPay = rewardsLeftToPay.add(tokenReward);
        pool.accRewardTokenPerShare = pool.accRewardTokenPerShare.add(tokenReward.mul(1e30).div(totalStaked));
        pool.lastRewardBlock = block.number;
    }

    /// @dev  Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() external {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    /// @dev Harvest currently earned rewards
    function harvest() external nonReentrant {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[msg.sender];
        harvestInternal(msg.sender);
        /// @dev Set the user reward debt to the latest pool.accRewardTokenPerShare so rewards
        ///  cannot be double harvested
        user.rewardDebt = user.amount.mul(pool.accRewardTokenPerShare).div(1e30);
        
    }

    /// @dev Transfers pending rewards to address
    /// @notice This function does not do important updates to save on gas:
    ///  - update the users rewardDebt afterward 
    function harvestInternal(address _toHarvest) internal {
        updatePool(0);
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[_toHarvest];
        // If user.amount is zero then no rewards can be transferred 
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accRewardTokenPerShare).div(1e30).sub(user.rewardDebt);
            if(pending > 0) {
                if(rewardBalance > 0) {
                    if(pending > rewardBalance) {
                        safeTransferRewardInternal(_toHarvest, rewardBalance);
                        emit Harvest(_toHarvest, rewardBalance);
                    } else {
                        safeTransferRewardInternal(_toHarvest, pending);
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
    function deposit(uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[msg.sender];
        // Harvest senders rewards before their reward debt is updated below.
        harvestInternal(msg.sender);
        // Deposit stake tokens
        uint256 finalDepositAmount = 0;
        if(_amount > 0) {
            uint256 preStakeBalance = balanceOfStakeToken();
            stakeToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            if (userInfo[msg.sender].rewardDebt == 0) {
                addressList.push(address(msg.sender));
            }
            // Reflect tokens may remove a portion of the transfer for fees. This ensures only the
            //  amount deposited into the contract counds for staking
            finalDepositAmount = balanceOfStakeToken().sub(preStakeBalance);
            totalStaked = totalStaked.add(finalDepositAmount);
            user.amount = user.amount.add(finalDepositAmount);
        }
        /// @dev Set the user reward debt to the latest pool.accRewardTokenPerShare so rewards
        ///  cannot be double harvested
        user.rewardDebt = user.amount.mul(pool.accRewardTokenPerShare).div(1e30);

        emit Deposit(msg.sender, finalDepositAmount);
    }

    /// Withdraw rewards and/or staked tokens. Pass a 0 amount to withdraw only rewards 
    /// @param _amount The amount of staking tokens to withdraw
    function withdraw(uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "withdraw: not good");
        // Harvest senders rewards before their reward debt is updated below.
        harvestInternal(msg.sender);
        // Withdraw stake tokens
        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            stakeToken.safeTransfer(address(msg.sender), _amount);
            totalStaked = totalStaked.sub(_amount);
        }
        /// @dev Set the user reward debt to the latest pool.accRewardTokenPerShare so rewards
        ///  cannot be double harvested
        if(user.amount == 0) {
            user.rewardDebt = 69;
        } else {
            user.rewardDebt = user.amount.mul(pool.accRewardTokenPerShare).div(1e30);
        }

        emit Withdraw(msg.sender, _amount);
    }

    /// @notice Update the reward per block based on the endblock and current rewards in contract
    /// @dev This function is PUBLIC so that anyone can update the rewards per block. 
    ///   This may be useful for reflect tokens or other deviations
    function updateRewardPerBlockInternal() internal {
        uint256 nextRewardBlock = getNextRewardBlock();
        uint256 blockDiff = bonusEndBlock.sub(nextRewardBlock);
        if(blockDiff == 0) {
            rewardPerBlock = 0;
        } else {
            rewardPerBlock = availableRewards().div(blockDiff);
        }
        emit UpdateRewardPerBlock(rewardPerBlock);
    }

    /* Public View Functions */

    /// @dev Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        if (_to <= bonusEndBlock) {
            return _to.sub(_from);
        } else if (_from >= bonusEndBlock) {
            return 0;
        } else {
            return bonusEndBlock.sub(_from);
        }
    }

    // TEST BNB balance
    /// @dev Obtain number of reward tokens in this contract
    /// @return wei balace of contract
    function balanceOfRewardToken() public view returns (uint256) {
        if(isBNBRewardPool) {
            return address(this).balance;
        } else {
            // Return BEP20 balance
            return rewardToken.balanceOf(address(this));
        }
    }

    /// @dev Obtain number of stake tokens in this contract
    /// @return wei balace of contract
    function balanceOfStakeToken() public view returns (uint256) {
        // Return BEO20 balance
        return stakeToken.balanceOf(address(this));
    }

    /// @dev Amount of rewards that are left to be paid in the contract
    function availableRewards() public view returns (uint256) {
        return rewardBalance.sub(rewardsLeftToPay);
    }

    /// @dev Return the next block that rewards are available
    function getNextRewardBlock() public view returns (uint256) {
        uint256 currentBlock = block.number;
        if(startBlock > currentBlock) {
            return startBlock;
        } else if(currentBlock > bonusEndBlock) {
            return bonusEndBlock;
        } else {
            return currentBlock;
        }
    }

    /// @dev Obtain the reward token fees (if any) earned by reflect token
    function getRewardTokenFeeBalance() public view returns (uint256) {
        if(isSameTokenPool()) {
            // If the tokens are the same, then the combined balance will be returned
            return balanceOfRewardToken().sub(rewardBalance).sub(totalStaked);
        } else {
            return balanceOfRewardToken().sub(rewardBalance);
        }
    }

    /// @dev Obtain the stake token fees (if any) earned by reflect token
    function getStakeTokenFeeBalance() public view returns (uint256) {
        if(isSameTokenPool()) {
            // If the tokens are the same, then the combined balance will be returned
            return balanceOfStakeToken().sub(totalStaked).sub(rewardBalance);
        } else {
            return balanceOfStakeToken().sub(totalStaked);
        }
    }

    /* External Functions */
        /// @dev Check if this pool uses the same token for staking and rewards
    function isSameTokenPool() public view returns (bool) {
        return address(stakeToken) == address(rewardToken);
    }

    /// @dev Return the number of addresses that have participated in this pool
    function getAddressListLength() external view returns (uint256) {
        return addressList.length;
    }

    /// @dev Deposit BEP20 Rewards into contract
    function depositBEP20Rewards(uint256 _amount, bool extendEndBlock) external {
        require(!isBNBRewardPool, 'Cannot deposit BEP20 rewards into a BNB reward pool');
        require(_amount > 0, 'Deposit value must be greater than 0.');
        rewardBalance = rewardBalance.add(_amount);
        IBEP20(rewardToken).safeTransferFrom(address(msg.sender), address(this), _amount);
        if(extendEndBlock && rewardPerBlock > 0){
            uint256 additionalBlocks = _amount.div(rewardPerBlock);
            bonusEndBlock = bonusEndBlock.add(additionalBlocks);
        }
        updateRewardPerBlockInternal();
        emit DepositRewards(_amount);
    }

    /// @dev Deposit BNB Rewards into contract
    function depositBNBRewards(bool extendEndBlock) external payable {
        require(isBNBRewardPool, 'Cannot deposit BNB rewards into a BEP20 reward pool');
        require(msg.value > 0, 'Message has no BNB value to deposit into contract.');
        rewardBalance = rewardBalance.add(msg.value);
        if(extendEndBlock && rewardPerBlock > 0){
            uint256 additionalBlocks = msg.value.div(rewardPerBlock);
            bonusEndBlock = bonusEndBlock.add(additionalBlocks);
        } 
        updateRewardPerBlockInternal();

        emit DepositRewards(msg.value);
    }

    /* Internal Functions */

    /// @param _to address to send reward token to
    /// @param _amount value of reward token to transfer
    function safeTransferRewardInternal(address _to, uint256 _amount) internal {
        require(_amount <= rewardBalance, 'amount is greater than rewardBalance');
        rewardBalance = rewardBalance.sub(_amount);
        rewardsLeftToPay = rewardsLeftToPay.sub(_amount);
        
        if(isBNBRewardPool) {
            // Transfer BNB to address
            (bool success, ) = _to.call{gas: 23000, value: _amount}("");
            require(success, 'TransferHelper: BNB_TRANSFER_FAILED'); 
        } else {
            // Transfer BEP20 to address
            IBEP20(rewardToken).safeTransfer(_to, _amount);
        }
    }


    /* Owner Functions */
    
    /// @notice Update the block where rewards end
    /// @param  _bonusEndBlock The block when rewards will end
    function updateBonusEndBlock(uint256 _bonusEndBlock) external onlyOwner {
        require(_bonusEndBlock > getNextRewardBlock() && _bonusEndBlock > block.number, 'invalid bonusEndBlock');
        bonusEndBlock = _bonusEndBlock;
        updateRewardPerBlockInternal();
        emit UpdateBonusEndBlock(bonusEndBlock);
    }

    /* Emergency Functions */ 

    /// @dev Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw() external {
        UserInfo storage user = userInfo[msg.sender];
        stakeToken.safeTransfer(address(msg.sender), user.amount);
        totalStaked = totalStaked.sub(user.amount);
        user.amount = 0;
        user.rewardDebt = 69;
        emit EmergencyWithdraw(msg.sender, user.amount);
    }


    /// @dev Remove excess reward tokens earned by reflect fees
    function skimRewardTokenFees() external onlyOwner {
        uint256 rewardTokenFeeBalance = getRewardTokenFeeBalance();
        rewardToken.safeTransfer(msg.sender, rewardTokenFeeBalance);
        emit SkimRewardTokenFees(msg.sender, rewardTokenFeeBalance);
    }

    /// @dev Remove excess stake tokens earned by reflect fees
    function skimStakeTokenFees() external onlyOwner {
        uint256 stakeTokenFeeBalance = getStakeTokenFeeBalance();
        stakeToken.safeTransfer(msg.sender, stakeTokenFeeBalance);
        emit SkimStakeTokenFees(msg.sender, stakeTokenFeeBalance);
    }

    /// @notice A public function to sweep accidental BEP20 transfers to this contract. 
    ///   Tokens are sent to owner
    /// @param token The address of the BEP20 token to sweep
    function sweepToken(IBEP20 token) external onlyOwner {
        require(address(token) != address(stakeToken), "can not sweep stake token");
        require(address(token) != address(rewardToken), "can not sweep reward token");
        uint256 balance = token.balanceOf(address(this));
        token.safeTransfer(msg.sender, balance);
        emit EmergencySweepWithdraw(msg.sender, token, balance);
    }
}