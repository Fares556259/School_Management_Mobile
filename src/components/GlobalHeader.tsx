import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Bell, ChevronDown, Check, X, User, ChevronRight, ChevronLeft, Clock3, ShieldAlert } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { authStorage, parentService, ParentAccessSnapshot, studentService } from '../services/api';
import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { prefetchChildHome, prefetchChildTabs } from '../services/childDataSync';
import { savePreferredChildId } from '../services/sessionHydration';
import { parentAccessText } from '../content/parentAccess';

interface GlobalHeaderProps {
  navigation: any;
  showBack?: boolean;
}

const GlobalHeaderComponent = ({ navigation, showBack }: GlobalHeaderProps) => {
  const { t, isRTL, language } = useLanguage();
  const accessCopy = parentAccessText[language];
  const selectedChildId = useAppStore(s => s.selectedChildId);
  const setSelectedChildId = useAppStore(s => s.setSelectedChildId);
  const children = useAppStore(s => s.children);
  const userName = useAppStore(s => s.userName);
  const userAvatarUrl = useAppStore(s => s.userAvatarUrl);
  const userRole = useAppStore(s => s.userRole);
  const userId = useAppStore(s => s.userId);
  const unreadNotificationsCount = useAppStore(s => s.unreadNotificationsCount);
  const setUnreadNotificationsCount = useAppStore(s => s.setUnreadNotificationsCount);
  const studentStatuses = useAppStore(s => s.studentStatuses);
  const queryClient = useQueryClient();
  
  const [showSwitcher, setShowSwitcher] = useState(false);
  const selectedChild = children.find((c: any) => c.id === selectedChildId);
  const status = selectedChildId ? studentStatuses[selectedChildId] || 'Present' : 'Present';

  // Keep the badge child-scoped; cached data renders immediately and is then refreshed.
  const { data: selectedUnreadCount = 0 } = useQuery({
    queryKey: ['notifCount', userId, selectedChildId],
    queryFn: async () => {
      const uid = userId || await authStorage.getUserId();
      if (!uid) return 0;
      return studentService.fetchUnreadNotificationCount(uid, selectedChildId);
    },
    enabled: userRole === 'parent' && !!userId && !!selectedChildId,
    staleTime: 60_000,
    refetchOnMount: false,
    gcTime: 24 * 60 * 60_000,
  });

  const { data: familyRequests, refetch: refreshFamilyRequests } = useQuery<ParentAccessSnapshot | null>({
    queryKey: ['parentAccess', userId],
    queryFn: () => parentService.fetchAccessStatus(),
    enabled: userRole === 'parent' && !!userId,
    staleTime: 20_000,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (userRole === 'parent') setUnreadNotificationsCount(selectedUnreadCount);
  }, [selectedUnreadCount, setUnreadNotificationsCount, userRole]);

  const warmFamilyHomes = useCallback(() => {
    if (userRole !== 'parent') return;
    const otherChildren = children.filter(child => child.id !== selectedChildId);
    otherChildren.forEach((child, index) => {
      setTimeout(() => void prefetchChildHome(queryClient, child), index * 450);
    });
  }, [children, queryClient, selectedChildId, userRole]);

  useEffect(() => {
    // Give the visible child's home request first use of the connection on a
    // cold launch. Other children are warmed once the first screen has settled.
    const timeout = setTimeout(warmFamilyHomes, 700);
    return () => clearTimeout(timeout);
  }, [warmFamilyHomes]);

  const handleSwitchChild = (id: string) => {
    const nextChild = children.find(child => child.id === id);
    if (nextChild) {
      // Start the exact screen the parent will see before changing the key.
      // React Query deduplicates this with HomeScreen's own request.
      void prefetchChildHome(queryClient, nextChild).finally(() => {
        setTimeout(() => void prefetchChildTabs(queryClient, nextChild), 300);
      });
    }
    setSelectedChildId(id);
    void savePreferredChildId(userId, id);
    setShowSwitcher(false);
  };

  const toggleSwitcher = () => {
    if (userRole === 'teacher') return;
    if (!showSwitcher) {
      warmFamilyHomes();
      void refreshFamilyRequests();
    }
    setShowSwitcher(!showSwitcher);
  };

  const openRequest = (request: ParentAccessSnapshot['requests'][number]) => {
    setShowSwitcher(false);
    navigation.navigate('ParentRequests', {
      requestId: request.id,
      requestPreview: request,
      schoolName: familyRequests?.schoolName || '',
      accessStatus: familyRequests?.accessStatus || 'ACTIVE',
    });
  };

  const requestColors = (requestStatus: string) => requestStatus === 'PENDING'
    ? { background: '#FFF8E8', border: '#F2D79B', text: '#8A5B12' }
    : requestStatus === 'REJECTED' || requestStatus === 'REVOKED'
      ? { background: '#FFF1EE', border: '#F2C5BA', text: '#B6472C' }
      : { background: '#F3F5F8', border: '#E1E7EF', text: '#637189' };

  const unresolvedRequests = (familyRequests?.requests || []).filter(request => request.status !== 'APPROVED');

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEF2F6', zIndex: 50 }}>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 11, gap: 12 }}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
          {showBack ? (
            <TouchableOpacity 
              onPress={() => {
                navigation.goBack();
              }}
              hitSlop={8}
              style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E3E9F0', marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }}
            >
              {isRTL ? <ChevronRight size={24} color="#2b3437" strokeWidth={3} /> : <ChevronLeft size={24} color="#2b3437" strokeWidth={3} />}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={userRole === 'parent' ? toggleSwitcher : () => navigation.navigate('Profile')}
            activeOpacity={0.72}
            hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={userRole === 'parent' ? t.switchChild : userName}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 54,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              paddingHorizontal: 7,
              paddingVertical: 5,
              borderRadius: 18,
              backgroundColor: userRole === 'parent' ? '#F8FAFC' : 'transparent',
              borderWidth: userRole === 'parent' ? 1 : 0,
              borderColor: '#E8EDF3',
            }}
          >
            {!showBack && (
              <View style={{ position: 'relative' }}>
              <View style={{ width: 44, height: 44, borderRadius: 15, borderWidth: 1, borderColor: '#DDE5EE', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                <Image 
                  source={userRole === 'parent' && selectedChild?.avatarUrl
                    ? { uri: selectedChild.avatarUrl }
                    : userAvatarUrl ? { uri: userAvatarUrl } : require('../../assets/noavatar.png')}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                  priority="high"
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
              
              {userRole === 'parent' && (
                <View style={{ position: 'absolute', right: -4, bottom: -3, width: 22, height: 22, borderRadius: 8, borderWidth: 2, borderColor: '#FFFFFF', overflow: 'hidden', backgroundColor: '#EEF2F6' }}>
                  <Image 
                    source={userAvatarUrl ? { uri: userAvatarUrl } : require('../../assets/noavatar.png')}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                    priority="high"
                    style={{ width: '100%', height: '100%' }}
                  />
                </View>
              )}
              </View>
            )}

            <View style={{ marginLeft: isRTL ? 0 : 11, marginRight: isRTL ? 11 : 0, flex: 1, minWidth: 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#98A2B3', letterSpacing: 1.5, textTransform: 'uppercase' }} numberOfLines={1}>
              {userRole === 'teacher' ? 'SnapSchool Teacher' : userName}
            </Text>

            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 1, maxWidth: '100%' }}>
              <Text style={{ flexShrink: 1, fontSize: 19, fontWeight: '900', color: '#0B63CE', letterSpacing: -0.35 }} numberOfLines={1}>
                {userRole === 'teacher' ? userName.split(' ')[0] : (selectedChild?.name?.split(' ')[0] || t.switchChild)}
              </Text>
              {userRole === 'parent' && (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginLeft: isRTL ? 0 : 7, marginRight: isRTL ? 7 : 0, gap: 6 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: status === 'Absent' ? '#EF4444' : status === 'Due' ? '#F59E0B' : '#22C55E' }} />
                </View>
              )}
            </View>
            </View>

            {userRole === 'parent' && (
              <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: '#E9F2FD', alignItems: 'center', justifyContent: 'center', marginLeft: isRTL ? 0 : 5, marginRight: isRTL ? 5 : 0 }}>
                <ChevronDown size={17} color="#0B63CE" strokeWidth={2.8} />
              </View>
            )}
          </TouchableOpacity>
          </View>

        <TouchableOpacity
          onPress={() => {
            setUnreadNotificationsCount(0);
            navigation.navigate('Notifications');
          }}
          hitSlop={8}
          style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E3E9F0', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 7, elevation: 1 }}
        >
          <Bell size={22} color="#0B63CE" strokeWidth={2.4} />
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
            
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start', marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#0B63CE', textAlign: isRTL ? 'right' : 'left' }}>{t.childPickerTitle}</Text>
                <Text style={{ fontSize: 14, color: '#737C7F', fontWeight: '500', marginTop: 4, textAlign: isRTL ? 'right' : 'left' }}>{t.childPickerSubtitle}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSwitcher(false)} className="w-10 h-10 bg-surface-low rounded-full items-center justify-center">
                <X size={20} color="#737c7f" />
              </TouchableOpacity>
            </View>
 
            <ScrollView
              style={{ maxHeight: 430 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
            >
              {children.map((child: any) => {
                const isActive = selectedChildId === child.id;
                return (
                   <TouchableOpacity
                    key={child.id}
                    onPress={() => handleSwitchChild(child.id)}
                    style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 16, borderRadius: 28, borderWidth: 2, borderColor: isActive ? '#0B63CE' : '#E8EDF3', backgroundColor: isActive ? '#EFF6FF' : '#FAFBFC' }}
                  >
                    <View className={`w-14 h-14 rounded-full overflow-hidden border-2 ${isActive ? 'border-brand-primary' : 'border-surface-low'}`}>
                      <Image 
                        source={child.avatarUrl ? { uri: child.avatarUrl } : require('../../assets/noavatar.png')} 
                        transition={200}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: isRTL ? 0 : 16, marginRight: isRTL ? 16 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: '#172033', textAlign: isRTL ? 'right' : 'left' }}>{child.name}</Text>
                      <Text style={{ fontSize: 14, color: '#737C7F', fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }}>{child.class || t.noClassAssigned}</Text>
                    </View>
                    <View style={{ borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#E4F6EF', marginHorizontal: 8 }}>
                      <Text style={{ color: '#118465', fontSize: 10, fontWeight: '800' }}>{accessCopy.approved}</Text>
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
              {unresolvedRequests.map(request => {
                const colors = requestColors(request.status);
                const label = request.status === 'PENDING' ? accessCopy.pending
                  : request.status === 'REJECTED' ? accessCopy.rejected
                    : request.status === 'REVOKED' ? accessCopy.revoked : accessCopy.cancelled;
                return <TouchableOpacity
                  key={request.id}
                  onPress={() => openRequest(request)}
                  accessibilityRole="button"
                  accessibilityLabel={`${accessCopy.requestChild} ${request.reference}, ${label}`}
                  style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 16, borderRadius: 24, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background }}
                >
                  <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
                    {request.status === 'PENDING' ? <Clock3 size={23} color={colors.text} /> : <ShieldAlert size={23} color={colors.text} />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0, marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#172033', textAlign: isRTL ? 'right' : 'left' }}>{accessCopy.requestChild} {request.reference}</Text>
                    <Text style={{ marginTop: 3, fontSize: 12, color: '#737C7F', fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }}>{familyRequests?.schoolName}</Text>
                  </View>
                  <View style={{ borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#FFFFFF', marginHorizontal: 8 }}>
                    <Text style={{ color: colors.text, fontSize: 10, fontWeight: '800' }}>{label}</Text>
                  </View>
                  {isRTL ? <ChevronLeft size={19} color={colors.text} /> : <ChevronRight size={19} color={colors.text} />}
                </TouchableOpacity>;
              })}
            </ScrollView>
 
            <TouchableOpacity 
              className="flex-row items-center justify-center mt-6 p-4 rounded-2xl bg-surface-low"
              onPress={() => {
                setShowSwitcher(false);
                navigation.navigate('LinkChild');
              }}
            >
              <User size={18} color="#0055d4" className="mr-2" />
              <Text className="text-brand-primary font-jakarta font-bold text-sm uppercase tracking-widest">{t.linkChild}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export const GlobalHeader = React.memo(GlobalHeaderComponent);
