import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, Modal, TextInput, ActivityIndicator, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Edit2, Globe, BellRing, LifeBuoy, LogOut, Camera, X, Check, Phone, User as UserIcon, ChevronDown, ChevronRight, User, Pencil } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Svg, Circle } from 'react-native-svg';
import { useAppStore } from '../store/useAppStore';
import { authService, parentService, studentService, uiService } from '../services/api';

import { GlobalHeader } from '../components/GlobalHeader';

const { width } = Dimensions.get('window');

const CircularProgress = ({ size, progress, imageUri, updating, onPress }: any) => {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

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
      <TouchableOpacity 
        onPress={onPress}
        activeOpacity={0.8}
        style={{ position: 'absolute', width: size - 15, height: size - 15, borderRadius: (size - 15) / 2, overflow: 'hidden', backgroundColor: '#f1f4f6' }}
      >
        <Image 
          source={imageUri ? { uri: imageUri } : require('../../assets/noavatar.png')} 
          style={{ width: '100%', height: '100%' }}
        />
        {updating && (
          <View className="absolute inset-0 bg-black/20 items-center justify-center">
            <ActivityIndicator size="small" color="white" />
          </View>
        )}
        <View className="absolute bottom-0 right-0 left-0 bg-black/30 py-1 items-center">
          <Camera size={12} color="white" />
        </View>
      </TouchableOpacity>
      {/* Percentage Badge */}
      <View style={{
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#f1f4f6',
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e9ec',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        <Text style={{ fontSize: 10, fontWeight: '900', color: '#0055d4' }}>{progress}%</Text>
      </View>
    </View>
  );
};

const ChildCard = ({ child, isSelected, onSelect, onEditImage }: any) => (
  <TouchableOpacity 
    onPress={onSelect}
    activeOpacity={0.9}
    className="mr-3 overflow-hidden bg-white rounded-[28px] border border-surface-low"
    style={{
      width: 170,
      shadowColor: '#2b3437',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 3,
    }}
  >
    <View className="relative">
      <Image 
        source={child.avatarUrl ? { uri: child.avatarUrl } : require('../../assets/noavatar.png')} 
        className="w-full h-[170px] bg-surface-low" 
      />
      <TouchableOpacity 
        onPress={onEditImage}
        className="absolute bottom-2 right-2 bg-white/90 p-2 rounded-full border border-surface-low shadow-sm"
      >
        <Camera size={18} color="#0055d4" />
      </TouchableOpacity>
    </View>
    <View className="p-4 flex-row justify-between items-center bg-white">
      <View>
        <Text className="text-[#0055d4] font-jakarta font-black text-lg" numberOfLines={1}>{child.name.split(' ')[0].toLowerCase()}</Text>
        <Text className="text-text-muted font-manrope text-xs font-bold leading-tight">{child.class}</Text>
      </View>
      {isSelected && (
        <View className="w-6 h-6 bg-brand-primary rounded-full items-center justify-center shadow-sm">
          <Check size={14} color="white" />
        </View>
      )}
    </View>
  </TouchableOpacity>
);

const SettingItemV2 = ({ icon: Icon, label, color, isLast, onPress }: any) => (
  <TouchableOpacity 
    onPress={onPress}
    activeOpacity={0.6}
    className={`flex-row items-center py-4 px-4 ${!isLast ? 'border-b border-surface-low' : ''}`}
  >
    <View className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${color || 'bg-surface-low'}`}>
      <Icon size={20} color="#737c7f" />
    </View>
    <Text className="flex-1 text-lg font-jakarta font-semibold text-text-primary">{label}</Text>
    <ChevronDown size={20} color="#d1d5db" />
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
      mediaTypes: ImagePicker.MediaType.IMAGES,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Modern Header Save Button */}
      <View className="flex-row justify-end px-6 pt-2">
         <TouchableOpacity 
            onPress={handleSaveProfile}
            disabled={updating}
            className="bg-brand-primary px-5 py-2.5 rounded-full shadow-md shadow-brand-primary/20"
         >
           {updating ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-jakarta font-bold text-sm">Save</Text>}
         </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 150 }}>
        
        {/* Parent Header (High Fidelity) */}
        <View className="items-center mt-8">
          <CircularProgress 
            size={140} 
            progress={85} 
            imageUri={parentProfile?.img}
            updating={updating}
            onPress={() => showImageOptions('parent')}
          />
          <Text className="text-2xl font-jakarta font-black text-text-primary mt-6">{parentProfile?.name} {parentProfile?.surname}</Text>
          <TouchableOpacity 
             onPress={() => setEditModalVisible(true)}
             className="mt-4 p-2 bg-white rounded-xl border border-surface-low shadow-sm"
          >
            <Pencil size={20} color="#737c7f" />
          </TouchableOpacity>
        </View>

        {/* My Children Section */}
        <View className="mt-12">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-2xl font-jakarta font-black text-text-primary">My Children</Text>
            <TouchableOpacity className="bg-surface-low px-4 py-2 rounded-xl">
              <Text className="text-text-muted font-jakarta font-bold text-sm">Manage</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2 -mx-2 px-2 overflow-visible">
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
        <View className="mt-12">
          <Text className="text-2xl font-jakarta font-black text-text-primary mb-6">Settings</Text>
          <View className="bg-white rounded-[32px] overflow-hidden border border-surface-low shadow-sm shadow-black/5">
            <SettingItemV2 icon={UserIcon} label="Profile Details" onPress={() => setEditModalVisible(true)} />
            <SettingItemV2 icon={Globe} label="Language" />
            <SettingItemV2 icon={BellRing} label="Notifications" />
            <SettingItemV2 icon={LifeBuoy} label="Support" />
            <SettingItemV2 icon={LogOut} label="Sign Out" isLast onPress={handleLogout} />
          </View>
        </View>

        {/* Footer */}
        <View className="items-center mt-12 mb-10 opacity-40">
          <Text className="text-text-muted text-[10px] font-jakarta font-black tracking-widest uppercase">SnapSchool Parent V2.5.0</Text>
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
