// INFRA: adaptador entre o backend e os contratos inteligentes (DLT).
// O resto do backend não sabe nada de ethers/Hardhat: só chama estas funções.
//
// DIÁRIO DE OPERAÇÕES (event sourcing): a rede Hardhat roda em memória e some
// quando o processo termina. Para a blockchain continuar consistente com o
// banco de dados, toda operação que ALTERA a cadeia e dá certo é anotada em
// ordem no diário (tabela operacoes_blockchain). No próximo startup, depois de
// publicar os contratos (publicação determinística: mesma conta e mesma ordem
// geram os mesmos endereços), o diário é reexecutado na mesma ordem.
// Operações que falham não entram no diário.
const { iniciarRede } = require("tokeninvest-blockchain");
const { ErroDominio } = require("../domain/consentimento");

// Mensagens amigáveis para os erros customizados dos contratos
const ERROS_CONTRATO = {
  NaoHabilitado: "Investidor não habilitado (KYC) no Sandbox.",
  ContratoPausado: "As operações deste ativo estão pausadas pelo emissor.",
  SemCotasDisponiveis: "Não há cotas suficientes disponíveis.",
  LimiteSandboxExcedido: "Limite de cotas por investidor do Sandbox excedido.",
  CotasInsuficientes: "Você não possui essa quantidade de cotas.",
  SaldoInsuficiente: "Saldo em DREX insuficiente.",
  AutorizacaoInsuficiente: "Autorização de débito em DREX insuficiente.",
};

/**
 * @param catalogo ativos a publicar
 * @param diario   { registrar(tipo, dados), todas() } (opcional: sem ele, nada é anotado)
 * @param chavePrivadaDe (endereco) => chave privada do dono da carteira, usada na reexecução
 */
