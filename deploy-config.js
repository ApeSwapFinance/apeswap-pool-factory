
function getNetworkConfig(network, accounts) {
    if (["bsc", "bsc-fork"].includes(network)) {
        console.log(`Deploying with ${network} config.`)
        return {
            // adminAddress: "0x6c905b4108a87499ced1e0498721f2b831c6ab13", // General Admin EOA
            adminAddress: "0x50Cf6cdE8f63316b2BD6AACd0F5581aEf5dD235D", // General Admin [BSC Safe Wallet]
            //In case you want to deploy a new poolmanager make sure you deploy the right one in deploy script.
            //You probable want V2 (with viewTotalGovernanceHoldings)
            poolManager: "0x36524d6A9FB579A0b046edfC691ED47C2de5B8bf",
        }
    } else if (['bsc-testnet', 'bsc-testnet-fork'].includes(network)) {
        console.log(`Deploying with ${network} config.`)
        return {
            adminAddress: "0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2",
            poolManager: "0x8977d569bAe2F74cBbAf8546B8f073714517E214",
        }
    } else if (['development'].includes(network)) {
        console.log(`Deploying with ${network} config.`)
        return {
            adminAddress: "",
            poolManager: "",
        }
    } else if (['polygon'].includes(network)) {
        console.log(`Deploying with ${network} config.`)
        return {
            adminAddress: "0x6c905b4108a87499ced1e0498721f2b831c6ab13",
            poolManager: "",
        }
    } else if (['bttc'].includes(network)) {
        console.log(`Deploying with ${network} config.`)
        return {
            adminAddress: "0x6c905b4108a87499ced1e0498721f2b831c6ab13",
            poolManager: "0x7AD6115A646D225A9486DC557f17021935b99147",
        }
    } else if (['tlos'].includes(network)) {
        console.log(`Deploying with ${network} config.`)
        return {
            adminAddress: "0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2",
            poolManager: "0xEe57c38d678CaE0cE16168189dB47238d8fe6553",
        }
    } else {
        throw new Error(`No config found for network ${network}.`)
    }
}

module.exports = { getNetworkConfig };
