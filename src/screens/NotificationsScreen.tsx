import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, GraduationCap, CheckCircle2, AlertTriangle, Info } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { studentService } from '../services/api';
import { Notification } from '../types';
const ICON_MAP: Record<string, any> = {
  GraduationCap, CheckCircle2, AlertTriangle, Info,
};

const NotificationRow = ({ item }: any) => {
  const Icon = ICON_MAP[item.iconName] || Info;
  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 24,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: item.isNew ? '#0055d415' : '#f1f4f6',
        backgroundColor: item.isNew ? '#0055d403' : 'white',
      }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: item.iconColor + '10', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
        <Icon size={22} color={item.iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#737c7f', textTransform: 'uppercase' }}>{item.type} • {item.student}</Text>
          <Text style={{ fontSize: 11, color: '#abb3b7' }}>{item.time}</Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: item.isNew ? 'bold' : '500', color: '#2b3437', lineHeight: 20 }}>{item.message}</Text>
      </View>
      {item.isNew && (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0055d4', marginLeft: 12 }} />
      )}
    </TouchableOpacity>
  );
};

export const NotificationsScreen = ({ navigation }: any) => {
  const { selectedChildId } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedChildId) return;
    const loadNotifications = async () => {
      setLoading(true);
      const data = await studentService.fetchNotifications(selectedChildId);
      setNotifications(data);
      setLoading(false);
    };
    loadNotifications();
  }, [selectedChildId]);
  const unreadCount = notifications.filter(n => n.isNew).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f4f6', flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}
        >
          <ChevronLeft size={24} color="#2b3437" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={{ fontSize: 12, color: '#737c7f', marginTop: 2 }}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0055d4" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {notifications.length > 0 ? (
            notifications.map(item => <NotificationRow key={item.id} item={item} />)
          ) : (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Info size={48} color="#d1d5db" />
              <Text style={{ fontSize: 16, color: '#737c7f', fontWeight: '500', marginTop: 16 }}>No notifications yet</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};
