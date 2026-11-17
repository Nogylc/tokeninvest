// APLICAÇÃO: depósito/resgate em DREX e compra/venda de ativos tokenizados.
const regras = require("../domain/investimento");
const { ErroDominio } = require("../domain/consentimento");
const { decifrar } = require("../seguranca/criptografia");

function criarInvestimentoService({ repos, blockchain, openFinance, banco }) {
  function usuario(usuarioId) {
    const u = repos.usuarios.porId(usuarioId);
    if (!u || u.ativo === false) throw new ErroDominio("Usuário não encontrado.", 404);
    return u;
  }

  async function ativo(id, endereco) {
    const a = (await blockchain.listarAtivos(endereco)).find((x) => x.id === id);
    if (!a) throw new ErroDominio("Ativo não encontrado.", 404);
    return a;
  }

  async function resumo(usuarioId) {
    const { carteira } = usuario(usuarioId);
    return {
      endereco: carteira.endereco,
      saldoDrexCentavos: await blockchain.saldoDrex(carteira.endereco),
      ativos: (await blockchain.listarAtivos(carteira.endereco)).filter((a) => a.minhasCotas > 0),
      extrato: await blockchain.extrato(carteira.endereco),
      rede: await blockchain.infoRede(),
    };
  }

  const listarAtivos = (usuarioId) => blockchain.listarAtivos(usuario(usuarioId).carteira.endereco);

  // Reais (conta bancária) -> Pix via Open Finance -> emissão de dBRL na DLT
  async function depositar(usuarioId, valorReais) {
    const { carteira } = usuario(usuarioId);
    const centavos = regras.reaisParaCentavos(valorReais);
    regras.validarDeposito(centavos);
    const token = openFinance.tokenPara(usuarioId, "PAGAMENTOS_PIX");

    const pix = await banco.enviarPix(token, centavos);
    try {
      const tx = await blockchain.emitirDrex(carteira.endereco, centavos);
      repos.auditoria.registrar(usuarioId, "DEPOSITO_DREX", `${centavos} centavos`);
      return { pix, transacao: tx };
    } catch (e) {
      await banco.receberPix(token, centavos); // compensação: devolve o dinheiro ao banco
      throw e;
    }
  }

  // dBRL -> queima na DLT -> Pix de volta para a conta bancária
  async function resgatar(usuarioId, valorReais) {
    const { carteira } = usuario(usuarioId);
    const centavos = regras.reaisParaCentavos(valorReais);
    regras.validarResgate(centavos, await blockchain.saldoDrex(carteira.endereco));
    const token = openFinance.tokenPara(usuarioId, "PAGAMENTOS_PIX");

    const tx = await blockchain.resgatarDrex(carteira.endereco, centavos);
    try {
      const pix = await banco.receberPix(token, centavos);
      repos.auditoria.registrar(usuarioId, "RESGATE_DREX", `${centavos} centavos`);
      return { pix, transacao: tx };
    } catch (e) {
      await blockchain.emitirDrex(carteira.endereco, centavos); // compensação
      throw e;
    }
  }

  async function comprar(usuarioId, ativoId, quantidade) {
    const { carteira } = usuario(usuarioId);
    const a = await ativo(ativoId, carteira.endereco);
    const { quantidade: q, custo } = regras.validarCompra({
      quantidade, ativo: a, saldoDrexCentavos: await blockchain.saldoDrex(carteira.endereco), cotasAtuais: a.minhasCotas,
    });
    const tx = await blockchain.comprar(decifrar(carteira.chaveCifrada), ativoId, q, custo);
    repos.auditoria.registrar(usuarioId, "COMPRA_COTAS", `${q} ${a.simbolo}`);
    return { transacao: tx, quantidade: q, valorCentavos: custo };
  }

  async function vender(usuarioId, ativoId, quantidade) {
    const { carteira } = usuario(usuarioId);
    const a = await ativo(ativoId, carteira.endereco);
    const { quantidade: q } = regras.validarVenda({ quantidade, cotasAtuais: a.minhasCotas });
    const tx = await blockchain.vender(decifrar(carteira.chaveCifrada), ativoId, q);
    repos.auditoria.registrar(usuarioId, "VENDA_COTAS", `${q} ${a.simbolo}`);
    return { transacao: tx, quantidade: q, valorCentavos: q * a.precoCotaCentavos };
  }

  return { resumo, listarAtivos, depositar, resgatar, comprar, vender };
}

module.exports = { criarInvestimentoService };
