import { ethers, upgrades } from "hardhat"

async function main() {

  const DeltAttributes = await ethers.getContractFactory("DeltAttributes")

  const instanceAttributes = await DeltAttributes.deploy();

  await instanceAttributes.deployed();

  console.log("DeltAttributes deployed to:", instanceAttributes.address);

  const DeltItems = await ethers.getContractFactory("DeltItems", {
    libraries: {
      DeltAttributes: instanceAttributes.address
    }
  });

  DeltItems
  const instanceItems = await upgrades.deployProxy(DeltItems, { unsafeAllowLinkedLibraries: true, });

  await instanceItems.deployed();

  console.log(`DeltItems proxy deployed to:`, instanceItems.address);

  const DeltTrader = await ethers.getContractFactory("DeltTrader");
  const instanceTrader = await DeltTrader.deploy(instanceItems.address);

  await instanceTrader.deployed();

  console.log(`DeltTrader deployed to:`, instanceTrader.address);

  await instanceItems.grantRole("0x0000000000000000000000000000000000000000000000000000000000000000", instanceTrader.address);
  console.log("DeltTrader granted admin.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
