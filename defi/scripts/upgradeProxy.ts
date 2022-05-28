import { ethers, upgrades } from "hardhat"

async function main(proxyAddress: string, upgrade: string) {
  const DeltItemsV2 = await ethers.getContractFactory(upgrade);
  await upgrades.upgradeProxy(proxyAddress, DeltItemsV2);
  console.log(`${upgrade} proxy upgraded`);
}

main("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", "DeltItems").catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
