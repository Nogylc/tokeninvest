// Teste de ponta a ponta da API: cadastro -> Open Finance -> DREX -> tokenização -> LGPD.
// Rodar com: npm test (na raiz) ou npm test -w backend
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const os = require("os");
const fs = require("fs");
const path = require("path");
const { iniciar } = require("../src/server");

const PORTA = 3099;
// Banco temporário: os testes nunca sujam backend/data/
const PASTA_TMP = fs.mkdtempSync(path.join(os.tmpdir(), "tokeninvest-fluxo-"));
const API = `http://127.0.0.1:${PORTA}`;
let servidor, token, consentimento;

async function chamar(metodo, caminho, corpo, tk = token) {
  const r = await fetch(API + caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(tk ? { Authorization: `Bearer ${tk}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, corpo: r.status === 204 ? null : await r.json() };
}

before(async () => { servidor = await iniciar({ porta: PORTA, caminhoBanco: path.join(PASTA_TMP, "teste.db") }); });
after(async () => {
  await new Promise((r) => servidor.close(r)); // fecha o banco antes de apagar a pasta
  fs.rmSync(PASTA_TMP, { recursive: true, force: true });
});

test("cadastro valida CPF e exige aceite da política de privacidade", async () => {
  const r1 = await chamar("POST", "/api/auth/cadastro", { nome: "Ana Teste", email: "ana@teste.com", cpf: "111.111.111-11", senha: "senha12345", aceiteTermos: true });
  assert.equal(r1.status, 400);
  const r2 = await chamar("POST", "/api/auth/cadastro", { nome: "Ana Teste", email: "ana@teste.com", cpf: "529.982.247-25", senha: "senha12345" });
  assert.equal(r2.status, 400);
});

test("cadastro devolve JWT e CPF mascarado", async () => {
  const r = await chamar("POST", "/api/auth/cadastro", { nome: "Ana Teste", email: "ana@teste.com", cpf: "529.982.247-25", senha: "senha12345", aceiteTermos: true });
  assert.equal(r.status, 201);
  assert.match(r.corpo.usuario.cpf, /^\*\*\*\.982\.247-\*\*$/);
  token = r.corpo.token;
  assert.ok(!JSON.stringify(JSON.parse(Buffer.from(token.split(".")[1], "base64url"))).includes("529"));
});

test("rotas protegidas recusam requisição sem JWT", async () => {
  assert.equal((await chamar("GET", "/api/carteira", null, null)).status, 401);
  assert.equal((await chamar("GET", "/api/carteira", null, "token-falso")).status, 401);
});

test("sem consentimento não é possível depositar", async () => {
  const r = await chamar("POST", "/api/carteira/depositar", { valor: 100 });
  assert.equal(r.status, 403);
});

test("fluxo Open Finance: consentimento -> autenticação no banco -> confirmação", async () => {
  const r = await chamar("POST", "/api/open-finance/consentimentos", { permissoes: ["CONTAS_SALDO", "PAGAMENTOS_PIX"], prazoDias: 90 });
  assert.equal(r.status, 201);
  assert.equal(r.corpo.consentimento.status, "AGUARDANDO_AUTORIZACAO");
  const url = new URL(r.corpo.urlAutorizacao);
  const p = Object.fromEntries(url.searchParams);

  // Usuário erra a senha do banco
  const errado = await chamar("POST", "/banco-simulado/api/autorizar", { consentId: p.consent_id, cpf: "52998224725", senha: "x", aprovar: true, redirect_uri: p.redirect_uri, state: p.state, code_challenge: p.code_challenge }, null);
  assert.equal(errado.status, 401);

  const banco = await chamar("POST", "/banco-simulado/api/autorizar", { consentId: p.consent_id, cpf: "52998224725", senha: "banco123", aprovar: true, redirect_uri: p.redirect_uri, state: p.state, code_challenge: p.code_challenge }, null);
  const volta = new URL(banco.corpo.redirectUrl);

  const ret = await chamar("POST", "/api/open-finance/retorno", { code: volta.searchParams.get("code"), state: volta.searchParams.get("state") });
  assert.equal(ret.corpo.status, "AUTORIZADO");
  assert.equal(ret.corpo.tokenBancoCifrado, undefined);

  // state é de uso único (proteção contra replay)
  const replay = await chamar("POST", "/api/open-finance/retorno", { code: volta.searchParams.get("code"), state: volta.searchParams.get("state") });
  assert.equal(replay.status, 400);

  // Antes da confirmação explícita ainda não dá para usar
  assert.equal((await chamar("GET", "/api/open-finance/saldo")).status, 403);
  const conf = await chamar("POST", `/api/open-finance/consentimentos/${ret.corpo.id}/confirmar`);
  assert.equal(conf.corpo.status, "ATIVO");
  consentimento = conf.corpo;

  const saldo = await chamar("GET", "/api/open-finance/saldo");
  assert.equal(saldo.corpo.saldoCentavos, 500000);
});

test("depósito via Pix gera DREX na blockchain", async () => {
  const r = await chamar("POST", "/api/carteira/depositar", { valor: 1000 });
  assert.equal(r.status, 200);
  assert.match(r.corpo.transacao.hash, /^0x/);
  const c = await chamar("GET", "/api/carteira");
  assert.equal(c.corpo.saldoDrexCentavos, 100000);
  assert.equal((await chamar("GET", "/api/open-finance/saldo")).corpo.saldoCentavos, 400000);
});

test("compra e venda de cotas tokenizadas", async () => {
  const compra = await chamar("POST", "/api/ativos/cdb-rio-2027/comprar", { quantidade: 20 });
  assert.equal(compra.status, 200);
  const limite = await chamar("POST", "/api/ativos/imovel-manaus/comprar", { quantidade: 101 });
  assert.equal(limite.status, 400);
  const venda = await chamar("POST", "/api/ativos/cdb-rio-2027/vender", { quantidade: 5 });
  assert.equal(venda.status, 200);
  const c = await chamar("GET", "/api/carteira");
  assert.equal(c.corpo.ativos[0].minhasCotas, 15);
  assert.equal(c.corpo.saldoDrexCentavos, 100000 - 20000 + 5000);
  assert.ok(c.corpo.extrato.some((e) => e.tipo === "COMPRA"));
});

test("LGPD: exportação de dados e revogação do consentimento", async () => {
  const d = await chamar("GET", "/api/privacidade/meus-dados");
  assert.equal(d.corpo.titular.cpf, "52998224725");
  const rev = await chamar("DELETE", `/api/open-finance/consentimentos/${consentimento.id}`);
  assert.equal(rev.corpo.status, "REVOGADO");
  assert.equal((await chamar("GET", "/api/open-finance/saldo")).status, 403);
  const excluir = await chamar("DELETE", "/api/privacidade/conta");
  assert.equal(excluir.status, 409); // ainda tem investimentos
});
