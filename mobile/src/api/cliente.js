import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

export function criarCliente({ storage = SecureStore, aoExpirar = () => {}, url = API_URL } = {}) {
  const chave = 'tokeninvest.jwt';
  const sessao = {
    obter: () => storage.getItemAsync(chave),
    salvar: token => storage.setItemAsync(chave, token),
    limpar: () => storage.deleteItemAsync(chave),
  };
  async function requisicao(method, caminho, corpo) {
    const token = await sessao.obter();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      const resposta = await fetch(`${url}${caminho}`, {
        method, signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      });
      if (resposta.status === 401 && token) {
        await sessao.limpar();
        aoExpirar();
      }
      if (resposta.status === 204) return null;
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(json.erro || json.error_description || 'Erro na comunicação com o servidor.');
      return json;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('O servidor demorou a responder. Confira o extrato antes de repetir uma operação.');
      if (error instanceof TypeError) throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  const api = {
    cadastrar: dados => requisicao('POST', '/api/auth/cadastro', dados),
    login: (email, senha) => requisicao('POST', '/api/auth/login', { email, senha }),
    eu: () => requisicao('GET', '/api/auth/eu'),
    permissoes: () => requisicao('GET', '/api/open-finance/permissoes'),
    consentimentos: () => requisicao('GET', '/api/open-finance/consentimentos'),
    criarConsentimento: (permissoes, prazoDias) => requisicao('POST', '/api/open-finance/consentimentos', { permissoes, prazoDias }),
    retornoBanco: params => requisicao('POST', '/api/open-finance/retorno', params),
    confirmarConsentimento: id => requisicao('POST', `/api/open-finance/consentimentos/${encodeURIComponent(id)}/confirmar`),
    revogarConsentimento: id => requisicao('DELETE', `/api/open-finance/consentimentos/${encodeURIComponent(id)}`),
    saldoBancario: () => requisicao('GET', '/api/open-finance/saldo'),
    carteira: () => requisicao('GET', '/api/carteira'),
    depositar: valor => requisicao('POST', '/api/carteira/depositar', { valor }),
    resgatar: valor => requisicao('POST', '/api/carteira/resgatar', { valor }),
    ativos: () => requisicao('GET', '/api/ativos'),
    comprar: (id, quantidade) => requisicao('POST', `/api/ativos/${encodeURIComponent(id)}/comprar`, { quantidade }),
    vender: (id, quantidade) => requisicao('POST', `/api/ativos/${encodeURIComponent(id)}/vender`, { quantidade }),
    meusDados: () => requisicao('GET', '/api/privacidade/meus-dados'),
    excluirConta: () => requisicao('DELETE', '/api/privacidade/conta'),
  };
  const apiBanco = {
    consentimento: id => requisicao('GET', `/banco-simulado/api/consentimentos/${encodeURIComponent(id)}`),
    autorizar: dados => requisicao('POST', '/banco-simulado/api/autorizar', dados),
  };
  return { api, apiBanco, sessao };
}
const ouvintes = new Set();
export const observarSessaoExpirada = callback => { ouvintes.add(callback); return () => ouvintes.delete(callback); };
export const { api, apiBanco, sessao } = criarCliente({ aoExpirar: () => ouvintes.forEach(callback => callback()) });
