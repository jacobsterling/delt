// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "./Base64.sol";

library DeltAttributes {
    struct ItemId {
        bool awarded;
        string itemName;
        string itemType;
        uint256 mod;
    }

    struct Attr {
        string attrKey;
        Stat[] stats;
    }

    struct AttrLoc {
        uint256 mod;
        uint256 index;
    }

    struct Stat {
        string desc;
        string statKey;
        uint256 tier;
        uint256 value;
    }

    function attributesURI(Attr[] memory attributes)
        internal
        pure
        returns (string memory)
    {
        string memory _attributes = "";
        for (uint256 i = 0; i < attributes.length; i++) {
            _attributes = string(
                abi.encodePacked(
                    _attributes,
                    '"',
                    attributes[i].attrKey,
                    '":  {'
                )
            );
            for (uint256 j = 0; j < attributes[i].stats.length; j++) {
                _attributes = string(
                    abi.encodePacked(
                        _attributes,
                        '"',
                        attributes[i].stats[j].statKey,
                        '":  {"desc": "',
                        attributes[i].stats[j].desc,
                        '",  "tier": ',
                        Base64.uint2str(attributes[i].stats[j].tier),
                        ',  "value": ',
                        Base64.uint2str(attributes[i].stats[j].value),
                        "}"
                    )
                );
                if (j < attributes[i].stats.length - 1) {
                    _attributes = string(abi.encodePacked(_attributes, ", "));
                }
            }
            _attributes = string(abi.encodePacked(_attributes, "}"));

            if (i < attributes.length - 1) {
                _attributes = string(abi.encodePacked(_attributes, ", "));
            }
        }
        return _attributes;
    }

    function tokenURI(
        ItemId memory _itemItem,
        string memory encodedSVG,
        Attr[] memory _attributes
    ) external pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(
                        bytes(
                            string(
                                abi.encodePacked(
                                    '{"name": "',
                                    _itemItem.itemName,
                                    '",  "type": "',
                                    _itemItem.itemType,
                                    '",  "mod": ',
                                    Base64.uint2str(_itemItem.mod),
                                    ',  "image": "',
                                    Base64.decode(encodedSVG),
                                    '",  ',
                                    '"attributes": {',
                                    attributesURI(_attributes),
                                    "}}"
                                )
                            )
                        )
                    )
                )
            );
    }
}
