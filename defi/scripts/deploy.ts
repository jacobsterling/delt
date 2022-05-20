import { ethers } from "hardhat"

async function main() {
  const DeltItems = await ethers.getContractFactory("DeltItems");
  const instance = await DeltItems.deploy();

  await instance.deployed();

  console.log("DeltItems deployed to:", instance.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
