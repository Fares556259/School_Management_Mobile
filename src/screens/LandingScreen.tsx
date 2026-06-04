import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraduationCap, ArrowRight, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const RoleCard = ({ title, description, image, onPress, accentColor = '#0072e6', accentBg = '#eff6ff', accentBorder = '#bfdbfe' }: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.88}
    style={{
      backgroundColor: 'white',
      borderRadius: 24,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
      borderWidth: 2,
      borderColor: accentBorder,
      shadowColor: accentColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 0,
      elevation: 3,
      minHeight: 88,
    }}
  >
    <View style={{
      width: 72, height: 72,
      borderRadius: 18,
      backgroundColor: accentBg,
      borderWidth: 2, borderColor: accentBorder,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 18, overflow: 'hidden',
    }}>
      <Image source={image} style={{ width: '120%', height: '120%' }} resizeMode="contain" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 4, letterSpacing: -0.2 }}>{title}</Text>
      <Text style={{ fontSize: 13, color: '#64748b', lineHeight: 20, fontWeight: '700' }}>{description}</Text>
    </View>
    <View style={{
      width: 38, height: 38, borderRadius: 12,
      backgroundColor: accentBg, borderWidth: 2, borderColor: accentBorder,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <ChevronRight size={18} color={accentColor} strokeWidth={3} />
    </View>
  </TouchableOpacity>
);

export const LandingScreen = ({ onSelectRole }: { onSelectRole: (role: 'parent' | 'teacher') => void }) => {
  const handleFutureRole = (role: string) => {
    Alert.alert(
      "Feature Coming Soon", 
      `We are currently working on the ${role} portal! This feature will be added in a future update. Please use the Parent or Teacher profile for now.`,
      [{ text: "OK", style: "default" }]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View style={{
              width: 84, height: 84, borderRadius: 24,
              backgroundColor: '#0072e6',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
              shadowColor: '#0055b3',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 0,
              elevation: 8,
            }}>
              <GraduationCap color="white" size={42} strokeWidth={2} />
            </View>

            <Text style={{ fontSize: 36, fontWeight: '900', color: '#1e293b', letterSpacing: -1 }}>
              Snap<Text style={{ color: '#0072e6' }}>School</Text>
            </Text>

            <View style={{ marginTop: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b', letterSpacing: -0.3 }}>Who are you?</Text>
              <Text style={{ fontSize: 14, color: '#64748b', marginTop: 8, textAlign: 'center', fontWeight: '700', lineHeight: 22 }}>
                Select your profile to continue to your account
              </Text>
            </View>
          </View>

          {/* Role Cards */}
          <View>
            <RoleCard
              title="Parent"
              description="Monitor progress, grades, and school schedule."
              image={require('../../assets/3d/parent.jpg')}
              onPress={() => onSelectRole('parent')}
              accentColor="#0072e6"
              accentBg="#eff6ff"
              accentBorder="#bfdbfe"
            />

            <RoleCard
              title="Teacher"
              description="Manage lessons, attendance, and student performance."
              image={require('../../assets/3d/teacher.jpg')}
              onPress={() => onSelectRole('teacher')}
              accentColor="#16a34a"
              accentBg="#dcfce7"
              accentBorder="#86efac"
            />

            <RoleCard
              title="Student"
              description="Access homework, attendance, and official announcements."
              image={require('../../assets/3d/student.jpg')}
              onPress={() => handleFutureRole('Student')}
              accentColor="#94a3b8"
              accentBg="#f1f5f9"
              accentBorder="#e2e8f0"
            />
          </View>

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
