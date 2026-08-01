import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, StatusBar, Dimensions, Switch, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Edit2, BellRing, LogOut, Camera, X, Check, Phone, User as UserIcon, ChevronDown, ChevronRight, User, Pencil, FileText, Info, PhoneCall, MapPin, Image as ImageIcon, Award, Globe } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Svg, Circle } from 'react-native-svg';
import { useAppStore } from '../store/useAppStore';
import { useLanguage, Language } from '../context/LanguageContext';
import { authService, parentService, studentService, uiService, teacherService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../services/notificationService';

import { GlobalHeader } from '../components/GlobalHeader';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

const CircularProgress = ({ size, progress, imageUri, name, updating, onPress }: any) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const initial = name ? name.charAt(0).toUpperCase() : 'P';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f1f4f6"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#0055d4"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', width: size - 20, height: size - 20, borderRadius: (size - 20) / 2, overflow: 'hidden', backgroundColor: '#e2e9ec', alignItems: 'center', justifyContent: 'center' }}>
        {imageUri ? (
          <Image 
            source={{ uri: imageUri }} 
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Text style={{ fontSize: size / 3, fontWeight: '900', color: '#737c7f', fontFamily: 'PlusJakartaSans-ExtraBold' }}>{initial}</Text>
        )}
        {updating && (
          <View className="absolute inset-0 bg-black/20 items-center justify-center">
            <ActivityIndicator size="small" color="white" />
          </View>
        )}
      </View>

      {/* Floating Action Button for Image */}
      <TouchableOpacity 
        onPress={onPress}
        activeOpacity={0.8}
        className="absolute bottom-1 right-1 bg-white p-2 rounded-full border border-brand-primary/10 shadow-lg"
      >
        <Camera size={18} color="#0055d4" />
      </TouchableOpacity>

      {/* Percentage Badge - Positioned at Top Right of the ring */}
      <View style={{
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'white',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#0055d4',
        shadowColor: '#0055d4',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        <Text style={{ fontSize: 9, fontWeight: '900', color: '#0055d4', fontFamily: 'PlusJakartaSans-ExtraBold' }}>{progress}%</Text>
      </View>
    </View>
  );
};

const CHILD_COLORS = ['#eff6ff', '#f5f3ff', '#fff7ed', '#fdf2f8'];
const CHILD_TEXT_COLORS = ['#0055d4', '#8b5cf6', '#f59e0b', '#ec4899'];

const ChildCard = ({ child, index, onSelect, onEditImage }: any) => {
  const bgColor = CHILD_COLORS[index % CHILD_COLORS.length];
  const textColor = CHILD_TEXT_COLORS[index % CHILD_TEXT_COLORS.length];
  
  return (
    <TouchableOpacity 
      onPress={onSelect}
      activeOpacity={0.7}
      className="bg-white rounded-[24px] p-4 flex-row items-center mb-3 shadow-sm shadow-black/5 border border-surface-low/60"
    >
      <View 
        className="relative w-14 h-14 rounded-full items-center justify-center" 
        style={{ backgroundColor: bgColor }}
      >
        {child.avatarUrl ? (
          <Image 
            source={{ uri: child.avatarUrl }} 
            style={{ width: '100%', height: '100%', borderRadius: 999 }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <UserIcon size={32} color={textColor} strokeWidth={1.5} />
        )}
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-lg font-jakarta font-black text-text-primary" numberOfLines={1}>
          {child.name.split(' ')[0]}
        </Text>
        <Text style={{ color: textColor, fontSize: 13, fontWeight: '700', fontFamily: 'PlusJakartaSans-Bold' }}>
          Class: {child.class}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const SettingItemV3 = ({ icon: Icon, label, subtitle, color, iconBg, onPress, isLast, isDestructive, rightElement }: any) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.6} className={`flex-row items-center py-4 px-5 ${!isLast ? 'border-b border-surface-low/50' : ''}`}>
    <View className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${iconBg || 'bg-brand-primary/10'}`}>
      <Icon size={20} color={color || "#0055d4"} />
    </View>
    <View className="flex-1">
      <Text className={`text-[15px] font-jakarta font-bold ${isDestructive ? 'text-red-500' : 'text-text-primary'}`}>{label}</Text>
      {subtitle && <Text className="text-[11px] font-manrope font-semibold text-text-muted mt-0.5">{subtitle}</Text>}
    </View>
    {rightElement || <ChevronRight size={18} color="#9ca3af" />}
  </TouchableOpacity>
);

const SectionTitle = ({ title }: { title: string }) => (
  <Text className="text-[13px] font-jakarta font-bold text-text-muted ml-6 mb-3 mt-8">{title}</Text>
);

export const ProfileScreen = ({ navigation, onSignOut }: any) => {
  const { children, setSelectedChildId, setChildren, userName, setUserName, setUserAvatarUrl, userRole, userId } = useAppStore();
  const { t, language, setLanguage } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [editData, setEditData] = useState({ name: '', surname: '', phone: '' });
  const [editChildrenDataBulk, setEditChildrenDataBulk] = useState<{id: string, name: string, surname: string, avatarUrl?: string}[]>([]);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [editChildModalVisible, setEditChildModalVisible] = useState(false);
  const [editChildData, setEditChildData] = useState({ id: '', name: '', surname: '' });
  const [updatingChild, setUpdatingChild] = useState(false);

  useEffect(() => {
    const loadNotificationPreference = async () => {
      try {
        const storedPref = await AsyncStorage.getItem('notificationsEnabled');
        if (storedPref !== null) {
          setNotificationsEnabled(storedPref === 'true');
        }
      } catch (e) {
        console.error('Failed to load notification preference', e);
      }
    };
    loadNotificationPreference();
  }, []);

  const toggleNotifications = async () => {
    try {
      const newValue = !notificationsEnabled;
      setNotificationsEnabled(newValue);
      await AsyncStorage.setItem('notificationsEnabled', String(newValue));
      
      if (!newValue) {
        if (userId) await authService.registerPushToken(userId, ''); 
      } else {
        const token = await notificationService.getPushToken();
        if (token && userId) {
          await authService.registerPushToken(userId, token);
        }
      }
    } catch (e) {
      console.error('Failed to toggle notifications', e);
    }
  };

  const openEditChildModal = (child: any) => {
    const nameParts = (child.name || '').split(' ');
    setEditChildData({ 
      id: child.id, 
      name: nameParts[0] || '', 
      surname: nameParts.slice(1).join(' ') || '' 
    });
    setEditChildModalVisible(true);
  };

  const handleSaveChildProfile = async () => {
    if (!editChildData.id) return;
    setUpdatingChild(true);
    try {
      await studentService.updateProfile(editChildData.id, { name: editChildData.name, surname: editChildData.surname });
      const updatedChildren = children.map(c => c.id === editChildData.id ? { ...c, name: `${editChildData.name} ${editChildData.surname}`.trim() } : c);
      setChildren(updatedChildren);
      setEditChildModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update child profile');
    } finally {
      setUpdatingChild(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [userRole])
  );

  const loadProfile = async () => {
    setLoading(true);
    try {
      let userProfile: any = null;
      if (userRole === 'teacher') {
        userProfile = await teacherService.fetchProfile();
      } else {
        userProfile = await parentService.fetchParentProfile();
      }
      
      const school = await parentService.fetchSchoolInfo();
      
      if (userProfile) {
        setProfile(userProfile);
        setUserName(`${userProfile.name} ${userProfile.surname}`);
        setUserAvatarUrl(userProfile.img);
        setEditData({
          name: userProfile.name || '',
          surname: userProfile.surname || '',
          phone: userProfile.phone || ''
        });
      }
      if (school) {
        setSchoolInfo(school);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Photo Modal State
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<{type: 'user' | 'student', id?: string} | null>(null);

  const showImageOptions = (type: 'user' | 'student', id?: string) => {
    setPhotoTarget({ type, id });
    setPhotoModalVisible(true);
  };

  const takePhoto = async (type: 'user' | 'student', id?: string) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        handleUpload(result.assets[0].uri, type, id);
      }
    } catch (error: any) {
      console.log('Camera Attempt Failed:', error.message);
      if (error.message?.includes('not available on simulator')) {
        Alert.alert('Simulator Detected', 'The camera is only available on physical devices. Please use "Choose from Library" instead.');
      } else {
        Alert.alert('Error', 'Failed to open camera. Please check your settings.');
      }
    }
  };

  const pickImage = async (type: 'user' | 'student', id?: string) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery access is required to pick photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        handleUpload(result.assets[0].uri, type, id);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to open gallery');
    }
  };

  const handleUpload = async (uri: string, type: 'user' | 'student', id?: string) => {
    setUpdating(true);
    try {
      const uploadId = type === 'user' ? userId : id;
      const { url } = await uiService.uploadImage(uri, type === 'user' ? 'profile' : 'student', uploadId!);
      
      if (type === 'user') {
        let updated = false;
        if (userRole === 'teacher') {
          updated = !!(await parentService.updateProfile({ img: url }));
        } else {
          updated = !!(await parentService.updateProfile({ img: url }));
        }
        
        if (updated) {
          setProfile({ ...profile, img: url });
          setUserAvatarUrl(url);
        }
      } else if (id) {
        const updated = await studentService.updateImage(id, url);
        if (updated) {
          const refreshedChildren = await parentService.fetchChildren();
          setChildren(refreshedChildren);
          setEditChildrenDataBulk(prev => prev.map(c => c.id === id ? { ...c, avatarUrl: url } : c));
        }
      }
      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveProfile = async () => {
    setUpdating(true);
    try {
      const updated = await parentService.updateProfile(editData);
      
      let childrenUpdated = false;
      const updatedChildrenStore = [...children];
      for (const childData of editChildrenDataBulk) {
         const originalChild = children.find(c => c.id === childData.id);
         const newName = `${childData.name} ${childData.surname}`.trim();
         if (originalChild && originalChild.name !== newName) {
            await studentService.updateProfile(childData.id, { name: childData.name, surname: childData.surname });
            childrenUpdated = true;
            const idx = updatedChildrenStore.findIndex(c => c.id === childData.id);
            if (idx >= 0) {
               updatedChildrenStore[idx] = { ...updatedChildrenStore[idx], name: newName };
            }
         }
      }

      if (updated || childrenUpdated) {
        if (updated) {
          setProfile({ ...profile, ...editData });
          setUserName(`${editData.name} ${editData.surname}`);
        }
        if (childrenUpdated) {
          setChildren(updatedChildrenStore);
        }
        setEditModalVisible(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        setEditModalVisible(false); // No changes
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          setChildren([]);
          if (onSignOut) onSignOut();
        },
      },
    ]);
  };

  const calculateCompletion = () => {
    if (!profile) return 0;
    const fields = ['name', 'surname', 'phone', 'img'];
    const filled = fields.filter(f => !!profile[f]).length;
    return Math.round((filled / fields.length) * 100);
  };

  const isDirty = profile && (
    editData.name !== profile.name || 
    editData.surname !== profile.surname || 
    editData.phone !== profile.phone
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-background">
        <ActivityIndicator size="large" color="#0055d4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header Save Button */}
      <View className="flex-row justify-end px-6 pt-2 h-12">
        {isDirty && (
          <TouchableOpacity 
             onPress={handleSaveProfile}
             disabled={updating}
             className="bg-brand-primary px-5 py-2.5 rounded-full shadow-md shadow-brand-primary/20"
          >
            {updating ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-jakarta font-bold text-sm">Save</Text>}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingBottom: 150, backgroundColor: '#f8fafc' }}>
        
        {/* Main Title */}
        <View className="items-center mt-4 mb-2">
          <Text className="text-[13px] font-jakarta font-bold text-text-primary tracking-widest uppercase">Profile Setting</Text>
        </View>

        {/* Top Profile Card */}
        <View className="bg-white rounded-[24px] p-5 flex-row items-center mt-4 mx-6 shadow-sm shadow-black/5 border border-surface-low/60">
          <View className="relative w-16 h-16 rounded-full bg-blue-50 items-center justify-center">
            {profile?.img ? (
              <Image 
                source={{ uri: profile.img }} 
                style={{ width: '100%', height: '100%', borderRadius: 999 }} 
                contentFit="cover" 
              />
            ) : (
              <Text className="text-xl font-jakarta font-black text-brand-primary">{profile?.name?.charAt(0)}</Text>
            )}
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-lg font-jakarta font-black text-text-primary">{profile?.name} {profile?.surname}</Text>
            <Text className="text-text-muted font-manrope font-semibold text-xs mt-0.5">
              {profile?.phone || (userRole === 'teacher' ? 'Teacher Account' : `${children.length} children linked`)}
            </Text>
          </View>
        </View>

        {/* My Children Section - Only for Parents */}
        {userRole === 'parent' && (
          <View className="mt-8">
            <SectionTitle title="My Children" />
            <View className="px-6">
              {children.map((child, index) => (
                <ChildCard 
                  key={child.id} 
                  child={child} 
                  index={index}
                  onSelect={() => { setSelectedChildId(child.id); openEditChildModal(child); }}
                  onEditImage={() => showImageOptions('student', child.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* General Section */}
        <View>
          <SectionTitle title="General" />
          <View className="bg-white mx-6 rounded-[24px] overflow-hidden border border-surface-low/60 shadow-sm shadow-black/5">
            <SettingItemV3 
              icon={UserIcon} 
              color="#0055d4" iconBg="bg-blue-50"
              label="Edit Profile" 
              subtitle="Change profile picture, number, name"
              onPress={() => {
                if (profile) {
                  setEditData({
                    name: profile.name || '',
                    surname: profile.surname || '',
                    phone: profile.phone || ''
                  });
                }
                setEditChildrenDataBulk(children.map(c => {
                  const parts = (c.name || '').split(' ');
                  return { id: c.id, name: parts[0] || '', surname: parts.slice(1).join(' ') || '', avatarUrl: c.avatarUrl || undefined };
                }));
                setEditModalVisible(true);
              }}
              isLast={userRole === 'teacher'}
            />
            {userRole === 'parent' && (
              <View>
                <SettingItemV3 
                  icon={Award} 
                  color="#8b5cf6" iconBg="bg-purple-50"
                  label="Report Card" 
                  subtitle="View student academic performance"
                  onPress={() => navigation.navigate('Results')} 
                />
                <SettingItemV3 
                  icon={FileText} 
                  color="#f59e0b" iconBg="bg-orange-50"
                  label="Document Center" 
                  subtitle="Securely access school documents"
                  isLast 
                  onPress={() => navigation.navigate('DocumentCenter')} 
                />
              </View>
            )}
          </View>
        </View>

        {/* Preferences Section */}
        <View>
          <SectionTitle title={t.appLanguage} />
          <View className="bg-white mx-6 rounded-[24px] overflow-hidden border border-surface-low/60 shadow-sm shadow-black/5">
            <SettingItemV3 
              icon={Globe} 
              color="#0055d4" iconBg="bg-blue-50"
              label={t.appLanguage} 
              subtitle={language === 'ar' ? 'العربية 🇹🇳' : language === 'fr' ? 'Français 🇫🇷' : 'English 🇬🇧'}
              onPress={() => setLangModalVisible(true)}
            />
            <SettingItemV3 
              icon={BellRing} 
              color="#3b82f6" iconBg="bg-blue-50"
              label="Notification" 
              subtitle="Customize your notification preferences"
              rightElement={<Switch value={notificationsEnabled} onValueChange={toggleNotifications} trackColor={{ false: '#e2e8f0', true: '#0055d4' }} style={{ transform: [{ scale: 0.8 }] }} />}
            />
            <SettingItemV3 
              icon={Info} 
              color="#10b981" iconBg="bg-green-50"
              label="School Support" 
              subtitle={schoolInfo?.schoolName || 'Official SnapSchool Help'}
              onPress={() => schoolInfo?.phone && Linking.openURL(`tel:${schoolInfo.phone}`)}
            />
            <SettingItemV3 
              icon={LogOut} 
              color="#ef4444" iconBg="bg-red-50"
              label={t.signOut} 
              subtitle="Securely log out of Account"
              isDestructive
              isLast 
              onPress={handleLogout} 
            />
          </View>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal visible={langModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '85%', backgroundColor: 'white', borderRadius: 28, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: 'center', marginBottom: 20 }}>{t.selectLanguageTitle}</Text>
            
            {[
              { code: 'ar', label: 'العربية (تونس)', flag: '🇹🇳' },
              { code: 'fr', label: 'Français', flag: '🇫🇷' },
              { code: 'en', label: 'English', flag: '🇬🇧' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.code}
                onPress={async () => {
                  await setLanguage(opt.code as Language);
                  setLangModalVisible(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  backgroundColor: language === opt.code ? '#eff6ff' : '#f8fafc',
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: language === opt.code ? '#93c5fd' : '#f1f5f9',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 20 }}>{opt.flag}</Text>
                  <Text style={{ fontSize: 15, fontWeight: language === opt.code ? '800' : '600', color: language === opt.code ? '#0072e6' : '#334155' }}>
                    {opt.label}
                  </Text>
                </View>
                {language === opt.code && <Check size={20} color="#0072e6" strokeWidth={3} />}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => setLangModalVisible(false)}
              style={{ marginTop: 10, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#94a3b8' }}>Annuller</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} transparent={false} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: Math.max(insets.top, 20) }}>
          <View className="flex-row items-center px-6 py-4 mt-2">
            <TouchableOpacity onPress={() => setEditModalVisible(false)} className="p-2 -ml-2" hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}>
              <ChevronDown size={24} color="#2b3437" />
            </TouchableOpacity>
            <Text className="flex-1 text-center text-[13px] font-jakarta font-bold text-text-primary tracking-widest uppercase mr-6">Edit Profile</Text>
          </View>
          
          <ScrollView className="flex-1 px-6">
            <View className="items-center mt-6 mb-10">
              <View className="relative w-28 h-28 rounded-full bg-blue-50 items-center justify-center shadow-sm shadow-black/5">
                {profile?.img ? (
                  <Image 
                    source={{ uri: profile.img }} 
                    style={{ width: '100%', height: '100%', borderRadius: 999 }} 
                    contentFit="cover" 
                  />
                ) : (
                  <Text className="text-4xl font-jakarta font-black text-brand-primary">{profile?.name?.charAt(0)}</Text>
                )}
                <TouchableOpacity onPress={() => showImageOptions('user')} className="absolute bottom-0 right-0 bg-brand-primary w-8 h-8 rounded-full items-center justify-center border-4 border-[#f8fafc]">
                  <Camera size={14} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="gap-5">
              <View>
                <Text className="text-[13px] font-jakarta font-semibold text-text-primary mb-2 ml-1">Name</Text>
                <View className="bg-white rounded-2xl px-5 py-4 shadow-sm shadow-black/5 border border-surface-low/50">
                  <TextInput 
                    className="text-[15px] text-text-primary font-manrope font-semibold p-0"
                    value={editData.name}
                    onChangeText={(t) => setEditData({...editData, name: t})}
                    placeholder="Enter name"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <View>
                <Text className="text-[13px] font-jakarta font-semibold text-text-primary mb-2 ml-1">Surname</Text>
                <View className="bg-white rounded-2xl px-5 py-4 shadow-sm shadow-black/5 border border-surface-low/50">
                  <TextInput 
                    className="text-[15px] text-text-primary font-manrope font-semibold p-0"
                    value={editData.surname}
                    onChangeText={(t) => setEditData({...editData, surname: t})}
                    placeholder="Enter surname"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <View>
                <Text className="text-[13px] font-jakarta font-semibold text-text-primary mb-2 ml-1">Phone Number</Text>
                <View className="bg-white rounded-2xl px-5 py-4 shadow-sm shadow-black/5 border border-surface-low/50">
                  <TextInput 
                    className="text-[15px] text-text-primary font-manrope font-semibold p-0"
                    value={editData.phone}
                    onChangeText={(t) => setEditData({...editData, phone: t})}
                    keyboardType="phone-pad"
                    placeholder="Enter phone number"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              {/* Children Profile Fields */}
              {editChildrenDataBulk.length > 0 && (
                <View className="mt-4">
                  <Text className="text-[13px] font-jakarta font-semibold text-text-primary mb-4 ml-1">Children</Text>
                  {editChildrenDataBulk.map((childData, index) => (
                    <View key={childData.id} className="mb-6 bg-white rounded-3xl p-5 border border-surface-low/50 shadow-sm shadow-black/5">
                      <View className="flex-row items-center mb-4">
                        <View className="relative mr-3 pb-1 pr-1">
                          <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center shadow-sm shadow-black/5 overflow-hidden">
                            {childData.avatarUrl ? (
                              <Image 
                                source={{ uri: childData.avatarUrl }} 
                                style={{ width: '100%', height: '100%' }} 
                                contentFit="cover" 
                              />
                            ) : (
                              <UserIcon size={20} color="#0055d4" />
                            )}
                          </View>
                          <TouchableOpacity 
                            onPress={() => showImageOptions('student', childData.id)} 
                            hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
                            style={{ zIndex: 100, elevation: 10 }}
                            className="absolute bottom-0 right-0 bg-brand-primary w-7 h-7 rounded-full items-center justify-center border-2 border-white shadow-sm shadow-black/10"
                          >
                            <Camera size={12} color="white" />
                          </TouchableOpacity>
                        </View>
                        <Text className="text-sm font-jakarta font-bold text-text-primary">
                          Child {index + 1}
                        </Text>
                      </View>
                      
                      <View className="gap-4">
                        <View>
                          <Text className="text-xs font-jakarta font-medium text-text-tertiary mb-2 ml-1">Name</Text>
                          <View className="bg-surface-low/30 rounded-2xl px-4 py-3">
                            <TextInput 
                              className="text-sm text-text-primary font-manrope font-semibold p-0"
                              value={childData.name}
                              onChangeText={(t) => {
                                const newData = [...editChildrenDataBulk];
                                newData[index].name = t;
                                setEditChildrenDataBulk(newData);
                              }}
                              placeholder="Child Name"
                              placeholderTextColor="#9ca3af"
                            />
                          </View>
                        </View>

                        <View>
                          <Text className="text-xs font-jakarta font-medium text-text-tertiary mb-2 ml-1">Surname</Text>
                          <View className="bg-surface-low/30 rounded-2xl px-4 py-3">
                            <TextInput 
                              className="text-sm text-text-primary font-manrope font-semibold p-0"
                              value={childData.surname}
                              onChangeText={(t) => {
                                const newData = [...editChildrenDataBulk];
                                newData[index].surname = t;
                                setEditChildrenDataBulk(newData);
                              }}
                              placeholder="Child Surname"
                              placeholderTextColor="#9ca3af"
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          <View className="p-6 bg-[#f8fafc] pb-8">
             <TouchableOpacity 
                onPress={handleSaveProfile}
                disabled={updating || !isDirty}
                className={`py-4 rounded-full items-center shadow-md ${updating || !isDirty ? 'bg-surface-low shadow-none border border-black/5' : 'bg-brand-primary shadow-brand-primary/20'}`}
              >
                {updating ? <ActivityIndicator color="white" /> : <Text className={`${updating || !isDirty ? 'text-text-muted' : 'text-white'} font-jakarta font-bold text-lg`}>Save Changes</Text>}
              </TouchableOpacity>
          </View>

      {/* Photo Selection Action Sheet (Nested inside Edit Modal for iOS compatibility) */}
          <Modal visible={photoModalVisible} transparent animationType="fade">
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={() => setPhotoModalVisible(false)}
              className="flex-1 bg-black/40 justify-center p-6"
            >
              <TouchableOpacity activeOpacity={1} className="bg-white rounded-[32px] p-6 mb-4">
                <View className="items-center mb-8">
                  <Text className="text-xl font-jakarta font-black text-text-primary">Update profile photo</Text>
                  <Text className="text-text-muted font-manrope font-bold text-xs mt-1">Choose how you'd like to add your photo</Text>
                </View>

                <View className="gap-3">
                  <TouchableOpacity 
                    onPress={() => {
                      setPhotoModalVisible(false);
                      if (photoTarget) pickImage(photoTarget.type, photoTarget.id);
                    }}
                    className="flex-row items-center bg-white p-4 rounded-2xl border border-surface-low"
                  >
                    <View className="w-12 h-12 bg-blue-50 rounded-2xl items-center justify-center">
                      <ImageIcon size={22} color="#2563eb" />
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="text-base font-jakarta font-bold text-text-primary">Choose from library</Text>
                      <Text className="text-text-muted text-[10px] font-manrope font-bold">Pick from your photo gallery</Text>
                    </View>
                    <ChevronRight size={18} color="#d1d5db" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => {
                      setPhotoModalVisible(false);
                      if (photoTarget) takePhoto(photoTarget.type, photoTarget.id);
                    }}
                    className="flex-row items-center bg-white p-4 rounded-2xl border border-surface-low"
                  >
                    <View className="w-12 h-12 bg-purple-50 rounded-2xl items-center justify-center">
                      <Camera size={22} color="#8b5cf6" />
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="text-base font-jakarta font-bold text-text-primary">Take a photo</Text>
                      <Text className="text-text-muted text-[10px] font-manrope font-bold">Use your camera right now</Text>
                    </View>
                    <ChevronRight size={18} color="#d1d5db" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setPhotoModalVisible(false)}
                className="bg-[#334155]/20 py-4 rounded-2xl items-center"
              >
                <Text className="text-text-primary font-jakarta font-black text-lg">Cancel</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        </View>
      </Modal>

      {/* Edit Child Profile Modal */}
      <Modal visible={editChildModalVisible} transparent={false} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: Math.max(insets.top, 20) }}>
          <View className="flex-row items-center px-6 py-4 mt-2">
            <TouchableOpacity onPress={() => setEditChildModalVisible(false)} className="p-2 -ml-2" hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}>
              <ChevronDown size={24} color="#2b3437" />
            </TouchableOpacity>
            <View className="flex-1 items-center mr-6">
              <Text className="text-[#2b3437] font-semibold text-xs tracking-widest uppercase">
                Edit Child Profile
              </Text>
            </View>
          </View>

          <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
            <View className="items-center mb-8">
              <View className="relative w-28 h-28 rounded-full bg-blue-50 items-center justify-center shadow-sm shadow-black/5">
                <Text className="text-4xl text-brand-primary font-bold">
                  {editChildData.name ? editChildData.name.charAt(0).toUpperCase() : 'C'}
                </Text>
              </View>
            </View>

            <View className="space-y-6 mb-12">
              <View>
                <Text className="text-[#64748b] text-sm font-medium mb-2 pl-1">Name</Text>
                <TextInput
                  value={editChildData.name}
                  onChangeText={(t) => setEditChildData({ ...editChildData, name: t })}
                  className="bg-white px-5 py-4 rounded-[16px] text-[#2b3437] font-medium border border-surface-low/50 shadow-sm shadow-black/5"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View>
                <Text className="text-[#64748b] text-sm font-medium mb-2 pl-1">Surname</Text>
                <TextInput
                  value={editChildData.surname}
                  onChangeText={(t) => setEditChildData({ ...editChildData, surname: t })}
                  className="bg-white px-5 py-4 rounded-[16px] text-[#2b3437] font-medium border border-surface-low/50 shadow-sm shadow-black/5"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View className="pb-12">
              <TouchableOpacity 
                onPress={handleSaveChildProfile}
                disabled={updatingChild}
                className="bg-brand-primary rounded-full py-4 items-center shadow-sm shadow-brand-primary/30"
              >
                {updatingChild ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-base">Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

    </SafeAreaView>
  );
};
