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
import "./DeltUtils.sol";

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
    mapping(uint256 => mapping(string => mapping(string => StatValue)))
        public attributes;
    mapping(uint256 => mapping(string => string[])) public statKeys;
    mapping(uint256 => string[]) public attrKeys;

    struct Attribute {
        string attrKey;
        StatInput[] stats;
    }

    struct StatInput {
        string statKey;
        StatValue stat;
    }

    struct StatValue {
        uint32 value;
        string desc;
        string rarity;
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

    function getAttributes(uint256 _tokenId)
        public
        view
        onlyRole(MINTER_ROLE)
        returns (string memory)
    {
        string[] memory _attrKeys = attrKeys[_tokenId];

        string memory _attributes = "[";

        for (uint256 i = 0; i < _attrKeys.length; i++) {
            string memory _attrKey = _attrKeys[i];
            //Stat[] memory _stats = attributes[_tokenId][_attrKey];
            _attributes = string(
                abi.encodePacked(_attributes, '"', _attrKey, '": ')
            );
            for (uint256 j = 0; j < statKeys[_tokenId][_attrKey].length; j++) {
                string memory _statKey = statKeys[_tokenId][_attrKey][j];
                _attributes = string(
                    abi.encodePacked(
                        _attributes,
                        '["',
                        _statKey,
                        '", ',
                        Utils.uint2str(
                            attributes[_tokenId][_attrKey][_statKey].value
                        ),
                        ", ",
                        '"',
                        attributes[_tokenId][_attrKey][_statKey].desc,
                        '", ',
                        '"',
                        attributes[_tokenId][_attrKey][_statKey].rarity,
                        '"]'
                    )
                );
                if (j < statKeys[_tokenId][_attrKey].length - 1) {
                    _attributes = string(abi.encodePacked(_attributes, ","));
                }
            }
            if (i < _attrKeys.length - 1) {
                _attributes = string(abi.encodePacked(_attributes, ","));
            }
        }
        return string(abi.encodePacked(_attributes, "]"));
    }

    function setStat(
        uint256 _tokenId,
        string memory _attrKey,
        StatInput memory _stat
    ) public onlyRole(MINTER_ROLE) {
        statKeys[_tokenId][_attrKey].push(_stat.statKey);
        attributes[_tokenId][_attrKey][_stat.statKey] = _stat.stat;

        Utils.KeyQueryResult memory query = Utils.keyQuery(
            _attrKey,
            attrKeys[_tokenId],
        );

        if (!query.result) {
            attrKeys[_tokenId].push(_attrKey);
        }
    }

    function removeStat(
        uint256 _tokenId,
        string memory _attrKey,
        string memory _statKey
    ) public onlyRole(MINTER_ROLE) {
        Utils.KeyQueryResult memory query = Utils.keyQuery(
            _statKey,
            statKeys[_tokenId][_attrKey]
            
        );

        if (query.result) {
            delete statKeys[_tokenId][_attrKey][query.index];
            delete attributes[_tokenId][_attrKey][_statKey];
        }
    }

    function createItem(
        uint256 _tokenId,
        string memory _itemId,
        Attribute[] memory _attributes
    ) internal onlyRole(MINTER_ROLE) {
        itemId[_tokenId] = _itemId;
        tokenIdlookup[_itemId] = _tokenId;
        string[] memory _attrKeys = new string[](_attributes.length);
        for (uint256 i = 0; i < _attributes.length; i++) {
            Attribute memory _attribute = _attributes[i];

            _attrKeys[i] = _attribute.attrKey;

            StatInput[] memory _stats = _attribute.stats;

            string[] memory _statKeys = new string[](_stats.length);

            for (uint256 j = 0; j < _stats.length; j++) {
                StatInput memory _stat = _stats[j];
                _statKeys[j] = _stat.statKey;
                attributes[_tokenId][_attribute.attrKey][_stat.statKey] = _stat
                    .stat;
            }
            statKeys[_tokenId][_attribute.attrKey] = _statKeys;
        }
        attrKeys[_tokenId] = _attrKeys;
    }

    function burnItem(uint256 _tokenId) public onlyRole(BURNER_ROLE) {
        string memory _itemId = getItemId(_tokenId);
        delete itemId[_tokenId];
        delete tokenIdlookup[_itemId];
        for (uint256 i = 0; i < attrKeys[_tokenId].length; i++) {
            string memory _attrKey = attrKeys[_tokenId][i];
            for (uint256 j = 0; j < statKeys[_tokenId][_attrKey].length; j++) {
                string memory _statKey = statKeys[_tokenId][_attrKey][j];
                delete attributes[_tokenId][_attrKey][_statKey];
                delete statKeys[_tokenId][_attrKey][j];
            }
            delete attrKeys[_tokenId][i];
        }
    }

    function awardItem(
        address player,
        string memory _itemId,
        string memory _tokenSVG,
        Attribute[] memory _attributes
    ) public returns (uint256) {
        require(tokenIdlookup[_itemId] == 0, "NFT name already minted");

        uint256 newTokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(player, newTokenId);

        _setTokenURI(newTokenId, _tokenSVG);

        createItem(newTokenId, _itemId, _attributes);

        return newTokenId;
    }

    function payToMintItem(
        address player,
        string memory _itemId,
        string memory _tokenSVG,
        Attribute[] memory _attributes
    ) public payable returns (uint256) {
        require(tokenIdlookup[_itemId] == 0, "NFT name already minted");
        require(msg.value > 0 ether, "you need to payup");

        uint256 newTokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(player, newTokenId);

        _setTokenURI(newTokenId, _tokenSVG);

        createItem(newTokenId, _itemId, _attributes);

        require(newTokenId > 0, "fault");

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
    {
        burnItem(_tokenId);
        super._burn(_tokenId);
    }

    function tokenURI(uint256 _tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
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
                        getAttributes(_tokenId),
                        "}"
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
