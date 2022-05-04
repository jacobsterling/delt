<script setup lang="ts">

import Delt from "../../../defi/artifacts/contracts/delt.sol/Delt.json"

import { ethers, Signer, providers } from 'ethers';

// Import the NFTStorage class and File constructor from the 'nft.storage' package
import { NFTStorage } from "nft.storage"
import { containsProp } from "@vueuse/shared";

const { $wallet: wallet } = useNuxtApp()

const mintStatus = await useContract(wallet, "baki")

</script>

<template>
  <div>
    <!-- <h5>ID # {{ tokenID }}</h5>
    <button v-if="!isMinted" @click="mintToken">
      Mint
    </button>
    <button v-else @click="getURI">
      Taken! Show URI
    </button> -->
  </div>
</template>