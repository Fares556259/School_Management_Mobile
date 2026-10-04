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
  image: import('react-native').ImageSourcePropType;
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
      backgroundColor: '#FFFFFF',
      borderRadius: 30,
      padding: 20,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#E6F0F8',
      shadowColor: isPrimary ? '#0055D4' : '#263238',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.07,
      shadowRadius: isPrimary ? 16 : 12,
      elevation: 3,
    }}
  >
    {/* 3D Illustration tile */}
    <View
      style={{
        width: 74,
        height: 74,
        borderRadius: 22,
        backgroundColor: '#F8FBFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: isRTL ? 0 : 16,
        marginLeft: isRTL ? 16 : 0,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
      }}
    >
      <Image source={image} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
    </View>

    {/* Text info */}
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#263238',
          marginBottom: 3,
          letterSpacing: isRTL ? 0 : -0.3,
          alignSelf: 'stretch',
          writingDirection: isRTL ? 'rtl' : 'ltr',
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        {title}
      </Text>

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
        borderRadius: 14,
        backgroundColor: isPrimary ? 'rgba(59, 123, 234, 0.12)' : 'rgba(241, 245, 249, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: isRTL ? 4 : 0,
        marginLeft: isRTL ? 0 : 4,
      }}
    >
      <ChevronRight
        size={18}
        color={isPrimary ? '#0055D4' : '#5B6B8C'}
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
    <View style={{ flex: 1, backgroundColor: '#F8FBFF', overflow: 'hidden' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FBFF" />

      <View pointerEvents="none" style={{ position: 'absolute', top: -150, right: -110, width: 400, height: 400, borderRadius: 200, backgroundColor: '#EFF7FB' }} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 22,
            width: '100%',
            maxWidth: 480,
            alignSelf: 'center',
            paddingTop: 16,
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
                shadowColor: '#0055D4',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <Globe size={16} color="#0055D4" />
              <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#263238' }}>
                {getLangBadge()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Center: App Logo in a rounded glass square with soft glow */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                backgroundColor: '#0055D4',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
                shadowColor: '#0055D4',
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
                fontSize: 34,
                fontWeight: '700',
                color: '#263238',
                letterSpacing: -0.8,
              }}
            >
              Snap<Text style={{ color: '#0055D4' }}>School</Text>
            </Text>

            <View style={{ marginTop: 10, width: '100%', alignItems: 'center', paddingHorizontal: 16 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}
                style={{
                  width: '100%',
                  fontSize: 22,
                  fontWeight: '700',
                  color: '#263238',
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

          {/* School spaces */}
          <View>
            {/* Parent */}
            <RoleCard
              title={language === 'ar' ? 'ولي الأمر' : t?.parent || 'Parent'}
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

            {/* Teacher */}
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

            {/* Administration */}
            <RoleCard
              title={language === 'ar' ? 'الإدارة' : language === 'fr' ? 'Direction' : 'Admin'}
              description={
                language === 'ar'
                  ? 'أدِر مدرستك مع هنيّة الذكية'
                  : language === 'en' ? 'Manage your school, finances and school life with Hnia.' : 'Pilotez l’école, les finances et la vie scolaire avec Hnia.'
              }

              isPrimary={false}
              isRTL={isRTL}
              image={require('../../assets/3d/administrator.png')}
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
              shadowColor: '#0055D4',
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
                color: '#263238',
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
                      color: language === item.id ? '#0055D4' : '#263238',
                    }}
                  >
                    {item.name}
                  </Text>
                </View>
                {language === item.id && <Check size={18} color="#0055D4" strokeWidth={3} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
