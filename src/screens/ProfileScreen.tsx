import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Modal, TextInput, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Edit2, Globe, BellRing, LifeBuoy, LogOut, Camera, X, Check, Phone, User as UserIcon, ChevronDown, ChevronRight, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../store/useAppStore';
import { authService, parentService, studentService, uiService } from '../services/api';

import { GlobalHeader } from '../components/GlobalHeader';

const ChildCard = ({ child, isSelected, onSelect, onEditImage }: any) => (
  <View className="mr-4">
    <TouchableOpacity 
      onPress={onSelect}
      className={`w-[160px] p-4 rounded-[32px] bg-surface-lowest border ${isSelected ? 'border-brand-primary bg-blue-50' : 'border-surface-low'}`}
      style={{
        shadowColor: '#2b3437',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 4,
      }}
    >
      <View className="relative">
        <Image 
          source={child.avatarUrl ? { uri: child.avatarUrl } : require('../../assets/noavatar.png')} 
          className="w-16 h-16 rounded-2xl bg-surface-low" 
        />
        <TouchableOpacity 
          onPress={onEditImage}
          className="absolute -bottom-1 -right-1 bg-brand-primary p-1.5 rounded-full border-2 border-white"
        >
          <Camera size={10} color="white" />
        </TouchableOpacity>
        {isSelected && (
          <View className="absolute -top-2 -right-2 bg-brand-primary rounded-full p-1 border-2 border-white">
            <Check size={8} color="white" />
          </View>
        )}
      </View>
      <Text className="text-brand-primary font-jakarta font-bold text-lg mt-3" numberOfLines={1}>{child.name.split(' ')[0]}</Text>
      <Text className="text-text-muted font-manrope text-sm font-medium">{child.class}</Text>
    </TouchableOpacity>
  </View>
);

const SettingItem = ({ icon: Icon, label, value, color, iconColor, isLast, onPress }: any) => (
  <TouchableOpacity 
    onPress={onPress}
    className={`flex-row items-center py-4 ${!isLast ? 'border-b border-surface-low' : ''}`}
  >
    <View className={`p-3 rounded-2xl mr-4 ${color || 'bg-surface-low'}`}>
      <Icon size={20} color={iconColor || '#737c7f'} />
    </View>
    <View className="flex-1">
      <Text className={`text-lg font-jakarta font-semibold ${iconColor === '#9f403d' ? 'text-brand-error' : 'text-text-primary'}`}>{label}</Text>
      {value && <Text className="text-text-muted font-manrope text-sm font-medium">{value}</Text>}
    </View>
    <Text className="text-text-muted text-xl font-light">›</Text>
  </TouchableOpacity>
);

