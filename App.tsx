import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from './src/screens/HomeScreen';
import { AnnouncementsScreen } from './src/screens/AnnouncementsScreen';
import { PaymentsScreen } from './src/screens/PaymentsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { AttendanceScreen } from './src/screens/AttendanceScreen';
import { HomeworkDetailScreen } from './src/screens/HomeworkDetailScreen';
import { ExamDetailScreen } from './src/screens/ExamDetailScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { LinkChildScreen } from './src/screens/LinkChildScreen';
import { AnnouncementDetailScreen } from './src/screens/AnnouncementDetailScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { LandingScreen } from './src/screens/LandingScreen';
import { Home as HomeIcon, FileText, CreditCard, User, Megaphone, Calendar, BarChart3 } from 'lucide-react-native';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from './src/store/useAppStore';
import { parentService, authService, studentService } from './src/services/api';
import * as Haptics from 'expo-haptics';
import "./src/styles/global.css";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabs({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Tab.Navigator
      screenListeners={{
        tabPress: () => {
          Haptics.selectionAsync();
        },
      }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          height: 85,
          paddingBottom: 20,
          paddingTop: 10,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.04,
          shadowRadius: 20,
          elevation: 10,
        },
        tabBarActiveTintColor: '#0055d4',
        tabBarInactiveTintColor: '#737c7f',
        tabBarLabelStyle: { fontWeight: '900', fontSize: 9, marginTop: 2 },
        tabBarIcon: ({ color, focused }) => {
          let Icon: any;
          if (route.name === 'Home') Icon = HomeIcon;
          else if (route.name === 'Announcements') Icon = Megaphone;
          else if (route.name === 'Results') Icon = BarChart3;
          else if (route.name === 'Payments') Icon = CreditCard;
          else if (route.name === 'Profile') Icon = User;
          return (
            <View className={focused ? "bg-brand-primary/10 px-4 py-2 rounded-2xl transform scale-110" : ""}>
              <Icon color={color} size={focused ? 24 : 20} strokeWidth={focused ? 3 : 2} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Announcements" component={AnnouncementsScreen} />
      <Tab.Screen name="Results" component={ResultsScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen
        name="Profile"
        children={(props: any) => <ProfileScreen {...props} onSignOut={onSignOut} />}
      />
    </Tab.Navigator>
  );
}

  export default function App() {
    const { setChildren, setSelectedChildId, setError, setParentName, setParentAvatarUrl } = useAppStore();
    const [authState, setAuthState] = useState<'loading' | 'landing' | 'signedIn' | 'signedOut'>('loading');
  
    // Check stored auth on launch
    useEffect(() => {
      const bootstrap = async () => {
        try {
          const loggedIn = await authService.isLoggedIn();
          if (loggedIn) {
            // Speed Boost: Parallel fetch of essential data
            const [profile, childrenData] = await Promise.all([
              parentService.fetchParentProfile(),
              parentService.fetchChildren()
            ]);

            if (profile) {
              setParentName(`${profile.name} ${profile.surname}`);
              setParentAvatarUrl(profile.img || null);
            }

            if (childrenData && childrenData.length > 0) {
              setChildren(childrenData);
              setSelectedChildId(childrenData[0].id);
              setAuthState('signedIn');
            } else {
              // Stale session or server unreachable — require login
              await authService.logout();
              setAuthState('landing');
            }
          } else {
            setAuthState('landing');
          }
        } catch (error) {
          console.error("[BOOTSTRAP-ERROR]", error);
          setAuthState('landing');
        }
      };
      bootstrap();
    }, []);
  
    const handleSignIn = async () => {
      const parentProfile = await parentService.fetchParentProfile();
      if (parentProfile?.name) setParentName(parentProfile.name);
      
      const data = await parentService.fetchChildren();
      setChildren(data);
      if (data.length > 0) setSelectedChildId(data[0].id);
      setAuthState('signedIn');
    };
  
    const handleSignOut = async () => {
      await authService.logout();
      setChildren([]);
      setParentName("Parent");
      setAuthState('landing');
    };

  if (authState === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a1628' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          {authState === 'landing' ? (
            <LandingScreen onSelectParent={() => setAuthState('signedOut')} />
          ) : authState === 'signedOut' ? (
            <SignInScreen onSignIn={handleSignIn} />
          ) : (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen
                name="MainTabs"
                children={() => <BottomTabs onSignOut={handleSignOut} />}
              />
              <Stack.Screen name="Attendance" component={AttendanceScreen} />
              <Stack.Screen name="Results" component={ResultsScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="HomeworkDetail" component={HomeworkDetailScreen} />
              <Stack.Screen name="ExamDetail" component={ExamDetailScreen} />
              <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} />
              <Stack.Screen name="LinkChild" component={LinkChildScreen} />
            </Stack.Navigator>
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
