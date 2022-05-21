// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/draft-ERC721VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "./Base64.sol";

/// @custom:security-contact kciuq@protonmail.com
contract DeltItems is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    ERC721BurnableUpgradeable,
    EIP712Upgradeable,
    ERC721VotesUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    CountersUpgradeable.Counter private _tokenIdCounter;

    mapping(uint256 => string) public itemId;
    mapping(string => uint256) public tokenIdlookup;
    mapping(uint256 => Attr[]) public attributes;

    struct Attr {
        string attrKey;
        Stat[] stats;
    }

    struct AttrEntry {
        bool exists;
        uint256 index;
        Attr attr;
    }

    struct Stat {
        string statKey;
        uint32 value;
        string desc;
        string rarity;
    }

    struct StatEntry {
        bool exists;
        uint256 index;
        Stat stat;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC721_init("DeltItems", "DELTI");
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __Pausable_init();
        __AccessControl_init();
        __ERC721Burnable_init();
        __EIP712_init("DeltItems", "1");
        __ERC721Votes_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function getItemId(uint256 _tokenId) public view returns (string memory) {
        return itemId[_tokenId];
    }

    function getTokenId(string memory _itemId) public view returns (uint256) {
        return tokenIdlookup[_itemId];
    }

    function getAttribute(uint256 _tokenId, string memory _attrKey)
        public
        view
        returns (AttrEntry memory)
    {
        for (uint256 i = 0; i < attributes[_tokenId].length; i++) {
            Attr storage _attr = attributes[_tokenId][i];
            if (
                keccak256(abi.encode(_attr.attrKey)) ==
                keccak256(abi.encode(_attrKey))
            ) {
                return AttrEntry(true, i, _attr);
            }
        }
        Stat[] memory _stats = new Stat[](0);
        return AttrEntry(false, attributes[_tokenId].length, Attr("", _stats));
    }

    function getStat(
        uint256 _tokenId,
        uint256 _attrIndex,
        string memory _statKey
    ) internal view returns (StatEntry memory) {
        Attr storage _attr = attributes[_tokenId][_attrIndex];
        for (uint256 i = 0; i < _attr.stats.length; i++) {
            if (
                keccak256(abi.encode(_attr.stats[i].statKey)) ==
                keccak256(abi.encode(_statKey))
            ) {
                return StatEntry(true, i, _attr.stats[i]);
            }
        }
        Stat memory _stat;
        return StatEntry(false, _attr.stats.length, _stat);
    }

    function setAttribute(uint256 _tokenId, Attr memory _attribute)
        public
        onlyRole(MINTER_ROLE)
    {
        AttrEntry memory query = getAttribute(_tokenId, _attribute.attrKey);
        if (query.exists) {
            attributes[_tokenId][query.index] = _attribute;
        } else {
            attributes[_tokenId].push(_attribute);
        }
    }

    function removeAttribute(uint256 _tokenId, string memory _attrKey)
        public
        onlyRole(MINTER_ROLE)
    {
        AttrEntry memory query = getAttribute(_tokenId, _attrKey);
        if (query.exists) {
            delete attributes[_tokenId][query.index];
        }
    }

    function setStat(
        uint256 _tokenId,
        string memory _attrKey,
        Stat memory _stat
    ) public onlyRole(MINTER_ROLE) {
        AttrEntry memory attrQuery = getAttribute(_tokenId, _attrKey);
        require(attrQuery.exists, "Attribute does not exist");

        StatEntry memory statQuery = getStat(
            _tokenId,
            attrQuery.index,
            _stat.statKey
        );
        if (statQuery.exists) {
            attributes[_tokenId][attrQuery.index].stats[
                statQuery.index
            ] = _stat;
        } else {
            attributes[_tokenId][statQuery.index].stats.push(_stat);
        }
    }

    function removeStat(
        uint256 _tokenId,
        string memory _attrKey,
        Stat memory _stat
    ) public onlyRole(MINTER_ROLE) {
        AttrEntry memory attrQuery = getAttribute(_tokenId, _attrKey);
        require(attrQuery.exists, "Attribute does not exist");

        StatEntry memory statQuery = getStat(
            _tokenId,
            attrQuery.index,
            _stat.statKey
        );

        require(statQuery.exists, "Stat does not exist");

        delete attributes[_tokenId][attrQuery.index].stats[statQuery.index];
    }

    function awardItem(
        address player,
        string memory _itemId,
        string memory _tokenSVG,
        Attr[] memory _attributes
    ) public returns (uint256) {
        require(tokenIdlookup[_itemId] == 0, "NFT name already minted");

        uint256 newTokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(player, newTokenId);

        _setTokenURI(newTokenId, _tokenSVG);

        itemId[newTokenId] = _itemId;
        tokenIdlookup[_itemId] = newTokenId;
        attributes[newTokenId] = _attributes;

        return newTokenId;
    }

    function payToMintItem(
        address player,
        string memory _itemId,
        string memory _tokenSVG,
        Attr[] memory _attributes
    ) public payable returns (uint256) {
        require(tokenIdlookup[_itemId] == 0, "NFT name already minted");
        require(msg.value > 0 ether, "you need to payup");

        uint256 newTokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(player, newTokenId);

        _setTokenURI(newTokenId, _tokenSVG);

        itemId[newTokenId] = _itemId;
        tokenIdlookup[_itemId] = newTokenId;
        attributes[newTokenId] = _attributes;

        return newTokenId;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    )
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        whenNotPaused
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721Upgradeable, ERC721VotesUpgradeable) {
        super._afterTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 _tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        onlyRole(BURNER_ROLE)
    {
        delete itemId[_tokenId];
        delete tokenIdlookup[getItemId(_tokenId)];
        delete attributes[_tokenId];
        super._burn(_tokenId);
    }

    function tokenURI(uint256 _tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        string memory _attributes = "[";
        for (uint256 i = 0; i < attributes[_tokenId].length; i++) {
            Attr storage _attr = attributes[_tokenId][i];
            _attributes = string(
                abi.encodePacked(_attributes, '"', _attr.attrKey, '": [')
            );

            for (uint256 j = 0; j < _attr.stats.length; j++) {
                Stat storage _stat = _attr.stats[j];

                _attributes = string(
                    abi.encodePacked(
                        _attributes,
                        '["',
                        _stat.statKey,
                        '", ',
                        Base64.uint2str(_stat.value),
                        ", ",
                        '"',
                        _stat.desc,
                        '", ',
                        '"',
                        _stat.rarity,
                        '"]'
                    )
                );
                if (j < _attr.stats.length - 1) {
                    _attributes = string(abi.encodePacked(_attributes, ", "));
                }
            }
            if (i < attributes[_tokenId].length - 1) {
                _attributes = string(abi.encodePacked(_attributes, ", "));
            }
        }
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "',
                        getItemId(_tokenId),
                        '",',
                        '"image_data": "',
                        super.tokenURI(_tokenId),
                        '",',
                        '"attributes": ',
                        _attributes,
                        "]}"
                    )
                )
            )
        );
        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(
            ERC721Upgradeable,
            ERC721EnumerableUpgradeable,
            AccessControlUpgradeable
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
