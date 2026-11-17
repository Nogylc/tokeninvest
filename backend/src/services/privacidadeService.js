// APLICAÇÃO: direitos do titular (LGPD, art. 18) - acesso, portabilidade, revogação e eliminação.
const { ErroDominio } = require("../domain/consentimento");
const { decifrar } = require("../seguranca/criptografia");

function criarPrivacidadeService({ repos, blockchain, openFinance }) {
  function usuario(usuarioId) {
    const u = repos.usuarios.porId(usuarioId);
    if (!u || u.ativo === false) throw new ErroDominio("Usuário não encontrado.", 404);
    return u;
  }

  // Acesso + portabilidade: o titular baixa TODOS os seus dados em JSON
  function meusDados(usuarioId) {
    const u = usuario(usuarioId);
    repos.auditoria.registrar(usuarioId, "EXPORTACAO_DADOS");
    return {
      titular: { nome: u.nome, email: u.email, cpf: decifrar(u.cpfCifrado), criadoEm: u.criadoEm, aceiteTermosEm: u.aceiteTermosEm },
      carteiraBlockchain: u.carteira.endereco,
      consentimentosOpenFinance: openFinance.listar(usuarioId),
      registrosDeAcesso: repos.auditoria.doUsuario(usuarioId),
      observacao:
        "Na blockchain ficam apenas o endereço da carteira e as transações (dados pseudonimizados). Nenhum dado pessoal é gravado on-chain.",
    };
  }

  // Eliminação: anonimiza os dados pessoais. O histórico on-chain é imutável,
  // mas não contém dados pessoais, então perde o vínculo com a pessoa.
  async function excluirConta(usuarioId) {
    const u = usuario(usuarioId);
    const saldo = await blockchain.saldoDrex(u.carteira.endereco);
    const ativos = (await blockchain.listarAtivos(u.carteira.endereco)).filter((a) => a.minhasCotas > 0);
    if (saldo > 0 || ativos.length) {
      throw new ErroDominio("Venda suas cotas e resgate seu saldo em DREX antes de excluir a conta.", 409);
    }
    for (const c of openFinance.listar(usuarioId)) {
      if (["AGUARDANDO_AUTORIZACAO", "AUTORIZADO", "ATIVO"].includes(c.status)) await openFinance.revogar(usuarioId, c.id);
    }
    repos.usuarios.salvar({
      id: u.id, ativo: false, nome: "Titular removido", email: null, cpfCifrado: null, cpfHash: null,
      senhaHash: null, carteira: { endereco: u.carteira.endereco }, removidoEm: new Date().toISOString(),
    });
    repos.auditoria.registrar(usuarioId, "CONTA_ANONIMIZADA");
    return { mensagem: "Seus dados pessoais foram eliminados." };
  }

  return { meusDados, excluirConta };
}

module.exports = { criarPrivacidadeService };
