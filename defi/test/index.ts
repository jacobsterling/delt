import { expect } from "chai";
import { ethers } from "hardhat";

describe("DeltItems", function () {
  it("Should mint new game item", async function () {
    const DeltItems = await ethers.getContractFactory("DeltItems");
    const deltItems = await DeltItems.deploy();
    await deltItems.deployed();

    const player = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    const metadataURI = 'cid/test.png';

    const newlyMintedToken = await deltItems.awardItem(player, "common sword", ["sword", "common"], ["damage", "weight", "speed"], [4, 2, 5], metadataURI);
    expect(newlyMintedToken).to.exist
    //wait until the transaction is mined
    await newlyMintedToken.wait();
    expect(newlyMintedToken).to.exist
  });
});

