import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { sessao, observarSessaoExpirada } from './api/cliente';

const Contexto = createContext(null);
const claro = { fundo: '#f5f6f8', superficie: '#ffffff', suave: '#f1f3f6', texto: '#0F1B2A', secundario: '#4b5563', borda: '#e3e6ea', destaque: '#0B6E4F', destaqueTexto: '#0B6E4F', destaqueSuave: '#e9f3ef', erro: '#b42318', erroSuave: '#fdf1f0' };
const escuro = { fundo: '#0a1320', superficie: '#0F1B2A', suave: '#15233a', texto: '#e8ecf1', secundario: '#b3bcc8', borda: '#1f2f44', destaque: '#0B6E4F', destaqueTexto: '#3fc28f', destaqueSuave: '#122e28', erro: '#f2786e', erroSuave: '#352025' };

export function Provedor({ children }) {
  const sistema = useColorScheme();
  const [escolha, setEscolha] = useState(null);
  const tema = escolha ?? sistema ?? 'light';
  const [autenticado, setAutenticado] = useState(false);
  const [iniciando, setIniciando] = useState(true);
  useEffect(() => {
    let ativo = true;
    sessao.obter().then(token => { if (ativo) setAutenticado(!!token); }).catch(() => {}).finally(() => { if (ativo) setIniciando(false); });
    const parar = observarSessaoExpirada(() => setAutenticado(false));
    return () => { ativo = false; parar(); };
  }, []);
  async function entrar(token) { await sessao.salvar(token); setAutenticado(true); }
  async function sair() { await sessao.limpar(); setAutenticado(false); }
  return <Contexto.Provider value={{ tema, cores: tema === 'dark' ? escuro : claro, alternarTema: () => setEscolha(tema === 'dark' ? 'light' : 'dark'), seguirSistema: () => setEscolha(null), autenticado, iniciando, entrar, sair }}>{children}</Contexto.Provider>;
}
export const useApp = () => useContext(Contexto);

export function TemaBanco({ children }) {
  const app = useApp();
  return <Contexto.Provider value={{ ...app, tema: 'light', cores: { ...claro, fundo: '#faf6f2', destaque: '#a54b2a', destaqueTexto: '#a54b2a', destaqueSuave: '#f7e9df' } }}>{children}</Contexto.Provider>;
}
