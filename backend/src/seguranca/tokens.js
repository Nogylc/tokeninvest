// JWT (sessão do app) e PKCE/state (fluxo OAuth2 com o banco).
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../config");

// O segredo é lido a cada uso porque só fica definido depois do startup (infra/segredos.js).
function segredo() {
  if (!config.jwtSegredo) throw new Error("JWT_SECRET não carregado: inicie o servidor por server.js.");
  return config.jwtSegredo;
}

function gerarJwt(usuario) {
  // Payload mínimo: nenhum dado pessoal (nome, CPF, e-mail) vai dentro do token.
  return jwt.sign({ sub: usuario.id, papel: "investidor" }, segredo(), {
    algorithm: "HS256",
    expiresIn: config.jwtExpiracao,
    issuer: "tokeninvest-api",
  });
}

function validarJwt(token) {
  return jwt.verify(token, segredo(), { algorithms: ["HS256"], issuer: "tokeninvest-api" });
}

const base64url = (buf) => buf.toString("base64url");

/** PKCE (RFC 7636): protege a troca do "authorization code" contra interceptação. */
function gerarPkce() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

function validarPkce(verifier, challenge) {
  return base64url(crypto.createHash("sha256").update(verifier).digest()) === challenge;
}

const aleatorio = (n = 16) => base64url(crypto.randomBytes(n));

module.exports = { gerarJwt, validarJwt, gerarPkce, validarPkce, aleatorio };
