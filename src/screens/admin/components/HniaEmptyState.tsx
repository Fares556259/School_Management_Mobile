import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, RefreshCw, CreditCard, Users, Bell, TrendingUp, Camera } from 'lucide-react-native';
import { adminService } from '../../../services/api';
import { useAppStore } from '../../../store/useAppStore';
import { useLanguage } from '../../../context/LanguageContext';
import { contextualPrompts, freshnessLabel, hniaText } from '../hniaExperience';

export default function HniaEmptyState({ onSelectPrompt, onOpenAttachmentSheet, schoolName = 'SnapSchool', chatLanguage }: { onSelectPrompt: (prompt: string) => void; onOpenAttachmentSheet: () => void; schoolName?: string; chatLanguage?: string }) {
  const globalLanguage = useLanguage().language;
  const language = chatLanguage || globalLanguage;
  const userId = useAppStore(s => s.userId);
  const userName = useAppStore(s => s.userName);
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Tunis' });
  const { data, isFetching, isError, refetch } = useQuery({ queryKey: ['admin', 'hnia-briefing', userId, date], queryFn: adminService.fetchHniaBriefing, staleTime: 60_000, enabled: Boolean(userId), retry: 1 });
  const tx = (fr: string, en: string, ar: string) => hniaText(language, fr, en, ar);
  const firstName = (data?.adminName || userName || '').split(' ')[0];
  const metrics = data?.success ? data.metrics : null;
  const tiles = [
    { id: 'revenue', label: tx('Recettes du jour', 'Today’s revenue', 'مداخيل اليوم'), value: metrics ? Number(metrics.todayRevenue).toLocaleString(language === 'ar' ? 'ar-TN' : 'fr-FR', { maximumFractionDigits: 3 }) + ' DT' : '—', icon: TrendingUp, color: '#16836b', prompt: 'Caisse du jour' },
    { id: 'unpaid', label: tx('Élèves avec impayés', 'Students owing fees', 'تلاميذ لديهم مستحقات'), value: metrics?.unpaidStudents ?? '—', icon: CreditCard, color: '#ad741c', prompt: 'Impayés du mois' },
    { id: 'attendance', label: tx('Élèves absents aujourd’hui', 'Students absent today', 'غيابات التلاميذ اليوم'), value: metrics?.absentStudents ?? '—', icon: Users, color: '#6658bc', prompt: 'Absences du jour' },
    { id: 'parents', label: tx('Demandes des parents', 'Parent requests', 'طلبات الأولياء'), value: metrics?.parentRequests ?? '—', icon: Bell, color: '#235bc8', prompt: 'Affiche les demandes des parents en attente' },
  ];
  return <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <Text style={s.eyebrow}>{tx('VOTRE ÉCOLE, AUJOURD’HUI', 'YOUR SCHOOL, TODAY', 'مدرستك، اليوم')}</Text>
    <Text style={[s.greeting, language === 'ar' && { textAlign: 'right' }]}>{tx('Bonjour', 'Hello', 'عسلامة')} {firstName}</Text>
    <Text style={s.subtitle}>{tx('On commence par quoi ?', 'What shall we take care of?', 'بشنوة نبدأو؟')}</Text>
    <View style={s.briefing}>
      <View style={s.headingRow}><View style={{ flex: 1 }}><Text style={s.heading}>{tx('Le point du jour', 'Daily briefing', 'لمحة اليوم')}</Text><Text style={s.meta}>{schoolName} · {new Date().toLocaleDateString(language === 'ar' ? 'ar-TN' : language === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', timeZone: 'Africa/Tunis' })}</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel={tx('Actualiser le point du jour', 'Refresh daily briefing', 'تحديث لمحة اليوم')} disabled={isFetching} onPress={() => refetch()} style={s.refresh}><RefreshCw size={16} color={isFetching ? '#b7c6d8' : '#5b7290'} /></TouchableOpacity></View>
      <View style={s.grid}>{tiles.map(tile => <TouchableOpacity key={tile.id} accessibilityRole="button" disabled={!metrics} onPress={() => onSelectPrompt(tile.prompt)} style={s.tile}><tile.icon size={17} color={tile.color} /><Text style={s.value}>{tile.value}</Text><Text style={s.label}>{tile.label}</Text></TouchableOpacity>)}</View>
      <Text style={s.meta}>{isError ? tx('Données indisponibles. Réessayez.', 'Could not verify the briefing. Try again.', 'تعذّر التحقق. يرجى المحاولة مجدداً.') : data?.fetchedAt ? freshnessLabel(data.fetchedAt, language) : tx('Consultation des chiffres…', 'Checking school figures…', 'جارٍ مراجعة الأرقام…')}{metrics ? ' · ' + tx('Impayés du mois en cours', 'Unpaid fees: current month', 'مستحقات الشهر الحالي') : ''}</Text>
    </View>
    {metrics && <View style={s.attention}><View style={s.headingRow}><View style={s.dot} /><Text style={s.heading}>{tx('À votre attention', 'Needs your attention', 'يتطلب متابعتكم')}</Text></View><Text style={s.attentionText}>{metrics.parentRequests > 0 ? tx(metrics.parentRequests + ' demandes attendent votre décision.', metrics.parentRequests + ' requests need your decision.', metrics.parentRequests + ' طلبات بانتظار قراركم.') : metrics.unpaidStudents > 0 ? tx(metrics.unpaidStudents + ' élèves ont un solde à régler ce mois-ci.', metrics.unpaidStudents + ' students have an outstanding balance this month.', metrics.unpaidStudents + ' تلاميذ لديهم مستحقات هذا الشهر.') : tx('Aucune demande parent ni scolarité en attente.', 'No pending parent requests or unpaid fees.', 'لا توجد طلبات أولياء أو مستحقات معلّقة.')}</Text></View>}
    <Text style={s.section}>{tx('POUR COMMENCER', 'START HERE', 'للبدء')}</Text>
    {contextualPrompts(language).map(item => <TouchableOpacity accessibilityRole="button" key={item.id} onPress={() => onSelectPrompt(item.prompt)} style={s.suggestion}><Text style={s.suggestionText}>{item.label}</Text><ArrowUpRight size={17} color="#8a9db3" /></TouchableOpacity>)}
    <TouchableOpacity accessibilityRole="button" onPress={onOpenAttachmentSheet} style={s.camera}><Camera size={16} color="#657d97" /><Text style={s.meta}>{tx('Photographier un reçu', 'Photograph a receipt', 'صوّر وصل')}</Text></TouchableOpacity>
  </ScrollView>;
}

const s = StyleSheet.create({ content: { padding: 22, paddingTop: 26, paddingBottom: 24 }, eyebrow: { color: '#607b9e', fontSize: 10, letterSpacing: 1.6, fontWeight: '700', marginBottom: 9 }, greeting: { color: '#132d49', fontSize: 30, fontWeight: '700', letterSpacing: -0.8 }, subtitle: { color: '#73859b', fontSize: 15, marginTop: 8, marginBottom: 24 }, briefing: { padding: 17, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dde7f2' }, headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, heading: { fontSize: 15, fontWeight: '700', color: '#1d3652' }, meta: { fontSize: 11, color: '#75899f', lineHeight: 18 }, refresh: { padding: 10 }, grid: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 14, gap: 8 }, tile: { width: '48%', backgroundColor: '#f7f9fc', padding: 12, borderRadius: 14, minHeight: 104 }, value: { fontSize: 24, color: '#203953', fontWeight: '700', marginTop: 9, marginBottom: 4, letterSpacing: -0.5 }, label: { fontSize: 11, color: '#698098', lineHeight: 16 }, attention: { padding: 16, borderLeftWidth: 2, borderLeftColor: '#b5d1f4', marginTop: 18, marginBottom: 22, backgroundColor: '#edf4fc', borderRadius: 12 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4783d0' }, attentionText: { marginTop: 8, color: '#58718f', fontSize: 13, lineHeight: 21 }, section: { color: '#8a9cb1', fontSize: 10, fontWeight: '700', letterSpacing: 1.3, marginTop: 12, marginBottom: 10 }, suggestion: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#e6edf5' }, suggestionText: { fontSize: 14, color: '#284866', fontWeight: '500' }, camera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
});
