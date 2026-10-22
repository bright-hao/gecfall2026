// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// A minimal repair of the Q6 example: debit before calling the recipient.
contract SafeVault {
    mapping(address => uint256) public deposits;
    bool private entered;

    function depositMoney() external payable {
        deposits[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(!entered, "reentrant call");
        require(deposits[msg.sender] >= amount, "insufficient deposit");
        entered = true;
        deposits[msg.sender] -= amount;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Ether transfer failed");
        entered = false;
    }
}
