import { ethers, upgrades } from "hardhat"

async function main() {

  const proxyAddress = "0x066676897391d185058c8cFF87B0734368BD44B9"

  // Upgrading
  const BoxV2 = await ethers.getContractFactory("BoxV2");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, BoxV2);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});