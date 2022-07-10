const { expectRevert, time, ether, BN } = require('@openzeppelin/test-helpers');
const { accounts, contract } = require('@openzeppelin/test-environment');
const { expect } = require('chai');

// Load compiled artifacts
const BEP20RewardApeV4 = contract.fromArtifact('BEP20RewardApeV4');
const BEP20RewardApeV2 = contract.fromArtifact('BEP20RewardApeV2');
const MockBEP20 = contract.fromArtifact('MockBEP20');
const PoolManager = contract.fromArtifact('PoolManager');

describe('PoolManager', async function () {
    // NOTE: This is required because advanceBlockTo takes time
    this.timeout(10000);
    const [minter, admin, alice, bob, carol] = accounts;
    // pass `this` to add the standard variables to each block
    async function setupPool(that, { fillPool } = { fillPool: true }) {
        that.stakeToken = await MockBEP20.new('Stake Token', 'STAKE', ether('1000000'), { from: minter });
        that.rewardToken = await MockBEP20.new('Reward Token', 'REWARD', ether('1000000'), { from: minter });
        that.poolManager = await PoolManager.new({ from: admin });

        that.STARTING_BALANCE = {
            alice: ether('200000'),
            bob: ether('100000'),
            carol: ether('100000'),
        }

        await that.stakeToken.transfer(alice, that.STARTING_BALANCE.alice, { from: minter });
        await that.stakeToken.transfer(bob, that.STARTING_BALANCE.bob, { from: minter });
        await that.stakeToken.transfer(carol, that.STARTING_BALANCE.carol, { from: minter });

        that.BLOCK_DIFF = 100;

        const startBlock = (await time.latestBlock()).toNumber() + 10;

        that.REWARD_APE_DETAILS = {
            stakeToken: that.stakeToken.address,
            rewardToken: that.rewardToken.address,
            rewardPerBlock: ether('.2'),
            startBlock: startBlock,
            endBlock: startBlock + that.BLOCK_DIFF,
        }

        that.TOTAL_REWARDS = that.REWARD_APE_DETAILS.rewardPerBlock.mul(new BN(that.BLOCK_DIFF));

        that.rewardApe = await BEP20RewardApeV4.new({ from: admin });
        await that.rewardApe.initialize(
            that.REWARD_APE_DETAILS.stakeToken,
            that.REWARD_APE_DETAILS.rewardToken,
            that.REWARD_APE_DETAILS.rewardPerBlock,
            that.REWARD_APE_DETAILS.startBlock,
            that.REWARD_APE_DETAILS.endBlock,
        )

        that.rewardApe2 = await BEP20RewardApeV4.new({ from: admin });
        await that.rewardApe2.initialize(
            that.REWARD_APE_DETAILS.stakeToken,
            that.REWARD_APE_DETAILS.rewardToken,
            that.REWARD_APE_DETAILS.rewardPerBlock,
            that.REWARD_APE_DETAILS.startBlock,
            that.REWARD_APE_DETAILS.endBlock - 100,
        )

        that.rewardApe3 = await BEP20RewardApeV4.new({ from: admin });
        await that.rewardApe3.initialize(
            that.REWARD_APE_DETAILS.stakeToken,
            that.REWARD_APE_DETAILS.rewardToken,
            that.REWARD_APE_DETAILS.rewardPerBlock,
            that.REWARD_APE_DETAILS.startBlock,
            that.REWARD_APE_DETAILS.endBlock,
        )

        that.rewardApe4 = await BEP20RewardApeV2.new(
            that.REWARD_APE_DETAILS.stakeToken,
            that.REWARD_APE_DETAILS.rewardToken,
            that.REWARD_APE_DETAILS.rewardPerBlock,
            that.REWARD_APE_DETAILS.startBlock,
            that.REWARD_APE_DETAILS.endBlock,
            { from: admin }
        );

        that.rewardApe5 = await BEP20RewardApeV2.new(
            that.REWARD_APE_DETAILS.stakeToken,
            that.REWARD_APE_DETAILS.rewardToken,
            that.REWARD_APE_DETAILS.rewardPerBlock,
            that.REWARD_APE_DETAILS.startBlock,
            that.REWARD_APE_DETAILS.endBlock,
            { from: admin }
        );

        if (fillPool) {
            await that.rewardToken.transfer(
                that.rewardApe.address,
                that.REWARD_APE_DETAILS.rewardPerBlock.mul(new BN(that.BLOCK_DIFF)),
                { from: minter }
            )
            await that.rewardToken.transfer(
                that.rewardApe2.address,
                that.REWARD_APE_DETAILS.rewardPerBlock.mul(new BN(that.BLOCK_DIFF)),
                { from: minter }
            )
            await that.rewardToken.transfer(
                that.rewardApe3.address,
                that.REWARD_APE_DETAILS.rewardPerBlock.mul(new BN(that.BLOCK_DIFF)),
                { from: minter }
            )
            await that.rewardToken.transfer(
                that.rewardApe4.address,
                that.REWARD_APE_DETAILS.rewardPerBlock.mul(new BN(that.BLOCK_DIFF)),
                { from: minter }
            )
            await that.rewardToken.transfer(
                that.rewardApe5.address,
                that.REWARD_APE_DETAILS.rewardPerBlock.mul(new BN(that.BLOCK_DIFF)),
                { from: minter }
            )
        }

        that.poolManager.addPools([
            that.rewardApe.address, 
            that.rewardApe2.address, 
            that.rewardApe3.address,
            that.rewardApe4.address,
            that.rewardApe5.address
        ], false, {from: admin})

        that.poolManager.addPools([
            that.rewardApe4.address,
            that.rewardApe5.address
        ], true, {from: admin})
    }

    async function advanceBlocksAndUpdatePool(that, block) {
        // 1 more block will be minded with the pool update
        await time.advanceBlockTo(block - 1);
        await that.rewardApe.updatePool();
        // console.log(`advanceBlocksAndUpdatePool:: Expected ${block} / Actual ${await time.latestBlock()}`)
    }

    describe('Balances', async function () {
        const DEPOSIT_AMOUNT = ether('100');

        before(async () => {
            await setupPool(this);
            await this.stakeToken.approve(this.rewardApe.address, ether('100'), { from: alice })
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: bob })
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: carol })

            await this.stakeToken.approve(this.rewardApe4.address, ether('100'), { from: alice })

            await this.rewardApe.deposit(DEPOSIT_AMOUNT, { from: alice })
            await this.rewardApe.deposit(DEPOSIT_AMOUNT, { from: bob })
            await this.rewardApe4.deposit(DEPOSIT_AMOUNT, { from: alice })

            await advanceBlocksAndUpdatePool(this, this.REWARD_APE_DETAILS.startBlock + this.BLOCK_DIFF / 2)
        });

        it('should properly account for how rock hard I am that this is working', async () => {
            try {
                const pools = await this.poolManager.allActivePools();
                console.log(pools);
            } catch (err) {
                console.log(err);
            }
        });

        it('should properly for voting power', async () => {
            try {
                for (let i = 0; i < 5; i++) {
                    let holdings = await this.poolManager.viewTotalHoldings(accounts[i], this.stakeToken.address);
                    console.log(holdings.toString());
                }
            } catch (err) {
                console.log(err);
            }
        });

        it('everyone should have 0 balances, besides minter', async () => {
            try {
                for (let i = 0; i < 5; i++) {
                    let holdings = await this.poolManager.viewTotalHoldings(accounts[i], this.rewardToken.address);
                    console.log(holdings.toString());
                }
            } catch (err) {
                console.log(err);
            }
        });
    });


});

