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
import { Home as HomeIcon, FileText, CreditCard, User, Megaphone, Calendar } from 'lucide-react-native';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from './src/store/useAppStore';
import { parentService, authService } from './src/services/api';
import "./src/styles/global.css";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabs({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Tab.Navigator
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
          else if (route.name === 'Payments') Icon = CreditCard;
          else if (route.name === 'Profile') Icon = User;
          return (
            <View style={focused ? { backgroundColor: '#0055d410', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 } : {}}>
              <Icon color={color} size={focused ? 24 : 20} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Announcements" component={AnnouncementsScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen
        name="Profile"
        children={(props: any) => <ProfileScreen {...props} onSignOut={onSignOut} />}
      />
    </Tab.Navigator>
  );
}

  export default function App() {
    const { setChildren, setSelectedChildId, setError, setParentName } = useAppStore();
    const [authState, setAuthState] = useState<'loading' | 'signedIn' | 'signedOut'>('loading');
  
    // Check stored auth on launch
    useEffect(() => {
      const bootstrap = async () => {
        const loggedIn = await authService.isLoggedIn();
        if (loggedIn) {
          // Try to load children; if network is down, fall back to login
          const parentProfile = await parentService.fetchParentProfile();
          if (parentProfile?.name) setParentName(parentProfile.name);
          
          const data = await parentService.fetchChildren();
          if (data.length > 0) {
            setChildren(data);
            setSelectedChildId(data[0].id);
            setAuthState('signedIn');
          } else {
            // Stale session or server unreachable — require login
            await authService.logout();
            setAuthState('signedOut');
          }
        } else {
          setAuthState('signedOut');
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
      setAuthState('signedOut');
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
          {authState === 'signedOut' ? (
            <SignInScreen onSignIn={handleSignIn} />
          ) : (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen
                name="MainTabs"
                children={() => <BottomTabs onSignOut={handleSignOut} />}
              />
              <Stack.Screen name="Attendance" component={AttendanceScreen} />
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
