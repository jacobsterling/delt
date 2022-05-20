import { ethers, upgrades } from "hardhat"

async function main() {
  const proxyAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  const DeltItemsV2 = await ethers.getContractFactory("DeltItems");
  await upgrades.upgradeProxy(proxyAddress, DeltItemsV2);

  console.log("DeltItems proxy upgraded");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
