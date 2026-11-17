// APLICAÇÃO: cadastro e login (orquestra domínio + segurança + infra).
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { validarCadastro, mascararCpf } = require("../domain/usuario");
const { ErroDominio } = require("../domain/consentimento");
const { cifrar, hashBusca } = require("../seguranca/criptografia");
const { gerarJwt } = require("../seguranca/tokens");

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 5 * 60 * 1000;

function criarAuthService({ repos, blockchain }) {
  const tentativas = new Map(); // email -> { erros, bloqueadoAte }

  function dadosPublicos(u) {
    return { id: u.id, nome: u.nome, email: u.email, cpf: u.cpfMascarado, carteira: u.carteira.endereco };
  }

  async function cadastrar(entrada) {
    const dados = validarCadastro(entrada);
    if (repos.usuarios.porEmail(dados.email)) throw new ErroDominio("E-mail já cadastrado.", 409);
    const cpfHash = hashBusca(dados.cpf);
    if (repos.usuarios.porCpfHash(cpfHash)) throw new ErroDominio("CPF já cadastrado.", 409);

    const carteira = await blockchain.criarCarteira();
    const usuario = repos.usuarios.salvar({
      id: crypto.randomUUID(),
      nome: dados.nome,
      email: dados.email,
      cpfCifrado: cifrar(dados.cpf), // CPF nunca fica em texto puro
      cpfHash,
      cpfMascarado: mascararCpf(dados.cpf), // versão mascarada para exibir nas telas
      senhaHash: await bcrypt.hash(String(entrada.senha), 10),
      carteira: { endereco: carteira.endereco, chaveCifrada: cifrar(carteira.chavePrivada) },
      aceiteTermosEm: new Date().toISOString(),
      criadoEm: new Date().toISOString(),
    });
    repos.auditoria.registrar(usuario.id, "CADASTRO", "Aceite da Política de Privacidade");
    return { token: gerarJwt(usuario), usuario: dadosPublicos(usuario) };
  }

  async function login({ email, senha }) {
    const chave = String(email || "").trim().toLowerCase();
    const t = tentativas.get(chave) || { erros: 0, bloqueadoAte: 0 };
    if (t.bloqueadoAte > Date.now()) throw new ErroDominio("Muitas tentativas. Tente novamente em alguns minutos.", 429);

    const u = repos.usuarios.porEmail(chave);
    const ok = u && u.ativo !== false && (await bcrypt.compare(String(senha || ""), u.senhaHash));
    if (!ok) {
      t.erros += 1;
      if (t.erros >= MAX_TENTATIVAS) Object.assign(t, { erros: 0, bloqueadoAte: Date.now() + BLOQUEIO_MS });
      tentativas.set(chave, t);
      throw new ErroDominio("E-mail ou senha inválidos.", 401); // mensagem genérica de propósito
    }
    tentativas.delete(chave);
    repos.auditoria.registrar(u.id, "LOGIN");
    return { token: gerarJwt(u), usuario: dadosPublicos(u) };
  }

  function perfil(usuarioId) {
    const u = repos.usuarios.porId(usuarioId);
    if (!u || u.ativo === false) throw new ErroDominio("Usuário não encontrado.", 404);
    return dadosPublicos(u);
  }

  return { cadastrar, login, perfil };
}

module.exports = { criarAuthService };
