// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

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
    mapping(string => bool) public exists;
    mapping(uint256 => mapping(string => Stat[])) public attributes;
    mapping(uint256 => string[]) public attrKeys;

    struct Attr {
        string attrKey;
        Stat[] stats;
    }

    struct Stat {
        string desc;
        string rarity;
        string statKey;
        uint32 value;
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

    function setAttribute(uint256 _tokenId, Attr memory _attribute)
        public
        onlyRole(MINTER_ROLE)
    {
        bool push = true;
        for (uint256 i = 0; i < attrKeys[_tokenId].length; i++) {
            if (
                keccak256(abi.encode(attrKeys[_tokenId][i])) ==
                keccak256(abi.encode(_attribute.attrKey))
            ) {
                if (_attribute.stats.length == 0) {
                    delete attributes[_tokenId][_attribute.attrKey];
                    if (i == attrKeys[_tokenId].length - 1) {
                        delete attrKeys[_tokenId][i];
                    } else {
                        attrKeys[_tokenId][i] = attrKeys[_tokenId][
                            attrKeys[_tokenId].length - 1
                        ];
                    }
                    attrKeys[_tokenId].pop();
                }
                push = false;
                break;
            }
        }
        if (push) {
            attrKeys[_tokenId].push(_attribute.attrKey);
        }
        if (_attribute.stats.length > 0) {
            setStats(_tokenId, _attribute.attrKey, _attribute.stats);
        }
    }

    function setStat(
        uint256 _tokenId,
        string memory _attrKey,
        Stat memory _stat
    ) public onlyRole(MINTER_ROLE) {
        bool push = true;
        for (uint256 i = 0; i < attributes[_tokenId][_attrKey].length; i++) {
            if (
                keccak256(
                    abi.encode(attributes[_tokenId][_attrKey][i].statKey)
                ) == keccak256(abi.encode(_stat.statKey))
            ) {
                if (_stat.value > 0) {
                    attributes[_tokenId][_attrKey][i] = _stat;
                } else {
                    uint256 attrLen = attributes[_tokenId][_attrKey].length - 1;
                    if (i < attrLen) {
                        attributes[_tokenId][_attrKey][i] = attributes[
                            _tokenId
                        ][_attrKey][attrLen];
                    }

                    attributes[_tokenId][_attrKey].pop();
                }
                push = false;
                break;
            }
        }
        if (push) {
            attributes[_tokenId][_attrKey].push(_stat);
        }
    }

    function setStats(
        uint256 _tokenId,
        string memory _attrKey,
        Stat[] memory _stats
    ) public onlyRole(MINTER_ROLE) {
        for (uint256 i = 0; i < _stats.length; i++) {
            setStat(_tokenId, _attrKey, _stats[i]);
        }
    }

    function awardItem(
        address player,
        string memory _itemId,
        string memory _tokenSVG,
        Attr[] memory _attributes
    ) public returns (uint256) {
        uint256 newTokenId = mintItem(player, _itemId, _tokenSVG, _attributes);
        return newTokenId;
    }

    function payToMintItem(
        address player,
        string memory _itemId,
        string memory _tokenSVG,
        Attr[] memory _attributes
    ) public payable returns (uint256) {
        require(msg.value > 0 ether, "you need to payup");
        uint256 newTokenId = mintItem(player, _itemId, _tokenSVG, _attributes);
        return newTokenId;
    }

    function mintItem(
        address player,
        string memory _itemId,
        string memory _tokenSVG,
        Attr[] memory _attributes
    ) internal onlyRole(MINTER_ROLE) returns (uint256) {
        require(!exists[_itemId], "NFT name already minted");

        uint256 newTokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(player, newTokenId);

        string memory encodedSVG = Base64.encode(bytes(string(_tokenSVG)));

        _setTokenURI(newTokenId, encodedSVG);

        itemId[newTokenId] = _itemId;
        tokenIdlookup[_itemId] = newTokenId;
        exists[_itemId] = true;

        for (uint256 i = 0; i < _attributes.length; i++) {
            setAttribute(newTokenId, _attributes[i]);
        }

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

    function burn(uint256 _tokenId) public override onlyRole(BURNER_ROLE) {
        _burn(_tokenId);
    }

    function _burn(uint256 _tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        onlyRole(BURNER_ROLE)
    {
        exists[getItemId(_tokenId)] = false;
        delete tokenIdlookup[getItemId(_tokenId)];
        delete itemId[_tokenId];

        for (uint256 i = 0; i < attrKeys[_tokenId].length; i++) {
            Stat[] memory eStat;
            setAttribute(_tokenId, Attr(attrKeys[_tokenId][i], eStat));
        }

        super._burn(_tokenId);
    }

    function tokenURI(uint256 _tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        string memory _attributes = "";
        for (uint256 i = 0; i < attrKeys[_tokenId].length; i++) {
            string memory _attrKey = attrKeys[_tokenId][i];
            _attributes = string(
                abi.encodePacked(_attributes, '"', _attrKey, '":  {')
            );
            for (
                uint256 j = 0;
                j < attributes[_tokenId][_attrKey].length;
                j++
            ) {
                Stat memory _stat = attributes[_tokenId][_attrKey][j];
                _attributes = string(
                    abi.encodePacked(
                        _attributes,
                        '"',
                        _stat.statKey,
                        '":  {"desc": "',
                        _stat.desc,
                        '",  "rarity": "',
                        _stat.rarity,
                        '",  "value": ',
                        Base64.uint2str(_stat.value),
                        "}"
                    )
                );
                if (j < attributes[_tokenId][_attrKey].length - 1) {
                    _attributes = string(abi.encodePacked(_attributes, ", "));
                }
            }
            _attributes = string(abi.encodePacked(_attributes, "}"));
            if (i < attrKeys[_tokenId].length - 1) {
                _attributes = string(abi.encodePacked(_attributes, ", "));
            }
        }
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "',
                        getItemId(_tokenId),
                        '",  ',
                        '"image_data": "',
                        getSvg(_tokenId),
                        '",  ',
                        '"attributes": {',
                        _attributes,
                        "}}"
                    )
                )
            )
        );
        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    function getSvg(uint256 _tokenId) public view returns (bytes memory) {
        string memory encodedSVG = super.tokenURI(_tokenId);

        bytes memory decodedSVG = Base64.decode(encodedSVG);

        return decodedSVG;
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
