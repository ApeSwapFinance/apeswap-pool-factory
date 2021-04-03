const { expectRevert, time, ether, BN } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');
const ApeRewardPoolFactory = artifacts.require('ApeRewardPoolFactory');
const ApeRewardPool = artifacts.require('ApeRewardPool');
const MockBEP20 = artifacts.require('libs/MockBEP20');

// NOTE: 
// TEST: 
// async function time.advanceBlockTo(target)
// Forces blocks to be mined until the the target block height is reached.

// async function time.latest()
// Returns the timestamp of the latest mined block. Should be coupled with advanceBlock to retrieve the current blockchain time.

// async function time.latestBlock()

function bigNumberDetails(bn) {
  // return BN_.div(new BN(10**decimals));
  const bnString = bn.toString();
  return [bnString, bnString.length]
}

const apePairFactory = '0x000000000000000000000000000000000000dEaD';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function isAlmostEqual(bnOne, bnTwo, variance = '10000') {
  const bnDiff = (bnOne.sub(bnTwo)).abs();
  assert.isTrue(bnDiff.lte(new BN(variance)), `isAlmostEqual: bnOne ${bnOne.toString()} and bnTwo ${bnTwo.toString()} have a greater variance than ${variance} `)
}


contract('ApeReardPoolFactory', async ([alice, bob, admin, dev, minter]) => {
  beforeEach(async () => {
    this.BEP20RewardPools = [];
    this.BNBRewardPools = [];

    this.feeToken = await MockBEP20.new('Fee Token', 'FEE', ether('1000'), {
      from: minter
    });
    this.rewardToken = await MockBEP20.new('Reward Token', 'Reward', ether('1000'), {
      from: minter,
    });

    const currentBlock = (await time.latestBlock()).toNumber();
    const startBlock = currentBlock + 100;
    const endBlock = startBlock + 1000;

    // address apePairFactoryIn,
    // IBEP20 feeTokenIn,
    // uint256 feeAmountIn
    this.apeRewardPoolFactory = await ApeRewardPoolFactory.new(
      apePairFactory,
      this.feeToken.address,
      '5000000000000000000000', // 5000
      { from: minter }
    );

    const stakeToken = this.feeToken.address;
    const rewardToken = this.rewardToken.address;

    // Create BEP20 Pool
    let tx = await this.apeRewardPoolFactory.createPoolByOwner(stakeToken, rewardToken, startBlock, endBlock, { from: minter });
    console.dir(tx, { depth: 3 })

    let poolAddress = await this.apeRewardPoolFactory.allPools(0);
    console.log({ poolAddress });

    let apeRewardPool = await ApeRewardPool.at(poolAddress);
    this.BEP20RewardPools.push(apeRewardPool);

    let poolStakeToken = await apeRewardPool.stakeToken();
    console.log({ poolStakeToken });

    let poolRewardToken = await apeRewardPool.rewardToken();
    console.log({ poolRewardToken });

    let isBNBRewardPool = await apeRewardPool.isBNBRewardPool();
    console.log({ isBNBRewardPool });

    // Create BNB Pool
    tx = await this.apeRewardPoolFactory.createPoolByOwner(stakeToken, ZERO_ADDRESS, startBlock, endBlock, { from: minter });
    console.dir(tx, { depth: 3 })

    poolAddress = await this.apeRewardPoolFactory.allPools(1);
    console.log({ poolAddress });

    apeRewardPool = await ApeRewardPool.at(poolAddress);
    this.BNBRewardPools.push(apeRewardPool);

    poolStakeToken = await apeRewardPool.stakeToken();
    console.log({ poolStakeToken });

    poolRewardToken = await apeRewardPool.rewardToken();
    console.log({ poolRewardToken });

    isBNBRewardPool = await apeRewardPool.isBNBRewardPool();
    console.log({ isBNBRewardPool });
  });

  // TODO: Test despoit and reward per block update after
  // TODO: Test endblock update and reward per block update after
  it('ApeRewardPool general functions...', async () => {
    it('owner functions...', async () => {


    });

  });

  async function multiTestRewardPerBlock(rewardPoolContract, runs = 5) {

    for (let test = 0; test < runs; test++) {
      await testRewardPerBlock(rewardPoolContract);

      let bonusEndBlock = await rewardPoolContract.bonusEndBlock();
      await rewardPoolContract.updateBonusEndBlock(bonusEndBlock.add(new BN('1000')), { from: minter });
    }

  }

  async function testRewardPerBlock(rewardPoolContract) {
    // TODO: can check against the balance of the ERC-20 contract/BNB balance of the pool
    let rewardBalance = await rewardPoolContract.rewardBalance();
    console.log(bigNumberDetails(rewardBalance))

    let availableRewards = await rewardPoolContract.availableRewards();
    console.log(bigNumberDetails(availableRewards))

    let rewardsLeftToPay = await rewardPoolContract.rewardsLeftToPay();
    console.log(bigNumberDetails(rewardsLeftToPay))

    let rewardPerBlock = await rewardPoolContract.rewardPerBlock();
    console.log(bigNumberDetails(rewardPerBlock));

    let getNextRewardBlock = await rewardPoolContract.getNextRewardBlock();
    console.log(bigNumberDetails(getNextRewardBlock));

    let bonusEndBlock = await rewardPoolContract.bonusEndBlock();
    let totalRewardsToPay = rewardPerBlock.mul(bonusEndBlock.sub(getNextRewardBlock));
    console.log(bigNumberDetails(bonusEndBlock));

    isAlmostEqual(totalRewardsToPay, availableRewards);
    // isAlmostEqual(totalRewardsToPay.toString(), availableRewards.toString(), `Total calculated rewards ${totalRewardsToPay.toString()} do not equal available rewards ${availableRewards.toString()}`);
  }


  it('BNB Rewards...', async () => {
    let BNBRewardPool = this.BNBRewardPools[0];

    await BNBRewardPool.depositBNBRewards({ from: minter, value: ether('1') });
    await multiTestRewardPerBlock(BNBRewardPool);

    await BNBRewardPool.depositBNBRewards({ from: minter, value: ether('2') });
    await multiTestRewardPerBlock(BNBRewardPool);
  });

  it('BEP20 Rewards...', async () => {
    let BEP20RewardPool = this.BEP20RewardPools[0];

    await this.rewardToken.approve(BEP20RewardPool.address, ether('1000000000000000000'), { from: minter });

    await BEP20RewardPool.depositBEP20Rewards(ether('100'), { from: minter });
    await multiTestRewardPerBlock(BEP20RewardPool);

    await BEP20RewardPool.depositBEP20Rewards(ether('200'), { from: minter });
    await multiTestRewardPerBlock(BEP20RewardPool);
  });
});
