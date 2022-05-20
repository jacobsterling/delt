
import { ethers } from "hardhat";
import { Signer } from "ethers"

export const proxyAddress = "0x066676897391d185058c8cFF87B0734368BD44B9"

export const getProxy = async (signer: Signer) => {
  const DeltItems = await ethers.getContractAt("DeltItems", proxyAddress, signer);
  return DeltItems
}

