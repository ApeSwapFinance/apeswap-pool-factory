const { BN } = require("@openzeppelin/test-helpers");

async function getUserSnapshot(rewardPoolContract, userAddress) {
  await rewardPoolContract.updatePool(0);
  const { amount, rewardDebt } = await rewardPoolContract.userInfo(userAddress);

  // TODO: add pendingReward(user)

  // FIXME: log
  console.log({ amount: amount.toString(), rewardDebt: rewardDebt.toString() });
}

async function getPoolSnapshot(rewardPoolContract) {
  await rewardPoolContract.updatePool(0);

  const snapshotFunctions = [
    "rewardPerBlock",
    "totalStaked",
    "totalStakeTokenBalance",
    "rewardsLeftToPay",
    "rewardsLeftToPay",
    "availableRewards",
    "getNextRewardBlock",
    "getStakeTokenFeeBalance",
    "getAddressListLength",
  ];

  let promises = [];
  let snapshot = {};

  for (const snapshotFunction of snapshotFunctions) {
    promises.push(
      rewardPoolContract[snapshotFunction]().then(
        (value) =>
          (snapshot = { ...snapshot, [snapshotFunction]: value.toString() })
      )
    );
  }

  promises.push(
    rewardPoolContract.poolInfo(0).then(
      (value) =>
        (snapshot = {
          ...snapshot,
          poolLastRewardBlock: value.lastRewardBlock.toString(),
          poolAccRewardTokenPerShare: value.accRewardTokenPerShare.toString(),
        })
    )
  );

  await Promise.all(promises);

  snapshot.estimatedBlocksFromRewardPayout = new BN(snapshot.rewardsLeftToPay)
    .div(new BN(snapshot.rewardPerBlock))
    .toString();

  // FIXME: log
  console.dir({ snapshot });

  return snapshot;
}

// TODO:
async function evaluateSnapshots(snapshotA, snapshotB) {
  const blockDiffBN = new BN(snapshotB.getNextRewardBlock).sub(
    new BN(snapshotA.getNextRewardBlock)
  );

  const estimatedRewardsBN = blockDiffBN.mul(
    new BN().div(new BN(snapshotA.rewardPerBlock))
  );

  // FIXME:
  console.dir({
    blockDiff: blockDiffBN.toString(),
    estimatedRewardsBN: estimatedRewardsBN.toString(),
  });
}

module.exports = { getUserSnapshot, getPoolSnapshot, evaluateSnapshots };
