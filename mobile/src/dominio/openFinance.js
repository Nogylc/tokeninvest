export function parametrosAutorizacao(url) {
  const params = new URL(url).searchParams;
  const dados = Object.fromEntries(['consent_id', 'state', 'redirect_uri', 'code_challenge'].map(key => [key, params.get(key)]));
  if (Object.values(dados).some(value => !value)) throw new Error('Pedido de autorização incompleto. Inicie a conexão novamente.');
  return dados;
}

export function parametrosRetorno(url, stateEsperado) {
  const params = new URL(url).searchParams;
  if (!params.get('state') || params.get('state') !== stateEsperado) throw new Error('Retorno do banco inválido. Inicie a conexão novamente.');
  if (!params.get('code') && !params.get('error')) throw new Error('O banco não retornou um código de autorização.');
  return { code: params.get('code'), state: params.get('state'), error: params.get('error') };
}
