# Assignment 3 Solidity lab

Run `npm install` and `npm run lab` to compile the contracts and reproduce the local results. The script creates `HelloWorld.abi.json`, `HelloWorld.creation.bin`, `HelloWorld.runtime.bin`, and `lab-results.json`. It deploys only to a disposable Ganache chain in memory. No wallet key, Sepolia ETH, or public RPC endpoint is required.

`StorageTest.sol` preserves the assignment's Solidity 0.5.1 program. `Dangerous.sol` preserves the intentionally vulnerable 0.4.24 program. `ReentrancyAttacker.sol` demonstrates the failure only against the local lab instance. `SafeVault.sol` shows a repaired withdrawal. `HelloWorld.sol` is the deployable answer for Question 5.

`HelloWorld.sol` was deployed to Sepolia with compiler 0.8.30 and optimization enabled. See `deployment-sepolia.json` for the public wallet, faucet transfer, contract address, deployment and `hello()` transaction hashes, and verified return value. The return value is available from an `eth_call` or Remix's read result; an ordinary transaction receipt does not include a return string.

To reproduce the public deployment with a new contract address, run `python -m http.server 8765` from this directory and open `http://localhost:8765/deploy-sepolia.html` in a browser with an injected Ethereum wallet. The page checks Sepolia chain ID 11155111 and the expected wallet address, uses the compiled creation bytecode, requests wallet approval for deployment and for a separate `hello()` transaction, and displays the confirmed transaction hashes and decoded `eth_call` output. Never enter a private key or seed phrase into this page or the terminal.
