// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @custom:security-contact kciuq@protonmail.com
contract DeltTrader {
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

    function bid(uint256 _tokenId) external payable {
        require(activeAuctions[_tokenId], "auction is not active");
        require(
            msg.sender != auctions[_tokenId].seller,
            "must not own the token"
        );
        require(
            msg.value > auctions[_tokenId].highestBid,
            "must pay more than the highest bid"
        );

        if (auctions[_tokenId].highestBidder != auctions[_tokenId].seller) {
            balances[auctions[_tokenId].highestBidder] += auctions[_tokenId]
                .highestBid;
        }

        auctions[_tokenId].highestBid = msg.value;
        auctions[_tokenId].highestBidder = msg.sender;

        emit BidPlaced(contractAddr, _tokenId, msg.value);
    }

    function startAuction(uint256 _tokenId, Transaction memory _item) internal {
        //Auction memory _auction = Auction(_item.contractAddr, _item.seller, true,  _item.price,  _item.seller );
        require(!activeAuctions[_tokenId], "auction is already active");

        uint256 endAt = block.timestamp + 1 days;

        auctions[_tokenId].seller = _item.seller;
        auctions[_tokenId].highestBid = _item.price;
        auctions[_tokenId].highestBidder = _item.seller;

        emit AuctionStart(contractAddr, _tokenId, _item.price, endAt);

        auctions[_tokenId].endAt = endAt;

        activeAuctions[_tokenId] = true;
    }

    function getPrice(uint256 _tokenId) public view returns (uint256) {
        require(
            !transactions[_tokenId][transactions[_tokenId].length - 1]
                .completed,
            "not listed"
        );
        if (
            transactions[_tokenId][transactions[_tokenId].length - 1].auctioned
        ) {
            return auctions[_tokenId].highestBid;
        } else {
            return
                transactions[_tokenId][transactions[_tokenId].length - 1].price;
        }
    }

    function endAuction(uint256 _tokenId) public returns (address) {
        require(activeAuctions[_tokenId], "auction for token is not active");
        require(msg.sender == auctions[_tokenId].seller, "must own the token");

        if (auctions[_tokenId].highestBidder == auctions[_tokenId].seller) {
            transactions[_tokenId].pop();
        } else {
            //require(block.timestamp >= auctions[_tokenId].endAt, "auction is still ongoing");

            transactions[_tokenId][transactions[_tokenId].length - 1]
                .completed = true;
            transactions[_tokenId][transactions[_tokenId].length - 1]
                .buyer = auctions[_tokenId].highestBidder;
            transactions[_tokenId][transactions[_tokenId].length - 1]
                .price = auctions[_tokenId].highestBid;

            ERC721 token = ERC721(contractAddr);

            require(
                auctions[_tokenId].highestBid <=
                    balances[auctions[_tokenId].highestBidder],
                "insufficent funds"
            );
            require(
                token.ownerOf(_tokenId) == auctions[_tokenId].seller,
                "caller must own given token"
            );

            // balances[auctions[_tokenId].highestBidder] -= auctions[_tokenId]
            //     .highestBid;

            auctions[_tokenId].seller.transfer(auctions[_tokenId].highestBid);

            token.safeTransferFrom(
                auctions[_tokenId].seller,
                auctions[_tokenId].highestBidder,
                _tokenId
            );
        }
        activeAuctions[_tokenId] = false;

        delete auctions[_tokenId];

        emit AuctionEnd(
            contractAddr,
            _tokenId,
            auctions[_tokenId].highestBid,
            auctions[_tokenId].highestBidder
        );
        return auctions[_tokenId].highestBidder;
    }

    function addListing(
        uint256 _tokenId,
        uint256 _price,
        bool _auction
    ) public {
        ERC721 token = ERC721(contractAddr);
        require(
            token.ownerOf(_tokenId) == msg.sender,
            "caller must own given token"
        );
        require(
            token.isApprovedForAll(msg.sender, address(this)),
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
            startAuction(_tokenId, item);
        }
    }

    function removeListing(uint256 _tokenId) public {
        ERC721 token = ERC721(contractAddr);
        require(
            token.ownerOf(_tokenId) == msg.sender,
            "caller must own given token"
        );
        require(
            token.isApprovedForAll(msg.sender, address(this)),
            "contract must be approved"
        );
        require(
            !transactions[_tokenId][transactions[_tokenId].length - 1]
                .completed,
            "transaction completed"
        );
        transactions[_tokenId].pop();
    }

    function getListings(uint256 _tokenId)
        public
        view
        returns (Transaction[] memory)
    {
        return transactions[_tokenId];
    }

    function isListed(uint256 _tokenId) public view returns (bool) {
        return
            !transactions[_tokenId][transactions[_tokenId].length - 1]
                .completed;
    }

    function isAuctioned(uint256 _tokenId) public view returns (bool) {
        require(isListed(_tokenId), "token is not listed");
        return activeAuctions[_tokenId];
    }

    function purchace(uint256 _tokenId) public payable {
        require(transactions[_tokenId].length > 0, "token is not listed");

        Transaction memory item = transactions[_tokenId][
            transactions[_tokenId].length - 1
        ];

        require(!item.completed, "token is not listed");
        require(msg.value >= item.price, "insufficient funds sent");
        balances[item.seller] += msg.value;
        ERC721 token = ERC721(contractAddr);
        token.safeTransferFrom(item.seller, msg.sender, _tokenId);
        transactions[_tokenId][transactions[_tokenId].length - 1].buyer = msg
            .sender;
        transactions[_tokenId][transactions[_tokenId].length - 1]
            .completed = true;
    }

    function withdraw(uint256 amount, address payable destAddr) public {
        require(amount <= balances[msg.sender], "insufficent funds");
        uint256 bWithdraw = balances[msg.sender];
        balances[msg.sender] = 0;
        destAddr.transfer(amount);
        balances[msg.sender] = bWithdraw - amount;
    }
}
