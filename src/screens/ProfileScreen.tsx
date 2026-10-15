import { PrivacyControls } from '../components/PrivacyControls';
import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, StatusBar, Dimensions, Switch, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Edit2, BellRing, LogOut, Camera, X, Check, Phone, User as UserIcon, ChevronDown, ChevronRight, ChevronLeft, User, Pencil, FileText, Info, PhoneCall, MapPin, Image as ImageIcon, Award, Globe, RefreshCw, KeyRound, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFonts } from 'expo-font';
import { Svg, Circle } from 'react-native-svg';
import { useAppStore } from '../store/useAppStore';
import { useLanguage, Language } from '../context/LanguageContext';
import { authService, parentService, studentService, uiService, teacherService } from '../services/api';
import { notificationService } from '../services/notificationService';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';

import { GlobalHeader } from '../components/GlobalHeader';
import { StatusToast, ToastConfig, ToastType } from '../components/StatusToast';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { SkeletonBlock } from '../components/SkeletonView';

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
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="small" color="white" />
          </View>
        )}
      </View>

      {/* Floating Action Button for Image */}
      <TouchableOpacity 
        onPress={onPress}
        activeOpacity={0.8}
        style={{ position: 'absolute', bottom: 4, right: 4, backgroundColor: 'white', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,85,212,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}
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

const ChildCard = ({ child, index, selected, onSelect, onEdit }: any) => {
  const { t, isRTL, language } = useLanguage();
  const bgColor = CHILD_COLORS[index % CHILD_COLORS.length];
  const textColor = CHILD_TEXT_COLORS[index % CHILD_TEXT_COLORS.length];
  
  return (
    <TouchableOpacity 
      onPress={onSelect}
      activeOpacity={0.7}
      style={{
        width: 172,
        minHeight: 112,
        backgroundColor: selected ? '#f0f7ff' : 'white',
        borderRadius: 22,
        padding: 14,
        marginRight: 12,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? '#0b72df' : '#e2e8f0',
        shadowColor: '#183153',
        shadowOpacity: selected ? 0.08 : 0.03,
        shadowRadius: 8,
        elevation: selected ? 2 : 0,
      }}
    >
      <View style={{ width: '100%', flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: bgColor, overflow: 'hidden' }}>
          {child.avatarUrl ? <Image source={{ uri: child.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} /> : <UserIcon size={25} color={textColor} strokeWidth={1.7} />}
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {selected && <View style={{ width: 25, height: 25, borderRadius: 13, backgroundColor: '#0b72df', alignItems: 'center', justifyContent: 'center' }}><Check size={14} color="white" strokeWidth={3} /></View>}
          <TouchableOpacity onPress={onEdit} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ width: 25, height: 25, borderRadius: 9, backgroundColor: selected ? '#dcecff' : '#f3f6f9', alignItems: 'center', justifyContent: 'center' }}>
            <Pencil size={12} color={selected ? '#0b72df' : '#718096'} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ width: '100%', marginTop: 10, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
        <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>
          {child.name}
        </Text>
        <Text style={{ color: selected ? '#0b72df' : '#64748b', fontSize: 12, fontWeight: '700', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>
          {child.class && child.class !== 'No Class' ? `${t.classLabel} ${child.class}` : (language === 'ar' ? 'دون قسم' : language === 'fr' ? 'Classe non attribuée' : 'No class assigned')}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const SettingItemV3 = ({ icon: Icon, label, subtitle, color, iconBg, onPress, isLast, isDestructive, rightElement }: any) => {
  const { isRTL } = useLanguage();
  return (
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={0.6} 
      style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
        borderBottomWidth: !isLast ? 1 : 0,
        borderBottomColor: '#f1f5f9',
      }}
    >
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: iconBg ? undefined : '#eff6ff',
        marginRight: isRTL ? 0 : 13,
        marginLeft: isRTL ? 13 : 0,
      }} className={iconBg}>
        <Icon size={20} color={color || "#0055d4"} />
      </View>
      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: isDestructive ? '#ef4444' : '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>{label}</Text>
        {subtitle && <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>{subtitle}</Text>}
      </View>
      {rightElement || (isRTL ? <ChevronLeft size={18} color="#9ca3af" /> : <ChevronRight size={18} color="#9ca3af" />)}
    </TouchableOpacity>
  );
};

const SectionTitle = ({ title }: { title: string }) => {
  const { isRTL } = useLanguage();
  return (
    <Text style={{
      fontSize: 13,
      fontWeight: '800',
      color: '#64748b',
      marginTop: 24,
      marginBottom: 10,
      marginHorizontal: 20,
      textAlign: isRTL ? 'right' : 'left',
    }}>
      {title}
    </Text>
  );
};

