// CAMADA DE INTEGRAÇÃO: única parte do frontend que conhece URLs e HTTP.
// As telas só chamam estas funções e recebem objetos JSON.

const CHAVE_TOKEN = "tokeninvest.jwt";

export const sessao = {
  obter: () => sessionStorage.getItem(CHAVE_TOKEN),
  salvar: (t) => sessionStorage.setItem(CHAVE_TOKEN, t),
  limpar: () => sessionStorage.removeItem(CHAVE_TOKEN),
};

async function requisicao(metodo, caminho, corpo) {
  const token = sessao.obter();
  const resp = await fetch(caminho, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}), // JWT em toda requisição
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (resp.status === 204) return null;
  const json = await resp.json().catch(() => ({}));
  if (resp.status === 401 && token) {
    sessao.limpar();
    window.location.href = "/login";
  }
  if (!resp.ok) throw new Error(json.erro || json.error_description || "Erro na comunicação com o servidor.");
  return json;
}

export const api = {
  // Autenticação
  cadastrar: (dados) => requisicao("POST", "/api/auth/cadastro", dados),
  login: (email, senha) => requisicao("POST", "/api/auth/login", { email, senha }),
  eu: () => requisicao("GET", "/api/auth/eu"),

  // Open Finance
  permissoes: () => requisicao("GET", "/api/open-finance/permissoes"),
  consentimentos: () => requisicao("GET", "/api/open-finance/consentimentos"),
  criarConsentimento: (permissoes, prazoDias) => requisicao("POST", "/api/open-finance/consentimentos", { permissoes, prazoDias }),
  retornoBanco: (params) => requisicao("POST", "/api/open-finance/retorno", params),
  confirmarConsentimento: (id) => requisicao("POST", `/api/open-finance/consentimentos/${id}/confirmar`),
  revogarConsentimento: (id) => requisicao("DELETE", `/api/open-finance/consentimentos/${id}`),
  saldoBancario: () => requisicao("GET", "/api/open-finance/saldo"),

  // DREX e ativos tokenizados
  carteira: () => requisicao("GET", "/api/carteira"),
  depositar: (valor) => requisicao("POST", "/api/carteira/depositar", { valor }),
  resgatar: (valor) => requisicao("POST", "/api/carteira/resgatar", { valor }),
  ativos: () => requisicao("GET", "/api/ativos"),
  comprar: (id, quantidade) => requisicao("POST", `/api/ativos/${id}/comprar`, { quantidade }),
  vender: (id, quantidade) => requisicao("POST", `/api/ativos/${id}/vender`, { quantidade }),

  // LGPD
  meusDados: () => requisicao("GET", "/api/privacidade/meus-dados"),
  excluirConta: () => requisicao("DELETE", "/api/privacidade/conta"),
};

// API do banco simulado (outra instituição)
export const apiBanco = {
  consentimento: (id) => requisicao("GET", `/banco-simulado/api/consentimentos/${encodeURIComponent(id)}`),
  autorizar: (dados) => requisicao("POST", "/banco-simulado/api/autorizar", dados),
};
