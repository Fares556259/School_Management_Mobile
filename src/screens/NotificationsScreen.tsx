import React, { useState, useCallback, useMemo } from 'react';
import { RefreshControl, View, Text, TouchableOpacity, StatusBar, SectionList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, AlertTriangle, Info, Trash2, Calendar, Bell, MessageCircle, FileText } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { studentService } from '../services/api';
import { Notification } from '../types';
import { RectButton, Swipeable } from 'react-native-gesture-handler';
import { SkeletonBlock } from '../components/SkeletonView';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type FilterType = 'All' | 'Unread';

function formatNotificationTime(createdAt: string, language: 'ar' | 'fr' | 'en') {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  const elapsed = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return language === 'ar' ? 'الآن' : language === 'fr' ? 'À l’instant' : 'Just now';
  if (minutes < 60) return language === 'ar' ? `منذ ${minutes} د` : language === 'fr' ? `Il y a ${minutes} min` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return language === 'ar' ? `منذ ${hours} س` : language === 'fr' ? `Il y a ${hours} h` : `${hours}h ago`;
  return date.toLocaleDateString(language === 'ar' ? 'ar-TN' : language === 'fr' ? 'fr-TN' : 'en-GB', { day: '2-digit', month: 'short' });
}

const ICON_CONFIG: Record<string, { icon: any, color: string, bgColor: string, accentColor: string }> = {
  URGENT: { icon: AlertTriangle, color: '#f97316', bgColor: '#fff7ed', accentColor: '#ef4444' },
  ANNOUNCEMENT: { icon: Info, color: '#0055d4', bgColor: '#eff6ff', accentColor: '#4f46e5' },
  ATTENDANCE: { icon: AlertTriangle, color: '#f97316', bgColor: '#fff7ed', accentColor: '#ef4444' },
  PAYMENT: { icon: Calendar, color: '#f59e0b', bgColor: '#fef3c7', accentColor: '#f59e0b' },
  DEFAULT: { icon: Bell, color: '#64748b', bgColor: '#f1f5f9', accentColor: '#64748b' },
};

