// =====================================================================
// BANCO SIMULADO ("Banco Rio") - instituição TRANSMISSORA de dados.
// Simula outra instituição do ecossistema Open Finance. Fica isolado do
// TokenInvest: a única forma de falar com ele é pela API REST abaixo.
//
//  POST /consentimentos           (TokenInvest cria o pedido, com client_id/secret)
//  GET  /consentimentos/:id       (tela do banco mostra o que foi pedido)
//  POST /autorizar                (cliente se AUTENTICA no banco e aprova/nega)
//  POST /token                    (OAuth2: troca code + PKCE por access_token)
//  GET  /contas/saldo             (Bearer token; permissão CONTAS_SALDO)
//  POST /pix/enviar               (Bearer token; permissão PAGAMENTOS_PIX)
//  POST /pix/receber              (Bearer token; crédito de resgate)
//  DELETE /consentimentos/:id     (revogação)
//
// Persistência: contas, consentimentos e tokens ficam nas tabelas banco_*
// do SQLite. Os authorization codes duram 2 minutos e ficam só em memória.
// =====================================================================
const express = require("express");
const crypto = require("crypto");
const { validarPkce, aleatorio } = require("../seguranca/tokens");

const SENHA_DEMO = "banco123"; // senha do internet banking simulado (só para demonstração)
const SALDO_INICIAL = 500000; // R$ 5.000,00 para toda conta nova

