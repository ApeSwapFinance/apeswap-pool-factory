
function getNetworkConfig(network, accounts) {
    if(["bsc", "bsc-fork"].includes(network)) {
        console.log(`Deploying with BSC MAINNET config.`)
        return {
            apePairFactoryOwner: '0x6c905b4108A87499CEd1E0498721F2B831c6Ab13', // ApeSwap General Admin
            apePairFactory: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6', // Ape Factory
            feeToken: '0x603c7f932ED1fc6575303D8Fb018fDCBb0f39a95', // BANANA
            feeAmount: '10000000000000000000000', // 10,000 
        }
    } else if (['testnet', 'testnet-fork'].includes(network)) {
        console.log(`Deploying with BSC testnet config.`)
        return {
            apePairFactoryOwner: '0xE375D169F8f7bC18a544a6e5e546e63AD7511581', // ApeSwap Testnet
            apePairFactory: '0x152349604d49c2Af10ADeE94b918b051104a143E', // Ape Factory
            feeToken: '0x4Fb99590cA95fc3255D9fA66a1cA46c43C34b09a', // BANANA
            feeAmount: '0',
        }
    } else if (['development'].includes(network)) {
        console.log(`Deploying with development config.`)
        return {
            // TODO: Update values
            apePairFactoryOwner: '0x6c905b4108A87499CEd1E0498721F2B831c6Ab13', // ApeSwap General Admin (Trezor 2)
            apePairFactory: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6', // Ape Factory
            feeToken: '0x603c7f932ED1fc6575303D8Fb018fDCBb0f39a95', // BANANA
            feeAmount: '0', 
        }
    } else {
        throw new Error(`No config found for network ${network}.`)
    }
}

module.exports = { getNetworkConfig };
