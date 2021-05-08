// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./BEP20.sol";

contract MockBEP20 is BEP20 {
    
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 supply_
    ) BEP20(name_, symbol_) {
        _mint(msg.sender, supply_);

    }
}