// Proteção de dados EM REPOUSO (LGPD): AES-256-GCM.
// Usado para o CPF do usuário e para a chave privada da carteira custodiada.
const crypto = require("crypto");
const config = require("../config");

// A chave é derivada do segredo DATA_KEY, que só fica disponível depois que o
// servidor carrega os segredos (infra/segredos.js). Por isso é lida a cada uso.
let chaveCache = null;
let origemCache = null;
function chave() {
  if (!config.chaveCriptografia) throw new Error("DATA_KEY não carregada: inicie o servidor por server.js.");
  if (origemCache !== config.chaveCriptografia) {
    chaveCache = crypto.createHash("sha256").update(config.chaveCriptografia).digest(); // 32 bytes
    origemCache = config.chaveCriptografia;
  }
  return chaveCache;
}

function cifrar(texto) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([cipher.update(String(texto), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, dados].map((b) => b.toString("base64")).join(".");
}

function decifrar(pacote) {
  const [iv, tag, dados] = pacote.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", chave(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(dados), decipher.final()]).toString("utf8");
}

/** Hash para buscar pelo CPF sem guardar o CPF em texto puro (pseudonimização). */
function hashBusca(valor) {
  return crypto.createHmac("sha256", chave()).update(String(valor)).digest("hex");
}

module.exports = { cifrar, decifrar, hashBusca };
