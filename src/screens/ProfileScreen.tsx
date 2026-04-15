import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Edit2, Globe, BellRing, LifeBuoy, LogOut, Camera, X, Check, Phone, User as UserIcon, ChevronDown, ChevronRight, User } from 'lucide-react-native';
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
  const { children, selectedChildId, setSelectedChildId, setChildren, parentName, setParentName } = useAppStore();
  const selectedChild = children.find((c: any) => c.id === selectedChildId);
  const [parentProfile, setParentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showChildSwitcher, setShowChildSwitcher] = useState(false);
  
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
      {/* Header: Profile Switcher & Notifications */}
      <View className="flex-row items-center justify-between px-6 py-4 bg-surface-lowest">
        <TouchableOpacity 
          onPress={() => setShowChildSwitcher(true)}
          className="flex-row items-center bg-white p-2.5 pr-4 rounded-2xl border border-surface-low"
          style={{
            shadowColor: '#2b3437',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View className="w-10 h-10 rounded-full overflow-hidden border-2 border-brand-primary/10 mr-3">
            <Image 
              source={selectedChild?.avatarUrl ? { uri: selectedChild.avatarUrl } : require('../../assets/noavatar.png')} 
              className="w-full h-full" 
            />
          </View>
          <View>
            <Text className="text-[10px] text-text-muted font-jakarta font-bold tracking-widest uppercase">
              {selectedChild?.name?.split(' ')[0]}'s Profile
            </Text>
            <View className="flex-row items-center">
              <Text className="text-lg font-jakarta font-bold text-text-primary">
                {selectedChild?.name || 'Switch Family'}
              </Text>
              <ChevronDown size={16} color="#0055d4" className="ml-1.5" />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} className="p-2.5 bg-surface-lowest rounded-full border border-surface-low">
          <Bell size={24} color="#0055d4" fill="#0055d4" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerClassName="px-6 pb-32">
        {/* Parent Profile Section */}
        <View className="items-center mt-6">
          <View className="relative">
            <View className="p-1 rounded-full border border-surface-low">
              <Image 
                source={parentProfile?.img ? { uri: parentProfile.img } : require('../../assets/noavatar.png')} 
                className="w-28 h-28 rounded-full bg-surface-low"
              />
            </View>
            <TouchableOpacity 
              onPress={() => showImageOptions('parent')}
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

      {/* Child Switcher BottomSheet */}
      <Modal visible={showChildSwitcher} transparent animationType="slide" onRequestClose={() => setShowChildSwitcher(false)}>
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setShowChildSwitcher(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <View className="bg-white rounded-t-[40px] p-8 pb-12">
            <View className="w-10 h-1 bg-surface-low rounded-full self-center mb-6" />
            
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-2xl font-jakarta font-black text-brand-primary">Family Profiles</Text>
                <Text className="text-sm text-text-muted font-manrope font-medium mt-1">Switch between your children</Text>
              </View>
              <TouchableOpacity onPress={() => setShowChildSwitcher(false)} className="w-10 h-10 bg-surface-low rounded-full items-center justify-center">
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
                      setShowChildSwitcher(false);
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
              onPress={() => {/* Placeholder for adding another child if needed */}}
            >
              <UserIcon size={18} color="#0055d4" className="mr-2" />
              <Text className="text-brand-primary font-jakarta font-bold text-sm uppercase tracking-widest">Manage Family Accounts</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};