function criarBancoSimulado({ clientes, bancoDeDados }) {
  const router = express.Router();
  const bd = bancoDeDados;
  const codigos = new Map(); // code -> { consentId, challenge, redirectUri, expira }

  // ---------- acesso às tabelas banco_* ----------
  const lerConsentimento = (id) => {
    const l = bd.primeiro("SELECT dados FROM banco_consentimentos WHERE id = ?", [id ?? null]);
    return l ? JSON.parse(l.dados) : undefined;
  };
  // O código altera o objeto diretamente (c.status = ...): sempre salvar depois.
  const salvarConsentimento = (c) =>
    bd.executar(
      `INSERT INTO banco_consentimentos (id, cpf_hash, status, expira_em, dados) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET cpf_hash = excluded.cpf_hash, status = excluded.status, expira_em = excluded.expira_em, dados = excluded.dados`,
      [c.id, c.cpfHash, c.status, c.expiraEm ?? null, JSON.stringify(c)]
    );

  const hashCpf = (cpf) => crypto.createHash("sha256").update("banco-rio:" + cpf).digest("hex");
  const conta = (cpfHash) => {
    const l = bd.primeiro("SELECT saldo FROM banco_contas WHERE cpf_hash = ?", [cpfHash]);
    if (l) return { saldo: Number(l.saldo) };
    bd.executar("INSERT INTO banco_contas (cpf_hash, saldo) VALUES (?, ?)", [cpfHash, SALDO_INICIAL]);
    return { saldo: SALDO_INICIAL };
  };
  const salvarConta = (cpfHash, ct) => bd.executar("UPDATE banco_contas SET saldo = ? WHERE cpf_hash = ?", [ct.saldo, cpfHash]);

  const lerToken = (token) => {
    const l = bd.primeiro("SELECT consent_id, expira FROM banco_tokens WHERE token = ?", [token]);
    return l ? { consentId: l.consent_id, expira: Number(l.expira) } : undefined;
  };
  const salvarToken = (token, info) =>
    bd.executar("INSERT INTO banco_tokens (token, consent_id, expira) VALUES (?, ?, ?)", [token, info.consentId, info.expira]);
  const apagarTokensDoConsentimento = (consentId) => bd.executar("DELETE FROM banco_tokens WHERE consent_id = ?", [consentId]);

  const erro = (res, status, codigo, descricao) => res.status(status).json({ error: codigo, error_description: descricao });

  function autenticarCliente(req, res) {
    const { client_id, client_secret } = req.body || {};
    const cliente = clientes[client_id];
    if (!cliente || cliente.secret !== client_secret) {
      erro(res, 401, "invalid_client", "Instituição receptora não reconhecida.");
      return null;
    }
    return cliente;
  }

  function autenticarToken(req, res, permissao) {
    const token = (req.headers.authorization || "").replace(/^Bearer /, "");
    const info = lerToken(token);
    if (!info || info.expira < Date.now()) return erro(res, 401, "invalid_token", "Token inválido ou expirado."), null;
    const c = lerConsentimento(info.consentId);
    if (!c || c.status !== "AUTORIZADO" || new Date(c.expiraEm) < new Date()) {
      return erro(res, 403, "consent_invalid", "Consentimento revogado ou expirado."), null;
    }
    if (!c.permissoes.includes(permissao)) return erro(res, 403, "insufficient_scope", "Permissão não concedida."), null;
    return c;
  }

  router.post("/consentimentos", (req, res) => {
    const cliente = autenticarCliente(req, res);
    if (!cliente) return;
    const { cpf, permissoes, expiraEm } = req.body;
    const id = "urn:bancorio:" + crypto.randomUUID();
    salvarConsentimento({
      id, clientId: req.body.client_id, nomeCliente: cliente.nome,
      cpfHash: hashCpf(cpf), permissoes, expiraEm, status: "AGUARDANDO_AUTORIZACAO",
    });
    res.status(201).json({ consentId: id, status: "AGUARDANDO_AUTORIZACAO" });
  });

  router.get("/consentimentos/:id", (req, res) => {
    const c = lerConsentimento(req.params.id);
    if (!c) return erro(res, 404, "not_found", "Consentimento não encontrado.");
    res.json({ consentId: c.id, instituicaoReceptora: c.nomeCliente, permissoes: c.permissoes, expiraEm: c.expiraEm, status: c.status });
  });

  // AUTENTICAÇÃO: o cliente prova quem é PARA O BANCO (o TokenInvest nunca vê a senha do banco).
  router.post("/autorizar", (req, res) => {
    const { consentId, cpf, senha, aprovar, redirect_uri, state, code_challenge } = req.body || {};
    const c = lerConsentimento(consentId);
    if (!c || c.status !== "AGUARDANDO_AUTORIZACAO") return erro(res, 400, "invalid_request", "Consentimento inválido.");
    const cliente = clientes[c.clientId];
    if (!cliente.redirectUris.includes(redirect_uri)) return erro(res, 400, "invalid_redirect", "redirect_uri não cadastrada.");

    const url = new URL(redirect_uri);
    url.searchParams.set("state", state);
    if (!aprovar) {
      c.status = "REJEITADO";
      salvarConsentimento(c);
      url.searchParams.set("error", "access_denied");
      return res.json({ redirectUrl: url.toString() });
    }
    if (hashCpf(String(cpf).replace(/\D/g, "")) !== c.cpfHash || senha !== SENHA_DEMO) {
      return erro(res, 401, "access_denied", "CPF ou senha do banco incorretos.");
    }
    c.status = "AUTORIZADO";
    salvarConsentimento(c);
    conta(c.cpfHash);
    const code = aleatorio(24);
    codigos.set(code, { consentId, challenge: code_challenge, redirectUri: redirect_uri, expira: Date.now() + 120000 });
    url.searchParams.set("code", code);
    res.json({ redirectUrl: url.toString() });
  });

  // OAuth2 - Authorization Code + PKCE
  router.post("/token", (req, res) => {
    if (!autenticarCliente(req, res)) return;
    const { grant_type, code, code_verifier, redirect_uri } = req.body;
    const info = codigos.get(code);
    codigos.delete(code); // code de USO ÚNICO
    if (grant_type !== "authorization_code" || !info || info.expira < Date.now() || info.redirectUri !== redirect_uri) {
      return erro(res, 400, "invalid_grant", "Código inválido ou expirado.");
    }
    if (!validarPkce(code_verifier, info.challenge)) return erro(res, 400, "invalid_grant", "PKCE inválido.");
    const access_token = aleatorio(32);
    salvarToken(access_token, { consentId: info.consentId, expira: Date.now() + 3600000 });
    res.json({ access_token, token_type: "Bearer", expires_in: 3600, consent_id: info.consentId });
  });

  router.get("/contas/saldo", (req, res) => {
    const c = autenticarToken(req, res, "CONTAS_SALDO");
    if (!c) return;
    res.json({ moeda: "BRL", saldoCentavos: conta(c.cpfHash).saldo, atualizadoEm: new Date().toISOString() });
  });

  router.post("/pix/enviar", (req, res) => {
    const c = autenticarToken(req, res, "PAGAMENTOS_PIX");
    if (!c) return;
    const valor = Number(req.body.valorCentavos);
    const ct = conta(c.cpfHash);
    if (!Number.isInteger(valor) || valor <= 0) return erro(res, 400, "invalid_amount", "Valor inválido.");
    if (valor > ct.saldo) return erro(res, 422, "insufficient_funds", "Saldo insuficiente no banco.");
    ct.saldo -= valor;
    salvarConta(c.cpfHash, ct);
    res.json({ endToEndId: "E" + Date.now() + aleatorio(6), valorCentavos: valor, saldoCentavos: ct.saldo });
  });

  router.post("/pix/receber", (req, res) => {
    const c = autenticarToken(req, res, "PAGAMENTOS_PIX");
    if (!c) return;
    const valor = Number(req.body.valorCentavos);
    if (!Number.isInteger(valor) || valor <= 0) return erro(res, 400, "invalid_amount", "Valor inválido.");
    const ct = conta(c.cpfHash);
    ct.saldo += valor;
    salvarConta(c.cpfHash, ct);
    res.json({ endToEndId: "E" + Date.now() + aleatorio(6), valorCentavos: valor, saldoCentavos: ct.saldo });
  });

  router.delete("/consentimentos/:id", (req, res) => {
    if (!autenticarCliente(req, res)) return;
    const c = lerConsentimento(req.params.id);
    if (c) {
      c.status = "REVOGADO";
      salvarConsentimento(c);
    }
    apagarTokensDoConsentimento(req.params.id);
    res.status(204).end();
  });

  return router;
}

module.exports = { criarBancoSimulado, SENHA_DEMO };
