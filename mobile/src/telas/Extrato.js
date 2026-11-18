import React from 'react';
import { api } from '../api/cliente';
import { reais, encurtar, TIPO_TRANSACAO } from '../dominio/formatar';
import { useDados } from '../useDados';
import { useApp } from '../Contexto';
import { Aviso, Carregando, Cartao, Copiar, Secundario, Tela, Texto } from '../componentes/UI';

export default function Extrato() {
  const q = useDados(() => api.carteira());
  const { cores } = useApp();
  return <Tela titulo="Extrato" subtitulo="Posição atual e todas as transações registradas na rede." atualizar={q.atualizar} carregando={q.carregando}>
    <Aviso mensagem={q.erro} />{!q.dados && q.carregando && <Carregando />}
    {q.dados && <><Cartao><Texto tipo="subtitulo">Meus ativos</Texto>{!q.dados.ativos.some(a => a.minhasCotas > 0) && <Secundario>Você ainda não possui cotas.</Secundario>}{q.dados.ativos.filter(a => a.minhasCotas > 0).map(a => <Texto key={a.id}>{a.nome}{'\n'}{a.minhasCotas} cota(s) · {reais(a.minhasCotas * a.precoCotaCentavos)}</Texto>)}</Cartao>
      <Texto tipo="subtitulo">Transações</Texto><Secundario>{q.dados.extrato.length} registro(s) na DLT</Secundario>
      {!q.dados.extrato.length && <Cartao><Secundario>Nenhuma transação ainda.</Secundario></Cartao>}
      {q.dados.extrato.map((t, i) => <Cartao key={`${t.hash}-${t.tipo}-${i}`}><Texto tipo="subtitulo">{TIPO_TRANSACAO[t.tipo] ?? t.tipo}</Texto><Secundario>{t.cotas ? `${t.cotas} cota(s) · ${t.ativo}` : 'dBRL'} · Bloco #{t.bloco}</Secundario><Texto tipo="titulo" style={{ color: ['DEPOSITO_DREX', 'VENDA'].includes(t.tipo) ? cores.destaqueTexto : cores.texto }}>{['DEPOSITO_DREX', 'VENDA'].includes(t.tipo) ? '+' : '−'} {reais(t.valorCentavos)}</Texto><Secundario selectable tipo="pequeno">{encurtar(t.hash)}</Secundario><Copiar texto={t.hash} rotulo="Copiar hash da transação" /></Cartao>)}
    </>}
  </Tela>;
}
