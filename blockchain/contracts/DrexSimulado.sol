// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DrexSimulado (dBRL)
 * @notice Simulação do Real Digital (DREX) para o MVP TokenInvest.
 *         1 dBRL = R$ 1,00. Usamos 2 casas decimais (centavos).
 *
 * Somente o "emissor" (papel do Banco Central / instituição liquidante
 * no ambiente de Sandbox) pode criar (mint) ou destruir (burn) tokens.
 * Isso representa a conversão de reais depositados na conta bancária
 * (via Open Finance / Pix) em Real Digital e vice-versa.
 */
contract DrexSimulado {
    string public constant name = "Real Digital Simulado";
    string public constant symbol = "dBRL";
    uint8 public constant decimals = 2;

    address public immutable emissor;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error SomenteEmissor();
    error SaldoInsuficiente();
    error AutorizacaoInsuficiente();
    error EnderecoInvalido();

    modifier somenteEmissor() {
        if (msg.sender != emissor) revert SomenteEmissor();
        _;
    }

    constructor() {
        emissor = msg.sender;
    }

    /// @notice Cria dBRL para uma carteira (depósito em reais -> Real Digital).
    function emitir(address para, uint256 valor) external somenteEmissor {
        if (para == address(0)) revert EnderecoInvalido();
        totalSupply += valor;
        balanceOf[para] += valor;
        emit Transfer(address(0), para, valor);
    }

    /// @notice Destrói dBRL de uma carteira (resgate de Real Digital -> reais).
    function resgatar(address de, uint256 valor) external somenteEmissor {
        if (balanceOf[de] < valor) revert SaldoInsuficiente();
        balanceOf[de] -= valor;
        totalSupply -= valor;
        emit Transfer(de, address(0), valor);
    }

    function transfer(address para, uint256 valor) external returns (bool) {
        _transferir(msg.sender, para, valor);
        return true;
    }

    function approve(address gastador, uint256 valor) external returns (bool) {
        allowance[msg.sender][gastador] = valor;
        emit Approval(msg.sender, gastador, valor);
        return true;
    }

    function transferFrom(address de, address para, uint256 valor) external returns (bool) {
        uint256 permitido = allowance[de][msg.sender];
        if (permitido < valor) revert AutorizacaoInsuficiente();
        allowance[de][msg.sender] = permitido - valor;
        _transferir(de, para, valor);
        return true;
    }

    function _transferir(address de, address para, uint256 valor) internal {
        if (para == address(0)) revert EnderecoInvalido();
        if (balanceOf[de] < valor) revert SaldoInsuficiente();
        balanceOf[de] -= valor;
        balanceOf[para] += valor;
        emit Transfer(de, para, valor);
    }
}
