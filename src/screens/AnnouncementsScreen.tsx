import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Megaphone, Bell, Search, Filter, Calendar, ChevronRight, Info, CheckCircle2, AlertTriangle, GraduationCap } from 'lucide-react-native';

// --- Mock Data ---
const ANNOUNCEMENTS = [
  {
    id: 1,
    title: 'Bazaar des Parents 2026',
    date: 'April 15, 2026',
    category: 'Event',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=800&auto=format&fit=crop',
    excerpt: 'Join us for our annual parents bazaar on the main campus playground. Lots of food, music, and activities!',
  },
  {
    id: 2,
    title: 'Spring Break Schedule',
    date: 'April 20, 2026',
    category: 'Academic',
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800&auto=format&fit=crop',
    excerpt: 'Please note the revised schedule for the upcoming Spring Break starting April 28th.',
  },
  {
    id: 3,
    title: 'Health & Safety Update',
    date: 'April 12, 2026',
    category: 'General',
    image: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?q=80&w=800&auto=format&fit=crop',
    excerpt: 'Updated protocols for campus visitors starting next Monday.',
  }
];

const NOTIFICATIONS = [
  {
    id: 1,
    type: 'Grade',
    student: 'Ahmed',
    message: 'Math Quiz - New Grade available: 18.5/20',
    time: '2 hours ago',
    icon: GraduationCap,
    iconColor: '#0055d4',
    isNew: true
  },
  {
    id: 2,
    type: 'Attendance',
    student: 'Sara',
    message: 'Just arrived at school',
    time: '3 hours ago',
    icon: CheckCircle2,
    iconColor: '#16a34a',
    isNew: false
  },
  {
    id: 3,
    type: 'Alert',
    student: 'Ahmed',
    message: 'Biology lab coat required for tomorrow',
    time: '5 hours ago',
    icon: AlertTriangle,
    iconColor: '#ea580c',
    isNew: true
  },
  {
    id: 4,
    type: 'Fee',
    student: 'System',
    message: 'April Tuition invoice is now ready for review',
    time: 'Yesterday',
    icon: Info,
    iconColor: '#737c7f',
    isNew: false
  }
];

// --- Components ---

const AnnouncementCard = ({ item }: any) => (
  <TouchableOpacity 
    style={{
      backgroundColor: 'white',
      borderRadius: 28,
      overflow: 'hidden',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#f1f4f6',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 10,
      elevation: 3
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

const NotificationRow = ({ item }: any) => {
  const Icon = item.icon;
  return (
    <TouchableOpacity 
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 18,
        borderRadius: 24,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: item.isNew ? '#0055d415' : '#f1f4f6',
        backgroundColor: item.isNew ? '#0055d403' : 'white'
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

export const AnnouncementsScreen = () => {
  const [activeTab, setActiveTab] = useState<'announcements' | 'notifications'>('announcements');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header Tier 1: Search & Branding */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <View>
            <Text style={{ fontSize: 28, fontWeight: 'black', color: '#2b3437', letterSpacing: -0.5 }}>Comm Center</Text>
            <Text style={{ fontSize: 13, color: '#737c7f', marginTop: 2 }}>School news & student alerts</Text>
          </View>
          <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 }}>
            <Megaphone size={22} color="#0055d4" />
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

      {/* Tabs */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#e2e9ec', padding: 5, borderRadius: 18 }}>
          <TouchableOpacity 
            onPress={() => setActiveTab('announcements')}
            style={{ flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: activeTab === 'announcements' ? 'white' : 'transparent', alignItems: 'center', shadowColor: activeTab === 'announcements' ? '#2b3437' : 'transparent', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: activeTab === 'announcements' ? 2 : 0 }}
          >
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: activeTab === 'announcements' ? '#0055d4' : '#586064' }}>Announcements</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('notifications')}
            style={{ flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: activeTab === 'notifications' ? 'white' : 'transparent', alignItems: 'center', shadowColor: activeTab === 'notifications' ? '#2b3437' : 'transparent', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: activeTab === 'notifications' ? 2 : 0 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: activeTab === 'notifications' ? '#0055d4' : '#586064' }}>Notifications</Text>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#ef4444', marginLeft: 8, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 10, fontWeight: '900' }}>2</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 150 }}>
        {activeTab === 'announcements' ? (
          ANNOUNCEMENTS.map(item => <AnnouncementCard key={item.id} item={item} />)
        ) : (
          NOTIFICATIONS.map(item => <NotificationRow key={item.id} item={item} />)
        )}
      </ScrollView>

    </SafeAreaView>
  );
};
