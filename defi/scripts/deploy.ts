// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, upgrades } from "hardhat"

async function main() {

  const DeltItems = await ethers.getContractFactory("DeltItems");
  const proxy = await upgrades.deployProxy(DeltItems);

  await proxy.deployed();

  console.log("Delt deployed to:", proxy.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
