import { readFile } from 'node:fs/promises';

export async function carregarCliente() {
  const config = await readFile(new URL('../src/config.js', import.meta.url), 'utf8');
  const fonte = await readFile(new URL('../src/api/cliente.js', import.meta.url), 'utf8');
  const memoria = `const valores = new Map(); const SecureStore = {getItemAsync: async k => valores.get(k) ?? null, setItemAsync: async (k,v) => {valores.set(k,v);}, deleteItemAsync: async k => {valores.delete(k);}};`;
  const codigo = fonte.replace("import * as SecureStore from 'expo-secure-store';", memoria).replace("import { API_URL } from '../config';", config.replace('export ', ''));
  return import(`data:text/javascript;base64,${Buffer.from(codigo).toString('base64')}`);
}
