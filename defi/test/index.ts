import { expect } from "chai";
import { ethers } from "hardhat";

describe("DeltItems", function () {
  it("Should mint new game item", async function () {
    const DeltItems = await ethers.getContractFactory("DeltItems");
    const deltItems = await DeltItems.deploy();
    await deltItems.deployed();



    const player = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'

    const role = await deltItems.hasRole("0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", player)

    expect(role).to.exist

    const metadataURI = 'cid/test.png';

    const newlyMintedToken = await deltItems.awardItem(player,
      "common short sword",
      [
        ["damage", [4, ""]],
        ["weight", [2, "light"]]
      ],
      metadataURI);
    expect(newlyMintedToken).to.exist
    //wait until the transaction is mined
    const result = await newlyMintedToken.wait();
    expect(result).to.exist
  });
});