async function criarBlockchainGateway(catalogo, { diario, chavePrivadaDe } = {}) {
  const rede = await iniciarRede({ ativos: catalogo });
  const { provider, emissor, drex, ethers } = rede;

  const ativos = new Map(); // id -> { contrato, meta }
  for (let i = 0; i < catalogo.length; i++) ativos.set(catalogo[i].id, { contrato: rede.ativos[i], meta: catalogo[i] });

  let anotando = true; // fica false durante a reexecução do diário
  const anotar = (tipo, dados) => {
    if (anotando && diario) diario.registrar(tipo, dados);
  };

  function traduzirErro(e) {
    let nome = e.revert?.name;
    if (!nome && e.data) {
      for (const c of [drex, ...[...ativos.values()].map((a) => a.contrato)]) {
        try { nome = c.interface.parseError(e.data)?.name; } catch { /* ignora */ }
        if (nome) break;
      }
    }
    return new ErroDominio(ERROS_CONTRATO[nome] || "Transação recusada pela blockchain.", 422);
  }

  async function executar(promessaTx) {
    try {
      const tx = await promessaTx;
      const recibo = await tx.wait();
      return { hash: recibo.hash, bloco: recibo.blockNumber };
    } catch (e) {
      if (e instanceof ErroDominio) throw e;
      throw traduzirErro(e);
    }
  }

  function obterAtivo(id) {
    const a = ativos.get(id);
    if (!a) throw new ErroDominio("Ativo não encontrado.", 404);
    return a;
  }

  const carteiraDe = (chavePrivada) => new ethers.Wallet(chavePrivada, provider);

  // ---------- operações "cruas" (sem anotar no diário) ----------
  async function prepararCarteira(endereco) {
    await executar(emissor.sendTransaction({ to: endereco, value: ethers.parseEther("1") })); // paga o "gás"
    for (const { contrato } of ativos.values()) {
      await executar(contrato.habilitarInvestidor(endereco, true)); // habilitação KYC no Sandbox
    }
  }
  const emitir = (endereco, centavos) => executar(drex.emitir(endereco, centavos));
  const resgatar = (endereco, centavos) => executar(drex.resgatar(endereco, centavos));
  async function comprar(chavePrivada, ativoId, quantidade, custo) {
    const { contrato } = obterAtivo(ativoId);
    const carteira = carteiraDe(chavePrivada);
    await executar(drex.connect(carteira).approve(await contrato.getAddress(), custo));
    return executar(contrato.connect(carteira).comprar(quantidade));
  }
  function vender(chavePrivada, ativoId, quantidade) {
    const { contrato } = obterAtivo(ativoId);
    return executar(contrato.connect(carteiraDe(chavePrivada)).vender(quantidade));
  }

  const gateway = {
    /** Só gera o par de chaves (acontece uma única vez, no cadastro). Não toca na cadeia. */
    gerarCarteira() {
      const carteira = ethers.Wallet.createRandom();
      return { endereco: carteira.address, chavePrivada: carteira.privateKey };
    },

    /** Financia com ETH e habilita o KYC nos ativos. Vai para o diário e é reexecutado. */
    async prepararCarteira(endereco) {
      await prepararCarteira(endereco);
      anotar("CRIAR_CARTEIRA", { endereco });
    },

    /** Carteira custodiada: gera chaves + prepara na cadeia (mantém a assinatura antiga). */
    async criarCarteira() {
      const carteira = gateway.gerarCarteira();
      await gateway.prepararCarteira(carteira.endereco);
      return carteira;
    },

    async saldoDrex(endereco) {
      return Number(await drex.balanceOf(endereco));
    },

    async emitirDrex(endereco, centavos) {
      const tx = await emitir(endereco, centavos);
      anotar("EMITIR", { endereco, centavos });
      return tx;
    },

    async resgatarDrex(endereco, centavos) {
      const tx = await resgatar(endereco, centavos);
      anotar("RESGATAR", { endereco, centavos });
      return tx;
    },

    async listarAtivos(endereco) {
      const lista = [];
      for (const [id, { contrato, meta }] of ativos) {
        lista.push({
          id,
          nome: await contrato.nome(),
          simbolo: await contrato.simbolo(),
          descricao: meta.descricao,
          rentabilidadeEstimada: meta.rentabilidadeEstimada,
          enderecoContrato: await contrato.getAddress(),
          totalCotas: Number(await contrato.totalCotas()),
          cotasDisponiveis: Number(await contrato.cotasDisponiveis()),
          precoCotaCentavos: Number(await contrato.precoCota()),
          limitePorInvestidor: Number(await contrato.limitePorInvestidor()),
          pausado: await contrato.pausado(),
          minhasCotas: endereco ? Number(await contrato.cotasDe(endereco)) : 0,
        });
      }
      return lista;
    },

    async comprar(chavePrivada, ativoId, quantidade, custo) {
      const tx = await comprar(chavePrivada, ativoId, quantidade, custo);
      anotar("COMPRAR", { endereco: carteiraDe(chavePrivada).address, ativoId, quantidade, custo });
      return tx;
    },

    async vender(chavePrivada, ativoId, quantidade) {
      const tx = await vender(chavePrivada, ativoId, quantidade);
      anotar("VENDER", { endereco: carteiraDe(chavePrivada).address, ativoId, quantidade });
      return tx;
    },

    /** Extrato montado a partir dos EVENTOS gravados no livro-razão. */
    async extrato(endereco) {
      const itens = [];
      const add = (ev, tipo, valorCentavos, extra = {}) =>
        itens.push({ tipo, valorCentavos: Number(valorCentavos), bloco: ev.blockNumber, hash: ev.transactionHash, ...extra });

      for (const ev of await drex.queryFilter(drex.filters.Transfer(ethers.ZeroAddress, endereco))) add(ev, "DEPOSITO_DREX", ev.args.value);
      for (const ev of await drex.queryFilter(drex.filters.Transfer(endereco, ethers.ZeroAddress))) add(ev, "RESGATE_DREX", ev.args.value);
      for (const [id, { contrato }] of ativos) {
        for (const ev of await contrato.queryFilter(contrato.filters.Compra(endereco))) {
          add(ev, "COMPRA", ev.args.valorPago, { ativo: id, cotas: Number(ev.args.cotas) });
        }
        for (const ev of await contrato.queryFilter(contrato.filters.Venda(endereco))) {
          add(ev, "VENDA", ev.args.valorRecebido, { ativo: id, cotas: Number(ev.args.cotas) });
        }
      }
      return itens.sort((a, b) => b.bloco - a.bloco);
    },

    async infoRede() {
      return {
        rede: "Hardhat Network (DLT local)",
        chainId: Number((await provider.getNetwork()).chainId),
        blocoAtual: await provider.getBlockNumber(),
        contratoDrex: await drex.getAddress(),
      };
    },

    /**
     * Reexecuta o diário em ordem, sem anotar de novo. Devolve { reexecutadas, ignoradas, falhas }.
     * Uma operação é ignorada quando a chave do dono da carteira não existe mais
     * (conta anonimizada pela LGPD). Nesse caso o saldo dela já era zero, então o
     * estado final dos contratos continua consistente.
     */
    async restaurarDoDiario() {
      const resultado = { reexecutadas: 0, ignoradas: 0, falhas: 0 };
      if (!diario) return resultado;
      const operacoes = diario.todas();
      anotando = false;
      try {
        for (const op of operacoes) {
          try {
            if (op.tipo === "CRIAR_CARTEIRA") {
              await prepararCarteira(op.endereco);
            } else if (op.tipo === "EMITIR") {
              await emitir(op.endereco, op.centavos);
            } else if (op.tipo === "RESGATAR") {
              await resgatar(op.endereco, op.centavos);
            } else if (op.tipo === "COMPRAR" || op.tipo === "VENDER") {
              const chave = chavePrivadaDe ? chavePrivadaDe(op.endereco) : null;
              if (!chave) { resultado.ignoradas += 1; continue; }
              if (op.tipo === "COMPRAR") await comprar(chave, op.ativoId, op.quantidade, op.custo);
              else await vender(chave, op.ativoId, op.quantidade);
            } else {
              resultado.ignoradas += 1;
              continue;
            }
            resultado.reexecutadas += 1;
          } catch (e) {
            resultado.falhas += 1;
            console.warn(`   [diário] falha ao reexecutar #${op.id} ${op.tipo}: ${e.message}`);
          }
        }
      } finally {
        anotando = true;
      }
      return resultado;
    },
  };

  return gateway;
}

module.exports = { criarBlockchainGateway };
