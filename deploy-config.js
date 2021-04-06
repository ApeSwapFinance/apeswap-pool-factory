
function getNetworkConfig(network, accounts) {
    if(["bsc", "bsc-fork"].includes(network)) {
        console.log(`Deploying with BSC MAINNET config.`)
        return {
            apePairFactory: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6', // Ape Factory
            feeToken: '0x603c7f932ED1fc6575303D8Fb018fDCBb0f39a95', // BANANA
            feeAmount: '10000000000000000000000', // 10,000 
        }
    } else if (['testnet', 'testnet-fork'].includes(network)) {
        console.log(`Deploying with BSC testnet config.`)
        return {
            // TODO: Update values
            apePairFactory: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6', // Ape Factory
            feeToken: '0x603c7f932ED1fc6575303D8Fb018fDCBb0f39a95', // BANANA
            feeAmount: '0',
        }
    } else if (['development'].includes(network)) {
        console.log(`Deploying with development config.`)
        return {
            // TODO: Update values
            apePairFactory: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6', // Ape Factory
            feeToken: '0x603c7f932ED1fc6575303D8Fb018fDCBb0f39a95', // BANANA
            feeAmount: '0', 
        }
    } else {
        throw new Error(`No config found for network ${network}.`)
    }
}

module.exports = { getNetworkConfig };
