import "dotenv/config"
import { BN } from "@openzeppelin/test-helpers";
import { writeJSONToFile } from "./utils/files";
import { multicall, Call } from "@defifofum/multicall";
import BEP20RewardApeV4Build from "../build/contracts/BEP20RewardApeV4.json";
import { fetchPoolConfig } from "./utils/fetchPools";

const CHAIN_ID = 56;
const RPC_PROVIDER = "https://bsc-dataseed1.binance.org";

const gnana = {
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
    if (pool.stakingToken.address[CHAIN_ID] == gnana.address[CHAIN_ID]) {
      console.log(`Adding pool id: ${pool.sousId}`);
      filtered.push(pool.contractAddress[CHAIN_ID]);
    }
    return filtered;
  }, []);

  console.log(poolAddresses);
  // setup multicall
  const callDataArray: Call[] = [];
  for (const poolAddress of poolAddresses) {
    callDataArray.push({
      address: poolAddress,
      functionName: "getStakeTokenFeeBalance",
      params: [],
    });
  }
  let feeData: {
    poolAddress: string;
    bscscanUrl: string;
    feeBalance: string;
    tx: string;
  }[] = [];
  // send multicall data
  if (callDataArray.length) {
    const returnedData = await multicall(
      RPC_PROVIDER,
      BEP20RewardApeV4Build.abi,
      callDataArray
    );
    // Pull addresses out of return data
    feeData = returnedData.map((dataArray, index) => {
      return {
        poolAddress: poolAddresses[index],
        bscscanUrl: `https://bscscan.com/address/${poolAddresses[index]}#readContract`,
        // Values are returned as an array for each return value. We are pulling out the singular balance variable here
        feeBalance: dataArray[0].toString(),
        tx: "",
      };
    });
  }

  const totalFees = feeData.reduce((totalFees, currentFee) => {
    return new BN(totalFees).add(new BN(currentFee.feeBalance)).toString();
  }, "0");

  if (feeData.length) {
    await writeJSONToFile(__dirname + "/GNANA-SKIM", feeData);
    console.log(`Saved pairs to file. See ${feeData}.json`);
  }

  console.log(`Total pools: ${poolAddresses.length}.`);
  console.log(`Total Fees Wei: ${totalFees}.`);
  console.log(
    `Total Fees: ${new BN(totalFees)
      .div(new BN("1000000000000000000"))
      .toString()}.`
  );

  process.exit(0);
})();
