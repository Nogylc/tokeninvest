// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDrex {
    function transfer(address para, uint256 valor) external returns (bool);
    function transferFrom(address de, address para, uint256 valor) external returns (bool);
}

/**
 * @title AtivoTokenizado
 * @notice Representa um ativo real (ex.: um CDB ou um recebível) dividido em
 *         cotas digitais. Cada cota é um token registrado na DLT.
 *
 * Regras de negócio (tudo fica gravado de forma imutável no livro-razão):
 *  - O investidor compra cotas pagando em dBRL (DREX simulado).
 *  - O investidor pode vender as cotas de volta a qualquer hora (liquidez 24/7):
 *    o próprio contrato guarda uma reserva em dBRL para pagar as vendas.
 *  - Regras do Sandbox Regulatório:
 *      * só investidores habilitados (KYC aprovado) podem operar;
 *      * existe um limite máximo de cotas por investidor;
 *      * o emissor pode pausar o contrato em caso de emergência.
 */
contract AtivoTokenizado {
    string public nome;
    string public simbolo;
    IDrex public immutable drex;
    address public immutable emissor;

    uint256 public immutable totalCotas;
    uint256 public immutable precoCota; // em centavos de dBRL
    uint256 public immutable limitePorInvestidor; // regra do Sandbox

    uint256 public cotasDisponiveis;
    bool public pausado;

    mapping(address => uint256) public cotasDe;
    mapping(address => bool) public habilitado;

    bool private _travado; // proteção contra reentrância

    event InvestidorHabilitado(address indexed investidor, bool habilitado);
    event Compra(address indexed investidor, uint256 cotas, uint256 valorPago);
    event Venda(address indexed investidor, uint256 cotas, uint256 valorRecebido);
    event Pausa(bool pausado);

    error SomenteEmissor();
    error NaoHabilitado();
    error ContratoPausado();
    error QuantidadeInvalida();
    error SemCotasDisponiveis();
    error LimiteSandboxExcedido();
    error CotasInsuficientes();
    error Reentrancia();

    modifier somenteEmissor() {
        if (msg.sender != emissor) revert SomenteEmissor();
        _;
    }

    modifier operacaoPermitida(uint256 quantidade) {
        if (pausado) revert ContratoPausado();
        if (!habilitado[msg.sender]) revert NaoHabilitado();
        if (quantidade == 0) revert QuantidadeInvalida();
        _;
    }

    modifier semReentrancia() {
        if (_travado) revert Reentrancia();
        _travado = true;
        _;
        _travado = false;
    }

    constructor(
        string memory _nome,
        string memory _simbolo,
        address _drex,
        uint256 _totalCotas,
        uint256 _precoCota,
        uint256 _limitePorInvestidor
    ) {
        nome = _nome;
        simbolo = _simbolo;
        drex = IDrex(_drex);
        emissor = msg.sender;
        totalCotas = _totalCotas;
        cotasDisponiveis = _totalCotas;
        precoCota = _precoCota;
        limitePorInvestidor = _limitePorInvestidor;
    }

    /// @notice Emissor aprova (ou bloqueia) um investidor após o KYC.
    function habilitarInvestidor(address investidor, bool valor) external somenteEmissor {
        habilitado[investidor] = valor;
        emit InvestidorHabilitado(investidor, valor);
    }

    /// @notice Compra cotas. O investidor precisa ter dado approve em dBRL antes.
    function comprar(uint256 quantidade) external operacaoPermitida(quantidade) semReentrancia {
        if (quantidade > cotasDisponiveis) revert SemCotasDisponiveis();
        if (cotasDe[msg.sender] + quantidade > limitePorInvestidor) revert LimiteSandboxExcedido();

        uint256 valor = quantidade * precoCota;

        // Efeitos antes da interação externa (padrão checks-effects-interactions)
        cotasDisponiveis -= quantidade;
        cotasDe[msg.sender] += quantidade;

        drex.transferFrom(msg.sender, address(this), valor);
        emit Compra(msg.sender, quantidade, valor);
    }

    /// @notice Vende cotas de volta e recebe dBRL na hora (liquidez imediata).
    function vender(uint256 quantidade) external operacaoPermitida(quantidade) semReentrancia {
        if (cotasDe[msg.sender] < quantidade) revert CotasInsuficientes();

        uint256 valor = quantidade * precoCota;

        cotasDe[msg.sender] -= quantidade;
        cotasDisponiveis += quantidade;

        drex.transfer(msg.sender, valor);
        emit Venda(msg.sender, quantidade, valor);
    }

    /// @notice Botão de emergência: trava compras e vendas.
    function definirPausa(bool valor) external somenteEmissor {
        pausado = valor;
        emit Pausa(valor);
    }
}
