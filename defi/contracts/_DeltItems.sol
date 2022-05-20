// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/draft-ERC721Votes.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract _DeltItems is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    Pausable,
    AccessControl,
    ERC721Burnable,
    EIP712,
    ERC721Votes
{
    using Counters for Counters.Counter;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    Counters.Counter private _tokenIdCounter;

    mapping(uint256 => string) public itemId;
    mapping(string => uint256) public tokenIdlookup;
    mapping(string => uint8) public existingURIs;
    mapping(uint256 => mapping(string => Stat)) public attributes;
    mapping(uint256 => string[]) public attrKeys;

    struct Stat {
        int32 value;
        string desc;
        string rarity;
    }

    struct Attribute {
        string attrKey;
        Stat stat;
    }

    constructor() ERC721("_DeltItems", "DELT") EIP712("_DeltItems", "1") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
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
        returns (Attribute[] memory)
    {
        string[] memory _attrKeys = attrKeys[_tokenId];

        Attribute[] memory _attributes = new Attribute[](_attrKeys.length);

        for (uint256 i = 0; i < _attrKeys.length; i++) {
            string memory _attrKey = _attrKeys[i];
            Stat memory _stat = attributes[_tokenId][_attrKey];
            _attributes[i] = Attribute(_attrKey, _stat);
        }
        return _attributes;
    }

    function addAttribute(
        uint256 _tokenId,
        string memory _key,
        int32 _value,
        string memory _desc,
        string memory _rarity
    ) public onlyRole(MINTER_ROLE) {
        bool add = true;
        for (uint256 i = 0; i <= attrKeys[_tokenId].length; i++) {
            if (
                keccak256(abi.encode(attrKeys[_tokenId][i])) ==
                keccak256(abi.encode(_key))
            ) {
                add = false;
                break;
            }
        }
        if (add) {
            attrKeys[_tokenId].push(_key);
            attributes[_tokenId][_key].value = _value;
            attributes[_tokenId][_key].desc = _desc;
            attributes[_tokenId][_key].rarity = _rarity;
        }
    }

    function modAttribute(
        uint256 _tokenId,
        string memory _key,
        int32 _mod
    ) public onlyRole(MINTER_ROLE) {
        for (uint256 i = 0; i <= attrKeys[_tokenId].length; i++) {
            if (
                keccak256(abi.encode(attrKeys[_tokenId][i])) ==
                keccak256(abi.encode(_key))
            ) {
                attributes[_tokenId][_key].value += _mod;
                break;
            }
        }
    }

    function removeAttribute(uint256 _tokenId, string memory _key)
        public
        onlyRole(MINTER_ROLE)
    {
        for (uint256 i = 0; i <= attrKeys[_tokenId].length; i++) {
            if (
                keccak256(abi.encode(attrKeys[_tokenId][i])) ==
                keccak256(abi.encode(_key))
            ) {
                delete attributes[_tokenId][_key];
                break;
            }
        }
    }

    function createItem(
        uint256 _tokenId,
        string memory _itemId,
        Attribute[] memory _attributes
    ) private onlyRole(MINTER_ROLE) {
        itemId[_tokenId] = _itemId;
        tokenIdlookup[_itemId] = _tokenId;
        for (uint256 i = 0; i < _attributes.length; i++) {
            Attribute memory _attribute = _attributes[i];

            string memory _attrKey = _attribute.attrKey;

            string[] storage _attrKeys = attrKeys[_tokenId];

            _attrKeys.push(_attrKey);

            attrKeys[_tokenId] = _attrKeys;

            Stat memory _stat = _attribute.stat;

            attributes[_tokenId][_attrKey] = _stat;
        }
    }

    function burnItem(uint256 _tokenId) public onlyRole(BURNER_ROLE) {
        string memory _itemId = getItemId(_tokenId);
        delete itemId[_tokenId];
        delete tokenIdlookup[_itemId];
        for (uint256 i = 0; i <= attrKeys[_tokenId].length; i++) {
            delete attributes[_tokenId][attrKeys[_tokenId][i]];
        }
        delete attrKeys[_tokenId];
    }

    function awardItem(
        address player,
        string memory _itemId,
        Attribute[] memory _attributes,
        string memory _tokenURI
    ) public returns (uint256) {
        require(existingURIs[_tokenURI] != 1, "NFT already minted");

        uint256 newTokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        existingURIs[_tokenURI] = 1;

        _safeMint(player, newTokenId);

        _setTokenURI(newTokenId, _tokenURI);

        createItem(newTokenId, _itemId, _attributes);

        return newTokenId;
    }

    function payToMintItem(
        address player,
        string memory _itemId,
        Attribute[] memory _attributes,
        string memory _tokenURI
    ) public payable returns (uint256) {
        require(existingURIs[_tokenURI] != 1, "NFT already minted");
        require(msg.value > 0 ether, "you need to payup");
        uint256 newTokenId = _tokenIdCounter.current();
        existingURIs[_tokenURI] = 1;

        _safeMint(player, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);

        createItem(newTokenId, _itemId, _attributes);

        _tokenIdCounter.increment();

        return newTokenId;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Votes) {
        super._afterTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
        onlyRole(BURNER_ROLE)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
