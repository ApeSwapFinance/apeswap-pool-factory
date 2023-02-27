import "dotenv/config"
import { BN } from "@openzeppelin/test-helpers";
import { writeJSONToFile } from "./utils/files";
import { multicall, Call } from "@defifofum/multicall";
import BEP20RewardApeV4Build from "../build/contracts/BEP20RewardApeV4.json";
import { fetchPoolConfig } from "./utils/fetchPools";
import { formatEther } from "ethers/lib/utils";

const CHAIN_ID = 56;
const RPC_PROVIDER = "https://bsc-dataseed1.binance.org";

const gnanaNetworkConfig = {
  symbol: "GNANA",
  address: {
    "1": "",
    "56": "0xdDb3Bd8645775F59496c821E4F55A7eA6A6dc299",
    "97": "0xf693bDA9D3C56D5F9165c8633d9098e3C4Ae495A",
    "137": "",
  },
  decimals: 18,
  active: true,
};

(async function () {
  const pools = await fetchPoolConfig();
  let poolAddresses = pools.reduce(function (filtered, pool) {
    if (pool.stakingToken.address[CHAIN_ID] == gnanaNetworkConfig.address[CHAIN_ID]) {
      console.log(`Adding pool id: ${pool.sousId}`);
      filtered.push(pool.contractAddress[CHAIN_ID]);
    }
    return filtered;
  }, []);

  console.log(poolAddresses);
  // setup multicall fee read
  const callFeeDataArray: Call[] = [];
  for (const poolAddress of poolAddresses) {
    callFeeDataArray.push({
      address: poolAddress,
      functionName: "getStakeTokenFeeBalance",
      params: [],
    });
  }
  // setup multicall owner read
  const callOwnerDataArray: Call[] = [];
  for (const poolAddress of poolAddresses) {
    callOwnerDataArray.push({
      address: poolAddress,
      functionName: "owner",
      params: [],
    });
  }


  let feeData: {
    poolAddress: string;
    bscscanUrl: string;
    owner: string;
    feeBalance_Wei: string;
    feeBalance_Eth: string;
    tx: string;
  }[] = [];
  // send multicall data
  if (callFeeDataArray.length) {
    const returnedFeeData = await multicall(
      RPC_PROVIDER,
      BEP20RewardApeV4Build.abi,
      callFeeDataArray
    );
    const returnedOwnerData = await multicall(
      RPC_PROVIDER,
      BEP20RewardApeV4Build.abi,
      callOwnerDataArray
    );
    // Pull addresses out of return data
    feeData = returnedFeeData.map((dataArray, index) => {
      return {
        poolAddress: poolAddresses[index],
        bscscanUrl: `https://bscscan.com/address/${poolAddresses[index]}#readContract`,
        owner: returnedOwnerData[index][0],
        // Values are returned as an array for each return value. We are pulling out the singular balance variable here
        feeBalance_Wei: dataArray[0].toString(),
        feeBalance_Eth: formatEther(dataArray[0].toString()),
        tx: "",
      };
    });
  }

  const totalFees = feeData.reduce((totalFees, currentFee) => {
    return new BN(totalFees).add(new BN(currentFee.feeBalance_Wei)).toString();
  }, "0");

  if (feeData.length) {
    await writeJSONToFile(__dirname + "/GNANA-SKIM", feeData);
    console.log(`Saved pairs to file. See ${feeData}.json`);
  }

  console.log(`Total pools: ${poolAddresses.length}.`);
  console.log(`Total Fees Wei: ${totalFees}.`);
  console.log(
    `Total Fees Ether: ${formatEther(totalFees)}.`
  );

  process.exit(0);
})();
