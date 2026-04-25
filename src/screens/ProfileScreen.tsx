import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Edit2, BellRing, LogOut, Camera, X, Check, Phone, User as UserIcon, ChevronDown, ChevronRight, User, Pencil, FileText, Info, PhoneCall, MapPin, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Svg, Circle } from 'react-native-svg';
import { useAppStore } from '../store/useAppStore';
import { authService, parentService, studentService, uiService, teacherService } from '../services/api';

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
      activeOpacity={0.9}
      className="mr-4 overflow-hidden bg-white rounded-[32px] border border-surface-low"
      style={{
        width: 175,
        shadowColor: '#2b3437',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 4,
      }}
    >
      <View style={{ backgroundColor: bgColor, height: 160, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {child.avatarUrl ? (
          <Image 
            source={{ uri: child.avatarUrl }} 
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <UserIcon size={60} color={textColor} strokeWidth={1} />
        )}
        <TouchableOpacity 
          onPress={onEditImage}
          className="absolute bottom-3 right-3 bg-white/90 p-2 rounded-full shadow-sm"
        >
          <Camera size={16} color={textColor} />
        </TouchableOpacity>
      </View>
      <View className="p-4 bg-white">
        <Text className="font-jakarta font-black text-lg mb-1" style={{ color: textColor }} numberOfLines={1}>
          {child.name.split(' ')[0].toLowerCase()}
        </Text>
        <View style={{ backgroundColor: bgColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start' }}>
          <Text style={{ color: textColor, fontSize: 10, fontWeight: '800', fontFamily: 'PlusJakartaSans-ExtraBold' }}>{child.class}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const SettingItemV2 = ({ icon: Icon, label, color, labelColor, isLast, onPress, badge }: any) => (
  <TouchableOpacity 
    onPress={onPress}
    activeOpacity={0.6}
    className={`flex-row items-center py-4 px-4 ${!isLast ? 'border-b border-surface-low' : ''}`}
  >
    <View className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${color || 'bg-surface-low'}`}>
      <Icon size={20} color={labelColor || "#737c7f"} />
    </View>
    <Text 
      className="flex-1 text-lg font-jakarta font-semibold"
      style={{ color: labelColor || "#2b3437" }}
    >
      {label}
    </Text>
    {badge && (
      <View className="bg-brand-primary/10 px-2.5 py-1 rounded-full mr-2">
        <Text className="text-brand-primary text-[10px] font-jakarta font-black uppercase">{badge}</Text>
      </View>
    )}
    <ChevronRight size={20} color="#d1d5db" />
  </TouchableOpacity>
);

const StatCard = ({ label, value, icon: Icon, color }: any) => (
  <View style={{ flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 28, borderWidth: 1, borderColor: '#f1f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 }}>
    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: color + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
      <Icon size={18} color={color} />
    </View>
    <Text style={{ fontSize: 22, fontWeight: '900', color: '#2b3437', fontFamily: 'PlusJakartaSans-ExtraBold' }}>{value}</Text>
    <Text style={{ fontSize: 12, color: '#737c7f', fontWeight: '700', fontFamily: 'PlusJakartaSans-Bold', marginTop: 2 }}>{label}</Text>
  </View>
);

export const ProfileScreen = ({ navigation, onSignOut }: any) => {
  const { children, setSelectedChildId, setChildren, userName, setUserName, setUserAvatarUrl, userRole, userId } = useAppStore();
  const [profile, setProfile] = useState<any>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editData, setEditData] = useState({ name: '', surname: '', phone: '' });

  useEffect(() => {
    loadProfile();
  }, []);

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
          name: userProfile.name,
          surname: userProfile.surname,
          phone: userProfile.phone
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
      if (updated) {
        setProfile({ ...profile, ...editData });
        setUserName(`${editData.name} ${editData.surname}`);
        setEditModalVisible(false);
        Alert.alert('Success', 'Profile updated successfully');
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

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 150 }}>
        
        {/* Profile Header */}
        <View className="items-center mt-8">
          <CircularProgress 
            size={145} 
            progress={calculateCompletion()} 
            imageUri={profile?.img}
            name={profile?.name}
            updating={updating}
            onPress={() => showImageOptions('user')}
          />
          <Text className="text-3xl font-jakarta font-black text-text-primary mt-6">{profile?.name} {profile?.surname}</Text>
          <Text className="text-text-muted font-manrope font-bold text-sm mt-1">
            {userRole === 'teacher' ? 'Teacher Account' : `Parent Account • ${children.length} children linked`}
          </Text>
          
          <TouchableOpacity 
             onPress={() => setEditModalVisible(true)}
             className="mt-6 flex-row items-center bg-white px-6 py-3 rounded-full border border-surface-low shadow-sm"
          >
            <Pencil size={18} color="#737c7f" />
            <Text className="ml-2 text-text-primary font-jakarta font-bold">Edit profile</Text>
          </TouchableOpacity>
        </View>

        {/* My Children Section - Only for Parents */}
        {userRole === 'parent' && (
          <View className="mt-12">
            <Text className="text-2xl font-jakarta font-black text-text-primary mb-6">My children</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              className="py-2 -mx-2 px-2 overflow-visible"
              contentContainerStyle={{ paddingRight: 40 }}
            >
              {children.map((child, index) => (
                <ChildCard 
                  key={child.id} 
                  child={child} 
                  index={index}
                  onSelect={() => setSelectedChildId(child.id)}
                  onEditImage={() => showImageOptions('student', child.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Settings Section */}
        <View className="mt-10">
          <Text className="text-xl font-jakarta font-extrabold text-text-primary mb-4 ml-1">Settings & Tools</Text>
          <View className="bg-white rounded-[18px] overflow-hidden border border-surface-low shadow-sm shadow-black/5">
            <SettingItemV2 icon={UserIcon} label="Profile details" color="bg-[#f1f4f6]" />
            <SettingItemV2 icon={BellRing} label="Notifications" color="bg-[#f1f4f6]" />
            {userRole === 'parent' && (
              <SettingItemV2 icon={FileText} label="Document center" color="bg-[#f1f4f6]" onPress={() => navigation.navigate('DocumentCenter')} />
            )}
            <SettingItemV2 icon={LogOut} label="Sign out" color="bg-[#fef2f2]" labelColor="#ef4444" isLast onPress={handleLogout} />
          </View>
        </View>

        {/* School Support Section */}
        <View className="mt-10">
          <Text className="text-xl font-jakarta font-extrabold text-text-primary mb-4 ml-1">School support</Text>
          
          <View className="bg-[#2563eb] rounded-[18px] p-6 mb-3 shadow-lg shadow-blue-600/20">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center border border-white/30">
                <Info size={24} color="white" strokeWidth={2.5} />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-xl font-jakarta font-black text-white leading-tight">
                  {schoolInfo?.schoolName || 'SnapSchool'}
                </Text>
                <Text className="text-white/70 text-[10px] font-jakarta font-black uppercase tracking-[2px] mt-0.5">
                  Official Support
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="items-center mt-12 mb-10 opacity-40">
          <Text className="text-text-muted text-[10px] font-jakarta font-black tracking-widest uppercase">SnapSchool {userRole === 'teacher' ? 'Teacher' : 'Parent'} V2.5.0</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[40px] p-8 pb-12">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-jakarta font-black text-brand-primary">Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} className="p-2 bg-surface-low rounded-full">
                <X size={20} color="#737c7f" />
              </TouchableOpacity>
            </View>

            <View className="gap-5">
              <View>
                <Text className="text-text-muted font-manrope font-bold mb-2 ml-1">FIRST NAME</Text>
                <View className="flex-row items-center bg-surface-low rounded-2xl px-4 py-3 border border-surface-low">
                  <UserIcon size={18} color="#0055d4" />
                  <TextInput 
                    className="flex-1 ml-3 text-lg text-text-primary font-manrope"
                    value={editData.name}
                    onChangeText={(t) => setEditData({...editData, name: t})}
                    placeholder="Enter first name"
                  />
                </View>
              </View>

              <View>
                <Text className="text-text-muted font-manrope font-bold mb-2 ml-1">LAST NAME</Text>
                <View className="flex-row items-center bg-surface-low rounded-2xl px-4 py-3 border border-surface-low">
                  <UserIcon size={18} color="#0055d4" />
                  <TextInput 
                    className="flex-1 ml-3 text-lg text-text-primary font-manrope"
                    value={editData.surname}
                    onChangeText={(t) => setEditData({...editData, surname: t})}
                    placeholder="Enter last name"
                  />
                </View>
              </View>

              <View>
                <Text className="text-text-muted font-manrope font-bold mb-2 ml-1">PHONE NUMBER</Text>
                <View className="flex-row items-center bg-surface-low rounded-2xl px-4 py-3 border border-surface-low">
                  <Phone size={18} color="#0055d4" />
                  <TextInput 
                    className="flex-1 ml-3 text-lg text-text-primary font-manrope"
                    value={editData.phone}
                    onChangeText={(t) => setEditData({...editData, phone: t})}
                    keyboardType="phone-pad"
                    placeholder="Enter phone number"
                  />
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleSaveProfile}
                disabled={updating || !isDirty}
                className={`py-4 rounded-2xl items-center mt-4 shadow-lg ${updating || !isDirty ? 'bg-surface-low shadow-none' : 'bg-brand-primary shadow-brand-primary/20'}`}
              >
                {updating ? <ActivityIndicator color="white" /> : <Text className={`${updating || !isDirty ? 'text-text-muted' : 'text-white'} font-jakarta font-bold text-lg`}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Selection Action Sheet */}
      <Modal visible={photoModalVisible} transparent animationType="fade">
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setPhotoModalVisible(false)}
          className="flex-1 bg-black/40 justify-end p-6"
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
    </SafeAreaView>
  );
};
