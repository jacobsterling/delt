// contracts/DeltItems.sol
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
    CountersUpgradeable.Counter private _tokenIdCounter;

    mapping(uint256 => string) public itemId;
    mapping(string => uint256) public tokenIdlookup;
    mapping(string => uint8) public existingURIs; // set these in award item and pay for item
    mapping(uint256 => string[]) public attributes;
    mapping(uint256 => mapping(string => int32)) public stats;
    mapping(string => bool) public statKeyExists;

    string[] public statKeys;

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
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://";
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function safeMint(address to, string memory uri)
        public
        onlyRole(MINTER_ROLE)
    {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function setStat(
        uint256 _tokenId,
        string memory _stat,
        int32 _statValue
    ) public onlyRole(MINTER_ROLE) {
        stats[_tokenId][_stat] = _statValue;
        if (statKeyExists[_stat] == false) {
            statKeys.push(_stat);
        }
    }

    function modStat(
        uint256 _tokenId,
        string memory _stat,
        int32 _statMod
    ) public onlyRole(MINTER_ROLE) {
        stats[_tokenId][_stat] += _statMod;
    }

    function addAttribute(uint256 _tokenId, string memory _attribute)
        public
        onlyRole(MINTER_ROLE)
    {
        attributes[_tokenId].push(_attribute);
    }

    function deleteAttribute(uint256 _tokenId, string memory _attribute)
        public
        onlyRole(MINTER_ROLE)
    {
        uint256 i = 0;
        while (i != attributes[_tokenId].length) {
            if (
                keccak256(abi.encodePacked(attributes[_tokenId][i])) ==
                keccak256(abi.encodePacked(_attribute))
            ) {
                delete attributes[_tokenId][i];
            }
        }
    }

    function createItem(
        uint256 _tokenId,
        string memory _itemId,
        string[] memory _attributes,
        string[] memory _statKeys,
        int32[] memory _statValues
    ) public onlyRole(MINTER_ROLE) {
        require(
            _statKeys.length == _statValues.length,
            "Keys length != values length"
        );

        itemId[_tokenId] = _itemId;
        tokenIdlookup[_itemId] = _tokenId;

        uint48 i = 0;
        while (i != _attributes.length) {
            addAttribute(_tokenId, _attributes[i]);
            i++;
        }

        uint8 j = 0;
        while (j != _statKeys.length) {
            stats[_tokenId][_statKeys[j]] = _statValues[j];
            setStat(_tokenId, _statKeys[j], _statValues[j]);
            j++;
        }
    }

    function getAttributes(uint256 _tokenId)
        public
        view
        returns (string[] memory)
    {
        return attributes[_tokenId];
    }

    function getStatKeys(uint256 _tokenId)
        public
        view
        returns (string[] memory)
    {
        uint256 i = 0;
        uint256 j = 0;
        string[] memory _keys;
        while (i != statKeys.length) {
            if (stats[_tokenId][statKeys[i]] != 0) {
                _keys[j] = statKeys[i];
                j++;
            }
            i++;
        }

        return _keys;
    }

    function getStatValues(uint256 _tokenId)
        public
        view
        returns (int32[] memory)
    {
        uint256 i = 0;
        uint256 j = 0;
        int32[] memory _values;
        while (i != statKeys.length) {
            if (stats[_tokenId][statKeys[i]] != 0) {
                _values[j] = stats[_tokenId][statKeys[i]];
            }
            i++;
        }
        return _values;
    }

    function getItemId(uint256 _tokenId) public view returns (string memory) {
        return itemId[_tokenId];
    }

    function getTokenId(string memory _itemId) public view returns (uint256) {
        return tokenIdlookup[_itemId];
    }

    function awardItem(
        address player,
        string memory _itemId,
        string[] memory _attributes,
        string[] memory _statKeys,
        int32[] memory _statValues,
        string memory metadataURI
    ) public returns (uint256) {
        require(existingURIs[metadataURI] != 1, "NFT already minted");

        uint256 newTokenId = _tokenIdCounter.current();
        existingURIs[metadataURI] = 1;

        _mint(player, newTokenId);
        _setTokenURI(newTokenId, metadataURI);

        createItem(newTokenId, _itemId, _attributes, _statKeys, _statValues);

        _tokenIdCounter.increment();

        return newTokenId;
    }

    function payToMintItem(
        address player,
        string memory _itemId,
        string[] memory _attributes,
        string[] memory _statKeys,
        int32[] memory _statValues,
        string memory metadataURI
    ) public payable returns (uint256) {
        require(existingURIs[metadataURI] != 1, "NFT already minted");
        require(msg.value > 0 ether, "you need to payup");
        uint256 newTokenId = _tokenIdCounter.current();
        existingURIs[metadataURI] = 1;

        _mint(player, newTokenId);
        _setTokenURI(newTokenId, metadataURI);

        createItem(newTokenId, _itemId, _attributes, _statKeys, _statValues);

        _tokenIdCounter.increment();

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

    function _burn(uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
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