export const ProfileScreen = ({ navigation, onSignOut }: any) => {
  const { children, selectedChildId, setSelectedChildId, setChildren, userName, setUserName, setUserAvatarUrl, userAvatarUrl, userRole, userId } = useAppStore();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [arabicFontLoaded] = useFonts({ NotoSansArabic: require('../../assets/fonts/NotoSansArabic.ttf') });
  const arabicText = isRTL && arabicFontLoaded ? { fontFamily: 'NotoSansArabic', fontWeight: 'normal' as const, letterSpacing: 0 } : undefined;
  const [profile, setProfile] = useState<any>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [preparingEdit, setPreparingEdit] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [editData, setEditData] = useState({ name: '', surname: '', phone: '' });

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [editChildModalVisible, setEditChildModalVisible] = useState(false);
  const [editChildData, setEditChildData] = useState({ id: '', name: '', surname: '', avatarUrl: '', className: '', studentNumber: '' });
  const [updatingChild, setUpdatingChild] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  // Status Toast State
  const [toast, setToast] = useState<ToastConfig>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showToast = (type: ToastType, title: string, message?: string) => {
    setToast({ visible: true, type, title, message });
  };

  useEffect(() => {
    const loadNotificationPreference = async () => {
      try {
        setNotificationsEnabled(await notificationService.isEnabled());
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

      if (newValue) {
        await notificationService.initChannels();
        // Request OS permission
        const granted = await notificationService.requestPermissions();
        if (!granted) {
          showToast(
            'warning',
            t?.permissionsRequired || 'Permissions Required',
            t?.pleaseEnablePushNotificationPermissions || 'Please enable push notification permissions in system settings to receive alerts.'
          );
          setNotificationsEnabled(false);
          await notificationService.setEnabled(false);
          return;
        }

        // Get push token and register on backend
        const pushToken = await notificationService.getPushToken();
        if (!pushToken) {
          setNotificationsEnabled(false);
          await notificationService.setEnabled(false);
          showToast(
            'warning',
            t?.permissionsRequired || 'Permissions Required',
            t?.pleaseEnablePushNotificationPermissions || 'Please enable push notification permissions in system settings to receive alerts.'
          );
          return;
        }
        if (userId) {
          const registration = await authService.registerPushToken(userId, pushToken);
          if (!registration?.success) {
            throw new Error(registration?.error || 'Le serveur n’a pas confirmé cet appareil.');
          }
        }
        await notificationService.setEnabled(true);
        
        showToast(
          'info',
          t?.notificationsEnabled || 'Notifications Enabled 🔔',
          t?.youWillNowReceiveInstant || 'You will now receive instant push alerts for homework, grades, and school news.'
        );
      } else {
        // Unregister push token on backend and cancel local scheduled alerts
        if (userId) {
          await authService.registerPushToken(userId, '');
        }
        await notificationService.cancelAll();
        await notificationService.setEnabled(false);

        showToast(
          'warning',
          t?.notificationsDisabled || 'Notifications Disabled',
          t?.pushNotificationsHaveBeenDisabled || 'Push notifications have been disabled.'
        );
      }
    } catch (e) {
      console.error('Failed to toggle notifications', e);
      setNotificationsEnabled(!notificationsEnabled);
    }
  };

  const openEditChildModal = (child: any) => {
    const nameParts = (child.name || '').split(' ');
    setEditChildData({ 
      id: child.id, 
      name: nameParts[0] || '', 
      surname: nameParts.slice(1).join(' ') || '',
      avatarUrl: child.avatarUrl || '',
      className: child.class && child.class !== 'No Class' ? child.class : '',
      studentNumber: child.raw?.studentId || child.raw?.uniqueId || child.raw?.code || '',
    });
    setEditChildModalVisible(true);
  };

  const handleSaveChildProfile = async () => {
    if (!editChildData.id) return;
    if (!editChildData.name.trim() || !editChildData.surname.trim()) {
      showToast(
        'warning',
        language === 'ar' ? 'معلومات ناقصة' : language === 'fr' ? 'Informations incomplètes' : 'Missing information',
        language === 'ar' ? 'أدخل اسم التلميذ ولقبه.' : language === 'fr' ? 'Renseignez le prénom et le nom de l’enfant.' : 'Enter the child’s first and last name.'
      );
      return;
    }
    setUpdatingChild(true);
    try {
      await studentService.updateProfile(editChildData.id, { name: editChildData.name.trim(), surname: editChildData.surname.trim() });
      const updatedChildren = children.map(c => c.id === editChildData.id ? { ...c, name: `${editChildData.name.trim()} ${editChildData.surname.trim()}` } : c);
      setChildren(updatedChildren);
      setEditChildModalVisible(false);
      showToast('success', t?.profileUpdatedSuccess || 'Profile updated successfully');
    } catch (e) {
      showToast('error', t?.error || 'Error', t?.failedToUpdateProfile || 'Failed to update child profile');
    } finally {
      setUpdatingChild(false);
    }
  };

  const cachedIdentity = React.useMemo(() => {
    const parts = (userName || '').trim().split(/\s+/).filter(Boolean);
    return {
      name: parts[0] && parts[0] !== 'User' ? parts[0] : '',
      surname: parts.slice(1).join(' '),
      phone: '',
      img: userAvatarUrl || null,
    };
  }, [userAvatarUrl, userName]);

  const { data: profileData, isLoading: loading, refetch: loadProfile } = useQuery({
    queryKey: ['profile', userRole, userId],
    queryFn: async () => {
      const [userProfile, school] = await Promise.all([
        userRole === 'teacher' ? teacherService.fetchProfile() : parentService.fetchParentProfile(),
        parentService.fetchSchoolInfo(),
      ]);
      return { userProfile, school };
    },
    placeholderData: {
      userProfile: cachedIdentity,
      school: null,
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: false,
  });

  useEffect(() => {
    const userProfile = profileData?.userProfile;
    if (userProfile) {
      setProfile(userProfile);
      if (userProfile.name) {
        setUserName(`${userProfile.name} ${userProfile.surname || ''}`.trim());
      }
      if (userProfile.img) setUserAvatarUrl(userProfile.img);
      setEditData({
        name: userProfile.name || '',
        surname: userProfile.surname || '',
        phone: userProfile.phone || '',
      });
    }
    if (profileData?.school) setSchoolInfo(profileData.school);
  }, [profileData, setUserAvatarUrl, setUserName]);

  const openEditProfile = async () => {
    if (preparingEdit) return;
    setPreparingEdit(true);
    try {
      const refreshed = await loadProfile();
      const freshProfile = refreshed.data?.userProfile || profile;
      if (!freshProfile) {
        showToast(
          'error',
          language === 'ar' ? 'تعذر تحميل الملف الشخصي' : language === 'en' ? 'Profile unavailable' : 'Profil indisponible',
          language === 'ar' ? 'تحقق من الاتصال ثم حاول مجدداً.' : language === 'en' ? 'Check your connection and try again.' : 'Vérifiez votre connexion puis réessayez.'
        );
        return;
      }

      setEditData({
        name: freshProfile.name || '',
        surname: freshProfile.surname || '',
        phone: freshProfile.phone || '',
      });
      setEditModalVisible(true);
    } catch {
      showToast(
        'error',
        language === 'ar' ? 'تعذر تحميل الملف الشخصي' : language === 'en' ? 'Profile unavailable' : 'Profil indisponible',
        language === 'ar' ? 'تحقق من الاتصال ثم حاول مجدداً.' : language === 'en' ? 'Check your connection and try again.' : 'Vérifiez votre connexion puis réessayez.'
      );
    } finally {
      setPreparingEdit(false);
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
      const { url } = (await uiService.uploadImage(uri, type === 'user' ? 'profile' : 'student', uploadId!)) as any;
      
      if (type === 'user') {
        let updated = false;
        if (userRole === 'teacher') {
          updated = !!(await teacherService.updateProfile({ img: url }));
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
          const refreshedChild = refreshedChildren.find(child => child.id === id);
          setEditChildData(previous => previous.id === id ? { ...previous, avatarUrl: refreshedChild?.avatarUrl || url } : previous);
        }
      }
      showToast('success', t?.profilePhotoUpdatedSuccess || 'Profile picture updated successfully');
    } catch (error) {
      console.error('Upload error:', error);
      showToast('error', t?.error || 'Error', t?.saveError || 'Failed to upload image. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveProfile = async () => {
    setUpdating(true);
    try {
      const updated = await parentService.updateProfile(editData);
      
      if (updated) {
        if (updated) {
          setProfile({ ...profile, ...editData });
          setUserName(`${editData.name} ${editData.surname}`);
        }
        setEditModalVisible(false);
        showToast('success', t?.profileUpdatedSuccess || 'Profile updated successfully');
      } else {
        setEditModalVisible(false); // No changes
      }
    } catch (error) {
      showToast('error', t?.error || 'Error', t?.failedToUpdateProfile || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      if (__DEV__) {
        Alert.alert(
          language === 'ar' ? 'وضع التطوير' : 'Mode Dev',
          language === 'ar' ? 'المزامنة التلقائية مفعلة فقط في النسخة المجمعة.' : 'Les mises à jour OTA sont actives uniquement en version compilée/production.'
        );
        return;
      }
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        showToast('info', language === 'ar' ? 'جارٍ التحميل...' : 'Téléchargement...', language === 'ar' ? 'جارٍ تحميل آخر تحديث للتطبيق' : 'Téléchargement de la dernière version...');
        await Updates.fetchUpdateAsync();
        Alert.alert(
          language === 'ar' ? 'التحديث جاهز! 🚀' : 'Mise à jour prête ! 🚀',
          language === 'ar' ? 'تم تنزيل آخر إصدار من SnapSchool. اضغط على إعادة التشغيل لتطبيقه الآن.' : 'La dernière version de SnapSchool a été téléchargée avec succès. Appuyez sur Redémarrer pour l\'appliquer.',
          [
            { text: language === 'ar' ? 'إلغاء' : 'Plus tard', style: 'cancel' },
            { text: language === 'ar' ? 'إعادة التشغيل الآن' : 'Redémarrer maintenant', onPress: () => Updates.reloadAsync() },
          ]
        );
      } else {
        Alert.alert(
          language === 'ar' ? 'التطبيق محدث ✅' : 'Application à jour ✅',
          language === 'ar' ? `أنت تستخدم أحدث إصدار متاح حالياً (v${Constants.expoConfig?.version || '1.0.3'}).` : `Vous utilisez déjà la toute dernière version disponible (v${Constants.expoConfig?.version || '1.0.3'}).`
        );
      }
    } catch (err: any) {
      Alert.alert(
        language === 'ar' ? 'حالة التحديث' : 'Mise à jour',
        language === 'ar' ? `أنت على النسخة الحالية (v${Constants.expoConfig?.version || '1.0.3'}).` : `Vous disposez de la version courante (v${Constants.expoConfig?.version || '1.0.3'}).`
      );
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleLogout = () => {
    const logoutCopy = language === 'ar'
      ? { title: 'تسجيل الخروج', body: 'هل تريد تسجيل الخروج من حسابك؟', cancel: 'إلغاء', confirm: 'تسجيل الخروج' }
      : language === 'fr'
        ? { title: 'Déconnexion', body: 'Voulez-vous vous déconnecter de votre compte ?', cancel: 'Annuler', confirm: 'Se déconnecter' }
        : { title: 'Sign out', body: 'Do you want to sign out of your account?', cancel: 'Cancel', confirm: 'Sign out' };
    Alert.alert(logoutCopy.title, logoutCopy.body, [
      { text: logoutCopy.cancel, style: 'cancel' },
      {
        text: logoutCopy.confirm,
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          setChildren([]);
          if (onSignOut) onSignOut();
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (passwordForm.next.length < 8) {
      showToast(
        'error',
        language === 'ar' ? 'كلمة مرور قصيرة' : 'Mot de passe trop court',
        language === 'ar' ? 'يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل.' : 'Utilisez au moins 8 caractères.'
      );
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      showToast(
        'error',
        language === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Confirmation incorrecte'
      );
      return;
    }

    setChangingPassword(true);
    try {
      const result = await authService.changePassword(passwordForm.current, passwordForm.next);
      if (!result.success) {
        showToast('error', language === 'ar' ? 'تعذر التعديل' : 'Modification impossible', result.error);
        return;
      }
      setPasswordModalVisible(false);
      setPasswordForm({ current: '', next: '', confirm: '' });
      showToast(
        'success',
        language === 'ar' ? 'تم تغيير كلمة المرور' : 'Mot de passe modifié',
        language === 'ar' ? 'استخدم كلمة المرور الجديدة عند تسجيل الدخول.' : 'Utilisez votre nouveau mot de passe lors de la prochaine connexion.'
      );
    } finally {
      setChangingPassword(false);
    }
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

  if (loading && !userName && !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingBottom: 150, backgroundColor: '#f8fafc' }}>
          
          <View className="items-center mt-12 mb-2">
             <SkeletonBlock width={150} height={16} />
          </View>

          <View style={{
            backgroundColor: 'white',
            borderRadius: 24,
            padding: 20,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            marginTop: 16,
            marginHorizontal: 24,
            borderWidth: 1,
            borderColor: '#e2e8f0',
          }}>
            <SkeletonBlock width={64} height={64} borderRadius={32} style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }} />
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <SkeletonBlock width={140} height={20} marginBottom={8} />
              <SkeletonBlock width={100} height={14} />
            </View>
          </View>

          {[1, 2].map((sectionIndex) => (
             <View key={sectionIndex} className="mt-8">
               <View style={{ marginHorizontal: 24, marginBottom: 10, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                 <SkeletonBlock width={100} height={14} />
               </View>
               <View className="bg-white mx-6 rounded-[24px] overflow-hidden border border-surface-low/60 shadow-sm shadow-black/5 p-2">
                 {[1, 2, 3].map((itemIndex) => (
                    <View key={itemIndex} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: itemIndex !== 3 ? 1 : 0, borderBottomColor: '#f1f5f9' }}>
                      <SkeletonBlock width={42} height={42} borderRadius={14} style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }} />
                      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <SkeletonBlock width={120} height={16} marginBottom={6} />
                        <SkeletonBlock width={160} height={12} />
                      </View>
                    </View>
                 ))}
               </View>
             </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingBottom: 150, backgroundColor: '#f8fafc' }}>
        <View style={{ marginHorizontal: 20, marginTop: 22, marginBottom: 14, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={[{ fontSize: 12, fontWeight: '800', color: '#0b72df' }, arabicText]}>
            {language === 'ar' ? 'الحساب والعائلة' : language === 'fr' ? 'COMPTE & FAMILLE' : 'ACCOUNT & FAMILY'}
          </Text>
          <Text style={[{ fontSize: 28, lineHeight: 36, fontWeight: '900', color: '#10213a', marginTop: 2 }, arabicText]}>{t.profileSettingTitle}</Text>
        </View>

        <TouchableOpacity activeOpacity={0.75} onPress={() => { void openEditProfile(); }} style={{
          backgroundColor: 'white',
          borderRadius: 22,
          padding: 16,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          marginHorizontal: 20,
          borderWidth: 1,
          borderColor: '#e2e8f0',
          shadowColor: '#183153', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1,
        }}>
          <View style={{
            width: 58,
            height: 58,
            borderRadius: 18,
            backgroundColor: '#eff6ff',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: isRTL ? 0 : 14,
            marginLeft: isRTL ? 14 : 0,
          }}>
            {(profile?.img || userAvatarUrl) ? (
              <Image 
                source={{ uri: profile?.img || userAvatarUrl! }} 
                style={{ width: '100%', height: '100%', borderRadius: 999 }} 
                contentFit="cover" 
              />
            ) : (
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#0072e6' }}>
                {(profile?.name || userName)?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[{ fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }, arabicText]}>
              {profile?.name && profile?.surname ? `${profile.name} ${profile.surname}` : userName || '...'}
            </Text>
            <Text style={[{ fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }, arabicText]}>
              {profile?.phone || (userRole === 'teacher' ? (language === 'ar' ? 'حساب مدرس' : language === 'fr' ? 'Compte enseignant' : 'Teacher account') : `${children.length} ${language === 'ar' ? 'أبناء مسجلين' : language === 'fr' ? 'enfants inscrits' : 'children enrolled'}`)}
            </Text>
          </View>
          {preparingEdit ? <ActivityIndicator size="small" color="#0b72df" /> : <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#edf6ff', alignItems: 'center', justifyContent: 'center' }}><Pencil size={16} color="#0b72df" /></View>}
        </TouchableOpacity>

        {/* My Children Section - Only for Parents */}
        {userRole === 'parent' && (
          <View>
            <SectionTitle title={t.myChildren} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 4 }}>
              {children.map((child, index) => (
                <ChildCard 
                  key={child.id} 
                  child={child} 
                  index={index}
                  selected={child.id === selectedChildId}
                  onSelect={() => setSelectedChildId(child.id)}
                  onEdit={() => openEditChildModal(child)}
                />
              ))}
              <TouchableOpacity onPress={() => navigation.navigate('LinkChild')} style={{ width: 112, minHeight: 112, borderRadius: 22, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#9bc8f4', backgroundColor: '#f5faff', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: '#dfefff', alignItems: 'center', justifyContent: 'center' }}><Plus size={19} color="#0b72df" /></View>
                <Text style={[{ marginTop: 8, color: '#0b72df', fontSize: 11, lineHeight: 16, fontWeight: '800', textAlign: 'center' }, arabicText]}>{language === 'ar' ? 'إضافة تلميذ' : language === 'fr' ? 'Ajouter un enfant' : 'Add a child'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* General Section */}
        <View>
          <SectionTitle title={t.generalSection} />
          <View className="bg-white mx-5 rounded-[22px] overflow-hidden border border-surface-low/60 shadow-sm shadow-black/5">
            <SettingItemV3 
              icon={UserIcon} 
              color="#0055d4" iconBg="bg-blue-50"
              label={t.editProfileItem} 
              subtitle={t.editProfileSub}
              onPress={() => { void openEditProfile(); }}
              rightElement={preparingEdit ? <ActivityIndicator size="small" color="#0055D4" /> : undefined}
              isLast={userRole === 'teacher'}
            />
            {userRole === 'parent' && (
              <View>
                <SettingItemV3 
                  icon={Award} 
                  color="#8b5cf6" iconBg="bg-purple-50"
                  label={t.reportCardItem} 
                  subtitle={t.profileReportCardSub}
                  isLast
                  onPress={() => navigation.navigate('Results')} 
                />
              </View>
            )}
          </View>
        </View>

        {/* Preferences Section */}
        <View>
          <SectionTitle title={t.preferencesSection} />
          <View className="bg-white mx-5 rounded-[22px] overflow-hidden border border-surface-low/60 shadow-sm shadow-black/5">
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
              label={t.notificationsItem} 
              subtitle={t.notificationsSub}
              rightElement={<Switch value={notificationsEnabled} onValueChange={toggleNotifications} trackColor={{ false: '#e2e8f0', true: '#0055d4' }} style={{ transform: [{ scale: 0.8 }] }} />}
            />
            <SettingItemV3 
              icon={Info} 
              color="#10b981" iconBg="bg-green-50"
              label={t.schoolSupportItem} 
              subtitle={schoolInfo?.schoolName || t.schoolSupportSub}
              onPress={() => schoolInfo?.phone && Linking.openURL(`tel:${schoolInfo.phone}`)}
            />
            <SettingItemV3 
              icon={RefreshCw} 
              color="#10b981" iconBg="bg-emerald-50"
              label={language === 'ar' ? 'التحقق من التحديثات' : language === 'fr' ? 'Vérifier les mises à jour' : 'Check for Updates'} 
              subtitle={checkingUpdate ? (language === 'ar' ? 'جارٍ التحقق...' : 'Vérification en cours...') : `SnapSchool v${Constants.expoConfig?.version || '1.0.3'}`}
              onPress={handleCheckUpdate}
            />
            {userRole === 'parent' && (
              <SettingItemV3
                icon={KeyRound}
                color="#0055d4" iconBg="bg-blue-50"
                label={language === 'ar' ? 'تغيير كلمة المرور' : language === 'en' ? 'Change password' : 'Changer le mot de passe'}
                subtitle={language === 'ar' ? 'تحديث كلمة مرور حسابك بأمان' : language === 'en' ? 'Securely update your account password' : 'Mettre à jour votre accès en toute sécurité'}
                onPress={() => setPasswordModalVisible(true)}
              />
            )}
            <SettingItemV3 
              icon={LogOut} 
              color="#ef4444" iconBg="bg-red-50"
              label={t.signOut} 
              subtitle={t.signOutSub}
              isDestructive
              isLast 
              onPress={handleLogout} 
            />
          </View>

          <PrivacyControls inset />
          {/* App Version Tag */}
          <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8' }}>
              SnapSchool v{Constants.expoConfig?.version || '1.0.3'}
            </Text>
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
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#94a3b8' }}>{t?.cancel || 'Cancel'}</Text>
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
            <Text className="flex-1 text-center text-[13px] font-jakarta font-bold text-text-primary tracking-widest uppercase mr-6">
              {t?.editProfileItem || 'Edit Profile'}
            </Text>
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
                <Text className="text-[13px] font-jakarta font-semibold text-text-primary mb-2 ml-1" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  {t?.nameLabel || 'Name'}
                </Text>
                <View className="bg-white rounded-2xl px-5 py-4 shadow-sm shadow-black/5 border border-surface-low/50">
                  <TextInput 
                    className="text-[15px] text-text-primary font-manrope font-semibold p-0"
                    value={editData.name}
                    onChangeText={(t) => setEditData({...editData, name: t})}
                    placeholderTextColor="#9ca3af"
                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                  />
                </View>
              </View>

              <View>
                <Text className="text-[13px] font-jakarta font-semibold text-text-primary mb-2 ml-1" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  {t?.surnameLabel || 'Surname'}
                </Text>
                <View className="bg-white rounded-2xl px-5 py-4 shadow-sm shadow-black/5 border border-surface-low/50">
                  <TextInput 
                    className="text-[15px] text-text-primary font-manrope font-semibold p-0"
                    value={editData.surname}
                    onChangeText={(t) => setEditData({...editData, surname: t})}
                    placeholderTextColor="#9ca3af"
                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                  />
                </View>
              </View>

              <View>
                <Text className="text-[13px] font-jakarta font-semibold text-text-primary mb-2 ml-1" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  {t?.phoneLabel || 'Phone Number'}
                </Text>
                <View className="bg-gray-100 rounded-2xl px-5 py-4 border border-surface-low/50">
                  <Text className="text-[15px] text-gray-400 font-manrope font-semibold" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                    {editData.phone || '—'}
                  </Text>
                </View>
              </View>

            </View>
          </ScrollView>

          <View className="p-6 bg-[#f8fafc] pb-8">
             <TouchableOpacity 
                onPress={handleSaveProfile}
                disabled={updating || !isDirty}
                className={`py-4 rounded-full items-center shadow-md ${updating || !isDirty ? 'bg-surface-low shadow-none border border-black/5' : 'bg-brand-primary shadow-brand-primary/20'}`}
              >
                {updating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className={`${updating || !isDirty ? 'text-text-muted' : 'text-white'} font-jakarta font-bold text-lg`}>
                    {t?.saveChanges || 'Save Changes'}
                  </Text>
                )}
              </TouchableOpacity>
          </View>

          {/* Photo Selection Action Sheet (Nested inside Edit Modal for iOS compatibility) */}
          <Modal visible={photoModalVisible} transparent animationType="fade" onRequestClose={() => setPhotoModalVisible(false)}>
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={() => setPhotoModalVisible(false)}
              style={{
                flex: 1,
                backgroundColor: 'rgba(15, 23, 42, 0.55)',
                justifyContent: 'center',
                paddingHorizontal: 20,
              }}
            >
              <TouchableOpacity 
                activeOpacity={1} 
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 28,
                  padding: 24,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: 0.2,
                  shadowRadius: 24,
                  elevation: 12,
                  borderWidth: 1,
                  borderColor: '#f1f5f9',
                }}
              >
                {/* Header with Title and Close X */}
                <View style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '800',
                    color: '#0f172a',
                    textAlign: isRTL ? 'right' : 'left',
                    flex: 1,
                  }}>
                    {t?.updateProfilePhoto || 'Update profile photo'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setPhotoModalVisible(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#f1f5f9',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <Text style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#64748b',
                  marginBottom: 20,
                  textAlign: isRTL ? 'right' : 'left',
                }}>
                  {t?.chooseHowToAddPhoto || "Choose how you'd like to add your photo"}
                </Text>

                {/* Selection Options */}
                <View style={{ gap: 12 }}>
                  <TouchableOpacity 
                    onPress={() => {
                      setPhotoModalVisible(false);
                      if (photoTarget) pickImage(photoTarget.type, photoTarget.id);
                    }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      backgroundColor: '#f8fafc',
                      padding: 14,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                    }}
                  >
                    <View style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      backgroundColor: '#eff6ff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: isRTL ? 0 : 14,
                      marginLeft: isRTL ? 14 : 0,
                    }}>
                      <ImageIcon size={22} color="#0055d4" />
                    </View>
                    <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b' }}>
                        {t?.chooseFromLibrary || 'Choose from library'}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 2 }}>
                        {t?.pickFromGallery || 'Pick from your photo gallery'}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#94a3b8" style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => {
                      setPhotoModalVisible(false);
                      if (photoTarget) takePhoto(photoTarget.type, photoTarget.id);
                    }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      backgroundColor: '#f8fafc',
                      padding: 14,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                    }}
                  >
                    <View style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      backgroundColor: '#f5f3ff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: isRTL ? 0 : 14,
                      marginLeft: isRTL ? 14 : 0,
                    }}>
                      <Camera size={22} color="#7c3aed" />
                    </View>
                    <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b' }}>
                        {t?.takePhoto || 'Take a photo'}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 2 }}>
                        {t?.useCameraNow || 'Use your camera right now'}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#94a3b8" style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
                  </TouchableOpacity>
                </View>

                {/* Cancel Button Inside Box */}
                <TouchableOpacity 
                  onPress={() => setPhotoModalVisible(false)}
                  activeOpacity={0.8}
                  style={{
                    marginTop: 18,
                    paddingVertical: 14,
                    borderRadius: 16,
                    backgroundColor: '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#475569' }}>
                    {t?.cancel || 'Cancel'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        </View>
      </Modal>

      {/* Edit Child Profile Modal */}
      <Modal visible={editChildModalVisible} transparent={false} animationType="slide" onRequestClose={() => !updatingChild && setEditChildModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#f6f8fb' }}>
          <View style={{ flex: 1, paddingTop: Math.max(insets.top, 16) }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 20, height: 62 }}>
              <TouchableOpacity
                onPress={() => setEditChildModalVisible(false)}
                disabled={updatingChild || updating}
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronDown size={22} color="#243247" />
              </TouchableOpacity>
              <View style={{ flex: 1, marginHorizontal: 14, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[{ fontSize: 11, color: '#0b72df', fontWeight: '800' }, arabicText]}>
                  {language === 'ar' ? 'ملف التلميذ' : language === 'fr' ? 'PROFIL DE L’ENFANT' : 'CHILD PROFILE'}
                </Text>
                <Text style={[{ fontSize: 20, color: '#10213a', fontWeight: '900', marginTop: 1 }, arabicText]}>
                  {t?.editChildProfile || 'Edit Child Profile'}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 130 }}>
              <View style={{ backgroundColor: 'white', borderRadius: 26, borderWidth: 1, borderColor: '#e1e8f0', padding: 20, alignItems: 'center', shadowColor: '#183153', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 }}>
                <View style={{ width: 108, height: 108, borderRadius: 32, backgroundColor: '#eaf4ff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                  {editChildData.avatarUrl ? (
                    <Image source={{ uri: editChildData.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                  ) : (
                    <Text style={{ fontSize: 38, color: '#0b72df', fontWeight: '900' }}>{editChildData.name?.charAt(0).toUpperCase() || 'C'}</Text>
                  )}
                  {updating && <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,35,65,0.36)', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="white" /></View>}
                </View>

                <Text style={[{ marginTop: 14, color: '#10213a', fontSize: 19, fontWeight: '900', textAlign: 'center' }, arabicText]} numberOfLines={1}>
                  {`${editChildData.name} ${editChildData.surname}`.trim()}
                </Text>
                <Text style={[{ marginTop: 3, color: '#718096', fontSize: 12, fontWeight: '600', textAlign: 'center' }, arabicText]}>
                  {language === 'ar' ? 'اختر صورة واضحة للتلميذ' : language === 'fr' ? 'Choisissez une photo claire de l’enfant' : 'Choose a clear photo of the child'}
                </Text>

                <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 16 }]}>
                  <TouchableOpacity disabled={updating} onPress={() => pickImage('student', editChildData.id)} style={{ minHeight: 44, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#eaf4ff' }}>
                    <ImageIcon size={17} color="#0b72df" />
                    <Text style={[{ color: '#0b72df', fontSize: 12, fontWeight: '800' }, arabicText]}>{t?.chooseFromLibrary || 'Gallery'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={updating} onPress={() => takePhoto('student', editChildData.id)} style={{ minHeight: 44, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#f4f0ff' }}>
                    <Camera size={17} color="#7454b3" />
                    <Text style={[{ color: '#7454b3', fontSize: 12, fontWeight: '800' }, arabicText]}>{t?.takePhoto || 'Camera'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {(editChildData.className || editChildData.studentNumber) && (
                <View style={{ marginTop: 14, backgroundColor: '#eef5fc', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: '#dce8f5' }}>
                  <Text style={[{ color: '#55708f', fontSize: 11, fontWeight: '700', textAlign: isRTL ? 'right' : 'left', marginBottom: 10 }, arabicText]}>
                    {language === 'ar' ? 'بيانات مدرسية تديرها الإدارة' : language === 'fr' ? 'Informations gérées par l’école' : 'School-managed information'}
                  </Text>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10 }}>
                    {editChildData.className && <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 14, padding: 12 }}><Text style={[{ color: '#8795a8', fontSize: 10, fontWeight: '700', textAlign: isRTL ? 'right' : 'left' }, arabicText]}>{t.classLabel}</Text><Text style={{ color: '#183153', fontSize: 15, fontWeight: '900', marginTop: 3, textAlign: isRTL ? 'right' : 'left' }}>{editChildData.className}</Text></View>}
                    {editChildData.studentNumber && <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 14, padding: 12 }}><Text style={[{ color: '#8795a8', fontSize: 10, fontWeight: '700', textAlign: isRTL ? 'right' : 'left' }, arabicText]}>{t?.studentNumberLabel || 'Student number'}</Text><Text style={{ color: '#183153', fontSize: 14, fontWeight: '900', marginTop: 3, textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>{editChildData.studentNumber}</Text></View>}
                  </View>
                </View>
              )}

              <View style={{ marginTop: 18 }}>
                <Text style={[{ color: '#10213a', fontSize: 17, fontWeight: '900', textAlign: isRTL ? 'right' : 'left', marginBottom: 5 }, arabicText]}>
                  {language === 'ar' ? 'المعلومات الشخصية' : language === 'fr' ? 'Informations personnelles' : 'Personal information'}
                </Text>
                <Text style={[{ color: '#7a8799', fontSize: 12, lineHeight: 18, textAlign: isRTL ? 'right' : 'left', marginBottom: 14 }, arabicText]}>
                  {language === 'ar' ? 'يمكنك تعديل الاسم والصورة لكل تلميذ على حدة.' : language === 'fr' ? 'Modifiez le nom et la photo de chaque enfant séparément.' : 'Edit each child’s name and photo separately.'}
                </Text>

                {[
                  { key: 'name', label: t?.nameLabel || 'First name', value: editChildData.name },
                  { key: 'surname', label: t?.surnameLabel || 'Last name', value: editChildData.surname },
                ].map(field => (
                  <View key={field.key} style={{ marginBottom: 14 }}>
                    <Text style={[{ color: '#526174', fontSize: 12, fontWeight: '700', marginBottom: 7, textAlign: isRTL ? 'right' : 'left' }, arabicText]}>{field.label}</Text>
                    <View style={{ height: 56, backgroundColor: 'white', borderRadius: 17, borderWidth: 1, borderColor: '#dfe6ee', paddingHorizontal: 16, justifyContent: 'center' }}>
                      <TextInput
                        value={field.value}
                        onChangeText={value => setEditChildData(previous => ({ ...previous, [field.key]: value }))}
                        autoCapitalize="words"
                        placeholderTextColor="#9aa6b5"
                        style={[{ padding: 0, color: '#17253a', fontSize: 16, fontWeight: '700', textAlign: isRTL ? 'right' : 'left' }, arabicText]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 18), backgroundColor: 'rgba(246,248,251,0.97)', borderTopWidth: 1, borderTopColor: '#e6ebf1' }}>
              <TouchableOpacity
                onPress={handleSaveChildProfile}
                disabled={updatingChild || updating || !editChildData.name.trim() || !editChildData.surname.trim()}
                style={{ height: 54, borderRadius: 17, backgroundColor: '#0b72df', alignItems: 'center', justifyContent: 'center', opacity: updatingChild || updating || !editChildData.name.trim() || !editChildData.surname.trim() ? 0.48 : 1, shadowColor: '#0b72df', shadowOpacity: 0.2, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
              >
                {updatingChild ? <ActivityIndicator color="white" /> : <Text style={[{ color: 'white', fontSize: 15, fontWeight: '900' }, arabicText]}>{t?.saveChanges || 'Save Changes'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Authenticated parent password change */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !changingPassword && setPasswordModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15,27,61,0.55)', justifyContent: 'center', padding: 22 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 22, borderWidth: 1, borderColor: '#e2e8f0' }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f1b3d' }}>
                  {language === 'ar' ? 'تغيير كلمة المرور' : language === 'en' ? 'Change password' : 'Changer le mot de passe'}
                </Text>
                <Text style={{ marginTop: 4, fontSize: 13, color: '#64748b', textAlign: isRTL ? 'right' : 'left' }}>
                  {language === 'ar' ? 'أدخل كلمة المرور الحالية ثم اختر كلمة جديدة.' : language === 'en' ? 'Enter your current password, then choose a new one.' : 'Saisissez votre mot de passe actuel, puis choisissez-en un nouveau.'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPasswordModalVisible(false)}
                disabled={changingPassword}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {[
              { key: 'current', label: language === 'ar' ? 'كلمة المرور الحالية' : language === 'en' ? 'Current password' : 'Mot de passe actuel' },
              { key: 'next', label: language === 'ar' ? 'كلمة المرور الجديدة' : language === 'en' ? 'New password' : 'Nouveau mot de passe' },
              { key: 'confirm', label: language === 'ar' ? 'تأكيد كلمة المرور' : language === 'en' ? 'Confirm password' : 'Confirmer le mot de passe' },
            ].map((field, index) => (
              <View key={field.key} style={{ marginTop: index === 0 ? 22 : 14 }}>
                <Text style={{ marginBottom: 7, fontSize: 12, fontWeight: '700', color: '#475569', textAlign: isRTL ? 'right' : 'left' }}>{field.label}</Text>
                <TextInput
                  value={passwordForm[field.key as keyof typeof passwordForm]}
                  onChangeText={(value) => setPasswordForm(previous => ({ ...previous, [field.key]: value }))}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: '#dbe3ef', backgroundColor: '#f8fafc', paddingHorizontal: 16, fontSize: 16, color: '#0f1b3d', textAlign: isRTL ? 'right' : 'left' }}
                />
              </View>
            ))}

            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={changingPassword}
              style={{ marginTop: 22, height: 52, borderRadius: 16, backgroundColor: '#0055d4', alignItems: 'center', justifyContent: 'center', opacity: changingPassword ? 0.7 : 1 }}
            >
              {changingPassword ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: 'white', fontSize: 15, fontWeight: '800' }}>
                  {language === 'ar' ? 'حفظ كلمة المرور' : language === 'en' ? 'Save password' : 'Enregistrer le mot de passe'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Global Status Toast */}
      <StatusToast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};
