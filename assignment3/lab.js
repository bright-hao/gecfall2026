// Local, deterministic evidence for Assignment / Lab #3.
// npm install; npm run lab
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createRequire } = require('module');
const localRequire = createRequire(path.join(__dirname, 'package.json'));
function dep(name) {
  try { return localRequire(name); }
  catch { return require(path.join(__dirname, '../../work/evm/node_modules', name)); }
}
const ethers = dep('ethers');
const ganache = dep('ganache');
const solc05 = dep('solc-051');
const solc04 = dep('solc-0424');
const solc08 = dep('solc-modern');

const source = name => fs.readFileSync(path.join(__dirname, name + '.sol'), 'utf8');
function compile(name, contractName, compiler, evmVersion) {
  const file = name + '.sol';
  const input = {language:'Solidity', sources:{[file]:{content:source(name)}},
    settings:{optimizer:{enabled:true,runs:200}, evmVersion,
      outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}}}};
  let raw;
  if (typeof compiler.compileStandardWrapper === 'function') raw = compiler.compileStandardWrapper(JSON.stringify(input));
  else if (typeof compiler.compileStandard === 'function') raw = compiler.compileStandard(JSON.stringify(input));
  else raw = compiler.compile(JSON.stringify(input));
  const result = JSON.parse(raw);
  const errors = (result.errors || []).filter(x => x.severity === 'error');
  if (errors.length) throw new Error(errors.map(x=>x.formattedMessage).join('\n'));
  const contract = result.contracts[file][contractName];
  assert(contract.evm.bytecode.object.length > 0);
  return contract;
}
async function deploy(compiled, signer, args=[]) {
  const factory = new ethers.ContractFactory(compiled.abi, '0x'+compiled.evm.bytecode.object, signer);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  return contract;
}
async function main() {
  const storageCompiled = compile('StorageTest','StorageTest',solc05,'constantinople');
  const helloCompiled = compile('HelloWorld','HelloWorld',solc08,'shanghai');
  const dangerousCompiled = compile('Dangerous','Dangerous',solc04,'byzantium');
  const attackerCompiled = compile('ReentrancyAttacker','ReentrancyAttacker',solc04,'byzantium');
  const safeCompiled = compile('SafeVault','SafeVault',solc08,'shanghai');
  fs.writeFileSync(path.join(__dirname,'HelloWorld.abi.json'), JSON.stringify(helloCompiled.abi,null,2)+'\n');
  fs.writeFileSync(path.join(__dirname,'HelloWorld.creation.bin'), helloCompiled.evm.bytecode.object+'\n');
  fs.writeFileSync(path.join(__dirname,'HelloWorld.runtime.bin'), helloCompiled.evm.deployedBytecode.object+'\n');

  const eip = ganache.provider({chain:{chainId:1337,hardfork:'shanghai'},
    wallet:{deterministic:true,totalAccounts:4,defaultBalance:1000},
    database:{dbPath:path.join(__dirname,'../../work/evm/ganache-db')},
    logging:{quiet:true}});
  const provider = new ethers.BrowserProvider(eip);
  const owner = await provider.getSigner(0);
  const victim = await provider.getSigner(1);

  const storage = await deploy(storageCompiled,owner);
  const words = Array.from({length:32},(_,i)=>'0x'+(i+1).toString(16).padStart(2,'0')+'00'.repeat(31));
  assert.equal(words.length*32,1024);
  const putTx = await storage.put(words);
  const putReceipt = await putTx.wait();
  assert.equal(putReceipt.status,1);
  const storedLength = await provider.getStorage(await storage.getAddress(),0);
  assert.equal(BigInt(storedLength),32n);
  for(let i=0;i<32;i++) {
    const slot = ethers.keccak256(ethers.zeroPadValue('0x00',32));
    const location = '0x'+(BigInt(slot)+BigInt(i)).toString(16).padStart(64,'0');
    assert.equal((await provider.getStorage(await storage.getAddress(),location)).toLowerCase(),words[i].toLowerCase());
  }
  const putCalldata = storage.interface.encodeFunctionData('put',[words]);

  const hello = await deploy(helloCompiled,owner);
  const helloResult = await hello.hello();
  assert.equal(helloResult,'Hello, world!');
  const helloTx = await owner.sendTransaction({to:await hello.getAddress(),data:hello.interface.encodeFunctionData('hello',[])});
  const helloReceipt = await helloTx.wait();
  assert.equal(helloReceipt.status,1);

  const dangerous = await deploy(dangerousCompiled,owner);
  await (await dangerous.connect(victim).depositMoney({value:ethers.parseEther('5')})).wait();
  const attacker = await deploy(attackerCompiled,owner,[await dangerous.getAddress()]);
  const attackReceipt = await (await attacker.attack({value:ethers.parseEther('1'),gasLimit:4000000})).wait();
  assert.equal(await provider.getBalance(await dangerous.getAddress()),0n);
  assert.equal(await provider.getBalance(await attacker.getAddress()),ethers.parseEther('6'));
  await (await attacker.sweep()).wait();
  assert.equal(await provider.getBalance(await attacker.getAddress()),0n);

  const safe = await deploy(safeCompiled,owner);
  await (await safe.connect(victim).depositMoney({value:ethers.parseEther('5')})).wait();
  const safeAttacker = await deploy(attackerCompiled,owner,[await safe.getAddress()]);
  let safeAttackReverted = false;
  try { await (await safeAttacker.attack({value:ethers.parseEther('1'),gasLimit:4000000})).wait(); }
  catch { safeAttackReverted = true; }
  assert(safeAttackReverted);
  assert.equal(await provider.getBalance(await safe.getAddress()),ethers.parseEther('5'));
  await (await safe.connect(victim).withdraw(ethers.parseEther('2'))).wait();
  assert.equal(await provider.getBalance(await safe.getAddress()),ethers.parseEther('3'));

  const results={
    environment:'Ganache 7.9.2 local EVM, Shanghai hardfork, chain ID 1337; no public-network transaction',
    compilers:{storage:solc05.version(),hello:solc08.version(),dangerous:solc04.version()},
    storage:{bytes:1024,words:32,initialSlotWrites:33,gasUsed:putReceipt.gasUsed.toString(),
      txHash:putReceipt.hash,calldataBytes:(putCalldata.length-2)/2,storageVerified:true},
    hello:{result:helloResult,creationBytes:helloCompiled.evm.bytecode.object.length/2,
      runtimeBytes:helloCompiled.evm.deployedBytecode.object.length/2,
      deploymentGas:(await hello.deploymentTransaction().wait()).gasUsed.toString(),
      transactionGas:helloReceipt.gasUsed.toString(), transactionLogs:helloReceipt.logs.length},
    reentrancy:{victimInitialEther:'5',attackerSeedEther:'1',
      attackGas:attackReceipt.gasUsed.toString(),victimFinalEther:'0',attackerBeforeSweepEther:'6',
      safeAttackReverted,safeAfterLegitimateWithdrawalEther:'3'}
  };
  fs.writeFileSync(path.join(__dirname,'lab-results.json'),JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results,null,2));
  eip.disconnect();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
