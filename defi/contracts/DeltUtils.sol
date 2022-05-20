// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

library Utils {
    function uint2str(uint256 _i)
        internal
        pure
        returns (string memory _uintAsString)
    {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    struct KeyQueryResult {
        bool result;
        uint256 index;
    }

    function keyQuery(string memory _key, string[] storage _keys)
        internal
        view
        returns (KeyQueryResult memory)
    {
        for (uint256 i = 0; i < _keys.length; i++) {
            if (
                keccak256(abi.encode(_keys[i])) == keccak256(abi.encode(_key))
            ) {
                return KeyQueryResult(true, i);
            }
        }
        return KeyQueryResult(false, _keys.length);
    }
}
