import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Alert, RefreshControl, View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, SectionList, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, AlertTriangle, Info, Check, Trash2, Calendar, Clock, Bell } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { studentService, authStorage } from '../services/api';
import { Notification } from '../types';
import { RectButton, Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

type FilterType = 'All' | 'Unread' | 'Urgent';

const ICON_CONFIG: Record<string, { icon: any, color: string, bgColor: string, accentColor: string }> = {
  URGENT: { icon: AlertTriangle, color: '#f97316', bgColor: '#fff7ed', accentColor: '#ef4444' },
  ANNOUNCEMENT: { icon: Info, color: '#0055d4', bgColor: '#eff6ff', accentColor: '#4f46e5' },
  ATTENDANCE: { icon: AlertTriangle, color: '#f97316', bgColor: '#fff7ed', accentColor: '#ef4444' },
  PAYMENT: { icon: Calendar, color: '#f59e0b', bgColor: '#fef3c7', accentColor: '#f59e0b' },
  DEFAULT: { icon: Bell, color: '#64748b', bgColor: '#f1f5f9', accentColor: '#64748b' },
};

const NotificationCard = ({ item, onPress, onDelete }: { item: Notification, onPress: (n: Notification) => void, onDelete: (id: number) => void }) => {
  const absenceCount = item.message.match(/(\d+) absences/)?.[1] || item.message.match(/missed (\d+) sessions/)?.[1];
  const config = ICON_CONFIG[item.type] || ICON_CONFIG.DEFAULT;
  const Icon = config.icon;

  const renderRightActions = () => (
    <RectButton style={styles.deleteAction} onPress={() => onDelete(item.id)}>
      <Trash2 size={22} color="white" />
      <Text style={styles.actionText}>Delete</Text>
    </RectButton>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} friction={2}>
      <Animated.View 
        entering={FadeInUp.duration(400)}
        layout={Layout.springify()}
        style={styles.card}
      >
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => onPress(item)}
          style={styles.cardContent}
        >
          <View style={[styles.iconContainer, { backgroundColor: 'transparent', borderWidth: 0, paddingRight: 0 }]}>
            <Icon size={24} color={config.color} strokeWidth={2} />
          </View>
          
          <View style={styles.textContainer}>
            <View style={styles.cardHeader}>
              <Text style={styles.titleText}>
                {item.type === 'ATTENDANCE' ? 'Attendance alert' : (item.title || 'Notification')}
              </Text>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              {item.isNew && (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#0055d4', marginRight: 6 }} />
              )}
              <Text style={styles.typeText}>{item.type} • {item.studentName}</Text>
            </View>
            

            
            <Text style={styles.messageText} numberOfLines={2}>
              {item.message}
            </Text>

            {absenceCount && (
              <View style={styles.absencePill}>
                <View style={styles.pillDot} />
                <Text style={styles.pillText}>{absenceCount} absences</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Swipeable>
  );
};

export const NotificationsScreen = ({ navigation }: any) => {
  const { userId, selectedChildId, setUnreadNotificationsCount } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('All');

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const data = await studentService.fetchNotifications(userId, selectedChildId);
      setNotifications(data);
      setUnreadNotificationsCount(data.filter(n => n.isNew).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId, selectedChildId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [userId, selectedChildId]);

  const handleDelete = async (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await studentService.deleteNotification(id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleMarkAsRead = async (item: Notification) => {
    if (item.isNew) {
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isNew: false } : n));
      try {
        await studentService.markNotificationsAsRead([item.id]);
        const currentUnread = notifications.filter(n => n.isNew && n.id !== item.id).length;
        setUnreadNotificationsCount(currentUnread);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    if (item.type === 'ATTENDANCE' || item.type === 'ANNOUNCEMENT' || item.message.includes('URGENT')) {
      navigation.navigate('NotificationDetail', { notification: item });
    } else if (item.type === 'PAYMENT') {
      navigation.navigate('MainTabs', { screen: 'Payments' });
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter(n => n.isNew).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, isNew: false })));
    setUnreadNotificationsCount(0);
    try {
      await studentService.markNotificationsAsRead(unreadIds);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const filteredNotifications = useMemo(() => {
    let list = notifications;
    if (filter === 'Unread') list = notifications.filter(n => n.isNew);
    if (filter === 'Urgent') list = notifications.filter(n => n.type === 'ATTENDANCE' || n.message.includes('URGENT'));
    
    // Group by day
    const groups: { title: string; data: Notification[] }[] = [];
    list.forEach(n => {
      const date = new Date(n.createdAt);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      let title = 'Older';
      if (date.toDateString() === today.toDateString()) title = 'Today';
      else if (date.toDateString() === yesterday.toDateString()) title = 'Yesterday';

      const existingGroup = groups.find(g => g.title === title);
      if (existingGroup) existingGroup.data.push(n);
      else groups.push({ title, data: [n] });
    });

    return groups;
  }, [notifications, filter]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0055d4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={20} color="#0f172a" strokeWidth={3} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleSection}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <View style={styles.filterContainer}>
        {(['All', 'Unread', 'Urgent'] as FilterType[]).map(f => (
          <TouchableOpacity 
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterTab, filter === f && styles.activeFilterTab]}
          >
            <Text style={[styles.filterTabText, filter === f && styles.activeFilterTabText]}>
              {f}{f === 'Unread' ? ` (${notifications.filter(n => n.isNew).length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
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
    backgroundColor: '#ffffff',
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
    fontSize: 15,
    fontWeight: '600',
    color: '#0055d4',
  },
  titleSection: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  activeFilterTab: {
    backgroundColor: '#f1f5f9',
  },
  filterTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  activeFilterTabText: {
    color: '#0f172a',
  },
  listContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardContent: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 32,
    height: 32,
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
    marginBottom: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  timeText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  messageText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  absencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ef4444',
  },
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
