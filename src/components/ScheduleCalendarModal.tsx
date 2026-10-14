import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react-native';

type Language = 'ar' | 'fr' | 'en';

type Props = {
  visible: boolean;
  value: Date;
  language: Language;
  onClose: () => void;
  onSelect: (date: Date) => void;
};

const COPY = {
  ar: { title: 'اختر التاريخ', today: 'اليوم', close: 'إغلاق' },
  fr: { title: 'Choisir une date', today: "Aujourd’hui", close: 'Fermer' },
  en: { title: 'Choose a date', today: 'Today', close: 'Close' },
};

const localeFor = (language: Language) => language === 'ar' ? 'ar-TN-u-nu-latn' : language === 'fr' ? 'fr-TN' : 'en-GB';
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const ScheduleCalendarModal = ({ visible, value, language, onClose, onSelect }: Props) => {
  const [shownMonth, setShownMonth] = React.useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const locale = localeFor(language);
  const isRTL = language === 'ar';
  const copy = COPY[language];

  React.useEffect(() => {
    if (visible) setShownMonth(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [value, visible]);

  const weekDays = React.useMemo(() => {
    const monday = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(date);
    });
  }, [locale]);

  const days = React.useMemo(() => {
    const firstWeekDay = (shownMonth.getDay() + 6) % 7;
    const firstCell = new Date(shownMonth.getFullYear(), shownMonth.getMonth(), 1 - firstWeekDay);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(firstCell);
      date.setDate(firstCell.getDate() + index);
      return date;
    });
  }, [shownMonth]);

  const moveMonth = (offset: number) => {
    setShownMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const selectDate = (date: Date) => {
    onSelect(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
    onClose();
  };

  const today = new Date();
  const monthLabel = shownMonth.toLocaleDateString(locale, { month: 'long' });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={copy.close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.titleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.titleIcon}><CalendarDays size={19} color="#0B63CE" strokeWidth={2.4} /></View>
              <Text style={[styles.title, isRTL && styles.arabicText]}>{copy.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={copy.close}>
              <X size={19} color="#536174" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          <View style={[styles.monthRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity onPress={() => moveMonth(-1)} style={styles.monthButton} accessibilityRole="button">
              <ChevronLeft size={20} color="#243044" strokeWidth={2.4} style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
            </TouchableOpacity>
            <View style={styles.monthLabelWrap}>
              <Text style={[styles.monthLabel, isRTL && styles.arabicText]}>{monthLabel}</Text>
              <Text style={styles.yearLabel}>{String(shownMonth.getFullYear())}</Text>
            </View>
            <TouchableOpacity onPress={() => moveMonth(1)} style={styles.monthButton} accessibilityRole="button">
              <ChevronRight size={20} color="#243044" strokeWidth={2.4} style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {weekDays.map((day, index) => <Text key={`${day}-${index}`} style={[styles.weekDay, isRTL && styles.arabicText]}>{day}</Text>)}
          </View>
          <View style={styles.daysGrid}>
            {days.map(date => {
              const inMonth = date.getMonth() === shownMonth.getMonth();
              const selected = sameDay(date, value);
              const isToday = sameDay(date, today);
              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  onPress={() => selectDate(date)}
                  style={styles.dayCell}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                >
                  <View style={[styles.dayCircle, isToday && styles.todayCircle, selected && styles.selectedCircle]}>
                    <Text style={[styles.dayText, !inMonth && styles.outsideDayText, selected && styles.selectedDayText]}>{String(date.getDate())}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={() => selectDate(today)} style={styles.todayButton} accessibilityRole="button">
            <Text style={[styles.todayButtonText, isRTL && styles.arabicText]}>{copy.today}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, paddingHorizontal: 20, justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.48)' },
  sheet: {
    width: '100%', maxWidth: 420, alignSelf: 'center', padding: 18,
    borderRadius: 28, backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 18,
  },
  titleRow: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  titleGroup: { alignItems: 'center', gap: 10 },
  titleIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF3FF' },
  title: { fontSize: 18, fontWeight: '900', color: '#172033' },
  closeButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F5F8' },
  monthRow: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  monthButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F7FA' },
  monthLabelWrap: { alignItems: 'center' },
  monthLabel: { fontSize: 17, lineHeight: 23, fontWeight: '900', color: '#172033', textTransform: 'capitalize' },
  yearLabel: { marginTop: 1, fontSize: 11, fontWeight: '800', color: '#8996A8' },
  weekRow: { flexDirection: 'row', marginBottom: 5 },
  weekDay: { width: '14.285%', textAlign: 'center', fontSize: 11, fontWeight: '800', color: '#8996A8' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.285%', height: 43, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  todayCircle: { borderWidth: 1.5, borderColor: '#9CC7F5' },
  selectedCircle: { backgroundColor: '#0B6FE8', borderColor: '#0B6FE8' },
  dayText: { fontSize: 14, fontWeight: '700', color: '#243044' },
  outsideDayText: { color: '#C5CDD7' },
  selectedDayText: { color: '#FFFFFF', fontWeight: '900' },
  todayButton: { height: 46, marginTop: 14, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF3FF' },
  todayButtonText: { fontSize: 14, fontWeight: '900', color: '#0B63CE' },
  arabicText: { fontFamily: 'NotoSansArabic', fontWeight: 'normal', letterSpacing: 0 },
});
