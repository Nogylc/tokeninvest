// INFRA: cliente HTTP (REST/JSON) que fala com a API do banco transmissor.
const { ErroDominio } = require("../domain/consentimento");

function criarClienteOpenFinance({ urlBanco, clientId, clientSecret }) {
  async function chamar(metodo, caminho, { corpo, token } = {}) {
    const resp = await fetch(urlBanco + caminho, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    if (resp.status === 204) return null;
    const json = await resp.json();
    if (!resp.ok) throw new ErroDominio(`Banco: ${json.error_description || json.error}`, resp.status === 401 ? 502 : 422);
    return json;
  }
  const credenciais = { client_id: clientId, client_secret: clientSecret };

  return {
    criarConsentimento: (dados) => chamar("POST", "/consentimentos", { corpo: { ...credenciais, ...dados } }),
    trocarCodigo: ({ code, verifier, redirectUri }) =>
      chamar("POST", "/token", {
        corpo: { ...credenciais, grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: redirectUri },
      }),
    consultarSaldo: (token) => chamar("GET", "/contas/saldo", { token }),
    enviarPix: (token, valorCentavos) => chamar("POST", "/pix/enviar", { token, corpo: { valorCentavos } }),
    receberPix: (token, valorCentavos) => chamar("POST", "/pix/receber", { token, corpo: { valorCentavos } }),
    revogar: (consentIdBanco) =>
      chamar("DELETE", `/consentimentos/${encodeURIComponent(consentIdBanco)}`, { corpo: credenciais }),
  };
}

module.exports = { criarClienteOpenFinance };
