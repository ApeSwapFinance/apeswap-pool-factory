const { expectRevert, time, ether, BN } = require('@openzeppelin/test-helpers');
const { accounts, contract } = require('@openzeppelin/test-environment');
const { expect } = require('chai');

// Load compiled artifacts
const BEP20RewardApeV4 = contract.fromArtifact('BEP20RewardApeV4');
const MockBEP20 = contract.fromArtifact('MockBEP20');


describe('BEP20RewardApeV4', async function () {
    // NOTE: This is required because advanceBlockTo takes time
    this.timeout(10000);
    const [minter, admin, alice, bob, carol] = accounts;
    // pass `this` to add the standard variables to each block
    async function setupPool(that, { fillPool } = { fillPool: true }) {
        that.stakeToken = await MockBEP20.new('Stake Token', 'STAKE', ether('1000000'), { from: minter });
        that.rewardToken = await MockBEP20.new('Reward Token', 'REWARD', ether('1000000'), { from: minter });

        that.STARTING_BALANCE = {
            alice: ether('100000'),
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

        if (fillPool) {
            await that.rewardToken.transfer(
                that.rewardApe.address,
                that.REWARD_APE_DETAILS.rewardPerBlock.mul(new BN(that.BLOCK_DIFF)),
                { from: minter }
            )
        }
    }

    async function advanceBlocksAndUpdatePool(that, block) {
        // 1 more block will be minded with the pool update
        await time.advanceBlockTo(block - 1);
        await that.rewardApe.updatePool();
        // console.log(`advanceBlocksAndUpdatePool:: Expected ${block} / Actual ${await time.latestBlock()}`)
    }

    async function logCurrentBlock() {
        console.log({ currentBlock: (await time.latestBlock()).toString() })
    }

    describe('Unharvested Rewards ', async function () {
        const DEPOSIT_AMOUNT = ether('100');

        before(async () => {
            await setupPool(this);
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: alice })
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: bob })
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: carol })

            await this.rewardApe.deposit(DEPOSIT_AMOUNT, { from: alice })
            await this.rewardApe.deposit(DEPOSIT_AMOUNT, { from: bob });

            await advanceBlocksAndUpdatePool(this, this.REWARD_APE_DETAILS.startBlock + this.BLOCK_DIFF / 2)
        });

        it('should properly account for unharvested tokens halfway through pool length', async () => {
            const unharvestedRewards = await this.rewardApe.getUnharvestedRewards();
            expect(unharvestedRewards).to.be.bignumber.equal(this.REWARD_APE_DETAILS.rewardPerBlock.mul(new BN(this.BLOCK_DIFF / 2)))

        });


        it('should allow pool withdraw and transfer reward tokens', async () => {
            await advanceBlocksAndUpdatePool(this, this.REWARD_APE_DETAILS.endBlock);
            await this.rewardApe.withdraw(DEPOSIT_AMOUNT, { from: alice });

            const rewardBalance = await this.rewardToken.balanceOf(alice);
            expect(rewardBalance).to.be.bignumber.equal(ether('10'));
        });

        it('should properly account for unharvested rewards after withdraw', async () => {
            const unharvestedRewards = await this.rewardApe.getUnharvestedRewards();
            // This only works because two users deposited
            expect(unharvestedRewards).to.be.bignumber.equal(this.REWARD_APE_DETAILS.rewardPerBlock.mul(new BN(this.BLOCK_DIFF / 2)));
            const poolCalculatedRewardBalance = await this.rewardApe.rewardBalance();
            expect(poolCalculatedRewardBalance).to.be.bignumber.equal(this.REWARD_APE_DETAILS.rewardPerBlock.mul(new BN(this.BLOCK_DIFF / 2)));
        });

        it('should allow final pool withdraw and transfer reward tokens', async () => {
            await this.rewardApe.withdraw(DEPOSIT_AMOUNT, { from: bob });

            const rewardBalance = await this.rewardToken.balanceOf(bob);
            expect(rewardBalance).to.be.bignumber.equal(this.TOTAL_REWARDS.div(new BN('2')));

            const poolCalculatedRewardBalance = await this.rewardApe.rewardBalance();
            expect(poolCalculatedRewardBalance).to.be.bignumber.equal(ether('0'));

            const poolRewardBalance = await this.rewardToken.balanceOf(this.rewardApe.address);
            expect(poolRewardBalance).to.be.bignumber.equal(ether('0'));
        });
    });


    describe('Insufficient rewards ', async function () {
        const DEPOSIT_AMOUNT = ether('100');

        before(async () => {
            await setupPool(this, { fillPool: false });
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: alice })
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: bob })
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: carol })

            await this.rewardApe.deposit(DEPOSIT_AMOUNT, { from: alice })
            await this.rewardApe.deposit(DEPOSIT_AMOUNT, { from: bob });

            await advanceBlocksAndUpdatePool(this, this.REWARD_APE_DETAILS.startBlock + this.BLOCK_DIFF / 2)
        });

        it('should properly account for unharvested tokens halfway through pool length', async () => {
            const unharvestedRewards = await this.rewardApe.getUnharvestedRewards();
            expect(unharvestedRewards).to.be.bignumber.equal(this.REWARD_APE_DETAILS.rewardPerBlock.mul(new BN(this.BLOCK_DIFF / 2)))
        });


        it('should NOT allow pool withdraw due to low reward balance', async () => {
            await advanceBlocksAndUpdatePool(this, this.REWARD_APE_DETAILS.endBlock);
            await expectRevert(
                this.rewardApe.withdraw(DEPOSIT_AMOUNT, { from: alice }),
                'insufficient reward balance'
            )

            const rewardBalance = await this.rewardToken.balanceOf(alice);
            expect(rewardBalance).to.be.bignumber.equal(ether('0'));
        });

        it('should allow a user to emergency withdraw stake tokens', async () => {
            await this.rewardApe.emergencyWithdraw({ from: alice });

            const stakeBalance = await this.stakeToken.balanceOf(alice);
            expect(stakeBalance).to.be.bignumber.equal(this.STARTING_BALANCE.alice);
        });

        it('should NOT allow pool withdraw is not staked', async () => {
            await expectRevert(
                this.rewardApe.withdraw(DEPOSIT_AMOUNT, { from: carol }),
                'withdraw: not good'
            )
        });

        it('should allow a user to remove funds after rewards are filled', async () => {
            await this.rewardToken.transfer(
                this.rewardApe.address,
                this.REWARD_APE_DETAILS.rewardPerBlock.mul(new BN(this.BLOCK_DIFF)),
                { from: minter }
            )
            it('should NOT allow a user to remove more funds than deposited', async () => {
                await expectRevert(
                    this.rewardApe.withdraw(DEPOSIT_AMOUNT.add(ethers('1')), { from: bob }),
                    'withdraw: not good'
                )
            });

            await this.rewardApe.withdraw(DEPOSIT_AMOUNT, { from: bob });
            const rewardBalance = await this.rewardToken.balanceOf(bob);
            expect(rewardBalance).to.be.bignumber.equal(this.TOTAL_REWARDS.div(new BN('2')));

        });
    });
});

