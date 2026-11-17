// APLICAÇÃO: fluxo Open Finance = CONSENTIMENTO -> AUTENTICAÇÃO (no banco) -> CONFIRMAÇÃO.
const crypto = require("crypto");
const dominio = require("../domain/consentimento");
const { ErroDominio } = dominio;
const { cifrar, decifrar } = require("../seguranca/criptografia");
const { gerarPkce, aleatorio } = require("../seguranca/tokens");

function criarOpenFinanceService({ repos, banco, urlFrontend }) {
  const redirectUri = `${urlFrontend}/open-finance/retorno`;

  function doUsuario(usuarioId, id) {
    const c = repos.consentimentos.porId(id);
    if (!c || c.usuarioId !== usuarioId) throw new ErroDominio("Consentimento não encontrado.", 404);
    return c;
  }

  // Remove dados internos (token do banco) antes de responder
  const publico = ({ tokenBancoCifrado, ...c }) => c;

  // 1) CONSENTIMENTO: usuário escolhe O QUÊ compartilhar e POR QUANTO TEMPO
  async function iniciar(usuarioId, { permissoes, prazoDias }) {
    const usuario = repos.usuarios.porId(usuarioId);
    let c = dominio.criarConsentimento({ id: crypto.randomUUID(), usuarioId, banco: "Banco Rio (simulado)", permissoes, prazoDias });

    const { consentId } = await banco.criarConsentimento({
      cpf: decifrar(usuario.cpfCifrado),
      permissoes: c.permissoes,
      expiraEm: c.expiraEm,
    });
    c = repos.consentimentos.salvar({ ...c, consentIdBanco: consentId });

    // OAuth2: state (anti-CSRF) + PKCE
    const state = aleatorio();
    const pkce = gerarPkce();
    repos.sessoesOAuth.salvar(state, { consentimentoId: c.id, verifier: pkce.verifier, usuarioId });
    repos.auditoria.registrar(usuarioId, "CONSENTIMENTO_CRIADO", c.permissoes.join(","));

    // 2) AUTENTICAÇÃO: redireciona o usuário para a instituição detentora dos dados
    const url = new URL(`${urlFrontend}/banco-simulado`);
    url.search = new URLSearchParams({
      consent_id: consentId, state, redirect_uri: redirectUri,
      code_challenge: pkce.challenge, code_challenge_method: "S256",
    }).toString();
    return { consentimento: publico(c), urlAutorizacao: url.toString() };
  }

  // Volta do banco com o "authorization code"
  async function retorno(usuarioId, { code, state, error }) {
    const sessao = repos.sessoesOAuth.consumir(state);
    if (!sessao || sessao.usuarioId !== usuarioId) throw new ErroDominio("Retorno inválido (state não confere).", 400);
    let c = repos.consentimentos.porId(sessao.consentimentoId);

    if (error) {
      c = repos.consentimentos.salvar(dominio.registrarAutorizacao(c, false));
      repos.auditoria.registrar(usuarioId, "CONSENTIMENTO_REJEITADO");
      return publico(c);
    }
    const token = await banco.trocarCodigo({ code, verifier: sessao.verifier, redirectUri });
    c = dominio.registrarAutorizacao(c, true);
    c = repos.consentimentos.salvar({ ...c, tokenBancoCifrado: cifrar(token.access_token) });
    repos.auditoria.registrar(usuarioId, "CONSENTIMENTO_AUTORIZADO");
    return publico(c);
  }

  // 3) CONFIRMAÇÃO explícita no TokenInvest (evita fraude de redirecionamento)
  function confirmar(usuarioId, id) {
    const c = repos.consentimentos.salvar(dominio.confirmar(doUsuario(usuarioId, id)));
    repos.auditoria.registrar(usuarioId, "CONSENTIMENTO_CONFIRMADO");
    return publico(c);
  }

  async function revogar(usuarioId, id) {
    const atual = doUsuario(usuarioId, id);
    const c = dominio.revogar(atual);
    await banco.revogar(atual.consentIdBanco);
    repos.consentimentos.salvar({ ...c, tokenBancoCifrado: undefined });
    repos.auditoria.registrar(usuarioId, "CONSENTIMENTO_REVOGADO");
    return publico(c);
  }

  function listar(usuarioId) {
    return repos.consentimentos
      .doUsuario(usuarioId)
      .map((c) => repos.consentimentos.salvar(dominio.atualizarExpiracao(c)))
      .map(publico)
      .reverse();
  }

  /** Devolve o token do banco SÓ se o consentimento cobrir a permissão. */
  function tokenPara(usuarioId, permissao) {
    const c = dominio.exigirPermissao(repos.consentimentos.ativoDoUsuario(usuarioId), permissao);
    return decifrar(c.tokenBancoCifrado);
  }

  async function saldoBancario(usuarioId) {
    const saldo = await banco.consultarSaldo(tokenPara(usuarioId, "CONTAS_SALDO"));
    repos.auditoria.registrar(usuarioId, "LEITURA_SALDO_BANCARIO");
    return saldo;
  }

  return { iniciar, retorno, confirmar, revogar, listar, tokenPara, saldoBancario, permissoes: dominio.PERMISSOES_VALIDAS };
}

module.exports = { criarOpenFinanceService };