export const ProfileScreen = ({ navigation, onSignOut }: any) => {
  const { children, selectedChildId, setSelectedChildId, setChildren, parentName, setParentName, setParentAvatarUrl } = useAppStore();
  const selectedChild = children.find((c: any) => c.id === selectedChildId);
  const [parentProfile, setParentProfile] = useState<any>(null);
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
    const profile = await parentService.fetchParentProfile();
    if (profile) {
      setParentProfile(profile);
      setParentName(`${profile.name} ${profile.surname}`);
      setParentAvatarUrl(profile.img);
      setEditData({ name: profile.name, surname: profile.surname, phone: profile.phone });
    }
    setLoading(false);
  };

  const showImageOptions = (type: 'parent' | 'student', id?: string) => {
    const hasImage = type === 'parent' ? !!parentProfile?.img : !!children.find(c => c.id === id)?.avatarUrl;

    const options = [
      { text: '📁 Choose from Library', onPress: () => pickImage(type, id) },
      { text: '📸 Take Photo', onPress: () => takePhoto(type, id) },
    ];

    if (hasImage) {
      options.push({ 
        text: '🗑️ Remove Photo', 
        style: 'destructive', 
        onPress: () => handleRemoveImage(type, id) 
      });
    }

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
      'Profile Photo',
      'Would you like to update your profile photo?',
      options
    );
  };

  const takePhoto = async (type: 'parent' | 'student', id?: string) => {
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
  };

  const pickImage = async (type: 'parent' | 'student', id?: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      handleUpload(result.assets[0].uri, type, id);
    }
  };

  const handleRemoveImage = async (type: 'parent' | 'student', id?: string) => {
    setUpdating(true);
    try {
      if (type === 'parent') {
        const updated = await parentService.updateProfile({ img: null });
        if (updated) {
          setParentProfile({ ...parentProfile, img: null });
        }
      } else if (id) {
        const updated = await studentService.updateImage(id, '');
        if (updated) {
          const refreshedChildren = await parentService.fetchChildren();
          setChildren(refreshedChildren);
        }
      }
      Alert.alert('Success', 'Profile photo removed');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove photo');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpload = async (uri: string, type: 'parent' | 'student', id?: string) => {
    setUpdating(true);
    try {
      const uploadId = type === 'parent' ? parentProfile.id : id;
      const { url } = await uiService.uploadImage(uri, type === 'parent' ? 'profile' : 'student', uploadId);
      
      if (type === 'parent') {
        const updated = await parentService.updateProfile({ img: url });
        if (updated) {
          setParentProfile({ ...parentProfile, img: url });
        }
      } else if (id) {
        const updated = await studentService.updateImage(id, url);
        if (updated) {
          // Refresh children in store
          const refreshedChildren = await parentService.fetchChildren();
          setChildren(refreshedChildren);
        }
      }
      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveProfile = async () => {
    setUpdating(true);
    try {
      const updated = await parentService.updateProfile(editData);
      if (updated) {
        setParentProfile({ ...parentProfile, ...editData });
        setParentName(`${editData.name} ${editData.surname}`);
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-background">
        <ActivityIndicator size="large" color="#0055d4" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerClassName="px-6 pb-32">
        {/* Profile Health Tracker */}
        <View className="mt-8 bg-brand-primary p-6 rounded-[32px] shadow-lg shadow-brand-primary/20 overflow-hidden">
          <View className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white font-jakarta font-black text-lg">Profile Health</Text>
            <Text className="text-white/80 font-jakarta font-bold">85%</Text>
          </View>
          <View className="w-100 h-2 bg-white/20 rounded-full overflow-hidden">
             <View className="w-[85%] h-full bg-white rounded-full" />
          </View>
          <Text className="text-white/70 text-xs mt-3 font-medium">Add photos for all children to reach 100%!</Text>
        </View>

        {/* Parent Profile Section */}
        <View className="items-center mt-10">
          <View className="relative">
            <View className="p-1.5 rounded-full border-2 border-brand-primary/10">
              <Image 
                source={parentProfile?.img ? { uri: parentProfile.img } : require('../../assets/noavatar.png')} 
                className="w-32 h-32 rounded-full bg-surface-low"
              />
            </View>
            <TouchableOpacity 
              onPress={() => showImageOptions('parent')}
              disabled={updating}
              className="absolute bottom-1 right-1 bg-brand-primary p-2.5 rounded-full border-4 border-white shadow-md shadow-brand-primary/30"
            >
              {updating ? <ActivityIndicator size="small" color="white" /> : <Camera size={18} color="white" />}
            </TouchableOpacity>
          </View>
          <Text className="text-3xl font-jakarta font-black text-text-primary mt-5">{parentProfile?.name} {parentProfile?.surname}</Text>
          <View className="flex-row items-center mt-2 px-4 py-1.5 bg-surface-low rounded-full">
            <Phone size={12} color="#0055d4" />
            <Text className="text-brand-primary font-jakarta font-bold text-xs ml-2">{parentProfile?.phone}</Text>
          </View>
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
                onEditImage={() => showImageOptions('student', child.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Settings Section */}
        <View className="mt-10">
          <Text className="text-2xl font-jakarta font-black text-text-primary mb-4">Settings</Text>
          <View className="bg-surface-lowest rounded-[32px] p-6 border border-surface-low">
            <SettingItem 
              icon={UserIcon} 
              label="Profile Details" 
              value="Update your personal info" 
              color="bg-blue-50" 
              iconColor="#0055d4" 
              onPress={() => setEditModalVisible(true)}
            />
            <SettingItem icon={Globe} label="Language" value="English (System Default)" color="bg-surface-low" iconColor="#586064" />
            <SettingItem icon={BellRing} label="Notifications" value="Alerts, grades, & messages" color="bg-surface-low" iconColor="#586064" />
            <SettingItem icon={LifeBuoy} label="Support" value="Help center & contact school" color="bg-surface-low" iconColor="#586064" isLast />
            
            <TouchableOpacity
              onPress={handleLogout}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, marginTop: 8 }}
            >
              <View style={{ padding: 12, borderRadius: 16, marginRight: 16, backgroundColor: '#fef2f2' }}>
                <LogOut size={20} color="#9f403d" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#9f403d' }}>Sign Out</Text>
                <Text style={{ color: '#737c7f', fontSize: 13 }}>Clear session & return to login</Text>
              </View>
              <Text style={{ color: '#d1d5db', fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View className="items-center mt-12 mb-20">
          <Text className="text-text-muted text-[10px] font-jakarta font-bold tracking-widest uppercase">SnapSchool Parent V2.4.0 (Build 82)</Text>
          <Text className="text-text-muted text-[10px] font-manrope mt-1">© 2026 SnapSchool Education Systems</Text>
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
                <Text className="text-text-muted font- manrope font-bold mb-2 ml-1">FIRST NAME</Text>
                <View className="flex-row items-center bg-surface-low rounded-2xl px-4 py-3 border border-surface-low focus:border-brand-primary">
                  <UserIcon size={18} color="#0055d4" />
                  <TextInput 
                    className="flex-1 ml-3 text-lg text-text-primary font- manrope"
                    value={editData.name}
                    onChangeText={(t) => setEditData({...editData, name: t})}
                    placeholder="Enter first name"
                  />
                </View>
              </View>

              <View>
                <Text className="text-text-muted font- manrope font-bold mb-2 ml-1">LAST NAME</Text>
                <View className="flex-row items-center bg-surface-low rounded-2xl px-4 py-3 border border-surface-low">
                  <UserIcon size={18} color="#0055d4" />
                  <TextInput 
                    className="flex-1 ml-3 text-lg text-text-primary font- manrope"
                    value={editData.surname}
                    onChangeText={(t) => setEditData({...editData, surname: t})}
                    placeholder="Enter last name"
                  />
                </View>
              </View>

              <View>
                <Text className="text-text-muted font- manrope font-bold mb-2 ml-1">PHONE NUMBER</Text>
                <View className="flex-row items-center bg-surface-low rounded-2xl px-4 py-3 border border-surface-low">
                  <Phone size={18} color="#0055d4" />
                  <TextInput 
                    className="flex-1 ml-3 text-lg text-text-primary font- manrope"
                    value={editData.phone}
                    onChangeText={(t) => setEditData({...editData, phone: t})}
                    keyboardType="phone-pad"
                    placeholder="Enter phone number"
                  />
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleSaveProfile}
                disabled={updating}
                className="bg-brand-primary py-4 rounded-2xl items-center mt-4 shadow-lg shadow-brand-primary/20"
              >
                {updating ? <ActivityIndicator color="white" /> : <Text className="text-white font-jakarta font-bold text-lg">Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
