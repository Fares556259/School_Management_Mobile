import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Search, Filter, ChevronRight } from 'lucide-react-native';
import { studentService } from '../services/api';
import { Announcement } from '../types';
import { useAppStore } from '../store/useAppStore';

const AnnouncementCard = ({ item, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      backgroundColor: 'white', borderRadius: 28, overflow: 'hidden', marginBottom: 20,
      borderWidth: 1, borderColor: '#f1f4f6',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 3,
    }}
  >
    <Image source={{ uri: item.image }} style={{ width: '100%', height: 160 }} />
    <View style={{ padding: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ backgroundColor: '#0055d410', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0055d4', textTransform: 'uppercase' }}>{item.category}</Text>
        </View>
        <Text style={{ fontSize: 12, color: '#737c7f', marginLeft: 12 }}>{item.date}</Text>
      </View>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437', marginBottom: 8 }}>{item.title}</Text>
      <Text style={{ fontSize: 13, color: '#586064', lineHeight: 20 }} numberOfLines={2}>{item.excerpt}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0055d4' }}>Read Full Story</Text>
        <ChevronRight size={16} color="#0055d4" style={{ marginLeft: 4 }} />
      </View>
    </View>
  </TouchableOpacity>
);

export const AnnouncementsScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { getSelectedChild, selectedChildId } = useAppStore();

  useEffect(() => {
    const fetchWithClass = async () => {
      setLoading(true);
      const child = getSelectedChild();
      const classId = child?.raw?.classId;
      const data = await studentService.fetchAnnouncements(classId);
      setAnnouncements(data);
      setLoading(false);
    };

    fetchWithClass();
  }, [selectedChildId]);

  const filtered = announcements.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <View>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#2b3437', letterSpacing: -0.5 }}>Comm Center</Text>
            <Text style={{ fontSize: 13, color: '#737c7f', marginTop: 2 }}>School news & student alerts</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 }}
          >
            <Bell size={22} color="#0055d4" />
            <View style={{ position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 2, borderColor: 'white' }} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, height: 52, backgroundColor: 'white', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: '#f1f4f6' }}>
            <Search size={20} color="#abb3b7" style={{ marginRight: 12 }} />
            <TextInput
              placeholder="Search news..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ flex: 1, fontSize: 15, color: '#2b3437', fontWeight: '500' }}
              placeholderTextColor="#abb3b7"
            />
          </View>
          <TouchableOpacity style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f4f6' }}>
            <Filter size={20} color="#737c7f" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0055d4" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 150 }}>
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
