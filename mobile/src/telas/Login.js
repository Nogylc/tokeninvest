import React, { useState } from 'react';
import { api } from '../api/cliente';
import { useApp } from '../Contexto';
import { Aviso, Botao, Campo, Cartao, Escolha, Marca, Tela } from '../componentes/UI';

export default function Login({ navigation, route }) {
  const cadastro = route.name === 'Cadastro';
  const { entrar } = useApp();
  const [form, setForm] = useState({ nome: '', email: '', cpf: '', senha: '', aceiteTermos: false });
  const [erro, setErro] = useState('');
  const mudar = campo => valor => setForm(f => ({ ...f, [campo]: valor }));
  async function enviar() {
    setErro('');
    if (!form.email.trim() || form.senha.length < 8 || (cadastro && (!form.nome.trim() || !form.cpf || !form.aceiteTermos))) {
      setErro('Preencha os campos, use uma senha com pelo menos 8 caracteres e aceite a Política de Privacidade ao criar conta.'); return;
    }
    try {
      const dados = { ...form, email: form.email.trim(), nome: form.nome.trim() };
      const resposta = cadastro ? await api.cadastrar(dados) : await api.login(dados.email, dados.senha);
      await entrar(resposta.token);
    } catch (e) { setErro(e.message); }
  }
  return <Tela titulo={cadastro ? 'Criar conta' : 'Entrar na sua conta'} subtitulo={cadastro ? 'Leva menos de um minuto. Você precisa só de nome, CPF e e-mail.' : 'Acesse para acompanhar sua carteira e investir.'}>
    <Cartao><Marca />
      {cadastro && <><Campo rotulo="Nome completo" autoComplete="name" value={form.nome} onChangeText={mudar('nome')} /><Campo rotulo="CPF" placeholder="000.000.000-00" keyboardType="number-pad" value={form.cpf} onChangeText={mudar('cpf')} /></>}
      <Campo rotulo="E-mail" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={form.email} onChangeText={mudar('email')} />
      <Campo rotulo="Senha" secureTextEntry autoCapitalize="none" autoComplete={cadastro ? 'new-password' : 'current-password'} value={form.senha} onChangeText={mudar('senha')} />
      {cadastro && <Escolha titulo="Li e aceito a Política de Privacidade. Meus dados são usados apenas para operar a conta, o CPF é armazenado criptografado e posso solicitar a exclusão a qualquer momento." selecionada={form.aceiteTermos} onPress={() => mudar('aceiteTermos')(!form.aceiteTermos)} />}
      <Aviso mensagem={erro} /><Botao titulo={cadastro ? 'Criar conta' : 'Entrar'} onPress={enviar} />
      <Botao secundario titulo={cadastro ? 'Já tem conta? Entrar' : 'Ainda não tem conta? Cadastre-se'} onPress={() => navigation.navigate(cadastro ? 'Login' : 'Cadastro')} />
    </Cartao>
  </Tela>;
}
