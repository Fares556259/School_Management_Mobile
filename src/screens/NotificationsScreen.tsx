import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { RefreshControl, View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, SectionList, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, GraduationCap, CheckCircle2, AlertTriangle, Info, Check, Trash2, Calendar, Clock, Bell } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { studentService, authStorage } from '../services/api';
import { Notification } from '../types';
import { RectButton, Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

type FilterType = 'All' | 'Unread' | 'Urgent';

const ICON_CONFIG: Record<string, { icon: any, color: string, bgColor: string }> = {
  URGENT: { icon: AlertTriangle, color: '#ef4444', bgColor: '#fee2e2' },
  ANNOUNCEMENT: { icon: Info, color: '#0055d4', bgColor: '#e0f0ff' },
  ATTENDANCE: { icon: Clock, color: '#8b5cf6', bgColor: '#f3e8ff' },
  PAYMENT: { icon: Calendar, color: '#f59e0b', bgColor: '#fef3c7' },
  DEFAULT: { icon: Bell, color: '#64748b', bgColor: '#f1f5f9' },
};

const NotificationCard = ({ item, onPress, onDelete }: { item: Notification, onPress: (n: Notification) => void, onDelete: (id: number) => void }) => {
  const config = ICON_CONFIG[item.type] || (item.message.includes('URGENT') ? ICON_CONFIG.URGENT : ICON_CONFIG.DEFAULT);
  const Icon = config.icon;

  const renderRightActions = () => {
    return (
      <RectButton 
        style={styles.deleteAction} 
        onPress={() => onDelete(item.id)}
      >
        <Trash2 size={22} color="white" />
        <Text style={styles.actionText}>Delete</Text>
      </RectButton>
    );
  };

  const renderLeftActions = () => {
    if (!item.isNew) return null;
    return (
      <RectButton 
        style={styles.readAction} 
        onPress={() => onPress(item)}
      >
        <Check size={22} color="white" />
        <Text style={styles.actionText}>Read</Text>
      </RectButton>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      friction={2}
      leftThreshold={40}
      rightThreshold={40}
    >
      <Animated.View 
        entering={FadeInUp.duration(400)}
        layout={Layout.springify()}
        style={[
          styles.card,
          item.isNew && styles.unreadCard
        ]}
      >
        <TouchableOpacity 
          activeOpacity={0.6}
          onPress={() => onPress(item)}
          style={styles.cardContent}
        >
          <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
            <Icon size={20} color={config.color} />
          </View>
          
          <View style={styles.textContainer}>
            <View style={styles.cardHeader}>
              <Text style={styles.typeText}>{item.type} • {item.student}</Text>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
            
            <Text 
              style={[styles.messageText, item.isNew && styles.unreadMessage]}
              numberOfLines={2}
            >
              {item.message}
            </Text>
          </View>

          {item.isNew && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </Animated.View>
    </Swipeable>
  );
};

export const NotificationsScreen = ({ navigation }: any) => {
  const { selectedChildId, setUnreadNotificationsCount } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');

  const loadNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const parentId = await authStorage.getParentId();
      if (!parentId) return;

      const data = await studentService.fetchNotifications(parentId, selectedChildId);
      setNotifications(data);
      setUnreadNotificationsCount(data.filter(n => n.isNew).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChildId, setUnreadNotificationsCount]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications(false);
  };

  const handleMarkAsRead = async (item: Notification) => {
    if (item.isNew) {
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isNew: false } : n));
      try {
        await studentService.markNotificationsAsRead([item.id]);
        setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate to Home page as requested
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  const handleMarkAllRead = async () => {
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

  const handleDelete = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filteredNotifications = useMemo(() => {
    let list = notifications;
    if (activeFilter === 'Unread') list = notifications.filter(n => n.isNew);
    if (activeFilter === 'Urgent') list = notifications.filter(n => n.type === 'URGENT' || n.message.includes('URGENT'));
    return list;
  }, [notifications, activeFilter]);

  const groupedNotifications = useMemo(() => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const older: Notification[] = [];

    filteredNotifications.forEach(n => {
      const t = n.time.toLowerCase();
      if (t.includes('min') || t.includes('now') || (t.includes('hour') && parseInt(t) < 24)) {
        today.push(n);
      } else if (t.includes('1d') || t.includes('yesterday') || (t.includes('hour') && parseInt(t) >= 24)) {
        yesterday.push(n);
      } else {
        older.push(n);
      }
    });

    const sections = [];
    if (today.length > 0) sections.push({ title: 'Today', data: today });
    if (yesterday.length > 0) sections.push({ title: 'Yesterday', data: yesterday });
    if (older.length > 0) sections.push({ title: 'Older', data: older });

    return sections;
  }, [filteredNotifications]);

  const unreadTotal = notifications.filter(n => n.isNew).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color="#2b3437" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markReadText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.title}>Notifications</Text>

        {/* Filter Pills */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          {(['All', 'Unread', 'Urgent'] as FilterType[]).map(filter => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterTab,
                activeFilter === filter && styles.filterTabActive
              ]}
            >
              <Text style={[
                styles.filterTabText,
                activeFilter === filter && styles.filterTabTextActive
              ]}>
                {filter}
                {filter === 'Unread' && unreadTotal > 0 && ` (${unreadTotal})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0055d4" />
        </View>
      ) : (
        <SectionList
          sections={groupedNotifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <NotificationCard 
              item={item} 
              onPress={handleMarkAsRead}
              onDelete={handleDelete}
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0055d4"]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Bell size={64} color="#e2e8f0" strokeWidth={1} />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>
                No {activeFilter.toLowerCase()} notifications found.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markReadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0055d4',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterScroll: {
    maxHeight: 50,
    marginBottom: 16,
  },
  filterContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#0f172a',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: 'white',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'white',
    marginVertical: 4,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#f8fbff',
    borderWidth: 1,
    borderColor: '#0055d410',
  },
  cardContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  messageText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    fontWeight: '400',
  },
  unreadMessage: {
    color: '#1e293b',
    fontWeight: '700',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0055d4',
    marginLeft: 12,
  },
  deleteAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 20,
    marginLeft: 10,
  },
  readAction: {
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 20,
    marginRight: 10,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
