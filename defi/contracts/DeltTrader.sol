// contracts/DeltTrader.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract DeltTrader {
    mapping(address => mapping(uint256 => Listing)) public listings;

    struct Listing {
        uint256 price;
        address seller;
    }

    function addListing(
        uint256 price,
        address contractAddr,
        uint256 tokenId
    ) public {}
}
