// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

async function main() {

  const Delt = await ethers.getContractFactory("Delt");
  const delt = await Delt.deploy();

  await delt.deployed();

  console.log("Delt deployed to:", delt.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
