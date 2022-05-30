// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @custom:security-contact kciuq@protonmail.com
contract DeltTrader is ReentrancyGuard {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _contractAddr) {
        contractAddr = _contractAddr;
    }

    event AuctionStart(
        address contractAddr,
        uint256 _tokenId,
        uint256 price,
        uint256 endAt
    );
    event AuctionEnd(
        address contractAddr,
        uint256 _tokenId,
        uint256 highestBid,
        address highestBidder
    );
    event BidPlaced(address contractAddr, uint256 _tokenId, uint256 highestBid);

    mapping(uint256 => Transaction[]) public transactions;
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => bool) public activeAuctions;
    mapping(address => uint256) public balances;

    address contractAddr;

    struct Transaction {
        address buyer;
        address payable seller;
        uint256 price;
        bool auctioned;
        bool completed;
    }

    struct Auction {
        address payable seller;
        uint256 highestBid;
        address highestBidder;
        uint256 endAt;
    }

    modifier isListed(uint256 _tokenId, bool isActive) {
        if (isActive) {
            if (transactions[_tokenId].length > 0) {
                require(
                    !transactions[_tokenId][transactions[_tokenId].length - 1]
                        .completed,
                    "token is not listed"
                );
            } else {
                revert("token is not listed");
            }
        } else {
            if (transactions[_tokenId].length > 0) {
                require(
                    transactions[_tokenId][transactions[_tokenId].length - 1]
                        .completed,
                    "token is listed"
                );
            }
        }
        _;
    }

    modifier isAuctioned(uint256 _tokenId, bool isActive) {
        if (isActive) {
            require(
                activeAuctions[_tokenId],
                "auction for token is not active"
            );
        } else {
            require(!activeAuctions[_tokenId], "auction for token is active");
        }
        _;
    }

    modifier isOwner(uint256 _tokenId) {
        if (ERC721(contractAddr).ownerOf(_tokenId) == msg.sender) {
            _;
        } else {
            revert("not owner of given token");
        }
    }

    function addListing(
        uint256 _tokenId,
        uint256 _price,
        bool _auction
    ) public isOwner(_tokenId) isListed(_tokenId, false) {
        unchecked {
            require(_price > 0, "price must be greater than 0");
        }

        require(
            ERC721(contractAddr).isApprovedForAll(msg.sender, address(this)),
            "contract must be approved"
        );

        Transaction memory item = Transaction(
            address(this),
            payable(msg.sender),
            _price,
            _auction,
            false
        );

        transactions[_tokenId].push(item);

        if (_auction) {
            uint256 endAt = block.timestamp + 1 days;

            auctions[_tokenId].seller = item.seller;
            unchecked {
                auctions[_tokenId].highestBid = item.price;
            }

            auctions[_tokenId].highestBidder = item.seller;

            emit AuctionStart(contractAddr, _tokenId, item.price, endAt);

            auctions[_tokenId].endAt = endAt;

            activeAuctions[_tokenId] = true;
        }
    }

    function removeListing(uint256 _tokenId)
        public
        isOwner(_tokenId)
        isListed(_tokenId, true)
        isAuctioned(_tokenId, false)
    {
        transactions[_tokenId].pop();
    }

    function forceUnlist(uint256 _tokenId)
        internal
        nonReentrant
        isListed(_tokenId, true)
    {
        if (activeAuctions[_tokenId]) {
            if (auctions[_tokenId].highestBidder != auctions[_tokenId].seller) {
                unchecked {
                    balances[auctions[_tokenId].highestBidder] += auctions[
                        _tokenId
                    ].highestBid;
                }
            }
            activeAuctions[_tokenId] = false;
        }
        transactions[_tokenId].pop();
    }

    function endAuction(uint256 _tokenId)
        public
        nonReentrant
        isOwner(_tokenId)
        isListed(_tokenId, true)
        isAuctioned(_tokenId, true)
    {
        if (auctions[_tokenId].highestBidder == auctions[_tokenId].seller) {
            activeAuctions[_tokenId] = false;
            removeListing(_tokenId);
        } else {
            //require(block.timestamp >= auctions[_tokenId].endAt, "auction is still ongoing");
            activeAuctions[_tokenId] = false;

            transactions[_tokenId][transactions[_tokenId].length - 1]
                .completed = true;

            unchecked {
                transactions[_tokenId][transactions[_tokenId].length - 1]
                    .price = auctions[_tokenId].highestBid;

                balances[auctions[_tokenId].seller] += auctions[_tokenId]
                    .highestBid;
            }

            ERC721(contractAddr).safeTransferFrom(
                auctions[_tokenId].seller,
                auctions[_tokenId].highestBidder,
                _tokenId
            );
        }

        delete auctions[_tokenId];

        emit AuctionEnd(
            contractAddr,
            _tokenId,
            auctions[_tokenId].highestBid,
            auctions[_tokenId].highestBidder
        );
    }

    function bid(uint256 _tokenId)
        external
        payable
        nonReentrant
        isListed(_tokenId, true)
        isAuctioned(_tokenId, true)
    {
        require(
            msg.sender != auctions[_tokenId].seller,
            "must not own the token"
        );

        unchecked {
            require(
                msg.value > auctions[_tokenId].highestBid,
                "must pay more than the highest bid"
            );
            if (auctions[_tokenId].highestBidder != auctions[_tokenId].seller) {
                balances[auctions[_tokenId].highestBidder] += auctions[_tokenId]
                    .highestBid;
            }
            auctions[_tokenId].highestBid = msg.value;
            transactions[_tokenId][transactions[_tokenId].length - 1]
                .price = msg.value;
        }

        auctions[_tokenId].highestBidder = msg.sender;
        transactions[_tokenId][transactions[_tokenId].length - 1].buyer = msg
            .sender;

        emit BidPlaced(contractAddr, _tokenId, msg.value);
    }

    function purchace(uint256 _tokenId)
        public
        payable
        nonReentrant
        isListed(_tokenId, true)
        isAuctioned(_tokenId, false)
    {
        Transaction memory item = transactions[_tokenId][
            transactions[_tokenId].length - 1
        ];

        if (msg.sender == item.seller) {
            removeListing(_tokenId);
        } else {
            unchecked {
                require(msg.value >= item.price, "insufficient funds sent");
                balances[item.seller] += msg.value;
            }
            ERC721(contractAddr).safeTransferFrom(
                item.seller,
                msg.sender,
                _tokenId
            );
            transactions[_tokenId][transactions[_tokenId].length - 1]
                .buyer = msg.sender;
            transactions[_tokenId][transactions[_tokenId].length - 1]
                .completed = true;
        }
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

    function getListings(uint256 _tokenId)
        public
        view
        returns (Transaction[] memory)
    {
        return transactions[_tokenId];
    }
}
