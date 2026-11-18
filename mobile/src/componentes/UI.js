import React, { useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '../Contexto';

export function Texto({ children, tipo = 'normal', style, ...props }) {
  const { cores } = useApp();
  return <Text {...props} style={[{ color: cores.texto, fontFamily: tipo === 'titulo' || tipo === 'subtitulo' ? 'Inter_600SemiBold' : 'Inter_400Regular', fontSize: tipo === 'titulo' ? 26 : tipo === 'subtitulo' ? 17 : tipo === 'pequeno' ? 12 : 14, lineHeight: tipo === 'titulo' ? 33 : 22 }, style]}>{children}</Text>;
}
export function Secundario({ children, ...props }) { const { cores } = useApp(); return <Texto {...props} style={[{ color: cores.secundario }, props.style]}>{children}</Texto>; }
export function Tela({ titulo, subtitulo, children, atualizar, carregando = false, banco = false }) {
  const { cores } = useApp();
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: banco ? '#faf6f2' : cores.fundo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.conteudo} refreshControl={atualizar ? <RefreshControl refreshing={carregando} onRefresh={atualizar} tintColor={cores.destaqueTexto} /> : undefined}>
      <View style={s.cabecalho}><Texto tipo="titulo">{titulo}</Texto>{subtitulo && <Secundario>{subtitulo}</Secundario>}</View>{children}
    </ScrollView>
  </KeyboardAvoidingView>;
}
export function Cartao({ children, style }) { const { cores } = useApp(); return <View style={[s.cartao, { backgroundColor: cores.superficie, borderColor: cores.borda }, style]}>{children}</View>; }
export function Linha({ children, style }) { return <View style={[s.linha, style]}>{children}</View>; }
export function Botao({ titulo, onPress, secundario = false, perigo = false, disabled = false, style, icone }) {
  const { cores } = useApp();
  const trava = useRef(false);
  const [ocupado, setOcupado] = useState(false);
  async function executar() {
    if (trava.current || disabled) return;
    trava.current = true; setOcupado(true);
    try { await onPress?.(); } finally { trava.current = false; setOcupado(false); }
  }
  const cor = perigo ? cores.erro : cores.destaque;
  return <Pressable accessibilityRole="button" accessibilityLabel={titulo} accessibilityState={{ disabled: disabled || ocupado, busy: ocupado }} disabled={disabled || ocupado} onPress={executar} style={[s.botao, { backgroundColor: secundario || perigo ? cores.superficie : cor, borderColor: perigo ? cores.erro : secundario ? cores.borda : cor, opacity: disabled || ocupado ? 0.5 : 1 }, style]}>
    {ocupado ? <ActivityIndicator color={secundario || perigo ? cor : '#fff'} /> : <>{icone && <Feather name={icone} size={17} color={secundario ? cores.texto : '#fff'} />}<Texto style={{ color: perigo ? cor : secundario ? cores.texto : '#fff', fontFamily: 'Inter_600SemiBold' }}>{titulo}</Texto></>}
  </Pressable>;
}
export function Campo({ rotulo, ...props }) { const { cores } = useApp(); return <View style={{ gap: 6 }}><Texto tipo="pequeno">{rotulo}</Texto><TextInput accessibilityLabel={rotulo} placeholderTextColor={cores.secundario} {...props} style={[s.campo, { color: cores.texto, backgroundColor: cores.superficie, borderColor: cores.borda }, props.style]} /></View>; }
export function Aviso({ mensagem, tipo = 'erro' }) { const { cores } = useApp(); if (!mensagem) return null; return <View accessibilityLiveRegion="polite" style={{ padding: 12, borderRadius: 8, backgroundColor: tipo === 'erro' ? cores.erroSuave : cores.destaqueSuave }}><Texto style={{ color: tipo === 'erro' ? cores.erro : cores.destaqueTexto }}>{mensagem}</Texto></View>; }
export function Escolha({ titulo, selecionada, onPress }) { const { cores } = useApp(); return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selecionada }} onPress={onPress} style={[s.escolha, { backgroundColor: selecionada ? cores.destaqueSuave : cores.superficie, borderColor: selecionada ? cores.destaque : cores.borda }]}><Feather name={selecionada ? 'check-square' : 'square'} size={20} color={cores.destaqueTexto} /><Texto style={{ flex: 1 }}>{titulo}</Texto></Pressable>; }
export function Copiar({ texto, rotulo = 'Copiar' }) { const [copiado, setCopiado] = useState(false); return <Botao secundario titulo={copiado ? 'Copiado' : rotulo} icone="copy" onPress={async () => { try { await Clipboard.setStringAsync(texto); setCopiado(true); } catch { setCopiado(false); } }} />; }
export function Marca() { const { tema } = useApp(); return <Image accessibilityLabel="TokenInvest" resizeMode="contain" source={tema === 'dark' ? require('../../assets/logo-claro.png') : require('../../assets/logo-escuro.png')} style={{ width: 164, height: 36 }} />; }
export function Etapas({ atual }) { const { cores } = useApp(); return <Linha>{['Consentimento', 'Autenticação', 'Confirmação'].map((nome, i) => <View key={nome} style={{ flex: 1, gap: 6 }}><View style={{ height: 3, borderRadius: 3, backgroundColor: i + 1 <= atual ? cores.destaque : cores.borda }} /><Texto tipo="pequeno" style={{ color: i + 1 === atual ? cores.destaqueTexto : cores.secundario }}>{i + 1}. {nome}</Texto></View>)}</Linha>; }
export function Carregando() { const { cores } = useApp(); return <ActivityIndicator style={{ margin: 24 }} color={cores.destaqueTexto} />; }
export const s = StyleSheet.create({
  conteudo: { padding: 20, paddingBottom: 32, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center' },
  cabecalho: { gap: 6, paddingTop: 4 },
  cartao: { borderWidth: 1, borderRadius: 12, padding: 20, gap: 14 },
  linha: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  botao: { minHeight: 46, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  campo: { minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 13, paddingVertical: 12, fontFamily: 'Inter_400Regular', fontSize: 15 },
  escolha: { padding: 14, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
