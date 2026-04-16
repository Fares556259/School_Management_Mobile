import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraduationCap, ArrowRight, ChevronRight } from 'lucide-react-native';

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

export const LandingScreen = ({ onSelectParent }: { onSelectParent: () => void }) => {
  const handleFutureRole = (role: string) => {
    Alert.alert(
      "Feature Coming Soon", 
      `We are currently working on the ${role} portal! This feature will be added in a future update. Please use the Parent profile for now.`,
      [{ text: "OK", style: "default" }]
    );
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
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 48 }}>
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
            
            <View style={{ marginTop: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#2b3437' }}>Welcome</Text>
              <Text style={{ fontSize: 15, color: '#737c7f', marginTop: 8, textAlign: 'center', fontWeight: '500' }}>
                Please select your profile to continue to your account
              </Text>
            </View>
          </View>

          {/* Role Cards */}
          <View>
            <RoleCard 
              title="Parent"
              description="Monitor progress, grades, and school schedule."
              image={require('../../assets/3d/parent.png')}
              onPress={onSelectParent}
            />
            
            <RoleCard 
              title="Teacher"
              description="Manage lessons, attendance, and student performance."
              image={require('../../assets/3d/teacher.png')}
              onPress={() => handleFutureRole('Teacher')}
            />
            
            <RoleCard 
              title="Student"
              description="Access homework, schedule, and exam results."
              image={require('../../assets/3d/student.png')}
              onPress={() => handleFutureRole('Student')}
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
