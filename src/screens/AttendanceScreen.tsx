import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Clock3, FileUp, ShieldCheck } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { studentService, uiService } from '../services/api';
import { AttendanceHistoryDay } from '../types';
import { GlobalHeader } from '../components/GlobalHeader';
import { SkeletonBlock } from '../components/SkeletonView';

type Filter = 'ALL' | 'ABSENT' | 'LATE';

const COPY = {
  fr: { title: 'Assiduité', subtitle: 'Suivi des 30 derniers jours', rate: 'Taux de présence', present: 'Présences', absent: 'Absences', late: 'Retards', all: 'Tout', activity: 'Historique récent', session: 'séance', sessions: 'séances', noEvents: 'Aucun événement pour ce filtre', remarks: 'Remarques', justify: 'Justifier', sent: 'Justificatif envoyé à l’école.', failed: 'Impossible d’envoyer le justificatif.' },
  en: { title: 'Attendance', subtitle: 'Last 30 days', rate: 'Attendance rate', present: 'Present', absent: 'Absent', late: 'Late', all: 'All', activity: 'Recent history', session: 'session', sessions: 'sessions', noEvents: 'No activity for this filter', remarks: 'Notes', justify: 'Justify', sent: 'The document was sent to the school.', failed: 'The document could not be sent.' },
  ar: { title: 'الحضور والمواظبة', subtitle: 'آخر 30 يوماً', rate: 'نسبة الحضور', present: 'حضور', absent: 'غياب', late: 'تأخير', all: 'الكل', activity: 'السجل الأخير', session: 'حصة', sessions: 'حصص', noEvents: 'لا توجد أحداث ضمن هذا الاختيار', remarks: 'ملاحظات', justify: 'إرسال تبرير', sent: 'تم إرسال التبرير إلى المدرسة.', failed: 'تعذر إرسال التبرير.' },
} as const;

const STATUS_STYLE = {
  PRESENT: { color: '#16875B', bg: '#E9F8F1', icon: CheckCircle2 },
  ABSENT: { color: '#C83D3D', bg: '#FFF0EF', icon: AlertCircle },
  LATE: { color: '#B66A00', bg: '#FFF7E6', icon: Clock3 },
};

