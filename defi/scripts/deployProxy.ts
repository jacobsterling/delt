import { ethers, upgrades } from "hardhat"

async function main() {
  const DeltItems = await ethers.getContractFactory("DeltItems");
  const instance = await upgrades.deployProxy(DeltItems);

  await instance.deployed();

  console.log("DeltItems proxy deployed to:", instance.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
