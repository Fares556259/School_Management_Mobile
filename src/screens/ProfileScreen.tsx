import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Edit2, Globe, BellRing, LifeBuoy, LogOut, Camera, X, Check, Phone, User as UserIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../store/useAppStore';
import { authService, parentService, studentService, uiService } from '../services/api';

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
        <Image source={{ uri: child.avatarUrl }} className="w-16 h-16 rounded-2xl bg-surface-low" />
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
  const { children, selectedChildId, setSelectedChildId, setChildren, parentName, setParentName } = useAppStore();
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
      setEditData({ name: profile.name, surname: profile.surname, phone: profile.phone });
    }
    setLoading(false);
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
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 bg-surface-lowest">
        <View className="flex-row items-center">
          <View className="w-8 h-8 bg-brand-primary rounded-lg items-center justify-center mr-2">
            <Text className="text-white font-black">S</Text>
          </View>
          <Text className="text-xl font-jakarta font-black text-brand-primary">SnapSchool</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} className="p-2">
          <Bell size={24} color="#0055d4" fill="#0055d4" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerClassName="px-6 pb-32">
        {/* Parent Profile Section */}
        <View className="items-center mt-6">
          <View className="relative">
            <View className="p-1 rounded-full border border-surface-low">
              <Image 
                source={{ uri: parentProfile?.img || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + parentProfile?.name }} 
                className="w-28 h-28 rounded-full bg-surface-low"
              />
            </View>
            <TouchableOpacity 
              onPress={() => pickImage('parent')}
              disabled={updating}
              className="absolute bottom-0 right-0 bg-brand-primary p-2 rounded-full border-2 border-white"
            >
              {updating ? <ActivityIndicator size="small" color="white" /> : <Camera size={16} color="white" />}
            </TouchableOpacity>
          </View>
          <Text className="text-3xl font-jakarta font-black text-text-primary mt-4">{parentProfile?.name} {parentProfile?.surname}</Text>
          <Text className="text-text-muted font-manrope font-bold mt-1">{parentProfile?.phone}</Text>
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
                onEditImage={() => pickImage('student', child.id)}
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
