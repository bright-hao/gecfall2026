# Assignment 3 Solidity lab

Run `npm install` and `npm run lab` to compile the contracts and reproduce the local results. The script creates `HelloWorld.abi.json`, `HelloWorld.creation.bin`, `HelloWorld.runtime.bin`, and `lab-results.json`. It deploys only to a disposable Ganache chain in memory. No wallet key, Sepolia ETH, or public RPC endpoint is required.

`StorageTest.sol` preserves the assignment's Solidity 0.5.1 program. `Dangerous.sol` preserves the intentionally vulnerable 0.4.24 program. `ReentrancyAttacker.sol` demonstrates the failure only against the local lab instance. `SafeVault.sol` shows a repaired withdrawal. `HelloWorld.sol` is the deployable answer for Question 5.

For Sepolia, deploy `HelloWorld.sol` with compiler 0.8.30 and optimization enabled. Save the contract address, deployment transaction hash, and transaction hash for calling `hello()` in the report after your own wallet is funded. The return value is available from an `eth_call` or Remix's read result; an ordinary transaction receipt does not include a return string.
