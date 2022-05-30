// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "./DeltAttributes.sol";

/// @custom:security-contact kciuq@protonmail.com
contract DeltItems is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    ERC721BurnableUpgradeable,
    EIP712Upgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using DeltAttributes for DeltAttributes.ItemId;
    using DeltAttributes for DeltAttributes.Attr;
    using DeltAttributes for DeltAttributes.AttrLoc;
    using DeltAttributes for DeltAttributes.Stat;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    CountersUpgradeable.Counter private _tokenIdCounter;

    mapping(uint256 => DeltAttributes.ItemId) public itemId;
    mapping(string => uint256) public tokenIdlookup;
    mapping(string => bool) public exists;
    mapping(uint256 => mapping(string => DeltAttributes.Stat[]))
        public attributes;
    mapping(uint256 => mapping(string => DeltAttributes.AttrLoc))
        public attrLoc;
    mapping(uint256 => mapping(string => bool)) public attrExists;
    mapping(uint256 => string[]) public attrKeys;
    mapping(string => uint256) public traitTier;

    struct Op {
        int256 opMod;
        bool push;
    }

    Op public _op;

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

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function setTier(string memory _trait, uint256 _tier)
        public
        onlyRole(MINTER_ROLE)
    {
        traitTier[_trait] = _tier;
    }

    function getTier(string memory _trait) public view returns (uint256) {
        return traitTier[_trait];
    }

    function getItemId(uint256 _tokenId)
        public
        view
        returns (DeltAttributes.ItemId memory)
    {
        return itemId[_tokenId];
    }

    function getTokenId(string memory _itemId) public view returns (uint256) {
        return tokenIdlookup[_itemId];
    }

    function getOpPrice(uint256 _lvl, int256 _mod)
        public
        pure
        returns (uint256)
    {
        unchecked {
            if (_mod > 0) {
                return _lvl * uint256(_mod) * 1e15 wei;
            } else {
                return _lvl * 1e15 wei;
            }
        }
    }

    function setAttribute(uint256 _tokenId, DeltAttributes.Attr memory _attr)
        internal
    {
        if (!attrExists[_tokenId][_attr.attrKey]) {
            attrKeys[_tokenId].push(_attr.attrKey);
            attrLoc[_tokenId][_attr.attrKey] = DeltAttributes.AttrLoc(
                0,
                attrKeys[_tokenId].length - 1
            );
            attrExists[_tokenId][_attr.attrKey] = true;
        }
        itemId[_tokenId].lvl -= attrLoc[_tokenId][_attr.attrKey].lvl;
        for (uint256 i = 0; i < _attr.stats.length; i++) {
            _op.push = true;
            _attr.stats[i].tier = traitTier[_attr.stats[i].trait];
            for (
                uint256 j = 0;
                j < attributes[_tokenId][_attr.attrKey].length;
                j++
            ) {
                if (
                    keccak256(
                        abi.encode(
                            attributes[_tokenId][_attr.attrKey][j].statKey
                        )
                    ) == keccak256(abi.encode(_attr.stats[i].statKey))
                ) {
                    unchecked {
                        _op.opMod +=
                            int256(_attr.stats[i].tier * _attr.stats[i].value) -
                            int256(
                                attributes[_tokenId][_attr.attrKey][j].tier *
                                    attributes[_tokenId][_attr.attrKey][j].value
                            );
                    }
                    if (_attr.stats[i].value > 0) {
                        attributes[_tokenId][_attr.attrKey][j] = _attr.stats[i];
                    } else {
                        if (
                            j < attributes[_tokenId][_attr.attrKey].length - 1
                        ) {
                            attributes[_tokenId][_attr.attrKey][j] = attributes[
                                _tokenId
                            ][_attr.attrKey][
                                attributes[_tokenId][_attr.attrKey].length - 1
                            ];
                        }
                        attributes[_tokenId][_attr.attrKey].pop();
                    }
                    _op.push = false;
                    break;
                }
            }
            if (_op.push) {
                attributes[_tokenId][_attr.attrKey].push(_attr.stats[i]);
                unchecked {
                    _op.opMod +=
                        int256(_attr.stats[i].tier) *
                        int256(_attr.stats[i].value);
                }
            }
        }
        unchecked {
            if (_op.opMod > 0) {
                attrLoc[_tokenId][_attr.attrKey].lvl += uint256(_op.opMod);
            } else {
                int256 sub = _op.opMod * -1;
                attrLoc[_tokenId][_attr.attrKey].lvl -= uint256(sub);
            }
        }
        if (
            attributes[_tokenId][_attr.attrKey].length == 0 ||
            _attr.stats.length == 0
        ) {
            _op.opMod = int256(attrLoc[_tokenId][_attr.attrKey].lvl) * -1;
            delete attributes[_tokenId][_attr.attrKey];
            if (
                attrLoc[_tokenId][_attr.attrKey].index ==
                attrKeys[_tokenId].length - 1
            ) {
                delete attrKeys[_tokenId][
                    attrLoc[_tokenId][_attr.attrKey].index
                ];
            } else {
                attrLoc[_tokenId][
                    attrKeys[_tokenId][attrKeys[_tokenId].length - 1]
                ].index = attrLoc[_tokenId][_attr.attrKey].index;
                attrKeys[_tokenId][
                    attrLoc[_tokenId][_attr.attrKey].index
                ] = attrKeys[_tokenId][attrKeys[_tokenId].length - 1];
                delete attrLoc[_tokenId][_attr.attrKey];
            }
            attrExists[_tokenId][_attr.attrKey] = false;
            attrKeys[_tokenId].pop();
        } else {
            itemId[_tokenId].lvl += attrLoc[_tokenId][_attr.attrKey].lvl;
        }
    }

    function awardItem(
        address player,
        DeltAttributes.ItemId memory _itemId,
        string memory _tokenSVG,
        DeltAttributes.Attr[] memory _attributes
    ) public onlyRole(MINTER_ROLE) {
        require(_itemId.awarded, "item was not awarded");
        mintItem(player, _itemId, _tokenSVG, _attributes);
    }

    function payToMintItem(
        address player,
        DeltAttributes.ItemId memory _itemId,
        string memory _tokenSVG,
        DeltAttributes.Attr[] memory _attributes
    ) public payable {
        require(!_itemId.awarded, "item was awarded");
        mintItem(player, _itemId, _tokenSVG, _attributes);
    }

    function mintItem(
        address player,
        DeltAttributes.ItemId memory _itemId,
        string memory _tokenSVG,
        DeltAttributes.Attr[] memory _attributes
    ) internal {
        require(!exists[_itemId.itemName], "NFT name already minted");

        itemId[_tokenIdCounter.current()] = _itemId;
        tokenIdlookup[_itemId.itemName] = _tokenIdCounter.current();
        exists[_itemId.itemName] = true;

        for (uint256 i = 0; i < _attributes.length; i++) {
            setAttribute(_tokenIdCounter.current(), _attributes[i]);
            _op.opMod = 0;
        }

        if (!_itemId.awarded) {
            unchecked {
                require(
                    msg.value >=
                        getOpPrice(
                            itemId[_tokenIdCounter.current()].lvl,
                            int256(itemId[_tokenIdCounter.current()].lvl)
                        ),
                    "underpayed"
                );
            }
        }

        _safeMint(player, _tokenIdCounter.current());

        _setTokenURI(
            _tokenIdCounter.current(),
            Base64.encode(bytes(_tokenSVG))
        );

        _tokenIdCounter.increment();
        _op.opMod = 0;
    }

    function opMod() public view returns (int256) {
        return _op.opMod;
    }

    function modifiyItem(uint256 _tokenId, DeltAttributes.Attr memory _attr)
        public
        payable
    {
        require(ownerOf(_tokenId) == msg.sender, "you must own the token");
        setAttribute(_tokenId, _attr);
        unchecked {
            require(
                msg.value >= getOpPrice(itemId[_tokenId].lvl, _op.opMod),
                "underpayed"
            );
        }
        _op.opMod = 0;
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

    function burn(uint256 _tokenId)
        public
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        exists[getItemId(_tokenId).itemName] = false;
        delete itemId[_tokenId];
        delete attrKeys[_tokenId];
        _burn(_tokenId);
    }

    function _burn(uint256 _tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        super._burn(_tokenId);
    }

    function tokenURI(uint256 _tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        DeltAttributes.Attr[] memory _attributes = new DeltAttributes.Attr[](
            attrKeys[_tokenId].length
        );
        for (uint256 i = 0; i < _attributes.length; i++) {
            _attributes[i] = DeltAttributes.Attr(
                attrKeys[_tokenId][i],
                attributes[_tokenId][attrKeys[_tokenId][i]]
            );
        }

        return
            DeltAttributes.tokenURI(
                itemId[_tokenId],
                super.tokenURI(_tokenId),
                _attributes
            );
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
