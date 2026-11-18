import React, { useState } from 'react';
import { Alert } from 'react-native';
import { api } from '../api/cliente';
import { data, STATUS_CONSENTIMENTO } from '../dominio/formatar';
import { useDados } from '../useDados';
import { useApp } from '../Contexto';
import { Aviso, Botao, Carregando, Cartao, Copiar, Secundario, Tela, Texto } from '../componentes/UI';

export default function Privacidade({ navigation }) {
  const q = useDados(async () => { const [usuario, lista] = await Promise.all([api.eu(), api.consentimentos()]); return { usuario, lista }; });
  const { sair } = useApp();
  const [msg, setMsg] = useState({});
  async function revogar(id) {
    try { await api.revogarConsentimento(id); setMsg({ tipo: 'ok', texto: 'Consentimento revogado. O banco não compartilha mais seus dados.' }); q.atualizar(); } catch (e) { setMsg({ texto: e.message }); }
  }
  async function baixar() {
    try { const dados = await api.meusDados(); navigation.getParent().navigate('MeusDados', { dados }); } catch (e) { setMsg({ texto: e.message }); }
  }
  async function excluir() {
    try { await api.excluirConta(); await sair(); } catch (e) { setMsg({ texto: e.message }); }
  }
  return <Tela titulo="Privacidade e dados" subtitulo="Seus direitos como titular: acesso, portabilidade, revogação e exclusão." atualizar={q.atualizar} carregando={q.carregando}>
    <Aviso mensagem={q.erro} /><Aviso tipo={msg.tipo} mensagem={msg.texto} />{!q.dados && q.carregando && <Carregando />}
    {q.dados && <Cartao><Texto tipo="subtitulo">Dados que guardamos</Texto><Texto>Nome: {q.dados.usuario.nome}</Texto><Texto>E-mail: {q.dados.usuario.email}</Texto><Texto>CPF: {q.dados.usuario.cpf}</Texto><Secundario tipo="pequeno">CPF armazenado criptografado (AES-256)</Secundario><Secundario selectable tipo="pequeno">Carteira: {q.dados.usuario.carteira}</Secundario><Copiar texto={q.dados.usuario.carteira} rotulo="Copiar endereço da carteira" /><Botao secundario titulo="Baixar meus dados" onPress={baixar} /><Secundario tipo="pequeno">Nenhum dado pessoal é gravado na blockchain: lá ficam apenas o endereço da carteira e as transações.</Secundario></Cartao>}
    <Cartao><Texto tipo="subtitulo">Consentimentos Open Finance</Texto>{q.dados && !q.dados.lista.length && <Secundario>Nenhum consentimento registrado.</Secundario>}{q.dados?.lista.map(c => <Cartao key={c.id}><Texto tipo="subtitulo">{c.banco}</Texto><Texto>{STATUS_CONSENTIMENTO[c.status]}</Texto><Secundario>{c.permissoes.join(', ')}{'\n'}Expira: {data(c.expiraEm)}</Secundario>{!['REVOGADO', 'REJEITADO', 'EXPIRADO'].includes(c.status) && <Botao secundario titulo="Revogar" onPress={() => revogar(c.id)} />}</Cartao>)}</Cartao>
    <Cartao><Texto tipo="subtitulo">Excluir minha conta</Texto><Secundario>Antes de excluir, venda suas cotas e resgate o saldo em DREX. A exclusão é definitiva.</Secundario><Botao perigo titulo="Excluir conta" onPress={() => Alert.alert('Excluir conta?', 'Tem certeza? Seus dados pessoais serão eliminados.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir definitivamente', style: 'destructive', onPress: excluir }])} /></Cartao>
    <Botao secundario titulo="Sair da conta" onPress={sair} />
  </Tela>;
}

export function MeusDados({ route }) { return <Tela titulo="Meus dados" subtitulo="Exportação dos seus dados em formato JSON."><Cartao><Texto selectable style={{ fontFamily: 'monospace', fontSize: 12 }}>{JSON.stringify(route.params.dados, null, 2)}</Texto><Copiar texto={JSON.stringify(route.params.dados, null, 2)} rotulo="Copiar JSON" /></Cartao></Tela>; }
