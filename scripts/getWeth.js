const { getNamedAccounts, ethers } = require("hardhat");

const AMOUNT = ethers.utils.parseEther("0.02");

//Script that will deposit our tokens as WETH tokens
async function getWeth() {
    //in order to interact with a contract we need an account
    const { deployer } = await getNamedAccounts();

    //main objective: call the deposit function on the WETH contract so that when we deposit we get weth token
    // and to get the WETH contract we need two things: ABI, Contract Address
    //ABI: from the compiled WETH interface, contract Address: Mainnet WETH contract address
    // 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
    const iWeth = await ethers.getContractAt(
        "IWeth",
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        deployer
    );

    const tx = await iWeth.deposit({ value: AMOUNT });
    await tx.wait(1);
    const wethBalance = await iWeth.balanceOf(deployer);
    console.log(`Got ${wethBalance} WETH`);
}

module.exports = { getWeth, AMOUNT };
