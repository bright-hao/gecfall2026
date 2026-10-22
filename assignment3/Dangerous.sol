// SPDX-License-Identifier: MIT
pragma solidity ^0.4.24;

// The contract in Assignment / Lab #3, intentionally vulnerable.
// LOCAL LAB ONLY: never deploy this contract with real funds.
contract Dangerous {
    mapping(address => uint) deposits;

    function depositMoney() public payable {
        deposits[msg.sender] += msg.value;
    }

    function withdraw(uint amount) public {
        require(deposits[msg.sender] >= amount);
        if (!msg.sender.call.value(amount)()) {
            revert();
        }
        deposits[msg.sender] -= amount;
    }
}
