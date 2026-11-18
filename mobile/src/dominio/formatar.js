// Funções puras de apresentação (sem chamadas de rede).
export const reais = (centavos) =>
  (Number(centavos || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const data = (iso) => new Date(iso).toLocaleDateString("pt-BR");
export const dataHora = (iso) => new Date(iso).toLocaleString("pt-BR");

export const encurtar = (hash) => (hash ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : "");

export const STATUS_CONSENTIMENTO = {
  AGUARDANDO_AUTORIZACAO: "Aguardando autorização",
  AUTORIZADO: "Autorizado (falta confirmar)",
  ATIVO: "Ativo",
  REJEITADO: "Rejeitado",
  REVOGADO: "Revogado",
  EXPIRADO: "Expirado",
};

export const TIPO_TRANSACAO = {
  DEPOSITO_DREX: "Depósito (Pix → DREX)",
  RESGATE_DREX: "Resgate (DREX → Pix)",
  COMPRA: "Compra de cotas",
  VENDA: "Venda de cotas",
};
