// SPDX-License-Identifier: MIT
pragma solidity ^0.5.1;

// Source preserved from Assignment / Lab #3 for the 1 KiB storage experiment.
contract StorageTest {
    bytes32[] b;

    function put(bytes32[] memory _b) public {
        b = _b;
    }
}
