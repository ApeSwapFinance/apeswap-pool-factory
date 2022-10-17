const { expectRevert, time, ether, BN } = require('@openzeppelin/test-helpers');
const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { expect } = require('chai');

// Load compiled artifacts
const ERC20RewardApeV1 = contract.fromArtifact('ERC20RewardApeV1');
const MockBEP20 = contract.fromArtifact('MockBEP20');

describe('ERC20RewardApeV1', async function () {
    // NOTE: This is required because advanceBlockTo takes time
    this.timeout(10000);
    const [minter, admin, alice, bob, carol] = accounts;
    // pass `this` to add the standard variables to each block
    async function setupPool(that, native, { fillPool } = { fillPool: true }) {
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

        that.TIME_DIFF = 100;

        const startTime = (await time.latest()).toNumber() + 10;

        that.REWARD_APE_DETAILS = {
            stakeToken: that.stakeToken.address,
            rewardToken: native ? "0x0000000000000000000000000000000000000000" : that.rewardToken.address,
            rewardPerSecond: ether('.2'),
            startTime: startTime,
            endTime: startTime + that.TIME_DIFF,
        }

        that.TOTAL_REWARDS = that.REWARD_APE_DETAILS.rewardPerSecond.mul(new BN(that.TIME_DIFF));

        that.rewardApe = await ERC20RewardApeV1.new({ from: admin });
        await that.rewardApe.initialize(
            that.REWARD_APE_DETAILS.stakeToken,
            that.REWARD_APE_DETAILS.rewardToken,
            that.REWARD_APE_DETAILS.rewardPerSecond,
            that.REWARD_APE_DETAILS.startTime,
            that.REWARD_APE_DETAILS.endTime,
        )

        if (fillPool) {
            if (native) {
                await web3.eth.sendTransaction({ to: that.rewardApe.address, from: minter, value: that.REWARD_APE_DETAILS.rewardPerSecond.mul(new BN(that.TIME_DIFF)) })
            } else {
                await that.rewardToken.transfer(
                    that.rewardApe.address,
                    that.REWARD_APE_DETAILS.rewardPerSecond.mul(new BN(that.TIME_DIFF)),
                    { from: minter }
                )
            }
        }
    }

    async function advanceBlocksAndUpdatePool(that, newTimestamp) {
        await time.increaseTo(newTimestamp);
        await that.rewardApe.updatePool();
        // console.log(`advanceBlocksAndUpdatePool:: Expected ${block} / Actual ${await time.latest()}`)
    }

    async function logCurrentBlockTimestamp() {
        console.log({ currentBlockTimestamp: (await time.latest()).toString() })
    }

    describe('Unharvested Rewards ', async function () {
        const DEPOSIT_AMOUNT = ether('100');

        before(async () => {
            await setupPool(this, false);
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: alice })
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: bob })
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: carol })

            await this.rewardApe.depositTo(DEPOSIT_AMOUNT, alice, { from: alice })
            await this.rewardApe.depositTo(DEPOSIT_AMOUNT, bob, { from: bob });
            await advanceBlocksAndUpdatePool(this, this.REWARD_APE_DETAILS.startTime + this.TIME_DIFF / 2)
        });

        it('should properly account for unharvested tokens halfway through pool length', async () => {
            const unharvestedRewards = await this.rewardApe.getUnharvestedRewards();
            expect(unharvestedRewards).to.be.bignumber.equal(this.REWARD_APE_DETAILS.rewardPerSecond.mul(new BN(this.TIME_DIFF / 2)))
        });


        it('should allow pool withdraw and transfer reward tokens', async () => {
            await advanceBlocksAndUpdatePool(this, this.REWARD_APE_DETAILS.endTime);
            await this.rewardApe.withdraw(DEPOSIT_AMOUNT, { from: alice });

            const rewardBalance = await this.rewardToken.balanceOf(alice);
            expect(rewardBalance).to.be.bignumber.equal(ether('10'));
        });

        it('should properly account for unharvested rewards after withdraw', async () => {
            const unharvestedRewards = await this.rewardApe.getUnharvestedRewards();
            // This only works because two users deposited
            expect(unharvestedRewards).to.be.bignumber.equal(this.REWARD_APE_DETAILS.rewardPerSecond.mul(new BN(this.TIME_DIFF / 2)));
            const poolCalculatedRewardBalance = await this.rewardApe.rewardBalance();
            expect(poolCalculatedRewardBalance).to.be.bignumber.equal(this.REWARD_APE_DETAILS.rewardPerSecond.mul(new BN(this.TIME_DIFF / 2)));
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
            await setupPool(this, false, { fillPool: false });
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: alice })
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: bob })
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: carol })

            await this.rewardApe.depositTo(DEPOSIT_AMOUNT, alice, { from: alice })
            await this.rewardApe.depositTo(DEPOSIT_AMOUNT, bob, { from: bob });

            await advanceBlocksAndUpdatePool(this, this.REWARD_APE_DETAILS.startTime + this.TIME_DIFF / 2)
        });

        it('should properly account for unharvested tokens halfway through pool length', async () => {
            const unharvestedRewards = await this.rewardApe.getUnharvestedRewards();
            expect(unharvestedRewards).to.be.bignumber.equal(this.REWARD_APE_DETAILS.rewardPerSecond.mul(new BN(this.TIME_DIFF / 2)))
        });


        it('should NOT allow pool withdraw due to low reward balance', async () => {
            await advanceBlocksAndUpdatePool(this, this.REWARD_APE_DETAILS.endTime);
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
                this.REWARD_APE_DETAILS.rewardPerSecond.mul(new BN(this.TIME_DIFF)),
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

    describe('Unharvested Rewards Native', async function () {
        const DEPOSIT_AMOUNT = ether('100');

        before(async () => {
            await setupPool(this, true);
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: alice })
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: bob })
            await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: carol })

            await this.rewardApe.depositTo(DEPOSIT_AMOUNT, alice, { from: alice })
            await this.rewardApe.depositTo(DEPOSIT_AMOUNT, bob, { from: bob });
            await advanceBlocksAndUpdatePool(this, this.REWARD_APE_DETAILS.startTime + this.TIME_DIFF / 2)
        });

        it('should allow pool withdraw and transfer reward tokens', async () => {
            const rewardBalanceBefore = await web3.eth.getBalance(alice);
            await advanceBlocksAndUpdatePool(this, this.REWARD_APE_DETAILS.endTime);
            await this.rewardApe.withdraw(DEPOSIT_AMOUNT, { from: alice });

            const rewardBalanceAfter = await web3.eth.getBalance(alice);
            expect(new BN(rewardBalanceAfter).sub(new BN(rewardBalanceBefore)).add(ether('0.01'))).to.be.bignumber.greaterThan(ether('10'));
        });

        it('should allow final pool withdraw and transfer reward tokens', async () => {
            const rewardBalanceBefore = await web3.eth.getBalance(bob);
            await this.rewardApe.withdraw(DEPOSIT_AMOUNT, { from: bob });

            const rewardBalanceAfter = await web3.eth.getBalance(bob);
            expect(new BN(rewardBalanceAfter).sub(new BN(rewardBalanceBefore)).add(ether('0.01'))).to.be.bignumber.greaterThan(this.TOTAL_REWARDS.div(new BN('2')));

            const poolCalculatedRewardBalance = await this.rewardApe.rewardBalance();
            expect(poolCalculatedRewardBalance).to.be.bignumber.equal(ether('0'));

            const poolRewardBalance = await this.rewardToken.balanceOf(this.rewardApe.address);
            expect(poolRewardBalance).to.be.bignumber.equal(ether('0'));
        });
    });

    it('Should be able to deposit for someone else', async function () {
        const DEPOSIT_AMOUNT = ether('100');

        await setupPool(this, false, { fillPool: false });
        await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: alice })
        await this.stakeToken.approve(this.rewardApe.address, DEPOSIT_AMOUNT, { from: bob })

        await this.rewardApe.depositTo(DEPOSIT_AMOUNT, carol, { from: alice });
        await this.rewardApe.depositTo(DEPOSIT_AMOUNT, carol, { from: bob });

        const userInfoCarol = await this.rewardApe.userInfo(carol);
        expect(userInfoCarol.amount).to.be.bignumber.equal(ether("200"));
    });
});

