const { ethers } = require('ethers');
require('dotenv').config({ path: __dirname + '/../.env' });
require('dotenv').config({ path: __dirname + '/../agent/config/.env' });

async function disbursePayout(toAddress, amountMst) {
  try {
    const rpc = process.env.MST_TESTNET_RPC_URL || 'https://testnetrpc.mstblockchain.com';
    const provider = new ethers.JsonRpcProvider(rpc);
    const pk = process.env.DEPLOYER_PRIVATE_KEY || '0xbb670b7abf8baf1f0bd13d129bca23ea0d807a5f6e15463f3c43ddec7a11c667';
    const wallet = new ethers.Wallet(pk, provider);
    const target = toAddress || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
    const amt = amountMst || '5.0';

    const tx = await wallet.sendTransaction({
      to: target,
      value: ethers.parseEther(amt)
    });
    console.log(JSON.stringify({ status: 'success', hash: tx.hash, to: target, amount: amt }));
  } catch (error) {
    console.error(JSON.stringify({ status: 'error', message: error.message }));
    process.exit(1);
  }
}

const target = process.argv[2] || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const amt = process.argv[3] || '5.0';
disbursePayout(target, amt);
