import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraduationCap, ChevronRight, Globe, Check } from 'lucide-react-native';
import { useLanguage, Language } from '../context/LanguageContext';

interface RoleCardProps {
  title: string;
  description: string;
  image: any;
  isPrimary?: boolean;
  isRTL?: boolean;
  onPress: () => void;
}

const RoleCard = ({
  title,
  description,
  image,
  isPrimary = false,
  isRTL = false,
  onPress,
}: RoleCardProps) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={title}
    accessibilityHint={description}
    activeOpacity={0.88}
    style={{
      backgroundColor: 'rgba(255, 255, 255, 0.88)',
      borderRadius: 24,
      padding: 18,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: isPrimary ? 1.5 : 1,
      borderColor: isPrimary ? '#3B7BEA' : '#E2E8F0',
      shadowColor: isPrimary ? '#3B7BEA' : '#0F1B3D',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isPrimary ? 0.1 : 0.04,
      shadowRadius: isPrimary ? 16 : 12,
      elevation: isPrimary ? 3 : 2,
    }}
  >
    {/* 3D Illustration tile */}
    <View
      style={{
        width: 68,
        height: 68,
        borderRadius: 22,
        backgroundColor: isPrimary ? '#EFF6FF' : '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: isRTL ? 0 : 16,
        marginLeft: isRTL ? 16 : 0,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: isPrimary ? 'rgba(59, 123, 234, 0.2)' : 'rgba(226, 232, 240, 0.8)',
      }}
    >
      <Image
        source={image}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />
    </View>

    {/* Text info */}
    <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: '#0F1B3D',
            marginBottom: 3,
            letterSpacing: -0.3,
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {title}
        </Text>
        {isPrimary && (
          <View
            style={{
              backgroundColor: 'rgba(59, 123, 234, 0.12)',
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 6,
              marginBottom: 3,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '600', color: '#3B7BEA' }}>★</Text>
          </View>
        )}
      </View>
      <Text
        numberOfLines={3}
        style={{
          fontSize: 13,
          color: '#5B6B8C',
          lineHeight: 19,
          fontWeight: '500',
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        {description}
      </Text>
    </View>

    {/* Circular chevron */}
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isPrimary ? 'rgba(59, 123, 234, 0.12)' : 'rgba(241, 245, 249, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: isRTL ? 4 : 0,
        marginLeft: isRTL ? 0 : 4,
      }}
    >
      <ChevronRight
        size={18}
        color={isPrimary ? '#3B7BEA' : '#5B6B8C'}
        strokeWidth={2.8}
        style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }}
      />
    </View>
  </TouchableOpacity>
);