const NotificationCard = ({ item, onPress, onDelete }: { item: Notification, onPress: (n: Notification) => void, onDelete: (id: number) => void }) => {
  const { t, isRTL, language, getTranslatedSubject, formatNotification } = useLanguage();

  let dynamicType = item.type;
  let dynamicTitle = item.title || t.notifDefaultTitle;
  let displayMessage = item.message;

  if (item.title && item.title.trim().length > 0 && item.title !== 'Notification') {
    dynamicTitle = item.title;
  } else if (item.message.includes('A remark was left')) {
    dynamicType = 'REMARK';
    dynamicTitle = t.notifTeacherRemark || 'Teacher Remark';
    displayMessage = item.message.replace(/A remark was left for [^:]+:\s*"/, '"');
  } else if (item.type === 'ATTENDANCE') {
    dynamicTitle = t.notifAttendanceUpdate || 'Attendance Update';
    const match = item.message.match(/has been marked as (present|absent|late) on (.*) for (.*) session at (.*) by/i);
    if (match) {
       const status = match[1].toLowerCase();
       const translatedStatus = status === 'late' ? t.lateWord : status === 'absent' ? t.absentWord : t.presentWord;
       const subjectShort = getTranslatedSubject(match[3].split('|')[0].trim());
       if (isRTL) {
           displayMessage = `${t.markedAs} ${item.studentName} ${translatedStatus} ${t.forWord} ${subjectShort}.`;
       } else {
           displayMessage = `${item.studentName} ${t.markedAs} ${translatedStatus} ${t.forWord} ${subjectShort}.`;
       }
    }
  } else if (item.type === 'PAYMENT') {
    dynamicTitle = t.notifPaymentAlert || 'Payment Alert';
  } else if (item.type === 'MESSAGE') {
    dynamicTitle = item.title || (isRTL ? 'إشعار من الإدارة' : 'Message administratif');
  } else if (item.message.toLowerCase().includes('assignment') || item.message.toLowerCase().includes('task') || item.message.includes('مهمة جديدة')) {
    dynamicType = 'ASSIGNMENT';
    dynamicTitle = t.notifNewAssignment || 'New Assignment';
  } else if (item.studentName === 'SCHOOL' || item.message.toLowerCase().includes('exam schedule')) {
    dynamicTitle = t.notifSchoolAnnouncement || 'School Announcement';
  }

  displayMessage = formatNotification(displayMessage);
  dynamicTitle = formatNotification(dynamicTitle);
  const sourceLabel = item.studentName?.toUpperCase() === 'SCHOOL'
    ? (language === 'ar' ? 'المدرسة' : language === 'fr' ? 'École' : 'School')
    : item.studentName;

  const extendedConfig = {
    ...ICON_CONFIG,
    MESSAGE: { icon: Bell, color: '#0055d4', bgColor: '#eff6ff', accentColor: '#0055d4' },
    REMARK: { icon: MessageCircle, color: '#8b5cf6', bgColor: '#f5f3ff', accentColor: '#8b5cf6' },
    ASSIGNMENT: { icon: FileText, color: '#10b981', bgColor: '#d1fae5', accentColor: '#10b981' }
  };

  const config = extendedConfig[dynamicType as keyof typeof extendedConfig] || ICON_CONFIG.DEFAULT;
  const Icon = config.icon;

  const renderRightActions = () => (
    <RectButton style={styles.deleteAction} onPress={() => onDelete(item.id)}>
      <Trash2 size={22} color="white" />
      <Text style={styles.actionText}>{t.deleteBtn || 'Delete'}</Text>
    </RectButton>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} friction={2}>
      <View style={[styles.card, item.isNew && styles.unreadCardWrapper]}>
        <RectButton
          onPress={() => onPress(item)}
          style={[styles.cardContent, item.isNew && styles.unreadCard, isRTL && { flexDirection: 'row-reverse' }]}
        >
          <View style={[styles.iconContainer, { backgroundColor: config.bgColor }, isRTL ? { marginLeft: 16, marginRight: 0 } : { marginRight: 16 }]}>
            <Icon size={18} color={config.color} strokeWidth={2.5} />
          </View>

          <View style={[styles.textContainer, isRTL && { alignItems: 'flex-end' }]}>
            <View style={[styles.cardHeader, isRTL && { flexDirection: 'row-reverse' }]}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1, paddingRight: isRTL ? 0 : 10, paddingLeft: isRTL ? 10 : 0 }}>
                {item.isNew && <View style={[styles.unreadDot, isRTL ? { marginLeft: 8, marginRight: 0 } : { marginRight: 8 }]} />}
                <Text style={[styles.titleText, item.isNew && styles.unreadTitleText]} numberOfLines={2}>
                  {dynamicTitle}
                </Text>
              </View>
              <Text style={[styles.timeText, item.isNew && styles.unreadTimeText]}>{formatNotificationTime(item.createdAt, language)}</Text>
            </View>

            <Text style={[styles.messageText, item.isNew && styles.unreadMessageText, isRTL && { textAlign: 'right' }]} numberOfLines={1}>
              {displayMessage}
            </Text>
            <Text style={[styles.typeText, isRTL && { textAlign: 'right' }]} numberOfLines={1}>{sourceLabel}</Text>
          </View>

          <View style={{ justifyContent: 'center', alignItems: 'center', paddingLeft: isRTL ? 0 : 8, paddingRight: isRTL ? 8 : 0, alignSelf: 'center' }}>
            {isRTL ? <ChevronLeft size={16} color="#cbd5e1" strokeWidth={2.5} /> : <ChevronRight size={16} color="#cbd5e1" strokeWidth={2.5} />}
          </View>
        </RectButton>
      </View>
    </Swipeable>
  );
};

