import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { Check, RefreshCw, ChevronDown, ArrowUpRight, Download } from 'lucide-react-native';
import { freshnessLabel, hniaText } from '../hniaExperience';

export function HniaEvidence({ evidence, language, schoolName, onRefresh, disabled }: any) {
  const [, tick] = useState(0);
  useEffect(() => { const timer = setInterval(() => tick(n => n + 1), 60_000); return () => clearInterval(timer); }, []);
  if (!evidence) return null;
  if (evidence.source === 'school_knowledge') return <View style={s.evidence}>
    <Text style={s.evidenceTitle}>{hniaText(language, 'Sources de votre école', 'School sources', 'مصادر المدرسة')}</Text>
    <Text style={s.meta}>{evidence.schoolName || schoolName}</Text>
    {(evidence.sources || []).map((source: any, index: number) => <Text key={source.id} style={s.meta}>[{index + 1}] {source.title} · {source.updatedAt?.slice(0, 10)}</Text>)}
    {!evidence.sources?.length && <Text style={s.meta}>{hniaText(language, 'Aucune source trouvée', 'No source found', 'ما فماش مصدر')}</Text>}
    {evidence.toolCallId && onRefresh && <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={() => onRefresh(evidence.toolCallId)} style={s.refresh}><RefreshCw size={12} color="#235bc8" /><Text style={s.link}>{hniaText(language, 'Actualiser les sources', 'Refresh sources', 'تحديث المصادر')}</Text></TouchableOpacity>}
  </View>;
  if (evidence.source !== 'school_database') return null;
  const reads = evidence.reads || [evidence];
  const verified = evidence.verified !== false;
  return <View style={s.evidence}>
    <View style={s.row}><Check size={12} color={verified ? '#16836b' : '#a16207'} /><Text style={s.evidenceTitle}>{hniaText(language, verified ? 'Données consultées' : 'Consultation partielle', verified ? 'Records retrieved' : 'Partial retrieval', verified ? 'معطيات المدرسة' : 'معطيات جزئية')}</Text></View>
    <Text style={s.meta}>{evidence.schoolName || schoolName}</Text>
    {reads.map((read: any, index: number) => <View key={read.toolCallId || index} style={s.read}>
      <Text style={s.meta}>{freshnessLabel(read.fetchedAt, language)}{Number.isInteger(read.total) ? ` · ${read.total} ${hniaText(language, 'résultats', 'records', 'نتائج')}` : ''}</Text>
      {Object.keys(read.filters || {}).length > 0 && <Text style={s.meta}>{Object.entries(read.filters).map(([key, value]) => `${({ className: hniaText(language, 'Classe', 'Class', 'القسم'), month: hniaText(language, 'Mois', 'Month', 'الشهر'), year: hniaText(language, 'Année', 'Year', 'السنة'), status: hniaText(language, 'Statut', 'Status', 'الحالة'), period: hniaText(language, 'Période', 'Period', 'الفترة'), date: 'Date', query: hniaText(language, 'Recherche', 'Search', 'البحث') } as any)[key] || key}: ${value}`).join(' · ')}</Text>}
      {read.toolCallId && onRefresh && <TouchableOpacity accessibilityRole="button" accessibilityLabel={hniaText(language, 'Actualiser ces données', 'Refresh these records', 'تحديث المعطيات')} disabled={disabled} onPress={() => onRefresh(read.toolCallId)} style={[s.refresh, disabled && { opacity: 0.4 }]}><RefreshCw size={12} color="#235bc8" /><Text style={s.link}>{hniaText(language, 'Actualiser', 'Refresh', 'تحديث')}</Text></TouchableOpacity>}
    </View>)}
  </View>;
}

