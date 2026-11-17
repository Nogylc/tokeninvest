// DOMÍNIO: regras do consentimento Open Finance.
// Funções puras: não conhecem Express, banco de dados nem blockchain.
//
// Ciclo de vida (baseado no padrão do Open Finance Brasil):
//   AGUARDANDO_AUTORIZACAO -> AUTORIZADO -> ATIVO (após confirmação explícita)
//                          \-> REJEITADO        \-> REVOGADO / EXPIRADO

const PERMISSOES_VALIDAS = {
  CONTAS_SALDO: "Consultar o saldo da sua conta",
  PAGAMENTOS_PIX: "Iniciar transferências Pix para converter reais em DREX",
};

const PRAZO_MINIMO_DIAS = 1;
const PRAZO_MAXIMO_DIAS = 365; // consentimento SEMPRE tem prazo determinado

class ErroDominio extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

function criarConsentimento({ id, usuarioId, banco, permissoes, prazoDias, agora = new Date() }) {
  if (!Array.isArray(permissoes) || permissoes.length === 0) {
    throw new ErroDominio("Escolha pelo menos uma permissão (consentimento específico).");
  }
  const invalidas = permissoes.filter((p) => !PERMISSOES_VALIDAS[p]);
  if (invalidas.length) throw new ErroDominio(`Permissões inválidas: ${invalidas.join(", ")}`);

  const dias = Number(prazoDias);
  if (!Number.isInteger(dias) || dias < PRAZO_MINIMO_DIAS || dias > PRAZO_MAXIMO_DIAS) {
    throw new ErroDominio(`O prazo deve ser entre ${PRAZO_MINIMO_DIAS} e ${PRAZO_MAXIMO_DIAS} dias.`);
  }

  return {
    id,
    usuarioId,
    banco,
    permissoes: [...new Set(permissoes)],
    status: "AGUARDANDO_AUTORIZACAO",
    criadoEm: agora.toISOString(),
    expiraEm: new Date(agora.getTime() + dias * 86400000).toISOString(),
    historico: [{ status: "AGUARDANDO_AUTORIZACAO", em: agora.toISOString() }],
  };
}

function mudarStatus(c, novo, agora = new Date()) {
  return { ...c, status: novo, historico: [...c.historico, { status: novo, em: agora.toISOString() }] };
}

function registrarAutorizacao(c, aprovado, agora = new Date()) {
  if (c.status !== "AGUARDANDO_AUTORIZACAO") {
    throw new ErroDominio("Este consentimento não está aguardando autorização.");
  }
  return mudarStatus(c, aprovado ? "AUTORIZADO" : "REJEITADO", agora);
}

// Etapa de CONFIRMAÇÃO: o usuário volta para o TokenInvest e confirma
// explicitamente. Evita fraude de redirecionamento.
function confirmar(c, agora = new Date()) {
  if (c.status !== "AUTORIZADO") {
    throw new ErroDominio("Só é possível confirmar um consentimento já autorizado pelo banco.");
  }
  return mudarStatus(c, "ATIVO", agora);
}

function revogar(c, agora = new Date()) {
  if (["REVOGADO", "REJEITADO", "EXPIRADO"].includes(c.status)) {
    throw new ErroDominio("Este consentimento já está encerrado.");
  }
  return mudarStatus(c, "REVOGADO", agora);
}

function atualizarExpiracao(c, agora = new Date()) {
  if (c.status === "ATIVO" && new Date(c.expiraEm) <= agora) return mudarStatus(c, "EXPIRADO", agora);
  return c;
}

/** Garante que o consentimento está ativo, dentro do prazo e cobre a permissão pedida. */
function exigirPermissao(c, permissao, agora = new Date()) {
  if (!c) throw new ErroDominio("Você ainda não conectou sua conta bancária via Open Finance.", 403);
  const atual = atualizarExpiracao(c, agora);
  if (atual.status !== "ATIVO") {
    throw new ErroDominio(`Consentimento ${atual.status.toLowerCase()}. Faça uma nova conexão.`, 403);
  }
  if (!atual.permissoes.includes(permissao)) {
    throw new ErroDominio(`O consentimento não inclui a permissão ${permissao}.`, 403);
  }
  return atual;
}

module.exports = {
  PERMISSOES_VALIDAS,
  ErroDominio,
  criarConsentimento,
  registrarAutorizacao,
  confirmar,
  revogar,
  atualizarExpiracao,
  exigirPermissao,
};
