// contracts/DeltItems.sol
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
    mapping(string => uint8) public existingURIs;
    // mapping(uint256 => string[]) public attributes;
    // mapping(uint256 => mapping(string => int32)) public stats;
    mapping(uint256 => mapping(string => Attr)) public attributes;
    mapping(uint256 => string[]) public attrKeys;
    //mapping(string => bool) public statKeyExists;

    // struct Attr {
    //     Stat[] stats;
    // }

    struct Attr {
        int32 value;
        string desc;
    }

    struct Attribute {
        string attrKey;
        Attr attr;
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
        Attribute[] memory _attributes = new Attribute[](
            attrKeys[_tokenId].length
        );
        for (uint256 i = 0; i <= attrKeys[_tokenId].length; i++) {
            _attributes[i] = Attribute(
                attrKeys[_tokenId][i],
                attributes[_tokenId][attrKeys[_tokenId][i]]
            );
        }
        return _attributes;
    }

    function addAttribute(
        uint256 _tokenId,
        string memory _key,
        int32 _value,
        string memory _desc
    ) public onlyRole(MINTER_ROLE) {
        for (uint256 i = 0; i <= attrKeys[_tokenId].length; i++) {
            if (
                keccak256(abi.encode(attrKeys[_tokenId][i])) ==
                keccak256(abi.encode(_key))
            ) {
                attributes[_tokenId][_key].value = _value;
                attributes[_tokenId][_key].desc = _desc;
                break;
            }
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
        for (uint256 i = 0; i <= _attributes.length; i++) {
            attrKeys[_tokenId].push(_attributes[i].attrKey);
            attributes[_tokenId][_attributes[i].attrKey] = _attributes[i].attr;
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
        require(existingURIs[_tokenURI] == 1, "NFT already minted");

        uint256 newTokenId = _tokenIdCounter.current();
        existingURIs[_tokenURI] = 1;

        _mint(player, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);

        createItem(newTokenId, _itemId, _attributes);

        _tokenIdCounter.increment();

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

        _mint(player, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);

        createItem(newTokenId, _itemId, _attributes);

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
        onlyRole(BURNER_ROLE)
    {
        super._burn(tokenId);
        burnItem(tokenId);
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