export const LandingScreen = ({
  onSelectRole,
  onViewOnboarding,
}: {
  onSelectRole: (role: 'parent' | 'teacher' | 'admin') => void;
  onViewOnboarding?: () => void;
}) => {
  const { language, setLanguage, t, isRTL } = useLanguage();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const getLangBadge = () => {
    if (language === 'ar') return 'العربية 🇹🇳';
    if (language === 'fr') return 'Français 🇫🇷';
    return 'English 🇬🇧';
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#EAF1FD', overflow: 'hidden' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#8FB4F0" />

      {/* Atmospheric sky background with blurred cloud blobs */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 340,
          backgroundColor: '#8FB4F0',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: -60,
          right: -50,
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: 'rgba(255, 255, 255, 0.35)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 140,
          left: -80,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: 'rgba(255, 255, 255, 0.28)',
        }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 22,
            width: '100%',
            maxWidth: 480,
            alignSelf: 'center',
            paddingTop: 8,
            paddingBottom: 36,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Glass Pill Language Switcher (aligned to trailing edge) */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: isRTL ? 'flex-start' : 'flex-end',
              marginBottom: 12,
            }}
          >
            <TouchableOpacity
              onPress={() => setLangModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={language === 'ar' ? 'تغيير اللغة' : language === 'en' ? 'Change language' : 'Changer de langue'}
              activeOpacity={0.8}
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                paddingHorizontal: 14,
                paddingVertical: 7,
                minHeight: 44,
                borderRadius: 999,
                gap: 7,
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.95)',
                shadowColor: '#3B7BEA',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <Globe size={16} color="#3B7BEA" />
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#0F1B3D' }}>
                {getLangBadge()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Center: App Logo in a rounded glass square with soft glow */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View
              style={{
                width: 74,
                height: 74,
                borderRadius: 24,
                backgroundColor: '#3B7BEA',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
                shadowColor: '#3B7BEA',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.22,
                shadowRadius: 18,
                elevation: 5,
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.4)',
              }}
            >
              <GraduationCap color="#ffffff" size={38} strokeWidth={2.3} />
            </View>

            <Text
              style={{
                fontSize: 32,
                fontWeight: '700',
                color: '#0F1B3D',
                letterSpacing: -0.8,
              }}
            >
              Snap<Text style={{ color: '#3B7BEA' }}>School</Text>
            </Text>

            <View style={{ marginTop: 10, alignItems: 'center', paddingHorizontal: 16 }}>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '700',
                  color: '#0F1B3D',
                  letterSpacing: -0.4,
                  textAlign: 'center',
                }}
              >
                {t?.welcome || (language === 'ar' ? 'مرحباً بكم' : 'Bienvenue')}
              </Text>
              <Text
                style={{
                  fontSize: 13.5,
                  color: '#5B6B8C',
                  marginTop: 4,
                  textAlign: 'center',
                  fontWeight: '600',
                  lineHeight: 18,
                }}
              >
                {t?.pleaseSelectYourProfileTo ||
                  (language === 'ar'
                    ? 'اختر حسابك للمتابعة والدخول للتطبيق'
                    : 'Choisissez votre profil pour continuer')}
              </Text>
            </View>
          </View>

          {/* Role Cards: EXACTLY 3 ROLES (Student removed completely) */}
          <View>
            {/* 1. PARENT (Primary Highlighted) */}
            <RoleCard
              title={t?.parent || (language === 'ar' ? 'ولي الأمر' : 'Parent')}
              description={
                language === 'ar'
                  ? 'متابعة أعداد ومواظبة وجدول الأبناء'
                  : language === 'en' ? 'Follow your children’s grades, attendance and school life.' : 'Suivez les notes, absences et la vie scolaire de vos enfants.'
              }
              image={require('../../assets/3d/parent.jpg')}
              isPrimary={true}
              isRTL={isRTL}
              onPress={() => onSelectRole('parent')}
            />

            {/* 2. TEACHER */}
            <RoleCard
              title={t?.teacher || (language === 'ar' ? 'المدرس' : 'Enseignant')}
              description={
                language === 'ar'
                  ? 'إدارة الدروس والواجبات والغيابات'
                  : language === 'en' ? 'Manage grades, attendance and your class journal.' : 'Saisie des notes, appel et cahier de texte en direct.'
              }
              image={require('../../assets/3d/teacher.jpg')}
              isPrimary={false}
              isRTL={isRTL}
              onPress={() => onSelectRole('teacher')}
            />

            {/* 3. ADMINISTRATION (3D School Building Image) */}
            <RoleCard
              title={language === 'ar' ? 'الإدارة' : language === 'fr' ? 'Direction' : 'Admin'}
              description={
                language === 'ar'
                  ? 'أدِر مدرستك مع هنيّة الذكية'
                  : language === 'en' ? 'Manage your school, finances and school life with Hnia.' : 'Pilotez l’école, les finances et la vie scolaire avec Hnia.'
              }
              image={require('../../assets/3d/admin.jpg')}
              isPrimary={false}
              isRTL={isRTL}
              onPress={() => onSelectRole('admin')}
            />
          </View>

          {/* Footer note */}
          <View style={{ alignItems: 'center', marginTop: 14 }}>
            <Text
              style={{
                fontSize: 11,
                color: '#8FA3C7',
                fontWeight: '700',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}
            >
              Powered by SnapSchool
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Language Selection Modal (Frosted Glass) */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setLangModalVisible(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 27, 61, 0.45)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 340,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 28,
              padding: 24,
              borderWidth: 1.5,
              borderColor: 'rgba(255, 255, 255, 0.9)',
              shadowColor: '#3B7BEA',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 20,
              elevation: 5,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#0F1B3D',
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              {t.selectLanguageTitle || 'Choisir la langue'}
            </Text>

            {[
              { id: 'ar', name: 'العربية', flag: '🇹🇳' },
              { id: 'fr', name: 'Français', flag: '🇫🇷' },
              { id: 'en', name: 'English', flag: '🇬🇧' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={async () => {
                  await setLanguage(item.id as Language);
                  setLangModalVisible(false);
                }}
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  backgroundColor: language === item.id ? 'rgba(59, 123, 234, 0.1)' : 'transparent',
                  marginBottom: 6,
                }}
              >
                <View
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{item.flag}</Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: language === item.id ? '800' : '600',
                      color: language === item.id ? '#3B7BEA' : '#0F1B3D',
                    }}
                  >
                    {item.name}
                  </Text>
                </View>
                {language === item.id && <Check size={18} color="#3B7BEA" strokeWidth={3} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
