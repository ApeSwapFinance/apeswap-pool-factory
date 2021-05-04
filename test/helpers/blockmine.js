const { ether } = require('@openzeppelin/test-helpers');
const MockBEP20 = artifacts.require('libs/MockBEP20');

let mockBEP20 = undefined;

async function mineblocks(number = 1) {
    if(mockBEP20 === undefined) {
        mockBEP20 = await MockBEP20.new('Block Miner', 'MINE', ether('1'));
    }
    
    for (let index = 0; index < number; index++) {
        await mockBEP20.approve(`0x000000000000000000000000000000000000dead`, `0`);        
    }

    console.log(`Mined ${number} blocks!`)
}

module.exports = { mineblocks };