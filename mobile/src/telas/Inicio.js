import React, { useState } from 'react';
import { api } from '../api/cliente';
import { reais } from '../dominio/formatar';
import { useDados } from '../useDados';
import { Aviso, Botao, Campo, Carregando, Cartao, Copiar, Linha, Secundario, Tela, Texto } from '../componentes/UI';

export default function Inicio({ navigation }) {
  const q = useDados(async () => {
    const [usuario, carteira] = await Promise.all([api.eu(), api.carteira()]);
    let saldoBanco = null;
    try { saldoBanco = (await api.saldoBancario()).saldoCentavos; } catch {}
    return { usuario, carteira, saldoBanco };
  });
  const [valor, setValor] = useState(10000);
  const [msg, setMsg] = useState({});
  const [operando, setOperando] = useState(false);
  async function operar(tipo) {
    setOperando(true); setMsg({});
    try {
      const r = await api[tipo]((valor / 100).toFixed(2));
      setMsg({ tipo: 'ok', texto: `${tipo === 'depositar' ? 'Depósito' : 'Resgate'} de ${reais(valor)} concluído. Registrado no bloco #${r.transacao.bloco}.` }); q.atualizar();
    } catch (e) { setMsg({ texto: e.message }); } finally { setOperando(false); }
  }
  const c = q.dados?.carteira;
  const banco = q.dados?.saldoBanco;
  return <Tela titulo={q.dados ? `Olá, ${q.dados.usuario.nome.split(' ')[0]}` : 'Início'} subtitulo="Resumo da sua posição e operações em DREX." atualizar={q.atualizar} carregando={q.carregando}>
    <Aviso mensagem={q.erro} />{q.erro && <Botao secundario titulo="Tentar novamente" onPress={q.atualizar} />}
    {!c ? q.carregando && <Carregando /> : <>
      <Cartao style={{ backgroundColor: '#0F1B2A', borderColor: '#0F1B2A' }}><Texto style={{ color: '#b3bcc8' }}>Saldo em DREX (dBRL)</Texto><Texto style={{ fontSize: 36, lineHeight: 44, color: '#fff', fontFamily: 'Inter_600SemiBold' }}>{reais(c.saldoDrexCentavos)}</Texto><Texto tipo="pequeno" style={{ color: '#b3bcc8' }}>Disponível para investir ou resgatar a qualquer hora.</Texto></Cartao>
      <Cartao><Secundario>Investido</Secundario><Texto tipo="titulo">{reais(c.ativos.reduce((s, a) => s + a.minhasCotas * a.precoCotaCentavos, 0))}</Texto><Botao secundario titulo="Ver ativos disponíveis" onPress={() => navigation.navigate('Investir')} /></Cartao>
      <Cartao><Secundario>Conta conectada</Secundario><Texto tipo="titulo">{banco == null ? 'Nenhuma' : reais(banco)}</Texto>{banco == null ? <Botao secundario titulo="Conectar conta bancária" onPress={() => navigation.navigate('Open Finance')} /> : <Secundario>Banco Rio, via Open Finance</Secundario>}</Cartao>
      <Cartao><Texto tipo="subtitulo">Depositar ou resgatar</Texto><Secundario>Pix via Open Finance</Secundario>
        <Campo rotulo="Valor em reais" keyboardType="number-pad" value={(valor / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChangeText={v => setValor(Number(v.replace(/\D/g, '').slice(0, 12) || 0))} />
        <Linha>{[5000, 10000, 50000, 100000].map(v => <Botao key={v} secundario titulo={reais(v)} onPress={() => setValor(v)} />)}</Linha>
        <Linha><Botao titulo="Depositar" disabled={operando || valor <= 0} onPress={() => operar('depositar')} /><Botao secundario titulo="Resgatar" disabled={operando || valor <= 0} onPress={() => operar('resgatar')} /></Linha>
        <Secundario>Origem do depósito: {banco == null ? 'Conecte uma conta' : 'Banco Rio'}{ '\n' }Liquidação: Imediata · Tarifa: {reais(0)}{ '\n' }Você recebe: {(valor / 100).toLocaleString('pt-BR')} dBRL</Secundario>
        <Aviso tipo={msg.tipo} mensagem={msg.texto} /><Secundario tipo="pequeno">O depósito inicia um Pix da sua conta e emite dBRL na sua carteira. O resgate queima o dBRL e devolve o valor por Pix.</Secundario>
      </Cartao>
      <Cartao><Texto tipo="pequeno">Carteira</Texto><Secundario selectable tipo="pequeno">{c.endereco}</Secundario><Copiar texto={c.endereco} rotulo="Copiar endereço" /><Secundario tipo="pequeno">{c.rede.rede} · bloco #{c.rede.blocoAtual}</Secundario></Cartao>
    </>}
  </Tela>;
}
