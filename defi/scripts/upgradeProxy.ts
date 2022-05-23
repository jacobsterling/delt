import { ethers, upgrades } from "hardhat"

async function main() {
  const proxyAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
  const DeltItemsV2 = await ethers.getContractFactory("DeltItems");
  await upgrades.upgradeProxy(proxyAddress, DeltItemsV2);

  console.log("DeltItems proxy upgraded");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
