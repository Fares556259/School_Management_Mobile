import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Edit2, Globe, BellRing, LifeBuoy, LogOut, Home, BookOpen, FileText, CreditCard, User } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';

const ChildCard = ({ child, isSelected, onSelect }: any) => (
  <TouchableOpacity 
    onPress={onSelect}
    className={`w-[160px] p-4 mr-4 rounded-[32px] bg-surface-lowest border ${isSelected ? 'border-brand-primary bg-blue-50' : 'border-surface-low'}`}
    style={{
      shadowColor: '#2b3437',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 24,
      elevation: 4,
    }}
  >
    <View className="relative">
      <Image source={{ uri: child.avatarUrl }} className="w-16 h-16 rounded-2xl bg-surface-low" />
      {isSelected && (
        <View className="absolute -top-2 -right-2 bg-brand-primary rounded-full p-1 border-2 border-white">
          <Text className="text-white text-[10px]">✓</Text>
        </View>
      )}
    </View>
    <Text className="text-brand-primary font-jakarta font-bold text-lg mt-3">{child.name.split(' ')[0]}</Text>
    <Text className="text-text-muted font-manrope text-sm font-medium">{child.class}</Text>
  </TouchableOpacity>
);

const SettingItem = ({ icon: Icon, label, value, color, iconColor, isLast }: any) => (
  <TouchableOpacity 
    className={`flex-row items-center py-4 ${!isLast ? 'border-b border-surface-low' : ''}`}
  >
    <View className={`p-3 rounded-2xl mr-4 ${color || 'bg-surface-low'}`}>
      <Icon size={20} color={iconColor || '#737c7f'} />
    </View>
    <View className="flex-1">
      <Text className={`text-lg font-jakarta font-semibold ${iconColor === '#9f403d' ? 'text-brand-error' : 'text-text-primary'}`}>{label}</Text>
      {value && <Text className="text-text-secondary font-manrope text-sm font-medium">{value}</Text>}
    </View>
    <Text className="text-text-muted text-xl font-light">›</Text>
  </TouchableOpacity>
);

export const ProfileScreen = () => {
  const { children, selectedChildId, setSelectedChildId } = useAppStore();

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 bg-surface-lowest">
        <View className="flex-row items-center">
          <View className="w-8 h-8 bg-brand-primary rounded-lg items-center justify-center mr-2">
            <Text className="text-white font-black">S</Text>
          </View>
          <Text className="text-xl font-jakarta font-black text-brand-primary">SnapSchool</Text>
        </View>
        <TouchableOpacity className="p-2">
          <Bell size={24} color="#0055d4" fill="#0055d4" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerClassName="px-6 pb-32">
        {/* Parent Profile Section */}
        <View className="items-center mt-6">
          <View className="relative">
            <View className="p-1 rounded-full border border-surface-low">
              <Image 
                source={{ uri: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' }} 
                className="w-28 h-28 rounded-full"
              />
            </View>
            <TouchableOpacity className="absolute bottom-0 right-0 bg-brand-primary p-2 rounded-full border-2 border-white">
              <Edit2 size={14} color="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-3xl font-jakarta font-black text-text-primary mt-4">Sarah Al-Mansouri</Text>
          <Text className="text-text-secondary font-manrope font-bold mt-1">+971 50 123 4567</Text>
        </View>

        {/* My Children Section */}
        <View className="mt-10">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-jakarta font-black text-text-primary">My Children</Text>
            <TouchableOpacity><Text className="text-brand-primary font-jakarta font-bold">Manage</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
            {children.map(child => (
              <ChildCard 
                key={child.id} 
                child={child} 
                isSelected={selectedChildId === child.id}
                onSelect={() => setSelectedChildId(child.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Settings Section */}
        <View className="mt-10">
          <Text className="text-2xl font-jakarta font-black text-text-primary mb-4">Settings</Text>
          <View className="bg-surface-lowest rounded-[32px] p-6 border border-surface-low">
            <SettingItem icon={Globe} label="Language" value="English (System Default)" color="bg-blue-50" iconColor="#0055d4" />
            <SettingItem icon={BellRing} label="Notifications" value="Alerts, grades, & messages" color="bg-surface-low" iconColor="#586064" />
            <SettingItem icon={LifeBuoy} label="Support" value="Help center & contact school" color="bg-blue-50" iconColor="#0055d4" />
            <SettingItem icon={LogOut} label="Logout" color="bg-red-50" iconColor="#9f403d" isLast />
          </View>
        </View>

        {/* Footer */}
        <View className="items-center mt-12 mb-20">
          <Text className="text-text-muted text-[10px] font-jakarta font-bold tracking-widest uppercase">SnapSchool Parent V2.4.0 (Build 82)</Text>
          <Text className="text-text-muted text-[10px] font-manrope mt-1">© 2026 SnapSchool Education Systems</Text>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
};
