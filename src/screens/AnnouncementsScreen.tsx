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

const AnnouncementCard = ({ item, onPress, featured, arabicFontLoaded }: any) => {
  const { t, isRTL, language } = useLanguage();
  const isUrgent = String(item.category || '').toUpperCase() === 'URGENT';
  const arabicText = isRTL && arabicFontLoaded ? styles.arabicText : undefined;
  const badge = isUrgent ? t.urgentBadge : t.schoolNewsBadge;
  const hasImage = typeof item.image === 'string' && item.image.trim() && item.image !== 'null';

  if (!featured) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.78}
        accessibilityRole="button"
        style={[styles.compactCard, isUrgent && styles.urgentCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        {hasImage ? (
          <Image source={item.image} style={styles.compactImage} contentFit="cover" transition={180} cachePolicy="memory-disk" />
        ) : (
          <View style={styles.compactFallback}><Megaphone size={24} color="#39725E" /></View>
        )}
        <View style={[styles.compactBody, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.date, arabicText]}>{formatAnnouncementDate(item.date, language)}</Text>
            {isUrgent && <View style={styles.miniUrgentDot} />}
          </View>
          <Text numberOfLines={2} style={[styles.compactTitle, arabicText, { textAlign: isRTL ? 'right' : 'left' }]}>{item.title}</Text>
          <Text numberOfLines={1} style={[styles.compactExcerpt, arabicText, { textAlign: isRTL ? 'right' : 'left' }]}>{item.excerpt || item.content}</Text>
        </View>
        <ChevronRight size={17} color="#8B98A9" strokeWidth={2.4} style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} accessibilityRole="button" style={[styles.featuredCard, isUrgent && styles.urgentFeaturedCard]}>
      {hasImage ? (
        <Image source={item.image} style={styles.featuredImage} contentFit="cover" transition={220} cachePolicy="memory-disk" />
      ) : (
        <View style={styles.featuredFallback}><Megaphone size={34} color="#39725E" /></View>
      )}
      <View style={styles.featuredBody}>
        <View style={[styles.featuredMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.badge, isUrgent ? styles.urgentBadge : styles.newsBadge]}>
            <Text style={[styles.badgeText, isUrgent ? styles.urgentBadgeText : styles.newsBadgeText, arabicText]}>{badge}</Text>
          </View>
          <Text style={[styles.date, arabicText]}>{formatAnnouncementDate(item.date, language)}</Text>
        </View>
        <Text numberOfLines={2} style={[styles.featuredTitle, arabicText, { textAlign: isRTL ? 'right' : 'left' }]}>{item.title}</Text>
        <Text numberOfLines={2} style={[styles.featuredExcerpt, arabicText, { textAlign: isRTL ? 'right' : 'left' }]}>{item.excerpt || item.content}</Text>
        <View style={[styles.readAction, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.readActionText, arabicText]}>{t.readMore}</Text>
          <ChevronRight size={15} color="#0B63CE" strokeWidth={2.6} style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
        </View>
      </View>
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
            <View style={styles.featuredSkeleton}>
              <SkeletonBlock height={150} borderRadius={0} />
              <View style={styles.skeletonBody}>
                <SkeletonBlock width={105} height={22} borderRadius={999} />
                <SkeletonBlock width="88%" height={22} />
                <SkeletonBlock width="100%" height={15} />
              </View>
            </View>
            {[1, 2].map(item => <View key={item} style={styles.compactSkeleton}><SkeletonBlock width={92} height={92} borderRadius={15} /><View style={{ flex: 1, gap: 9 }}><SkeletonBlock width="45%" height={12} /><SkeletonBlock width="95%" height={18} /><SkeletonBlock width="72%" height={13} /></View></View>)}
          </>
        ) : announcements.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Megaphone size={28} color="#0B63CE" /></View>
            <Text style={[styles.emptyTitle, arabicText]}>{copy.emptyTitle}</Text>
            <Text style={[styles.emptyText, arabicText]}>{copy.emptyText}</Text>
          </View>
        ) : (
          announcements.map((item: any, index: number) => (
            <AnnouncementCard
              key={item.id}
              item={item}
              featured={index === 0}
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
  featuredCard: {
    overflow: 'hidden', marginBottom: 12, borderRadius: 24, borderWidth: 1, borderColor: '#DFE5EC', backgroundColor: '#FFFFFF',
    shadowColor: '#172033', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 2,
  },
  urgentFeaturedCard: { borderColor: '#F2C9C6' },
  featuredImage: { width: '100%', height: 150, backgroundColor: '#E8EEF4' },
  featuredFallback: { height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDF5F1' },
  featuredBody: { padding: 16 },
  featuredMetaRow: { alignItems: 'center', gap: 9, marginBottom: 10 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  newsBadge: { backgroundColor: '#EAF3FF' },
  urgentBadge: { backgroundColor: '#FDECEB' },
  badgeText: { fontSize: 10, lineHeight: 14, fontWeight: '900' },
  newsBadgeText: { color: '#0B63CE' },
  urgentBadgeText: { color: '#C23C36' },
  date: { fontSize: 11, lineHeight: 16, fontWeight: '700', color: '#8996A8' },
  featuredTitle: { fontSize: 19, lineHeight: 25, fontWeight: '900', color: '#172033', letterSpacing: -0.25 },
  featuredExcerpt: { marginTop: 6, fontSize: 14, lineHeight: 21, fontWeight: '600', color: '#5E6C7E' },
  readAction: { alignSelf: 'flex-start', alignItems: 'center', gap: 4, marginTop: 13 },
  readActionText: { fontSize: 13, lineHeight: 18, fontWeight: '900', color: '#0B63CE' },
  compactCard: {
    minHeight: 116, alignItems: 'center', gap: 12, marginBottom: 10, padding: 11,
    borderRadius: 20, borderWidth: 1, borderColor: '#E3E8EF', backgroundColor: '#FFFFFF',
  },
  urgentCard: { borderStartWidth: 3, borderStartColor: '#E46761' },
  compactImage: { width: 88, height: 92, borderRadius: 15, backgroundColor: '#E8EEF4' },
  compactFallback: { width: 88, height: 92, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDF5F1' },
  compactBody: { flex: 1, minWidth: 0 },
  metaRow: { alignItems: 'center', gap: 6, marginBottom: 3 },
  miniUrgentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E46761' },
  compactTitle: { fontSize: 15, lineHeight: 20, fontWeight: '900', color: '#243044' },
  compactExcerpt: { marginTop: 4, fontSize: 12, lineHeight: 17, fontWeight: '600', color: '#748195' },
  emptyState: { minHeight: 330, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  emptyIcon: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF3FF' },
  emptyTitle: { marginTop: 15, fontSize: 17, fontWeight: '900', color: '#243044', textAlign: 'center' },
  emptyText: { marginTop: 6, fontSize: 13, lineHeight: 20, fontWeight: '600', color: '#748195', textAlign: 'center' },
  featuredSkeleton: { overflow: 'hidden', marginBottom: 12, borderRadius: 24, borderWidth: 1, borderColor: '#E3E8EF', backgroundColor: '#FFFFFF' },
  skeletonBody: { padding: 16, gap: 11 },
  compactSkeleton: { minHeight: 116, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, padding: 11, borderRadius: 20, backgroundColor: '#FFFFFF' },
  arabicText: { fontFamily: 'NotoSansArabic', fontWeight: 'normal', letterSpacing: 0 },
});