const AttendanceRow = React.memo(({ day, locale, copy, onJustify, submittingId }: {
  day: AttendanceHistoryDay;
  locale: string;
  copy: typeof COPY.fr | typeof COPY.en | typeof COPY.ar;
  onJustify: (id: number) => void;
  submittingId: number | null;
}) => {
  const [expanded, setExpanded] = useState(false);
  const { getTranslatedSubject, isRTL } = useLanguage();
  const config = STATUS_STYLE[day.status] || STATUS_STYLE.PRESENT;
  const Icon = config.icon;
  const date = new Date(`${day.date}T12:00:00`);
  const dateLabel = date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  const statusLabel = day.status === 'ABSENT' ? copy.absent : day.status === 'LATE' ? copy.late : copy.present;

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E3E8EF', marginBottom: 10, overflow: 'hidden' }}>
      <TouchableOpacity onPress={() => setExpanded(value => !value)} activeOpacity={0.75} style={{ paddingHorizontal: 16, paddingVertical: 15, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: config.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={19} color={config.color} strokeWidth={2.3} />
        </View>
        <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={{ color: '#172033', fontSize: 15, fontWeight: '800' }}>{dateLabel}</Text>
          <Text style={{ color: '#728096', fontSize: 12, fontWeight: '600', marginTop: 3 }}>{day.sessions.length} {day.sessions.length === 1 ? copy.session : copy.sessions}</Text>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: config.bg }}>
          <Text style={{ color: config.color, fontSize: 11, fontWeight: '800' }}>{statusLabel}</Text>
        </View>
        {expanded ? <ChevronUp size={18} color="#98A2B3" style={{ marginLeft: 8 }} /> : <ChevronDown size={18} color="#98A2B3" style={{ marginLeft: 8 }} />}
      </TouchableOpacity>

      {expanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: '#EEF1F5', padding: 14, backgroundColor: '#FAFBFC' }}>
          {day.sessions.map(session => {
            const sessionStyle = STATUS_STYLE[session.status] || STATUS_STYLE.PRESENT;
            const label = session.status === 'ABSENT' ? copy.absent : session.status === 'LATE' ? copy.late : copy.present;
            const canJustify = session.status === 'ABSENT' && typeof session.id === 'number';
            return (
              <View key={String(session.id)} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingVertical: 10 }}>
                <View style={{ width: 3, height: 34, borderRadius: 2, backgroundColor: sessionStyle.color }} />
                <View style={{ flex: 1, marginHorizontal: 10, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={{ color: '#172033', fontSize: 14, fontWeight: '700' }}>{getTranslatedSubject(session.subject)}</Text>
                  <Text style={{ color: sessionStyle.color, fontSize: 11, fontWeight: '700', marginTop: 3 }}>{label}</Text>
                </View>
                {canJustify && (
                  <TouchableOpacity onPress={() => onJustify(session.id as number)} disabled={submittingId === session.id} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: '#EAF2FF' }}>
                    <FileUp size={14} color="#0B57D0" />
                    <Text style={{ color: '#0B57D0', fontSize: 11, fontWeight: '800', marginHorizontal: 5 }}>{submittingId === session.id ? '…' : copy.justify}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
          {day.notes.length > 0 && (
            <View style={{ marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7EBF0' }}>
              <Text style={{ color: '#667085', fontSize: 11, fontWeight: '800', marginBottom: 6 }}>{copy.remarks}</Text>
              {day.notes.map((note, index) => <Text key={`${note.author}-${index}`} style={{ color: '#344054', fontSize: 13, lineHeight: 19, marginTop: index ? 5 : 0 }}>{note.text} · {note.author}</Text>)}
            </View>
          )}
        </View>
      )}
    </View>
  );
});

export const AttendanceScreen = ({ navigation }: any) => {
  const selectedChildId = useAppStore(state => state.selectedChildId);
  const { language, isRTL } = useLanguage();
  const copy = COPY[language];
  const [filter, setFilter] = useState<Filter>('ALL');
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const { data: history = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['attendanceHistory', selectedChildId, 30],
    queryFn: ({ signal }) => studentService.fetchAttendanceHistory(selectedChildId!, signal),
    enabled: !!selectedChildId,
    staleTime: 5 * 60_000,
    gcTime: 24 * 60 * 60_000,
    refetchOnMount: false,
    retry: 1,
  });

  const totals = useMemo(() => history.reduce((result, day) => {
    result[day.status] += 1;
    return result;
  }, { PRESENT: 0, ABSENT: 0, LATE: 0 }), [history]);
  const attendanceRate = history.length ? Math.round((totals.PRESENT / history.length) * 100) : 0;
  const filtered = useMemo(() => filter === 'ALL' ? history : history.filter(day => day.status === filter), [filter, history]);
  const locale = language === 'ar' ? 'ar-TN' : language === 'fr' ? 'fr-FR' : 'en-GB';

  const handleJustify = useCallback(async (attendanceId: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.55 });
    if (result.canceled || !result.assets[0]?.uri || !selectedChildId) return;
    setSubmittingId(attendanceId);
    try {
      const uploaded = await uiService.uploadImage(result.assets[0].uri, 'student', selectedChildId) as any;
      await studentService.justifyAttendance(attendanceId, uploaded.url, 'Parent attendance justification');
      await refetch();
      Alert.alert('', copy.sent);
    } catch {
      Alert.alert('', copy.failed);
    } finally {
      setSubmittingId(null);
    }
  }, [copy.failed, copy.sent, refetch, selectedChildId]);

  const header = (
    <View>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={{ fontSize: 29, fontWeight: '800', letterSpacing: -0.7, color: '#172033' }}>{copy.title}</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#728096', marginTop: 4 }}>{copy.subtitle}</Text>
        </View>
        <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center' }}><CalendarDays size={20} color="#0B57D0" /></View>
      </View>

      {isLoading ? (
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E3E8EF', padding: 18, marginBottom: 18 }}>
          <SkeletonBlock width="35%" height={14} marginBottom={12} />
          <SkeletonBlock width="24%" height={38} marginBottom={16} />
          <SkeletonBlock width="100%" height={8} />
        </View>
      ) : (
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E3E8EF', padding: 18, marginBottom: 18 }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={{ color: '#728096', fontSize: 12, fontWeight: '700' }}>{copy.rate}</Text>
              <Text style={{ color: '#172033', fontSize: 38, fontWeight: '800', letterSpacing: -1.2, marginTop: 2 }}>{attendanceRate}%</Text>
            </View>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={25} color="#0B57D0" /></View>
          </View>
          <View style={{ height: 7, borderRadius: 99, backgroundColor: '#E7ECF2', marginTop: 14, overflow: 'hidden' }}><View style={{ width: `${attendanceRate}%`, height: '100%', borderRadius: 99, backgroundColor: '#0B57D0' }} /></View>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 18 }}>
            {[
              { value: totals.PRESENT, label: copy.present, color: '#16875B' },
              { value: totals.ABSENT, label: copy.absent, color: '#C83D3D' },
              { value: totals.LATE, label: copy.late, color: '#B66A00' },
            ].map((item, index) => (
              <View key={item.label} style={{ flex: 1, alignItems: 'center', borderLeftWidth: index && !isRTL ? 1 : 0, borderRightWidth: index && isRTL ? 1 : 0, borderColor: '#E7EBF0' }}>
                <Text style={{ color: item.color, fontSize: 20, fontWeight: '800' }}>{item.value}</Text>
                <Text style={{ color: '#728096', fontSize: 11, fontWeight: '600', marginTop: 3 }}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: '#172033', fontSize: 17, fontWeight: '800' }}>{copy.activity}</Text>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: '#EEF2F6', borderRadius: 12, padding: 3 }}>
          {([['ALL', copy.all], ['ABSENT', copy.absent], ['LATE', copy.late]] as [Filter, string][]).map(([value, label]) => (
            <TouchableOpacity key={value} onPress={() => setFilter(value)} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: filter === value ? '#FFFFFF' : 'transparent' }}>
              <Text style={{ color: filter === value ? '#172033' : '#728096', fontSize: 11, fontWeight: '700' }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F8FB' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <GlobalHeader navigation={navigation} showBack />
      <FlatList
        data={isLoading ? [] : filtered}
        keyExtractor={item => item.date}
        renderItem={({ item }) => <AttendanceRow day={item} locale={locale} copy={copy} onJustify={handleJustify} submittingId={submittingId} />}
        ListHeaderComponent={header}
        ListEmptyComponent={isLoading ? <View style={{ gap: 10 }}>{[1, 2, 3].map(item => <SkeletonBlock key={item} width="100%" height={72} borderRadius={18} />)}</View> : <View style={{ alignItems: 'center', paddingVertical: 42 }}><CheckCircle2 size={28} color="#98A2B3" /><Text style={{ color: '#667085', fontSize: 14, fontWeight: '600', marginTop: 10 }}>{copy.noEvents}</Text></View>}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 100, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        refreshControl={<RefreshControl refreshing={isRefetching && !isLoading} onRefresh={refetch} tintColor="#0B57D0" />}
      />
    </SafeAreaView>
  );
};
