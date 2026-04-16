import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, GraduationCap, CheckCircle2, AlertTriangle, Info, Check } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { studentService, authStorage } from '../services/api';
import { Notification } from '../types';

const ICON_MAP: Record<string, any> = {
  GraduationCap, CheckCircle2, AlertTriangle, Info,
};

const NotificationRow = ({ item, onPress }: any) => {
  const Icon = ICON_MAP[item.iconName] || Info;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 24,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: item.isNew ? '#0055d415' : '#f1f4f6',
        backgroundColor: item.isNew ? '#0055d403' : 'white',
        shadowColor: '#2b3437',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: item.isNew ? 0.05 : 0,
        shadowRadius: 8,
        elevation: item.isNew ? 2 : 0,
      }}
    >
      <View style={{ 
        width: 44, 
        height: 44, 
        borderRadius: 14, 
        backgroundColor: item.iconColor + '10', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginRight: 16 
      }}>
        <Icon size={22} color={item.iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: 10, fontWeight: '900', color: '#abb3b7', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {item.type} • {item.student}
          </Text>
          <Text style={{ fontSize: 11, color: '#abb3b7', fontWeight: '500' }}>{item.time}</Text>
        </View>
        <Text style={{ 
          fontSize: 14, 
          fontWeight: item.isNew ? '700' : '500', 
          color: item.isNew ? '#2b3437' : '#737c7f', 
          lineHeight: 20 
        }}>
          {item.message}
        </Text>
      </View>
      {item.isNew && (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0055d4', marginLeft: 12 }} />
      )}
    </TouchableOpacity>
  );
};

export const NotificationsScreen = ({ navigation }: any) => {
  const { selectedChildId, unreadNotificationsCount, setUnreadNotificationsCount } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications(false);
  };

  const handleMarkAsRead = async (item: Notification) => {
    // 1. Mark as read (Optimistic)
    if (item.isNew) {
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isNew: false } : n));
      try {
        await studentService.markNotificationsAsRead([item.id]);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // 2. Navigate based on type
    if (item.type === 'ANNOUNCEMENT') {
      navigation.navigate('MainTabs', { screen: 'Announcements' });
    } else if (item.type === 'PAYMENT' || item.type === 'REMINDER') {
      navigation.navigate('MainTabs', { screen: 'Payments' });
    }

    // Refresh count
    const newUnreadCount = notifications.filter(n => n.id !== item.id ? n.isNew : false).length;
    setUnreadNotificationsCount(newUnreadCount);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => n.isNew).map(n => n.id);
    if (unreadIds.length === 0) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, isNew: false })));
    setUnreadNotificationsCount(0);

    try {
      await studentService.markNotificationsAsRead(unreadIds);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => n.isNew).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfdfd' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{ 
        paddingHorizontal: 20, 
        paddingVertical: 16, 
        backgroundColor: 'white', 
        flexDirection: 'row', 
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 10
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-surface-low items-center justify-center mr-4"
        >
          <ChevronLeft size={24} color="#2b3437" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437', fontFamily: 'Jakarta-Bold' }}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={{ fontSize: 12, color: '#0055d4', fontWeight: '700' }}>{unreadCount} unread</Text>
          )}
        </View>
        
        {unreadCount > 0 && (
          <TouchableOpacity 
            onPress={handleMarkAllRead}
            style={{ 
              backgroundColor: '#f1f4f6', 
              paddingHorizontal: 12, 
              paddingVertical: 6, 
              borderRadius: 12 
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#737c7f' }}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0055d4" />
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0055d4"]} />
          }
        >
          {notifications.length > 0 ? (
            notifications.map(item => (
              <NotificationRow 
                key={item.id} 
                item={item} 
                onPress={handleMarkAsRead}
              />
            ))
          ) : (
            <View style={{ alignItems: 'center', marginTop: 100 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <CheckCircle2 size={40} color="#abb3b7" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437', marginBottom: 8 }}>All caught up!</Text>
              <Text style={{ fontSize: 14, color: '#737c7f', textAlign: 'center', paddingHorizontal: 40 }}>
                There are no new notifications for you right now.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};