export const NotificationsScreen = ({ navigation }: any) => {
  const { userId, selectedChildId, setUnreadNotificationsCount } = useAppStore();
  const { t, isRTL, language } = useLanguage();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('All');

  const { data: notifications = [], isLoading: loading, isRefetching: refreshing, refetch } = useQuery({
    queryKey: ['notifications', userId, selectedChildId],
    queryFn: async () => {
      if (!userId) return [];
      const data = await studentService.fetchNotifications(userId, selectedChildId);
      setUnreadNotificationsCount(data.filter(n => n.isNew).length);
      return data;
    },
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnMount: false,
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleDelete = async (id: number) => {
    queryClient.setQueryData(['notifications', userId, selectedChildId], (old: Notification[] | undefined) =>
      old ? old.filter(n => n.id !== id) : []
    );
    try {
      await studentService.deleteNotification(id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      refetch(); // Refetch on error to sync state
    }
  };

  const handleMarkAsRead = async (item: Notification) => {
    if (item.isNew) {
      queryClient.setQueryData(['notifications', userId, selectedChildId], (old: Notification[] | undefined) =>
        old ? old.map(n => n.id === item.id ? { ...n, isNew: false } : n) : []
      );
      try {
        await studentService.markNotificationsAsRead([item.id]);
        const currentUnread = notifications.filter(n => n.isNew && n.id !== item.id).length;
        setUnreadNotificationsCount(currentUnread);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        refetch();
      }
    }

    navigation.navigate('NotificationDetail', { notification: item });
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter(n => n.isNew).map(n => n.id);
    if (unreadIds.length === 0) return;

    queryClient.setQueryData(['notifications', userId, selectedChildId], (old: Notification[] | undefined) =>
      old ? old.map(n => ({ ...n, isNew: false })) : []
    );
    setUnreadNotificationsCount(0);
    try {
      await studentService.markNotificationsAsRead(unreadIds);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      refetch();
    }
  };

  const filteredNotifications = useMemo(() => {
    let list = notifications;
    if (filter === 'Unread') list = notifications.filter(n => n.isNew);

    // Group by day
    const groups: { title: string; data: Notification[] }[] = [];
    list.forEach(n => {
      const date = new Date(n.createdAt);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      let title = t.older || 'Older';
      if (date.toDateString() === today.toDateString()) title = t.today || 'Today';
      else if (date.toDateString() === yesterday.toDateString()) title = t.yesterday || 'Yesterday';

      const existingGroup = groups.find(g => g.title === title);
      if (existingGroup) existingGroup.data.push(n);
      else groups.push({ title, data: [n] });
    });

    return groups;
  }, [notifications, filter, t.older, t.today, t.yesterday]);

  const unreadCount = notifications.filter((notification) => notification.isNew).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
          <View style={styles.backButton} />
        </View>
        <View style={[styles.titleSection, isRTL && { alignItems: 'flex-end' }]}>
          <Text style={styles.title}>{t.notificationsScreenTitle || 'Notifications'}</Text>
        </View>
        <View style={{ paddingHorizontal: 24, gap: 16 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' }}>
              <SkeletonBlock width={40} height={40} borderRadius={20} />
              <View style={{ flex: 1, marginLeft: isRTL ? 0 : 16, marginRight: isRTL ? 16 : 0, gap: 8 }}>
                <SkeletonBlock width="60%" height={16} />
                <SkeletonBlock width="40%" height={12} />
                <SkeletonBlock width="100%" height={14} />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          {isRTL ? <ChevronRight size={20} color="#0f172a" strokeWidth={3} /> : <ChevronLeft size={20} color="#0f172a" strokeWidth={3} />}
        </TouchableOpacity>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>{t.markAllAsRead || 'Mark all as read'}</Text>
          </TouchableOpacity>
        ) : <View style={styles.headerSpacer} />}
      </View>

      <View style={[styles.titleSection, isRTL && { alignItems: 'flex-end' }]}>
        <Text style={styles.title}>{t.notificationsScreenTitle || 'Notifications'}</Text>
      </View>

      <View style={[styles.filterContainer, isRTL && { flexDirection: 'row-reverse' }]}>
        {(['All', 'Unread'] as FilterType[]).map(f => {
          const tabLabel = f === 'All' ? t.filterAll : t.filterUnread;
          return (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterTab, filter === f && styles.activeFilterTab]}
          >
            <Text style={[styles.filterTabText, filter === f && styles.activeFilterTabText]}>
              {tabLabel}{f === 'Unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </Text>
          </TouchableOpacity>
        )})}
      </View>

      <SectionList
        sections={filteredNotifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <NotificationCard
            item={item}
            onPress={handleMarkAsRead}
            onDelete={handleDelete}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeader, isRTL && { alignItems: 'flex-end' }]}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <Bell size={24} color="#8FA0B3" />
            <Text style={styles.emptyStateTitle}>
              {filter === 'Unread'
                ? (language === 'ar' ? 'لا توجد إشعارات غير مقروءة' : language === 'fr' ? 'Tout est lu' : 'You are all caught up')
                : (language === 'ar' ? 'لا توجد إشعارات' : language === 'fr' ? 'Aucune notification' : 'No notifications')}
            </Text>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0055d4" />
        }
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B57D0',
  },
  headerSpacer: { width: 40 },
  titleSection: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EEF2F6',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  activeFilterTab: {
    backgroundColor: '#E8F0FE',
    borderColor: '#D4E2FA',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  activeFilterTabText: {
    color: '#174EA6',
  },
  listContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#F7F9FC',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#708095',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5EAF0',
    borderRadius: 16,
    overflow: 'hidden',
  },
  unreadCardWrapper: {
    borderColor: '#D5E2F5',
  },
  unreadCard: {
    backgroundColor: '#F8FAFD',
  },
  cardContent: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8390A2',
    marginTop: 5,
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  unreadTimeText: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  unreadTitleText: {
    fontWeight: '900',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0B57D0',
    marginRight: 8,
  },
  messageText: {
    fontSize: 13,
    color: '#5F6D7E',
    lineHeight: 19,
  },
  unreadMessageText: {
    color: '#1e293b',
    fontWeight: '500',
  },
  emptyState: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 72, gap: 12 },
  emptyStateTitle: { color: '#66758A', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  deleteAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
});