export function HniaRecordsCard({ data, language, onOpenClass, onNextPage }: any) {
  const [expanded, setExpanded] = useState(false);
  const rows = data.rows || [];
  const shown = expanded ? rows : rows.slice(0, 3);
  const exportRows = () => Share.share({ title: data.title, message: [data.title, `${rows.length}/${data.total} ${hniaText(language, 'affichés', 'loaded', 'معروضة')}`, ...rows.map((row: any) => [row.title, row.subtitle, row.detail].filter(Boolean).join(' · '))].join('\n') });
  return <View style={[s.card, { direction: language === 'ar' ? 'rtl' : 'ltr' }]}>
    <View style={s.row}><Text style={s.title}>{data.className ? hniaText(language, `Classe ${data.className}`, `Class ${data.className}`, `القسم ${data.className}`) : data.kind === 'get_payments' ? hniaText(language, 'Paiements des élèves', 'Student payments', 'دفوعات التلاميذ') : data.kind === 'get_expenses' ? hniaText(language, 'Dépenses', 'Expenses', 'المصاريف') : data.kind === 'get_incomes' ? hniaText(language, 'Recettes', 'Income', 'المداخيل') : hniaText(language, 'Élèves', 'Students', 'التلاميذ')}</Text><View style={s.count}><Text style={s.countText}>{data.total}</Text></View></View>
    {data.hasMore && <Text style={s.meta}>{rows.length} / {data.total} {hniaText(language, 'chargés', 'loaded', 'محمّلة')}</Text>}
    {shown.map((row: any, index: number) => <View key={row.key || index} style={s.person}><View style={s.initial}><Text style={s.initialText}>{row.title?.charAt(0)}</Text></View><View style={{ flex: 1 }}><Text style={s.name}>{row.title}</Text><Text style={s.meta}>{row.subtitle}</Text>{row.detail && <Text style={s.meta}>{row.detail}</Text>}</View>{row.amount !== undefined && <Text style={s.name}>{row.amount}{typeof row.amount === 'number' ? ' DT' : ''}</Text>}</View>)}
    {!rows.length && <Text style={s.meta}>{hniaText(language, 'Aucun résultat pour ce filtre.', 'No records match this filter.', 'ما فماش نتائج للبحث هذا.')}</Text>}
    {rows.length > 3 && <TouchableOpacity accessibilityRole="button" style={s.expand} onPress={() => setExpanded(!expanded)}><Text style={s.link}>{expanded ? hniaText(language, 'Réduire', 'Show less', 'عرض أقل') : hniaText(language, `Voir les ${rows.length - 3} autres`, `Show remaining ${rows.length - 3}`, `عرض البقية (${rows.length - 3})`)}</Text><ChevronDown size={14} color="#235bc8" /></TouchableOpacity>}
    {data.hasMore && <TouchableOpacity accessibilityRole="button" style={s.expand} onPress={onNextPage}><Text style={s.link}>{hniaText(language, 'Charger la page suivante', 'Load next page', 'تحميل الصفحة التالية')}</Text></TouchableOpacity>}
    <View style={s.actions}>{data.className && onOpenClass && <TouchableOpacity accessibilityRole="button" onPress={onOpenClass} style={s.refresh}><Text style={s.link}>{hniaText(language, 'Ouvrir la classe', 'Open class', 'فتح القسم')}</Text><ArrowUpRight size={14} color="#235bc8" /></TouchableOpacity>}<TouchableOpacity accessibilityRole="button" onPress={exportRows} style={s.refresh}><Download size={13} color="#235bc8" /><Text style={s.link}>{hniaText(language, 'Exporter la liste affichée', 'Export displayed list', 'تصدير القائمة المعروضة')}</Text></TouchableOpacity></View>
  </View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e8f1', borderRadius: 20, padding: 16, marginTop: 4 }, row: { flexDirection: 'row', alignItems: 'center', gap: 7 }, title: { flex: 1, color: '#152c47', fontWeight: '700', fontSize: 17 }, count: { backgroundColor: '#edf4ff', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 }, countText: { color: '#235bc8', fontWeight: '700', fontSize: 13 }, person: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f3f7' }, initial: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#f1f5fb', justifyContent: 'center', alignItems: 'center' }, initialText: { fontWeight: '600', color: '#60758b' }, name: { color: '#21364e', fontSize: 14, fontWeight: '600', marginBottom: 3 }, meta: { color: '#677b90', fontSize: 11, lineHeight: 17 }, expand: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, link: { color: '#235bc8', fontSize: 12, fontWeight: '600' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 }, refresh: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 7, minHeight: 36 }, evidence: { borderTopWidth: 1, borderTopColor: '#e9eef5', paddingTop: 10, marginTop: 12, gap: 3 }, evidenceTitle: { color: '#16836b', fontSize: 11, fontWeight: '600' }, read: { marginTop: 3 },
});
