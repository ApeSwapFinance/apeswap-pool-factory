// SPDX-License-Identifier: MIT

// solhint-disable-next-line compiler-version
pragma solidity ^0.8.0;

// TODO: Factory should be behind a proxy

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IApePair.sol";
import "./BEP20/IBEP20.sol";
import "./ApeRewardPool.sol";

contract ApeRewardPoolFactory is Ownable {
    bytes32 public constant INIT_CODE_PAIR_HASH =
        keccak256(abi.encodePacked(type(ApeRewardPool).creationCode));

    // BEP20 token used for fees
    IBEP20 public feeToken;
    // fee amount using feeToken decimals
    uint256 public feeAmount;
    // stake token whitelist
    mapping(address => bool) public stakeTokenWhitelist;

    // address of IApePairFactory to verify stake tokens are ApePair tokens
    address public apePairFactory;
    // burn address
    address constant burnAddress =
        address(0x000000000000000000000000000000000000dEaD);

    // array of stake tokens used in pools created by this factory
    address[] stakeTokens;
    // mappping to an array of pools that use a specific stake token
    mapping(address => address[]) public poolsOfStakeToken;
    // array of reward tokens used in pools created by this factory
    address[] rewardTokens;
    // mapping to an array of pools that use a specific reward token
    mapping(address => address[]) poolsOfRewardToken;
    // array of pools created by this factory
    address[] public allPools;


    event PoolCreated(
        address indexed stakeToken,
        address indexed rewardToken,
        address pool,
        uint256 numPools
    );
    event BurnFee(uint256 feeAmount);

    constructor(
        address apePairFactoryIn,
        IBEP20 feeTokenIn,
        uint256 feeAmountIn
    ) {
        apePairFactory = apePairFactoryIn;
        feeToken = feeTokenIn;
        feeAmount = feeAmountIn;
    }

    /// @dev Gets the number of pools created by this factory
    function getAllPoolsLength() external view returns (uint256) {
        return allPools.length;
    }

    // TEST: manually
    /// @dev Anyone can create a pool if they pay a fee in the required feeToken
    /// @notice msg.sender needs to approve this contract to transfer the feeToken
    function createPool(
        address stakeToken,
        address rewardToken,
        uint256 startBlock,
        uint256 endBlock
    ) external returns (address) {
        // TEST: verfiy that the stake token is an ApePair contract, feeToken or whitelist
        // feeToken staking is allowed 
        if (stakeToken != address(feeToken)) {
            // If not feeToken, check if stakeToken is whitelisted or the correct LP token
            require(
                stakeTokenWhitelist[stakeToken] ||
                    IApePair(stakeToken).factory() == apePairFactory,
                "ApePoolFactory: invalid stake token."
            );
        }
        burnFee();
        return
            createPoolInternal(stakeToken, rewardToken, startBlock, endBlock);
    }

    /// @dev Admin can create pools for free
    function createPoolByOwner(
        address stakeToken,
        address rewardToken,
        uint256 startBlock,
        uint256 endBlock
    ) external onlyOwner returns (address) {
        return
            createPoolInternal(stakeToken, rewardToken, startBlock, endBlock);
    }

    /// @dev Creates a new pool contract and captures the address for referencing
    function createPoolInternal(
        address stakeToken,
        address rewardToken,
        uint256 startBlock,
        uint256 endBlock
    ) internal returns (address) {
        // verify inputs
        require(
            startBlock > block.number,
            "ApePoolFactory: startBlock must be greater than block.now"
        );
        require(
            endBlock > startBlock,
            "ApePoolFactory: endBlock must be greather than endBlock"
        );
        require(
            stakeToken != address(0),
            "ApePoolFactory: stake token cannot be address(0)"
        );
        // If reward token is address(0) then it will reward BNB
        if (rewardToken != address(0)) {
            // TEST: revert? non-ERC-20 by calling .totalSupply()
            /// @dev verify that the reward token is a BEP20 contract
            IBEP20(rewardToken).totalSupply();
        }

        // create the pool contract
        address pool = address(new ApeRewardPool());
        // initalize the pool
        ApeRewardPool(pool).initialize(
            IBEP20(stakeToken),
            rewardToken,
            startBlock,
            endBlock
        );

        // add references
        if(poolsOfStakeToken[stakeToken].length == 0) {
            stakeTokens.push(stakeToken);
        }
        poolsOfStakeToken[stakeToken].push(pool);

        if(poolsOfRewardToken[rewardToken].length == 0) {
            rewardTokens.push(rewardToken);
        }
        poolsOfRewardToken[rewardToken].push(pool);

        allPools.push(pool);
        emit PoolCreated(stakeToken, rewardToken, pool, allPools.length);

        return pool;
    }

    /// @dev Return an array of stake tokens used in pools
    function getStakeTokens() external view returns (address[] memory) {
        return stakeTokens;
    }

    /// @dev Return an array of pools that use the stake token passed
    function getPoolsOfStakeToken(address stakeToken) external view returns (address[] memory) {
        return poolsOfStakeToken[stakeToken];
    }

    /// @dev Return an array of reward tokens used in pools
    function getRewardTokens() external view returns (address[] memory) {
        return rewardTokens;
    }

    /// @dev Return an array of pools that use the reward token passed
    function getPoolsOfRewardToken(address rewardToken) external view returns (address[] memory) {
        return poolsOfRewardToken[rewardToken];
    }

    /// @dev Help function to get a block in the future from the current block
    function getBlockFromCurrent(uint256 offset) external view returns (uint256) {
        return block.number + offset;
    }

    /// @dev Send the feeAmount (if any) of feeToken to the burn address 
    function burnFee() internal {
        if(feeAmount == 0) return;
        // TEST: that the burn works
        feeToken.transferFrom(msg.sender, burnAddress, feeAmount);
        emit BurnFee(feeAmount);
    }

    /* Owner Functions */

    /// @dev Set the fee amount in feeToken decimals
    function setFee(uint256 newFeeAmount) external onlyOwner {
        feeAmount = newFeeAmount;
    }

    /// @dev Set the BEP20 feeToken
    function setFeeToken(IBEP20 newFeeToken) external onlyOwner {
        // TEST: that this check works by testing if it's a BEP20
        newFeeToken.totalSupply();
        feeToken = newFeeToken;
    }

    /// @dev Set the apePairFactory address
    function setApePairFactory(address newApePairFactory) external onlyOwner {
        apePairFactory = newApePairFactory;
    }

    /// @dev Set whitelist status for a stake token
    function setWhitelistForStakeToken(address stakeToken, bool newWhitelistSetting) external onlyOwner {
        stakeTokenWhitelist[stakeToken] = newWhitelistSetting;
    }
}
