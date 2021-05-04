const { expectRevert, time, ether, BN } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');
const ApeRewardPoolFactory = artifacts.require('ApeRewardPoolFactory');
const ApeRewardPool = artifacts.require('ApeRewardPool');
const MockBEP20 = artifacts.require('libs/MockBEP20');
const RBEP20 = artifacts.require('RBEP20');
const { getPoolSnapshot, getUserSnapshot, evaluateSnapshots } = require('./helpers/snapshot')
const { mineblocks } = require('./helpers/blockmine')

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

// TODO: This doesn't appear to work
this.includeTestNumber = 0;
this.currentTestNumber = 0;

contract('ApeReardPoolFactory', async ([alice, bob, admin, dev, minter]) => {
  afterEach(async () => {
    this.currentTestNumber++;
  });
  
  beforeEach(async () => {
    if(this.includeTestNumber && this.includeTestNumber !== this.currentTestNumber) {
      console.warning(`Skipping test number ${this.currentTestNumber}`);
      this.skip();
    }

    this.BEP20RewardPools = [];
    this.BNBRewardPools = [];

    this.feeTokenContract = await MockBEP20.new('Fee Token', 'FEE', ether('1000'), {
      from: minter
    });
    // Using the same stake token as fee token
    this.stakeTokenContract = this.feeTokenContract;
    this.rewardTokenContract = await MockBEP20.new('Reward Token', 'Reward', ether('1000'), {
      from: minter,
    });

    this.currentBlock = (await time.latestBlock()).toNumber();
    this.startBlock = this.currentBlock + 10;
    this.endBlock = this.startBlock + 1000;

    // address apePairFactoryIn,
    // IBEP20 feeTokenIn,
    // uint256 feeAmountIn
    this.apeRewardPoolFactory = await ApeRewardPoolFactory.new({ from: minter });
    await this.apeRewardPoolFactory.initialize(
      minter,
      apePairFactory,
      this.feeTokenContract.address,
      '5000000000000000000000', // 5000
      { from: minter }
    );

    this.stakeTokenAddress = this.feeTokenContract.address;
    this.rewardTokenAddress = this.rewardTokenContract.address;

    // Create BEP20 Pool
    let tx = await this.apeRewardPoolFactory.createPoolByOwner(this.stakeTokenAddress, this.rewardTokenAddress, this.startBlock, this.endBlock, { from: minter });
    // FIXME: log
    // console.dir(tx, { depth: 3 })

    let poolAddress = await this.apeRewardPoolFactory.allPools(0);
    console.log({ poolAddress });

    let apeRewardPool = await ApeRewardPool.at(poolAddress);
    this.BEP20RewardPools.push(apeRewardPool);

    let apeRewardPoolOwner = await apeRewardPool.owner();
    console.log({ apeRewardPoolOwner });

    let poolStakeToken = await apeRewardPool.stakeToken();
    console.log({ poolStakeToken });

    let poolRewardToken = await apeRewardPool.rewardToken();
    console.log({ poolRewardToken });

    let isBNBRewardPool = await apeRewardPool.isBNBRewardPool();
    console.log({ isBNBRewardPool });

    // Create BNB Pool
    tx = await this.apeRewardPoolFactory.createPoolByOwner(this.stakeTokenAddress, ZERO_ADDRESS, this.startBlock, this.endBlock, { from: minter });
    // FIXME: log
    // console.dir(tx, { depth: 3 })

    poolAddress = await this.apeRewardPoolFactory.allPools(1);
    console.log({ poolAddress });

    apeRewardPool = await ApeRewardPool.at(poolAddress);
    this.BNBRewardPools.push(apeRewardPool);

    apeRewardPoolOwner = await apeRewardPool.owner();
    console.log({ apeRewardPoolOwner });

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


  it('is BNB Rewards...', async () => {
    // TODO: test deposit (check user.amount and reward debt after)
    // TODO: test withdraw (check user.amount and reward debt after)
    // TODO: test harvest (check user.amount and reward debt after)
    let BNBRewardPool = this.BNBRewardPools[0];

    await BNBRewardPool.depositBNBRewards(false, { from: minter, value: ether('1') });
    await multiTestRewardPerBlock(BNBRewardPool);

    await BNBRewardPool.depositBNBRewards(false, { from: minter, value: ether('2') });
    await multiTestRewardPerBlock(BNBRewardPool);
  });

  it('is BEP20 Rewards...', async () => {
    // TODO: test deposit (check user.amount and reward debt after)
    // => Try with two different tokens, same tokens
    // - assert deposit amount === user.amount
    // - let blocks pass
    // - withdraw deposit amount
    // - assert balanceOf(user) === initialAmount && user.amount == 0 && rewardsLeftToPay === initialRewards - harvested rewards

    // TODO: test withdraw (check user.amount and reward debt after)
    // TODO: test harvest (check user.amount and reward debt after)
    // TODO: Reflect token test. Test skimStakeTokenFee and skimRewardTokenFee
    // TODO: Test skim BEP20 function? 
    let BEP20RewardPool = this.BEP20RewardPools[0];

    await this.rewardTokenContract.approve(BEP20RewardPool.address, ether('1000000000000000000'), { from: minter });

    await BEP20RewardPool.depositBEP20Rewards(ether('100'), false, { from: minter });
    await multiTestRewardPerBlock(BEP20RewardPool);

    await BEP20RewardPool.depositBEP20Rewards(ether('200'), false, { from: minter });
    await multiTestRewardPerBlock(BEP20RewardPool);
    
    
    
    // Transfer funds to alice
    await this.stakeTokenContract.transfer(alice, ether('10'), { from: minter});
    // Approve the reward pool to move stake tokens into the contract
    await this.stakeTokenContract.approve(BEP20RewardPool.address, ether('10'), { from: alice});
    await getUserSnapshot(BEP20RewardPool, alice);
    await getPoolSnapshot(BEP20RewardPool);
  
    await BEP20RewardPool.deposit( ether('1'), { from: alice });

    // FIXME: snapshot
    await getUserSnapshot(BEP20RewardPool, alice);
    const snapshotA = await getPoolSnapshot(BEP20RewardPool);
    await mineblocks(100);
    await getUserSnapshot(BEP20RewardPool, alice);
    await getPoolSnapshot(BEP20RewardPool);
    await BEP20RewardPool.deposit( ether('0'), { from: alice });
    await getUserSnapshot(BEP20RewardPool, alice);
    const snapshotB = await getPoolSnapshot(BEP20RewardPool);
    await evaluateSnapshots(snapshotA, snapshotB);
    await BEP20RewardPool.withdraw( ether('1'), { from: alice });
    await getUserSnapshot(BEP20RewardPool, alice);
    await getPoolSnapshot(BEP20RewardPool);




    // TODO: User A deposits
    // TODO: User B deposits 
    
  });

  it('is REP20 stake token...', async () => {
    // 10% tax fee (max)
    //   constructor(uint256 initialSupply, string memory nameIn, string memory symbolIn, uint8 decimalsIn, uint256 taxFeeIn) {
    this.rep20 = await RBEP20.new(ether('1000000000000000000'), 'Test REP20', 'TEST', 18, '1000', { from: minter });
    //   function excludeAccount(address account) external onlyOwner()
    this.rep20.excludeAccount(minter);

    const repStakeToken = this.rep20.address;
    const rewardToken = this.rewardTokenContract.address;
    let tx = await this.apeRewardPoolFactory.createPoolByOwner(repStakeToken, rewardToken, this.startBlock, this.endBlock, { from: minter });







    // TODO: Test deposit into the pool and the amount left in the pool after deposit

    // TODO: Test the stake token balance and stake token fee balance after doing 
    //   multiple transfers from minter to alice

    // TODO: Test skim stake token fees 
    //   - check skim token balance after
    //   - check stake token balance vs contract balance after

  });
});
