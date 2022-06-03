// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @custom:security-contact kciuq@protonmail.com
contract DeltTrader is ReentrancyGuard {
    event AuctionStart(Listing _listing, uint256 price, uint256 endAt);
    event AuctionEnd(
        Listing _listing,
        address highestBidder,
        uint256 highestBid,
        uint256 amount
    );

    event BidPlaced(Listing _listing, Bid[] updatedBids);
    event Purchaced(
        Listing _listing,
        address buyer,
        uint256 price,
        uint256 amount
    );

    mapping(address => mapping(uint256 => Transaction[])) public transactions;
    mapping(address => mapping(uint256 => Auction)) public auctions;
    mapping(address => mapping(uint256 => bool)) public activeAuctions;
    mapping(address => bool) public erc721;

    mapping(address => uint256) public balances;

    struct Transaction {
        address buyer;
        address payable seller;
        uint256 price;
        uint256 amount;
        bool auctioned;
        bool completed;
    }

    struct Listing {
        address contractAddr;
        uint256 id;
    }

    struct Bid {
        address bidder;
        uint256 bid;
    }

    struct Auction {
        address payable seller;
        uint256 endAt;
        uint256 initPrice;
        Bid[] bids;
    }

    modifier isListed(Listing memory _listing, bool isActive) {
        if (isActive) {
            if (transactions[_listing.contractAddr][_listing.id].length > 0) {
                require(
                    !transactions[_listing.contractAddr][_listing.id][
                        transactions[_listing.contractAddr][_listing.id]
                            .length - 1
                    ].completed,
                    "token is not listed"
                );
            } else {
                revert("token is not listed");
            }
        } else {
            if (transactions[_listing.contractAddr][_listing.id].length > 0) {
                require(
                    transactions[_listing.contractAddr][_listing.id][
                        transactions[_listing.contractAddr][_listing.id]
                            .length - 1
                    ].completed,
                    "token is listed"
                );
            }
        }
        _;
    }

    modifier isAuctioned(Listing memory _listing, bool isActive) {
        if (isActive) {
            require(
                activeAuctions[_listing.contractAddr][_listing.id],
                "auction for token is not active"
            );
        } else {
            require(
                !activeAuctions[_listing.contractAddr][_listing.id],
                "auction for token is active"
            );
        }
        _;
    }

    modifier isOwner(Listing memory _listing) {
        if (erc721[_listing.contractAddr]) {
            if (
                ERC721(_listing.contractAddr).ownerOf(_listing.id) == msg.sender
            ) {
                _;
            } else {
                revert("not owner of given token");
            }
        } else {
            if (
                ERC1155(_listing.contractAddr).balanceOf(
                    msg.sender,
                    _listing.id
                ) > 0
            ) {
                _;
            } else {
                revert("must own at least 1 of given token");
            }
        }
    }

    function setContractStandard(address _contractAddr, bool _isErc721) public {
        erc721[_contractAddr] = _isErc721;
    }

    function addListing(
        Listing memory _listing,
        uint256 _price,
        uint256 _amount,
        bool _auction
    ) public isOwner(_listing) isListed(_listing, false) {
        unchecked {
            require(_price > 0, "price must be greater than 0");
        }

        Transaction memory item = Transaction(
            address(this),
            payable(msg.sender),
            _price,
            _amount,
            _auction,
            false
        );

        if (erc721[_listing.contractAddr]) {
            require(
                ERC721(_listing.contractAddr).isApprovedForAll(
                    msg.sender,
                    address(this)
                ),
                "contract must be approved"
            );
            item.amount = 1;
        } else {
            require(
                ERC1155(_listing.contractAddr).isApprovedForAll(
                    msg.sender,
                    address(this)
                ),
                "contract must be approved"
            );
        }

        transactions[_listing.contractAddr][_listing.id].push(item);

        if (_auction) {
            auctions[_listing.contractAddr][_listing.id].seller = item.seller;
            unchecked {
                auctions[_listing.contractAddr][_listing.id].initPrice = item
                    .price;
            }

            emit AuctionStart(_listing, item.price, block.timestamp + 1 days);

            auctions[_listing.contractAddr][_listing.id].endAt =
                block.timestamp +
                1 days;

            activeAuctions[_listing.contractAddr][_listing.id] = true;
        }
    }

    function removeListing(Listing memory _listing)
        public
        isOwner(_listing)
        isListed(_listing, true)
        isAuctioned(_listing, false)
    {
        transactions[_listing.contractAddr][_listing.id].pop();
    }

    function forceUnlist(Listing memory _listing)
        internal
        nonReentrant
        isListed(_listing, true)
    {
        if (activeAuctions[_listing.contractAddr][_listing.id]) {
            if (auctions[_listing.contractAddr][_listing.id].bids.length > 0) {
                unchecked {
                    balances[
                        auctions[_listing.contractAddr][_listing.id]
                            .bids[
                                auctions[_listing.contractAddr][_listing.id]
                                    .bids
                                    .length - 1
                            ]
                            .bidder
                    ] += auctions[_listing.contractAddr][_listing.id]
                        .bids[
                            auctions[_listing.contractAddr][_listing.id]
                                .bids
                                .length - 1
                        ]
                        .bid;
                }
            }
            activeAuctions[_listing.contractAddr][_listing.id] = false;
        }
        transactions[_listing.contractAddr][_listing.id].pop();
    }

    function endAuction(Listing memory _listing)
        public
        nonReentrant
        isOwner(_listing)
        isListed(_listing, true)
        isAuctioned(_listing, true)
    {
        if (auctions[_listing.contractAddr][_listing.id].bids.length > 0) {
            activeAuctions[_listing.contractAddr][_listing.id] = false;
            removeListing(_listing);
        } else {
            //require(block.timestamp >= auctions[_listing.id].endAt, "auction is still ongoing");
            activeAuctions[_listing.contractAddr][_listing.id] = false;

            transactions[_listing.contractAddr][_listing.id][
                transactions[_listing.contractAddr][_listing.id].length - 1
            ].completed = true;

            unchecked {
                transactions[_listing.contractAddr][_listing.id][
                    transactions[_listing.contractAddr][_listing.id].length - 1
                ].price = auctions[_listing.contractAddr][_listing.id]
                    .bids[
                        auctions[_listing.contractAddr][_listing.id]
                            .bids
                            .length - 1
                    ]
                    .bid;

                balances[
                    auctions[_listing.contractAddr][_listing.id].seller
                ] += auctions[_listing.contractAddr][_listing.id]
                    .bids[
                        auctions[_listing.contractAddr][_listing.id]
                            .bids
                            .length - 1
                    ]
                    .bid;
            }

            if (erc721[_listing.contractAddr]) {
                ERC721(_listing.contractAddr).safeTransferFrom(
                    auctions[_listing.contractAddr][_listing.id].seller,
                    auctions[_listing.contractAddr][_listing.id]
                        .bids[
                            auctions[_listing.contractAddr][_listing.id]
                                .bids
                                .length - 1
                        ]
                        .bidder,
                    _listing.id
                );
            } else {
                ERC1155(_listing.contractAddr).safeTransferFrom(
                    auctions[_listing.contractAddr][_listing.id].seller,
                    auctions[_listing.contractAddr][_listing.id]
                        .bids[
                            auctions[_listing.contractAddr][_listing.id]
                                .bids
                                .length - 1
                        ]
                        .bidder,
                    _listing.id,
                    transactions[_listing.contractAddr][_listing.id][
                        transactions[_listing.contractAddr][_listing.id]
                            .length - 1
                    ].amount,
                    "0x0"
                );
            }
            emit AuctionEnd(
                _listing,
                auctions[_listing.contractAddr][_listing.id]
                    .bids[
                        auctions[_listing.contractAddr][_listing.id]
                            .bids
                            .length - 1
                    ]
                    .bidder,
                auctions[_listing.contractAddr][_listing.id]
                    .bids[
                        auctions[_listing.contractAddr][_listing.id]
                            .bids
                            .length - 1
                    ]
                    .bid,
                transactions[_listing.contractAddr][_listing.id][
                    transactions[_listing.contractAddr][_listing.id].length - 1
                ].amount
            );
        }
        delete auctions[_listing.contractAddr][_listing.id];
    }

    function bid(Listing memory _listing)
        external
        payable
        nonReentrant
        isListed(_listing, true)
        isAuctioned(_listing, true)
    {
        require(
            msg.sender != auctions[_listing.contractAddr][_listing.id].seller,
            "must not own the token"
        );

        if (auctions[_listing.contractAddr][_listing.id].bids.length > 0) {
            unchecked {
                require(
                    msg.value >
                        auctions[_listing.contractAddr][_listing.id]
                            .bids[
                                auctions[_listing.contractAddr][_listing.id]
                                    .bids
                                    .length - 1
                            ]
                            .bid,
                    "must pay more than the highest bid"
                );
            }
        } else {
            require(
                msg.value >
                    auctions[_listing.contractAddr][_listing.id].initPrice,
                "must pay more than the initial price"
            );
        }

        unchecked {
            balances[
                auctions[_listing.contractAddr][_listing.id]
                    .bids[
                        auctions[_listing.contractAddr][_listing.id]
                            .bids
                            .length - 1
                    ]
                    .bidder
            ] += auctions[_listing.contractAddr][_listing.id]
                .bids[
                    auctions[_listing.contractAddr][_listing.id].bids.length - 1
                ]
                .bid;

            transactions[_listing.contractAddr][_listing.id][
                transactions[_listing.contractAddr][_listing.id].length - 1
            ].price = msg.value;
        }

        transactions[_listing.contractAddr][_listing.id][
            transactions[_listing.contractAddr][_listing.id].length - 1
        ].buyer = msg.sender;

        auctions[_listing.contractAddr][_listing.id].bids.push(
            Bid(msg.sender, msg.value)
        );

        emit BidPlaced(
            _listing,
            auctions[_listing.contractAddr][_listing.id].bids
        );
    }

    function purchace(Listing memory _listing)
        public
        payable
        nonReentrant
        isListed(_listing, true)
        isAuctioned(_listing, false)
    {
        if (
            msg.sender ==
            transactions[_listing.contractAddr][_listing.id][
                transactions[_listing.contractAddr][_listing.id].length - 1
            ].seller
        ) {
            removeListing(_listing);
        } else {
            unchecked {
                require(
                    msg.value >=
                        transactions[_listing.contractAddr][_listing.id][
                            transactions[_listing.contractAddr][_listing.id]
                                .length - 1
                        ].price,
                    "insufficient funds sent"
                );
                balances[
                    transactions[_listing.contractAddr][_listing.id][
                        transactions[_listing.contractAddr][_listing.id]
                            .length - 1
                    ].seller
                ] += msg.value;
            }

            if (erc721[_listing.contractAddr]) {
                ERC721(_listing.contractAddr).safeTransferFrom(
                    transactions[_listing.contractAddr][_listing.id][
                        transactions[_listing.contractAddr][_listing.id]
                            .length - 1
                    ].seller,
                    msg.sender,
                    _listing.id
                );
            } else {
                ERC1155(_listing.contractAddr).safeTransferFrom(
                    transactions[_listing.contractAddr][_listing.id][
                        transactions[_listing.contractAddr][_listing.id]
                            .length - 1
                    ].seller,
                    msg.sender,
                    _listing.id,
                    transactions[_listing.contractAddr][_listing.id][
                        transactions[_listing.contractAddr][_listing.id]
                            .length - 1
                    ].amount,
                    "0x0"
                );
            }
            transactions[_listing.contractAddr][_listing.id][
                transactions[_listing.contractAddr][_listing.id].length - 1
            ].buyer = msg.sender;
            transactions[_listing.contractAddr][_listing.id][
                transactions[_listing.contractAddr][_listing.id].length - 1
            ].completed = true;
        }
        emit Purchaced(
            _listing,
            msg.sender,
            msg.value,
            transactions[_listing.contractAddr][_listing.id][
                transactions[_listing.contractAddr][_listing.id].length - 1
            ].amount
        );
    }

    function withdraw(uint256 amount) public nonReentrant {
        unchecked {
            require(amount <= balances[msg.sender], "insufficent funds");
        }
        payable(msg.sender).transfer(amount);
        unchecked {
            balances[msg.sender] -= amount;
        }
    }

    function getListings(Listing memory _listing)
        public
        view
        returns (Transaction[] memory)
    {
        return transactions[_listing.contractAddr][_listing.id];
    }
}
