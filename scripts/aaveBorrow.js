const { getNamedAccounts, ethers } = require("hardhat");
const { getWeth, AMOUNT } = require("../scripts/getWeth");

async function main() {
    await getWeth();

    //after getting(deposit) the WETH we deposit it into aave protocol
    //to interact with aave v2 mainnet contract we need two things: ABI, Address
    //0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    const { deployer } = await getNamedAccounts();
    const lendingPool = await getLendingPool(deployer);
    console.log(`Lending Pool address ${lendingPool.address}`);

    //deposit
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer);
    console.log("Depositing...");
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
    console.log("Deposited");

    //Borrow
    //we want to know how much we have borrowed, how much we can borrow, what is the total collateral
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(
        lendingPool,
        deployer
    ); // we get how much ETH we can borrow
    // We want to borrow DAI tokens, so we want the conversion rate
    const daiPrice = await getDaiPrice();
    const daiToBorrow =
        availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber()); //only withdraw 95% of the total amount
    const daiToBorrowWei = ethers.utils.parseEther(daiToBorrow.toString());

    const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    await borrowDai(daiTokenAddress, lendingPool, daiToBorrowWei, deployer);
    await getBorrowUserData(lendingPool, deployer);

    await repay(daiToBorrowWei, lendingPool, daiTokenAddress, deployer);
    await getBorrowUserData(lendingPool, deployer);
}

//we want the lending pool address which we get through the getLendingPool() function of lendingPoolAddressesProvider contract

async function getLendingPool(account) {
    const lendingPoolAddressesProviderContract = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    );
    const lendingPoolAddress =
        await lendingPoolAddressesProviderContract.getLendingPool();
    const lendingPool = await ethers.getContractAt(
        "ILendingPool",
        lendingPoolAddress,
        account
    );
    return lendingPool;
}

async function approveErc20(
    erc20Address,
    spenderAddress,
    amountToSpend,
    account
) {
    const erc20Token = await ethers.getContractAt(
        "IERC20",
        erc20Address,
        account
    );
    const tx = await erc20Token.approve(spenderAddress, amountToSpend);
    await tx.wait(1);
    console.log("Approved!");
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account);
    console.log(`You have ${totalCollateralETH} worth of ETH deposited`);
    console.log(`You have total ${totalDebtETH} worth of debt ETH`);
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH`);
    return { availableBorrowsETH, totalDebtETH };
}

async function getDaiPrice() {
    const daiUsdPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
    );
    const price = (await daiUsdPriceFeed.latestRoundData())[1];
    console.log(`The DAI/ETH price is ${price.toString()}`);
    return price;
}
//function borrow(address asset,
//uint256 amount,
//uint256 interestRateMode,
//uint16 referralCode,
//address onBehalfOf)
async function borrowDai(daiAddress, lendingPool, daiToBorrowWei, account) {
    const borrowTx = await lendingPool.borrow(
        daiAddress,
        daiToBorrowWei,
        1,
        0,
        account
    ); //Stable: 1, Variable: 2
}

async function repay(amount, lendingPool, daiAddress, account) {
    await approveErc20(daiAddress, lendingPool.address, amount, account);
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account);
    await repayTx.wait(1);
    console.log("Repaid.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
