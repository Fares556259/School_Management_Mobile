import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Megaphone, ChevronRight } from 'lucide-react-native';
import { studentService } from '../services/api';
import { Announcement } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { GlobalHeader } from '../components/GlobalHeader';
import { Image } from 'expo-image';
import { SkeletonBlock } from '../components/SkeletonView';
import * as Haptics from 'expo-haptics';

// ─── Announcement Card ────────────────────────────────────────────────────────
const AnnouncementCard = ({ item, onPress }: any) => {
  const { t, isRTL } = useLanguage();
  const isUrgent = item.category === 'URGENT';
  return (
    <TouchableOpacity
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      activeOpacity={0.88}
      style={{
        backgroundColor: 'white',
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: isUrgent ? '#fca5a5' : '#e2e8f0',
        shadowColor: isUrgent ? '#fca5a5' : '#e2e8f0',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 3,
      }}
    >
      {/* Image */}
      <Image
        source={item.image}
        style={{ width: '100%', height: 180 }}
        contentFit="cover"
        transition={300}
      />

      {/* Content */}
      <View style={{ padding: 20 }}>
        {/* Meta Row */}
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <View style={{
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 2,
            backgroundColor: isUrgent ? '#fee2e2' : '#eff6ff',
            borderColor: isUrgent ? '#fca5a5' : '#bfdbfe',
          }}>
            <Text style={{
              fontSize: 10, fontWeight: '900',
              color: isUrgent ? '#dc2626' : '#0072e6',
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              {item.category}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '700' }}>{item.date}</Text>
        </View>

        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 8, letterSpacing: -0.3, lineHeight: 24, textAlign: isRTL ? 'right' : 'left' }}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '700', lineHeight: 22, textAlign: isRTL ? 'right' : 'left' }} numberOfLines={2}>
          {item.excerpt}
        </Text>

        {/* Read CTA */}
        <View style={{
          flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4,
          marginTop: 16, paddingTop: 14,
          borderTopWidth: 2, borderTopColor: '#f1f5f9',
        }}>
          <Text style={{ fontSize: 14, fontWeight: '900', color: '#0072e6' }}>{t.readMore}</Text>
          <ChevronRight size={16} color="#0072e6" strokeWidth={3} style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export const AnnouncementsScreen = ({ navigation }: any) => {
  const { t, isRTL } = useLanguage();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { getSelectedChild, selectedChildId } = useAppStore();

  useEffect(() => {
    const fetchWithClass = async () => {
      setLoading(true);
      const child = getSelectedChild() as any;
      const classId = child?.raw?.classId;
      const studentId = child?.id;
      const data = await studentService.fetchAnnouncements(classId, studentId);
      setAnnouncements(data);
      setLoading(false);
    };
    fetchWithClass();
  }, [selectedChildId]);

  const filtered = announcements;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <GlobalHeader navigation={navigation} />

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
        <Text style={{ fontSize: 30, fontWeight: '900', color: '#1e293b', letterSpacing: -0.5, marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }}>
          {t.announcementsTitle}
        </Text>
        <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '700', textAlign: isRTL ? 'right' : 'left' }}>
          {t.schoolNews}
        </Text>
      </View>



      {/* Content */}
      {loading ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>
          {[1, 2, 3].map(i => (
            <View key={i} style={{ marginBottom: 16, backgroundColor: 'white', borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: '#e2e8f0' }}>
              <SkeletonBlock height={180} borderRadius={0} />
              <View style={{ padding: 20, gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <SkeletonBlock width={60} height={22} borderRadius={999} />
                  <SkeletonBlock width={80} height={22} borderRadius={8} />
                </View>
                <SkeletonBlock width="90%" height={22} />
                <SkeletonBlock width="100%" height={16} />
                <SkeletonBlock width="60%" height={16} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#eff6ff', borderWidth: 2, borderColor: '#bfdbfe', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Megaphone size={32} color="#0072e6" />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: 'center' }}>
            {announcements.length === 0 ? 'No announcements yet' : 'No results found'}
          </Text>
          <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '700', textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
            {announcements.length === 0
              ? 'School news and alerts will appear here once published.'
              : 'Nothing matches your search or filters. Try a different keyword.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        >
          {filtered.map(item => (
            <AnnouncementCard
              key={item.id}
              item={item}
              onPress={() => navigation.navigate('AnnouncementDetail', { announcement: item })}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};
