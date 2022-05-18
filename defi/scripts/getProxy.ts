import { ethers } from "hardhat";

const getProxy = async (signer: any) => {
  const proxyAddress = "0x066676897391d185058c8cFF87B0734368BD44B9"
  return await ethers.getContractAt("DeltItems", proxyAddress, signer)
}

export default getProxy