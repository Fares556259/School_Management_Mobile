import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StatusBar } from 'react-native';
import { Bell, ChevronDown, Check, X, User, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { authStorage, studentService } from '../services/api';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

interface GlobalHeaderProps {
  navigation: any;
  showBack?: boolean;
}

export const GlobalHeader = ({ navigation, showBack }: GlobalHeaderProps) => {
  const { t, isRTL } = useLanguage();
  const { 
    selectedChildId, 
    setSelectedChildId, 
    children, 
    userName, 
    userAvatarUrl, 
    userRole,
    userId,
    unreadNotificationsCount,
    setUnreadNotificationsCount,
    studentStatuses
  } = useAppStore();
  
  const [showSwitcher, setShowSwitcher] = useState(false);
  const selectedChild = children.find((c: any) => c.id === selectedChildId);
  const status = selectedChildId ? studentStatuses[selectedChildId] || 'Present' : 'Present';

  // Only load Notifications count in the header, profile should be in the store
  useEffect(() => {
    const loadUnreadCount = async () => {
      const uid = userId || await authStorage.getUserId();
      if (uid) {
        try {
          const notes = await studentService.fetchNotifications(uid, selectedChildId);
          setUnreadNotificationsCount(notes.filter(n => n.isNew).length);
        } catch (e) {
          console.log("[NOTIF-LOAD-ERROR] Silent skip");
        }
      }
    };
    loadUnreadCount();
  }, [selectedChildId, userId]);

  const handleSwitchChild = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedChildId(id);
    setShowSwitcher(false);
  };

  const toggleSwitcher = () => {
    if (userRole === 'teacher') return;
    Haptics.selectionAsync();
    setShowSwitcher(!showSwitcher);
  };

  return (
    <View className="bg-white border-b border-surface-low z-50">
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 }}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1 }}>
          {showBack ? (
            <TouchableOpacity 
              onPress={() => {
                Haptics.selectionAsync();
                navigation.goBack();
              }}
              style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}
            >
              {isRTL ? <ChevronRight size={24} color="#2b3437" strokeWidth={3} /> : <ChevronLeft size={24} color="#2b3437" strokeWidth={3} />}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPress={() => {
                Haptics.selectionAsync();
                navigation.navigate('Profile');
              }}
              activeOpacity={0.8}
              className="relative"
            >
              <View className="w-11 h-11 rounded-full border-2 border-surface-low overflow-hidden bg-white shadow-sm">
                <Image 
                  source={userAvatarUrl ? { uri: userAvatarUrl } : require('../../assets/noavatar.png')} 
                  contentFit="cover"
                  transition={200}
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
              
              {userRole === 'parent' && (
                <View className="absolute -right-1 -bottom-1 w-6 h-6 rounded-full border-2 border-white overflow-hidden bg-surface-low shadow-sm">
                  <Image 
                    source={selectedChild?.avatarUrl ? { uri: selectedChild.avatarUrl } : require('../../assets/noavatar.png')} 
                    contentFit="cover"
                    transition={200}
                    style={{ width: '100%', height: '100%' }}
                  />
                </View>
              )}
            </TouchableOpacity>
          )}

          <View style={{ marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0, flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text className="text-[10px] font-jakarta font-black text-text-muted opacity-40 uppercase tracking-[2px]" numberOfLines={1}>
              {userRole === 'teacher' ? 'SnapSchool Teacher' : userName}
            </Text>
            
            <TouchableOpacity 
              onPress={toggleSwitcher}
              disabled={userRole === 'teacher'}
              style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 2 }}
            >
              <Text className="text-xl font-jakarta font-black text-brand-primary tracking-tight" numberOfLines={1}>
                {userRole === 'teacher' ? userName.split(' ')[0] : (selectedChild?.name?.split(' ')[0] || t.switchChild)}
              </Text>
              {userRole === 'parent' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}>
                  <View className={`w-1.5 h-1.5 rounded-full mr-2 ${status === 'Absent' ? 'bg-brand-error' : status === 'Due' ? 'bg-orange-500' : 'bg-green-500'}`} />
                  <ChevronDown size={14} color="#0055d4" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setUnreadNotificationsCount(0);
            navigation.navigate('Notifications');
          }}
          className="w-11 h-11 rounded-full bg-white items-center justify-center border border-surface-low shadow-sm"
        >
          <Bell size={22} color="#0055d4" strokeWidth={2.5} />
        {unreadNotificationsCount > 0 && (
          <View className="absolute top-0 right-0 bg-brand-error min-w-[18px] h-[18px] rounded-full items-center justify-center px-1 border-2 border-white">
            <Text className="text-[8px] font-black text-white">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </Text>
          </View>
        )}
        </TouchableOpacity>
      </View>

      {/* Child Switcher BottomSheet */}
      <Modal visible={showSwitcher} transparent animationType="slide" onRequestClose={() => setShowSwitcher(false)}>
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setShowSwitcher(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <View className="bg-white rounded-t-[40px] p-8 pb-12">
            <View className="w-10 h-1 bg-surface-low rounded-full self-center mb-6" />
            
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-2xl font-jakarta font-black text-brand-primary">Family Profiles</Text>
                <Text className="text-sm text-text-muted font-manrope font-medium mt-1">Switch between your children</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSwitcher(false)} className="w-10 h-10 bg-surface-low rounded-full items-center justify-center">
                <X size={20} color="#737c7f" />
              </TouchableOpacity>
            </View>
 
            <View className="gap-3">
              {children.map((child: any) => {
                const isActive = selectedChildId === child.id;
                return (
                   <TouchableOpacity
                    key={child.id}
                    onPress={() => handleSwitchChild(child.id)}
                    className={`flex-row items-center p-4 rounded-[28px] border-2 ${isActive ? 'bg-blue-50/50 border-brand-primary' : 'bg-surface-lowest border-surface-low'}`}
                  >
                    <View className={`w-14 h-14 rounded-full overflow-hidden border-2 ${isActive ? 'border-brand-primary' : 'border-surface-low'}`}>
                      <Image 
                        source={child.avatarUrl ? { uri: child.avatarUrl } : require('../../assets/noavatar.png')} 
                        transition={200}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </View>
                    <View className="flex-1 ml-4">
                      <Text className="text-lg font-jakarta font-bold text-text-primary">{child.name}</Text>
                      <Text className="text-sm text-text-muted font-manrope font-semibold">{child.class || 'No Class Assigned'}</Text>
                    </View>
                    {isActive ? (
                      <View className="w-7 h-7 bg-brand-primary rounded-full items-center justify-center">
                        <Check size={16} color="white" />
                      </View>
                    ) : (
                      <ChevronRight size={20} color="#d1d5db" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
 
            <TouchableOpacity 
              className="flex-row items-center justify-center mt-6 p-4 rounded-2xl bg-surface-low"
              onPress={() => {
                setShowSwitcher(false);
                navigation.navigate('LinkChild');
              }}
            >
              <User size={18} color="#0055d4" className="mr-2" />
              <Text className="text-brand-primary font-jakarta font-bold text-sm uppercase tracking-widest">Link New Student</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
