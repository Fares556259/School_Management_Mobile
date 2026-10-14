import React from 'react';
import { RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Megaphone } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { GlobalHeader } from '../components/GlobalHeader';
import { SkeletonBlock } from '../components/SkeletonView';

const PAGE_COPY = {
  ar: {
    intro: 'آخر الأخبار والمعلومات المهمة من المدرسة.',
    latest: 'آخر المستجدات',
    emptyTitle: 'لا توجد إعلانات حالياً',
    emptyText: 'ستظهر أخبار المدرسة والتنبيهات هنا فور نشرها.',
  },
  fr: {
    intro: "Les informations utiles de l’école, au même endroit.",
    latest: 'Dernières nouvelles',
    emptyTitle: 'Aucune annonce pour le moment',
    emptyText: "Les actualités et alertes de l’école apparaîtront ici dès leur publication.",
  },
  en: {
    intro: 'Useful school updates, all in one place.',
    latest: 'Latest updates',
    emptyTitle: 'No announcements yet',
    emptyText: 'School news and alerts will appear here as soon as they are published.',
  },
};

const formatAnnouncementDate = (value: string, language: 'ar' | 'fr' | 'en') => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const locale = language === 'ar' ? 'ar-TN-u-nu-latn' : language === 'fr' ? 'fr-TN' : 'en-GB';
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
};

const AnnouncementCard = ({ item, onPress, arabicFontLoaded }: any) => {
  const { isRTL, language } = useLanguage();
  const isUrgent = String(item.category || '').toUpperCase() === 'URGENT';
  const arabicText = isRTL && arabicFontLoaded ? styles.arabicText : undefined;
  const hasImage = typeof item.image === 'string' && item.image.trim() && item.image !== 'null';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      accessibilityRole="button"
      style={[styles.compactCard, isUrgent ? styles.urgentCard : styles.newsCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
    >
      {hasImage ? (
        <Image source={item.image} style={styles.compactImage} contentFit="cover" transition={180} cachePolicy="memory-disk" />
      ) : (
        <View style={styles.compactFallback}><Megaphone size={24} color="#39725E" /></View>
      )}
      <View style={[styles.compactBody, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.date, arabicText]}>{formatAnnouncementDate(item.date, language)}</Text>
          <View style={[styles.statusDot, { backgroundColor: isUrgent ? '#E46761' : '#5A8C79' }]} />
        </View>
        <Text numberOfLines={2} style={[styles.compactTitle, arabicText, { textAlign: isRTL ? 'right' : 'left' }]}>{item.title}</Text>
        <Text numberOfLines={1} style={[styles.compactExcerpt, arabicText, { textAlign: isRTL ? 'right' : 'left' }]}>{item.excerpt || item.content}</Text>
      </View>
      <ChevronRight size={17} color="#8B98A9" strokeWidth={2.4} style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
    </TouchableOpacity>
  );
};

export const AnnouncementsScreen = ({ navigation }: any) => {
  const { t, isRTL, language } = useLanguage();
  const { getSelectedChild } = useAppStore();
  const [arabicFontLoaded] = useFonts({ NotoSansArabic: require('../../assets/fonts/NotoSansArabic.ttf') });
  const child = getSelectedChild() as any;
  const classId = child?.raw?.classId;
  const studentId = child?.id;
  const copy = PAGE_COPY[language];
  const arabicText = isRTL && arabicFontLoaded ? styles.arabicText : undefined;

  const { data: announcements = [], isLoading: loading, isFetching, refetch } = useQuery({
    queryKey: ['announcements', classId, studentId],
    queryFn: () => studentService.fetchAnnouncements(classId, studentId),
    enabled: !!studentId,
    staleTime: 60_000,
    refetchOnMount: false,
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />
      <GlobalHeader navigation={navigation} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching && !loading} onRefresh={refetch} tintColor="#0B63CE" />}
      >
        <View style={[styles.pageHeading, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <View style={[styles.eyebrowRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Megaphone size={15} color="#0B63CE" strokeWidth={2.5} />
            <Text style={[styles.eyebrow, arabicText]}>{copy.latest}</Text>
          </View>
          <Text style={[styles.pageTitle, arabicText, { textAlign: isRTL ? 'right' : 'left' }]}>{t.announcementsTitle}</Text>
          <Text style={[styles.pageIntro, arabicText, { textAlign: isRTL ? 'right' : 'left' }]}>{copy.intro}</Text>
        </View>

        {loading ? (
          <>
            {[1, 2, 3, 4].map(item => <View key={item} style={styles.compactSkeleton}><SkeletonBlock width={92} height={98} borderRadius={15} /><View style={{ flex: 1, gap: 9 }}><SkeletonBlock width="45%" height={12} /><SkeletonBlock width="95%" height={18} /><SkeletonBlock width="72%" height={13} /></View></View>)}
          </>
        ) : announcements.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Megaphone size={28} color="#0B63CE" /></View>
            <Text style={[styles.emptyTitle, arabicText]}>{copy.emptyTitle}</Text>
            <Text style={[styles.emptyText, arabicText]}>{copy.emptyText}</Text>
          </View>
        ) : (
          announcements.map((item: any) => (
            <AnnouncementCard
              key={item.id}
              item={item}
              arabicFontLoaded={arabicFontLoaded}
              onPress={() => navigation.navigate('AnnouncementDetail', { announcement: item })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F9FC' },
  content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 110 },
  pageHeading: { marginBottom: 18 },
  eyebrowRow: { alignItems: 'center', gap: 7, marginBottom: 7 },
  eyebrow: { fontSize: 11, lineHeight: 16, fontWeight: '900', color: '#0B63CE', textTransform: 'uppercase', letterSpacing: 0.8 },
  pageTitle: { fontSize: 28, lineHeight: 34, fontWeight: '900', color: '#172033', letterSpacing: -0.55 },
  pageIntro: { marginTop: 5, fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#667085' },
  date: { fontSize: 11, lineHeight: 16, fontWeight: '700', color: '#8996A8' },
  compactCard: {
    height: 122, overflow: 'hidden', alignItems: 'center', gap: 12, marginBottom: 10, padding: 11,
    borderRadius: 20, borderWidth: 1, borderColor: '#E3E8EF', borderStartWidth: 3, backgroundColor: '#FFFFFF',
    shadowColor: '#172033', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.035, shadowRadius: 7, elevation: 1,
  },
  urgentCard: { borderStartColor: '#E46761' },
  newsCard: { borderStartColor: '#5A8C79' },
  compactImage: { width: 92, height: 98, borderRadius: 15, backgroundColor: '#E8EEF4' },
  compactFallback: { width: 92, height: 98, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDF5F1' },
  compactBody: { flex: 1, minWidth: 0 },
  metaRow: { alignItems: 'center', gap: 6, marginBottom: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  compactTitle: { fontSize: 15, lineHeight: 20, fontWeight: '900', color: '#243044' },
  compactExcerpt: { marginTop: 4, fontSize: 12, lineHeight: 17, fontWeight: '600', color: '#748195' },
  emptyState: { minHeight: 330, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  emptyIcon: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF3FF' },
  emptyTitle: { marginTop: 15, fontSize: 17, fontWeight: '900', color: '#243044', textAlign: 'center' },
  emptyText: { marginTop: 6, fontSize: 13, lineHeight: 20, fontWeight: '600', color: '#748195', textAlign: 'center' },
  compactSkeleton: { height: 122, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, padding: 11, borderRadius: 20, backgroundColor: '#FFFFFF' },
  arabicText: { fontFamily: 'NotoSansArabic', fontWeight: 'normal', letterSpacing: 0 },
});
