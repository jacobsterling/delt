// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "./DeltAttributes.sol";
import "./Delt.sol";

contract DeltEntities is
    Initializable,
    ERC1155Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ERC1155BurnableUpgradeable,
    ERC1155SupplyUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using DeltAttributes for DeltAttributes.Id;
    using DeltAttributes for DeltAttributes.Attr;
    using DeltAttributes for DeltAttributes.Stat;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    CountersUpgradeable.Counter private _tokenIdCounter;

    mapping(uint256 => DeltAttributes.Id) public entityIds;
    mapping(uint256 => uint256) public entityCap;
    mapping(uint256 => uint256) public entitySupply;
    mapping(string => uint256) public entityIdlookup;
    mapping(string => bool) public exists;
    mapping(uint256 => mapping(string => DeltAttributes.Stat[]))
        public attributes;
    mapping(uint256 => string[]) public attrKeys;
    mapping(string => uint256) public traitTier;
    mapping(uint256 => string) private tokenSVGs;

    Delt public delt;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address deltAddress) public initializer {
        __ERC1155_init("");
        __AccessControl_init();
        __Pausable_init();
        __ERC1155Burnable_init();
        __ERC1155Supply_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        delt = Delt(deltAddress);
    }

    function pause() public onlyRole(MINTER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(MINTER_ROLE) {
        _unpause();
    }

    function setTier(string memory _trait, uint256 _tier)
        public
        onlyRole(MINTER_ROLE)
    {
        traitTier[_trait] = _tier;
    }

    function supplyOf(uint256 _entityId) public view returns (uint256) {
        return entitySupply[_entityId];
    }

    function setEntityCap(uint256 _entityId, uint256 cap)
        public
        onlyRole(MINTER_ROLE)
    {
        entityCap[_entityId] = cap;
    }

    function getTier(string memory _trait) public view returns (uint256) {
        return traitTier[_trait];
    }

    function getItemId(uint256 _entityId)
        public
        view
        returns (DeltAttributes.Id memory)
    {
        return entityIds[_entityId];
    }

    function getTokenId(string memory _entityId) public view returns (uint256) {
        return entityIdlookup[_entityId];
    }

    function mint(
        address account,
        DeltAttributes.Id memory _entityId,
        string memory _tokenSVG,
        DeltAttributes.Attr[] memory _attributes
    ) public onlyRole(MINTER_ROLE) {
        require(_entityId.awarded, "Entity was not awarded");
        createEntity(account, _entityId, _tokenSVG, _attributes);
    }

    function payToMint(
        address account,
        DeltAttributes.Id memory _entityId,
        string memory _tokenSVG,
        DeltAttributes.Attr[] memory _attributes
    ) public payable {
        require(!_entityId.awarded, "Entity was awarded");
        createEntity(account, _entityId, _tokenSVG, _attributes);
    }

    function createEntity(
        address account,
        DeltAttributes.Id memory _entityId,
        string memory _tokenSVG,
        DeltAttributes.Attr[] memory _attributes
    ) internal {
        require(!exists[_entityId.itemName], "Token name already minted");

        _entityId.lvl = 0;

        for (uint256 i = 0; i < _attributes.length; i++) {
            for (uint256 j = 0; j < _attributes[i].stats.length; j++) {
                unchecked {
                    _attributes[i].stats[j].tier = traitTier[
                        _attributes[i].stats[j].trait
                    ];
                    _entityId.lvl +=
                        _attributes[i].stats[j].tier *
                        _attributes[i].stats[j].value;
                }
                attributes[_tokenIdCounter.current()][_attributes[i].attrKey]
                    .push(_attributes[i].stats[j]);
            }
            attrKeys[_tokenIdCounter.current()].push(_attributes[i].attrKey);
        }

        if (!_entityId.awarded) {
            unchecked {
                require(msg.value >= _entityId.lvl**2 * 1e15 wei, "underpayed");
            }
        }

        entityIds[_tokenIdCounter.current()] = _entityId;
        entityIdlookup[_entityId.itemName] = _tokenIdCounter.current();
        exists[_entityId.itemName] = true;

        _mint(
            account,
            _tokenIdCounter.current(),
            _entityId.amount,
            bytes("mint")
        );

        entitySupply[_tokenIdCounter.current()] += _entityId.amount;

        tokenSVGs[_tokenIdCounter.current()] = Base64.encode(bytes(_tokenSVG));

        _tokenIdCounter.increment();
    }

    function mintBatch(
        address account,
        DeltAttributes.Id[] memory _entityIds,
        string[] memory _tokenSVGs,
        DeltAttributes.Attr[][] memory _entityAttributes
    ) public onlyRole(MINTER_ROLE) {
        require(
            _entityIds.length == _tokenSVGs.length,
            "ERC1155: ids and SVGs length mismatch"
        );
        for (uint256 i = 0; i < _entityIds.length; i++) {
            createEntity(
                account,
                _entityIds[i],
                _tokenSVGs[i],
                _entityAttributes[i]
            );
        }
    }

    function burnBatch(
        address from,
        uint256[] memory ids,
        uint256[] memory amounts
    ) public override onlyRole(MINTER_ROLE) {
        require(ids.length == amounts.length);
        for (uint256 i = 0; i < ids.length; i++) {
            burn(from, ids[i], amounts[i]);
        }
    }

    function burn(
        address account,
        uint256 id,
        uint256 value
    ) public override onlyRole(MINTER_ROLE) {
        _burn(account, id, value);
        entitySupply[id] -= value;
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory _entityIds,
        uint256[] memory amounts,
        bytes memory data
    )
        internal
        override(ERC1155Upgradeable, ERC1155SupplyUpgradeable)
        whenNotPaused
    {
        if (data == bytes("mint")) {
            for (uint256 i = 0; i < _entityIds.length; i++) {
                if (entityCap[_entityIds[i]] > 0) {
                    require(
                        entitySupply[_entityIds[i]] + amounts[i] <=
                            entityCap[_entityIds[i]],
                        "entity cap reached"
                    );
                }
            }
        }

        super._beforeTokenTransfer(
            operator,
            from,
            to,
            _entityIds,
            amounts,
            data
        );
    }

    // The following functions are overrides required by Solidity.

    function uri(uint256 _id) public view override returns (string memory) {
        DeltAttributes.Attr[] memory _attributes = new DeltAttributes.Attr[](
            attrKeys[_id].length
        );
        for (uint256 i = 0; i < _attributes.length; i++) {
            _attributes[i] = DeltAttributes.Attr(
                attrKeys[_id][i],
                attributes[_id][attrKeys[_id][i]]
            );
        }

        return
            DeltAttributes.tokenURI(
                entityIds[_id],
                tokenSVGs[_id],
                _attributes
            );
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
