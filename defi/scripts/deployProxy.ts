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

  const instanceItems = await upgrades.deployProxy(DeltItems, { unsafeAllowLinkedLibraries: true, });

  await instanceItems.deployed();

  console.log(`DeltItems proxy deployed to:`, instanceItems.address);

  const DeltEntities = await ethers.getContractFactory("DeltEntities", {
    libraries: {
      DeltAttributes: instanceAttributes.address
    }
  });

  const instanceEntities = await upgrades.deployProxy(DeltEntities, { unsafeAllowLinkedLibraries: true, });

  await instanceEntities.deployed();

  console.log(`DeltEntities proxy deployed to:`, instanceEntities.address);

  const DeltTrader = await ethers.getContractFactory("DeltTrader");
  const instanceTrader = await DeltTrader.deploy();

  await instanceTrader.deployed();

  console.log(`DeltTrader deployed to:`, instanceTrader.address);

  await instanceTrader.setContractStandard(instanceItems.address, true)
  await instanceTrader.setContractStandard(instanceEntities.address, false)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
