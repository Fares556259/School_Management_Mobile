import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, Alert, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraduationCap, ArrowRight, ChevronRight, Globe, Check } from 'lucide-react-native';
import { useLanguage, Language } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

const RoleCard = ({ title, description, image, onPress }: any) => (
  <TouchableOpacity 
    onPress={onPress}
    activeOpacity={0.9}
    style={{
      backgroundColor: 'white',
      borderRadius: 32,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      shadowColor: '#0055d4',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.05,
      shadowRadius: 20,
      elevation: 5,
      borderWidth: 1,
      borderColor: '#f1f4f6',
    }}
  >
    <View style={{
      width: 80,
      height: 80,
      borderRadius: 24,
      backgroundColor: '#f8fbff',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 20,
      overflow: 'hidden'
    }}>
      <Image source={image} style={{ width: '120%', height: '120%' }} resizeMode="contain" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '900', color: '#2b3437', marginBottom: 4, fontFamily: 'Jakarta-Bold' }}>{title}</Text>
      <Text style={{ fontSize: 13, color: '#737c7f', lineHeight: 18, fontWeight: '500' }}>{description}</Text>
    </View>
    <View style={{ width: 36, height: 36, borderRadius: 14, backgroundColor: '#f1f4f6', alignItems: 'center', justifyContent: 'center' }}>
      <ChevronRight size={18} color="#0055d4" strokeWidth={3} />
    </View>
  </TouchableOpacity>
);

export const LandingScreen = ({ onSelectRole }: { onSelectRole: (role: 'parent' | 'teacher') => void }) => {
  const { language, setLanguage, t } = useLanguage();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const handleFutureRole = (role: string) => {
    Alert.alert(
      "Feature Coming Soon", 
      `We are currently working on the ${role} portal! This feature will be added in a future update. Please use the Parent or Teacher profile for now.`,
      [{ text: "OK", style: "default" }]
    );
  };

  const getLangBadge = () => {
    if (language === 'ar') return 'العربية 🇹🇳';
    if (language === 'fr') return 'Français 🇫🇷';
    return 'English 🇬🇧';
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fbff' }}>
      <StatusBar barStyle="dark-content" />
      
      {/* Decorative Background Blob */}
      <View style={{ 
        position: 'absolute', 
        top: -150, 
        right: -100, 
        width: 400, 
        height: 400, 
        borderRadius: 200, 
        backgroundColor: '#0055d408' 
      }} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Language Button */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => setLangModalVisible(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'white',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                gap: 8,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Globe size={18} color="#0055d4" />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b' }}>{getLangBadge()}</Text>
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 36 }}>
            <View style={{ 
              width: 80, 
              height: 80, 
              borderRadius: 24, 
              backgroundColor: '#0055d4', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: 20,
              shadowColor: '#0055d4',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 15,
              elevation: 8
            }}>
              <GraduationCap color="white" size={40} />
            </View>
            
            <Text style={{ fontSize: 36, fontWeight: '900', color: '#2b3437', letterSpacing: -1 }}>
              Snap<Text style={{ color: '#0055d4' }}>School</Text>
            </Text>
            
            <View style={{ marginTop: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#2b3437' }}>
                {language === 'ar' ? 'مرحباً بكم' : language === 'fr' ? 'Bienvenue' : 'Welcome'}
              </Text>
              <Text style={{ fontSize: 14, color: '#737c7f', marginTop: 6, textAlign: 'center', fontWeight: '600' }}>
                {language === 'ar' ? 'اختر حسابك للمتابعة والدخول للتطبيق' : language === 'fr' ? 'Sélectionnez votre profil pour continuer' : 'Please select your profile to continue to your account'}
              </Text>
            </View>
          </View>

          {/* Role Cards */}
          <View>
            <RoleCard 
              title={language === 'ar' ? 'ولي الأمر' : language === 'fr' ? 'Parent' : 'Parent'}
              description={language === 'ar' ? 'متابعة أعداد ومواظبة وجدول الأبناء' : language === 'fr' ? 'Suivi des notes, absences et emplois du temps' : 'Monitor progress, grades, and school schedule.'}
              image={require('../../assets/3d/parent.jpg')}
              onPress={() => onSelectRole('parent')}
            />
            
            <RoleCard 
              title={language === 'ar' ? 'المدرس' : language === 'fr' ? 'Enseignant' : 'Teacher'}
              description={language === 'ar' ? 'إدارة الدروس والواجبات والغيابات' : language === 'fr' ? 'Gestion des cours, absences et devoirs' : 'Manage lessons, attendance, and student performance.'}
              image={require('../../assets/3d/teacher.jpg')}
              onPress={() => onSelectRole('teacher')}
            />
            
            <RoleCard 
              title={language === 'ar' ? 'التلميذ' : language === 'fr' ? 'Élève' : 'Student'}
              description={language === 'ar' ? 'متابعة الدروس والروض والإعلانات' : language === 'fr' ? 'Accès aux devoirs et annonces de l\'école' : 'Access homework, attendance, and official announcements.'}
              image={require('../../assets/3d/student.jpg')}
              onPress={() => handleFutureRole('Student')}
            />
          </View>

          {/* Language Selection Modal */}
          <Modal visible={langModalVisible} transparent animationType="fade" onRequestClose={() => setLangModalVisible(false)}>
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={() => setLangModalVisible(false)} 
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
            >
              <View style={{ width: '100%', backgroundColor: 'white', borderRadius: 28, padding: 24, elevation: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 16, textAlign: 'center' }}>
                  {t.selectLanguageTitle || 'Select App Language'}
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
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      borderRadius: 18,
                      backgroundColor: language === item.id ? '#eff6ff' : '#f8fafc',
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: language === item.id ? '#0055d4' : '#e2e8f0',
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>
                      {item.flag}  {item.name}
                    </Text>
                    {language === item.id && <Check size={20} color="#0055d4" strokeWidth={3} />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Footer Info */}
          <View style={{ marginTop: 24, alignItems: 'center' }}>
             <Text style={{ fontSize: 12, color: '#bdc3c7', fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>
               Powered by SnapSchool Admin
             </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};
