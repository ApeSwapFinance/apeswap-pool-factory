require('dotenv').config();
import { BN } from '@openzeppelin/test-helpers';
import { getDefaultProvider } from 'ethers'
import { Contract, PopulatedTransaction } from '@ethersproject/contracts'
import { writeJSONToFile } from './utils/files'
import { multicall, Call } from '@defifofum/multicall';
import BEP20RewardApeV4Build from '../build/contracts/BEP20RewardApeV4.json'

// NOTE: These files originate from 
// https://github.com/ApeSwapFinance/apeswap-frontend/tree/main/src/config/constants 
import pools from './constants/poolConfig';
import tokens from './constants/tokens';

const CHAIN_ID = 56;
const RPC_PROVIDER = 'https://bsc-dataseed1.binance.org';

(async function () {
    let poolAddresses = pools.reduce(function (filtered, pool) {
        if (pool.stakingToken.address[CHAIN_ID] == tokens.gnana.address[CHAIN_ID]) {
            console.log(`Adding pool id: ${pool.sousId}`);
            filtered.push(pool.contractAddress[CHAIN_ID]);
        }
        return filtered;
    }, []);

    console.log(poolAddresses)
    // setup multicall
    const callDataArray: Call[] = [];
    for (const poolAddress of poolAddresses) {
        callDataArray.push({
            address: poolAddress,
            functionName: 'getStakeTokenFeeBalance',
            params: []
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
        const returnedData = await multicall(RPC_PROVIDER, BEP20RewardApeV4Build.abi, callDataArray);
        // Pull addresses out of return data
        feeData = returnedData.map((dataArray, index) => {
            return {
                poolAddress: poolAddresses[index],
                bscscanUrl: `https://bscscan.com/address/${poolAddresses[index]}#readContract`,
                // Values are returned as an array for each return value. We are pulling out the singular balance variable here
                feeBalance: dataArray[0].toString(),
                tx: ''
            }
        });
    }

    const totalFees = feeData.reduce((totalFees, currentFee) => {
        return (new BN(totalFees).add(new BN(currentFee.feeBalance))).toString()
    }, '0')

    if(feeData.length) {
        await writeJSONToFile(__dirname + '/GNANA-SKIM', feeData);
        console.log(`Saved pairs to file. See ${feeData}.json`);
    }

    console.log(`Total pools: ${poolAddresses.length}.`);
    console.log(`Total Fees: ${totalFees}.`);
    


    process.exit(0);
}());

