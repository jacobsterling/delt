// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @custom:security-contact kciuq@protonmail.com
contract Delt is IERC20, ReentrancyGuard, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    string private _name = "Delt";
    string private _symbol = "DELT";

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function decimals() public pure returns (uint8) {
        return 18;
    }

    struct Fee {
        string feeType;
        address recipient;
        uint256 value;
    }

    Fee[] private fees;
    uint256 private feeTotal;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        mint(msg.sender, 300000 * 10**decimals()); // to crowd fund contract ??
        setFee(Fee("burn", address(0), 100)); // 1% to be burned
        setFee(Fee("dev", 0x0eB4b7662270706122998DcbcAEb0157f5B69501, 200)); // 0.5% to dev team (considered high)
        setFee(Fee("liquidity", address(this), 200)); // 0.5% to liquidity (for drops before minting);
        //add one for stakers ? (incetivises HODL == less transactions == less deflation ??)
    }

    function getFees() public view returns (Fee[] memory) {
        return fees;
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account)
        external
        view
        override
        returns (uint256)
    {
        return _balances[account];
    }

    function mint(address recipient, uint256 amount)
        public
        onlyRole(MINTER_ROLE)
    {
        unchecked {
            _balances[recipient] += amount;
            _totalSupply += amount;
        }
        emit Transfer(address(0), recipient, amount);
    }

    function burn(address from, uint256 amount) public onlyRole(MINTER_ROLE) {
        unchecked {
            require(_balances[from] >= amount);
            _balances[from] -= amount;
            _totalSupply -= amount;
        }
        emit Transfer(from, address(0), amount);
    }

    function setFee(Fee memory _fee) public onlyRole(DEFAULT_ADMIN_ROLE) {
        bool push = true;
        feeTotal = 0;
        for (uint256 i = 0; i < fees.length; i++) {
            feeTotal += _fee.value;
            if (
                keccak256(abi.encode(_fee.feeType)) ==
                keccak256(abi.encode(fees[i].feeType))
            ) {
                if (_fee.value > 0) {
                    fees[i] = _fee;
                } else {
                    fees[i] = fees[fees.length - 1];
                    fees.pop();
                }
                push = false;
                break;
            }
        }
        if (push) {
            fees.push(_fee);
            feeTotal += _fee.value;
        }
    }

    function takeFee(uint256 amount) internal returns (uint256) {
        uint256 fee;
        uint256 _feeTotal;
        unchecked {
            for (uint256 i = 0; i < fees.length; i++) {
                fee = amount / fees[i].value;
                require(fee > 0, "amount to small");
                _balances[fees[i].recipient] = fee;
                if (fees[i].recipient == address(0)) {
                    _totalSupply -= fee;
                }
                _feeTotal += fee;
                emit Transfer(msg.sender, fees[i].recipient, fee);
            }
            require(feeTotal == _feeTotal, "fee uncertainty error"); // change to <= ?
            return amount / _feeTotal;
        }
    }

    function transfer(address recipient, uint256 amount)
        external
        override
        nonReentrant
        returns (bool)
    {
        uint256 _amount;
        unchecked {
            require(_balances[msg.sender] >= amount, "insufficient balance");
            _balances[msg.sender] -= amount;
            _amount = amount - takeFee(amount);
            _balances[recipient] += _amount;
        }
        emit Transfer(msg.sender, recipient, _amount);
        return true;
    }

    function approve(address spender, uint256 amount)
        external
        override
        returns (bool)
    {
        _allowances[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function allowance(address owner, address spender)
        external
        view
        override
        returns (uint256)
    {
        return _allowances[owner][spender];
    }

    function transferFrom(
        address from,
        address recipient,
        uint256 amount
    ) external override nonReentrant returns (bool) {
        uint256 _amount;
        unchecked {
            require(
                _allowances[from][msg.sender] >= amount,
                "amount not approved"
            );
            _allowances[from][msg.sender] -= amount;
            _balances[from] -= amount;
            _amount = amount - takeFee(amount);
            _balances[recipient] += _amount;
        }
        emit Transfer(from, recipient, _amount);
        return true;
    }
}
