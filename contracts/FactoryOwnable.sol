// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";

/// @dev helper interface for calling owner() of factory
interface IOwnable {
    function owner() external returns (address);
}

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (a factory) which the owner of said factory can be granted 
 * exclusive access to specific functions.
 *
 * By default, the factory account will be the one that deploys the contract. This
 * can later be changed with {transferFactory}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyFactoryOwner`, which can be applied to your functions to restrict their 
 * use to the owner of the factory.
 */
abstract contract FactoryOwnable is Context {
    IOwnable private _factory;

    event FactoryTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor () {
        address msgSender = _msgSender();
        // TEST: Test that this is the address creating this is the factory
        _factory = IOwnable(msgSender);
        emit FactoryTransferred(address(0), msgSender);
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function factory() public view virtual returns (IOwnable) {
        return _factory;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyFactoryOwner() {
        // TEST: That this function works
        require(factory().owner() == _msgSender(), "FactoryOwnable: caller is not the factory owner");
        _;
    }

    /**
     * @dev Transfers the factory of the contract to a new account (`newFactory`).
     * Can only be called by the current factory owner.
     */
    function transferFactory(address newFactory) public virtual onlyFactoryOwner {
        transferFactoryInternal(newFactory);
    }

        /**
     * @dev Transfers the factory of the contract to a new account (`newFactory`).
     * Can only be called by the current factory owner.
     */
    function transferFactoryInternal(address newFactory) internal virtual {
        require(newFactory != address(0), "Ownable: new owner is the zero address");
        emit FactoryTransferred(address(_factory), newFactory);
        _factory = IOwnable(newFactory);
    }
}
