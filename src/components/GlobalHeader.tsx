import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, StatusBar } from 'react-native';
import { Bell, ChevronDown, Check, X, User, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { parentService, studentService } from '../services/api';

interface GlobalHeaderProps {
  navigation: any;
  showBack?: boolean;
}

export const GlobalHeader = ({ navigation, showBack }: GlobalHeaderProps) => {
  const { 
    selectedChildId, 
    setSelectedChildId, 
    children, 
    parentName, 
    setParentName, 
    parentAvatarUrl, 
    setParentAvatarUrl 
  } = useAppStore();
  
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [status, setStatus] = useState<'Present' | 'Absent' | 'Due'>('Present');
  const selectedChild = children.find((c: any) => c.id === selectedChildId);

  // Load Parent Profile if not already in store
  useEffect(() => {
    if (!parentName || parentName === 'Parent' || !parentAvatarUrl) {
      const loadParent = async () => {
        const profile = await parentService.fetchParentProfile();
        if (profile) {
          setParentName(`${profile.name} ${profile.surname}`);
          setParentAvatarUrl(profile.img);
        }
      };
      loadParent();
    }
  }, []);

  // Compute Status Priority for Dot: Absent > Due > Present
  useEffect(() => {
    if (!selectedChildId) return;
    
    const loadStatus = async () => {
      // 1. Check Attendance (Day Data)
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const homeData = await studentService.fetchHomeData(selectedChildId, dateStr);
      
      const hasAbsent = homeData.sessions?.some((s: any) => s.attendance === 'ABSENT');
      
      // 2. Check Payments
      const payments = await studentService.fetchPayments(selectedChildId);
      const hasOverdue = payments.some(p => p.status === 'Due' || p.isOverdue);
      
      if (hasAbsent) setStatus('Absent');
      else if (hasOverdue) setStatus('Due');
      else setStatus('Present');
    };
    
    loadStatus();
  }, [selectedChildId]);

  return (
    <View className="bg-white">
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center flex-1">
          {showBack ? (
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              className="mr-3 w-10 h-10 rounded-xl bg-surface-low items-center justify-center border border-surface-low"
            >
              <ChevronLeft size={24} color="#2b3437" />
            </TouchableOpacity>
          ) : (
            /* Parent Avatar */
            <TouchableOpacity 
              onPress={() => navigation.navigate('Profile')}
              className="p-1 rounded-full border border-surface-low shadow-sm shadow-black/5"
            >
              <Image 
                source={parentAvatarUrl ? { uri: parentAvatarUrl } : require('../../assets/noavatar.png')} 
                className="w-10 h-10 rounded-full bg-surface-low"
              />
            </TouchableOpacity>
          )}

          <View className="ml-3 flex-1">
            {/* Parent Name (Secondary) */}
            <Text className="text-[11px] font-jakarta font-bold text-text-muted opacity-60 uppercase tracking-widest" numberOfLines={1}>
              {parentName}
            </Text>
            
            {/* Child Name + Dropdown (Primary Highlight) */}
            <TouchableOpacity 
              onPress={() => setShowSwitcher(true)}
              className="flex-row items-center mt-0.5"
            >
              <Text className="text-xl font-jakarta font-black text-brand-primary" numberOfLines={1}>
                {selectedChild?.name || 'Select Child'}
              </Text>
              <View className="flex-row items-center ml-2">
                <View className={`w-2 h-2 rounded-full mr-2 ${status === 'Absent' ? 'bg-brand-error' : status === 'Due' ? 'bg-orange-500' : 'bg-green-500'}`} />
                <ChevronDown size={18} color="#0055d4" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action: Notifications */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          className="w-11 h-11 rounded-full bg-white items-center justify-center border border-surface-low shadow-lg shadow-black/5"
        >
          <Bell size={22} color="#0055d4" />
          <View className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-brand-error border-2 border-white" />
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
                    onPress={() => {
                      setSelectedChildId(child.id);
                      setShowSwitcher(false);
                    }}
                    className={`flex-row items-center p-4 rounded-[28px] border-2 ${isActive ? 'bg-blue-50/50 border-brand-primary' : 'bg-surface-lowest border-surface-low'}`}
                  >
                    <View className={`w-14 h-14 rounded-full overflow-hidden border-2 ${isActive ? 'border-brand-primary' : 'border-surface-low'}`}>
                      <Image 
                        source={child.avatarUrl ? { uri: child.avatarUrl } : require('../../assets/noavatar.png')} 
                        className="w-full h-full" 
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
