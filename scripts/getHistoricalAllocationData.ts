require('dotenv').config();
import { getDefaultProvider } from 'ethers'
import { Contract, PopulatedTransaction } from '@ethersproject/contracts'
import { writeJSONToFile } from './utils/files'
import { multicall, Call, } from '@defifofum/multicall';
// MasterApe Details
import MasterApeBuild from './MasterApe.json'
const MASTER_APE_ADDRESS = '0x5c8D727b265DBAfaba67E050f2f739cAeEB4A6F9'
const MASTER_APE_DEPLOY_BLOCK = 4855343;
// RPC Provider: Archive Node
const RPC_PROVIDER = process.env.BSC_MAINNET_ARCHIVE_RPC;
// Other Constants
const BLOCKS_PER_DAY = 1200 * 24;
const MULTICALL_DEPLOY_BLOCK = 4855379;
const CUSTOM_MULTICALL_ADDRESS = '0xc7Ad54Ff5C04A6E39D8C874A021aB0E42C45dE81';

/**
 * This script is used to pull historical MasterApe Farm allocations by pool ID.
 * 
 * Configuration:
 * - Will need a BSC Archive node save in .env as `BSC_MAINNET_ARCHIVE_RPC`
 * - Multicall Contract address which was deployed when the MasterApe contract was or before 
 */
interface PoolInfo {
    lpToken: string;
    allocPoint: number;
    lastRewardBlock: number;
    accCakePerShare: string;
}


async function queryMasterApePoolAllocations(queryBlockTag: number | 'latest' = 'latest'): Promise<{ queryBlockTag: number | 'latest', poolInfo: PoolInfo[] }> {
    const provider = getDefaultProvider(RPC_PROVIDER);
    const masterApeContract = new Contract(MASTER_APE_ADDRESS, MasterApeBuild.abi, provider);

    const totalPools = await masterApeContract.poolLength({ blockTag: queryBlockTag });
    const totalAllocPoint = await masterApeContract.totalAllocPoint({ blockTag: queryBlockTag });

    // // setup multicall
    const callDataArray: Call[] = [];
    // Loop through each pid in the MasterApe
    for (let pid = 0; pid < totalPools; pid++) {
        callDataArray.push({
            address: MASTER_APE_ADDRESS,
            functionName: 'getPoolInfo',
            params: [pid]
        });
    }

    let poolInfo: PoolInfo[] = [];
    // send multicall data
    if (callDataArray.length) {
        const returnedData = await multicall(RPC_PROVIDER, MasterApeBuild.abi, callDataArray, { blockTag: queryBlockTag, customMulticallAddress: CUSTOM_MULTICALL_ADDRESS });
        // Pull addresses out of return data
        poolInfo = returnedData.map((dataArray, index) => {
            return {
                pid: index,
                lpToken: dataArray[0],
                allocPoint: dataArray[1].toNumber(),
                lastRewardBlock: dataArray[2].toNumber(),
                accCakePerShare: dataArray[3].toString(),
            }
        });
    }

    // console.dir({ poolInfo }, { depth: null });
    // console.log(`Total Allocation Points: ${totalAllocPoint}.`);
    // console.log(`Total pools: ${totalPools}.`);
    // console.log(`Total pools processed: ${poolInfo.length}.`);
    return {
        queryBlockTag,
        poolInfo,
    }
}

async function queryHistoricalData({ startBlock, offset = 1200 * 24, endBlock = 'latest' }: {
    startBlock: number;
    offset: number;
    endBlock: number | 'latest';
}) {
    let computedEndBlock = endBlock;
    if (computedEndBlock == 'latest') {
        const provider = getDefaultProvider(RPC_PROVIDER);
        let block = await provider.getBlock('latest');
        computedEndBlock = block.number;
    }
    const promises = [];
    const historicalData = {};
    let currentBlock = startBlock;
    while (true) {
        const currentPromise = queryMasterApePoolAllocations(currentBlock).then(({queryBlockTag, poolInfo}) => {
            historicalData[queryBlockTag] = poolInfo;
        }).catch(e => {
            console.error('Error running Pool Allocations')
        })
        promises.push(currentPromise);
        if (currentBlock === computedEndBlock) {
            break;
        } else {
            currentBlock += offset;
            currentBlock = currentBlock > computedEndBlock ? computedEndBlock : currentBlock;
        }
    }
    await Promise.all(promises);

    const fileName = 'poolInfo'
    console.log(`Writing data to ${fileName}.json`)
    await writeJSONToFile(__dirname + `/${fileName}`, historicalData);
}

(async function () {
    try {
        const deployConfig = {
            startBlock: MASTER_APE_DEPLOY_BLOCK > MULTICALL_DEPLOY_BLOCK ? MASTER_APE_DEPLOY_BLOCK : MULTICALL_DEPLOY_BLOCK,
            offset: BLOCKS_PER_DAY,
            endBlock: 'latest',
        }
        await queryHistoricalData(deployConfig as any);
        console.dir({deployConfig});
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}());
