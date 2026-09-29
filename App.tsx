import React, { useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from './src/screens/HomeScreen';
import { AnnouncementsScreen } from './src/screens/AnnouncementsScreen';
import { PaymentsScreen } from './src/screens/PaymentsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { NotificationDetailScreen } from './src/screens/NotificationDetailScreen';
import { AttendanceScreen } from './src/screens/AttendanceScreen';
import { HomeworkDetailScreen } from './src/screens/HomeworkDetailScreen';
import { ExamDetailScreen } from './src/screens/ExamDetailScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { LinkChildScreen } from './src/screens/LinkChildScreen';
import { AnnouncementDetailScreen } from './src/screens/AnnouncementDetailScreen';
import { LandingScreen } from './src/screens/LandingScreen';
import { AppLaunchScreen } from './src/screens/AppLaunchScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ExamsScreen } from './src/screens/ExamsScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { TeacherClassesScreen } from './src/screens/teacher/TeacherClassesScreen';
import { TeacherHomeScreen } from './src/screens/teacher/TeacherHomeScreen';
import { TeacherAttendanceScreen } from './src/screens/teacher/TeacherAttendanceScreen';
import { TeacherLessonsScreen } from './src/screens/teacher/TeacherLessonsScreen';
import { TeacherTasksScreen } from './src/screens/teacher/TeacherTasksScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TeacherTaskDetailScreen } from './src/screens/teacher/TeacherTaskDetailScreen';
import { StudentSubmissionScreen } from './src/screens/teacher/StudentSubmissionScreen';
import { TeacherClassRosterScreen } from './src/screens/teacher/TeacherClassRosterScreen';
import { TeacherGradeEntryScreen } from './src/screens/teacher/TeacherGradeEntryScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import HniaChatScreen from './src/screens/admin/HniaChatScreen';
import AdminCaisseScreen from './src/screens/admin/AdminCaisseScreen';
import AdminMoreScreen from './src/screens/admin/AdminMoreScreen';

import { CoursesScreen } from './src/screens/CoursesScreen';
import { Home as HomeIcon, FileText, CreditCard, User, Megaphone, Calendar, BarChart3, ClipboardList, BookOpen, Users, ClipboardCheck, GraduationCap, LayoutDashboard, Bot, Wallet, MoreHorizontal } from 'lucide-react-native';
import { View, ActivityIndicator, Alert, StyleSheet, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from './src/store/useAppStore';
import { parentService, authService, authStorage, studentService, API_BASE_URL, teacherService, adminService } from './src/services/api';
import { notificationService } from './src/services/notificationService';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import "./src/styles/global.css";

import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

import { PostHogProvider } from 'posthog-react-native';
import { posthog, identifyUser, resetUser, trackScreen } from './src/services/posthog';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours in garbage collection
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

function BottomTabsContent({ onSignOut }: { onSignOut: () => void }) {
  const insets = useSafeAreaInsets();
  const { userRole } = useAppStore();
  const { t, isRTL } = useLanguage();
  const isTeacher = userRole === 'teacher';

  const profileTab = (
    <Tab.Screen
      key="Profile"
      name="Profile"
      options={{ tabBarLabel: t.tabProfile }}
      children={React.useCallback((props: any) => <ProfileScreen {...props} onSignOut={onSignOut} />, [onSignOut])}
    />
  );

  const parentTabs = isRTL ? [
    profileTab,
    <Tab.Screen key="Payments" name="Payments" component={PaymentsScreen} options={{ tabBarLabel: t.tabPayments }} />,
    <Tab.Screen key="Announcements" name="Announcements" component={AnnouncementsScreen} options={{ tabBarLabel: t.tabAnnouncements }} />,
    <Tab.Screen key="Courses" name="Courses" component={CoursesScreen} options={{ tabBarLabel: t.tabCourses }} />,
    <Tab.Screen key="Home" name="Home" component={HomeScreen} options={{ tabBarLabel: t.tabHome }} />,
  ] : [
    <Tab.Screen key="Home" name="Home" component={HomeScreen} options={{ tabBarLabel: t.tabHome }} />,
    <Tab.Screen key="Courses" name="Courses" component={CoursesScreen} options={{ tabBarLabel: t.tabCourses }} />,
    <Tab.Screen key="Announcements" name="Announcements" component={AnnouncementsScreen} options={{ tabBarLabel: t.tabAnnouncements }} />,
    <Tab.Screen key="Payments" name="Payments" component={PaymentsScreen} options={{ tabBarLabel: t.tabPayments }} />,
    profileTab,
  ];

      if (userRole === 'admin') {
      return (
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarHideOnKeyboard: false,
            tabBarStyle: {
              backgroundColor: '#ffffff',
              borderTopWidth: 1,
              borderTopColor: '#e2e8f0',
              height: 60 + insets.bottom,
              paddingBottom: 10 + insets.bottom,
              paddingTop: 8,
              elevation: 0,
              shadowOpacity: 0
            },
            tabBarActiveTintColor: '#0072e6',
            tabBarInactiveTintColor: '#94a3b8',
            tabBarLabelStyle: {
              fontWeight: '800',
              fontSize: 10,
              marginTop: 2,
              fontFamily: 'PlusJakartaSans-ExtraBold',
              letterSpacing: 0.2
            }
          }}
        >
          <Tab.Screen name="Dashboard" component={AdminDashboardScreen} options={{ tabBarLabel: (t as any).adminDashboard || 'Dashboard', tabBarIcon: ({ color, focused }) => <LayoutDashboard size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} /> }} />
          <Tab.Screen name="Hnia" component={HniaChatScreen} options={{ tabBarHideOnKeyboard: false, tabBarLabel: 'Hnia', tabBarIcon: ({ color, focused }) => <Bot size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} /> }} />
          <Tab.Screen name="Caisse" component={AdminCaisseScreen} options={{ tabBarLabel: (t as any).adminCaisse || 'Caisse', tabBarIcon: ({ color, focused }) => <Wallet size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} /> }} />
          <Tab.Screen name="More" options={{ tabBarLabel: (t as any).more || 'Plus', tabBarIcon: ({ color, focused }) => <MoreHorizontal size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} /> }}>
            {props => <AdminMoreScreen {...props} onSignOut={onSignOut} />}
          </Tab.Screen>
        </Tab.Navigator>
      );
    }
return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          height: 60 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: '#0072e6',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: {
          fontWeight: '800',
          fontSize: 10,
          marginTop: 2,
          fontFamily: 'PlusJakartaSans-ExtraBold',
          letterSpacing: 0.2,
        },
        tabBarIcon: ({ color, focused }) => {
          let Icon: any;
          if (route.name === 'Home') Icon = HomeIcon;
          else if (route.name === 'Announcements') Icon = Megaphone;
          else if (route.name === 'Payments') Icon = CreditCard;
          else if (route.name === 'Profile') Icon = User;
          else if (route.name === 'Attendance') Icon = ClipboardList;
          else if (route.name === 'Lessons') Icon = BookOpen;
          else if (route.name === 'Tasks') Icon = ClipboardCheck;
          else if (route.name === 'Grades') Icon = FileText;
          else if (route.name === 'Classes') Icon = Users;
          else if (route.name === 'Courses') Icon = GraduationCap;

          return (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <View style={{
                  position: 'absolute',
                  top: -12,
                  width: 32,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: '#0072e6',
                }} />
              )}
              <Icon
                color={color}
                size={22}
                strokeWidth={focused ? 2.5 : 1.8}
              />
            </View>
          );
        },
      })}
    >
      {isTeacher ? (
        <>
          <Tab.Screen name="Home" component={TeacherHomeScreen} options={{ tabBarLabel: t.tabHome }} />
          <Tab.Screen name="Classes" component={TeacherClassesScreen} options={{ tabBarLabel: (t as any).teacherClasses || 'Classes' }} />
          {profileTab}
        </>
      ) : (
        parentTabs
      )}
    </Tab.Navigator>
  );
}


export default function App() {
  const pendingNotificationRef = React.useRef<any>(null);
  const { 
    setChildren, 
    setSelectedChildId, 
    setError, 
    setUserName, 
    setUserAvatarUrl,
    setUserRole,
    setUserId,
    userRole,
    userId
  } = useAppStore();
  const [authState, setAuthState] = useState<'loading' | 'onboarding' | 'landing' | 'signedIn' | 'signedOut'>('onboarding');
  const [isLaunchScreenVisible, setIsLaunchScreenVisible] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'parent' | 'teacher' | 'admin'>('parent');
  const [isBootstrapDone, setIsBootstrapDone] = useState(false);
  const [isLaunchMinTimeDone, setIsLaunchMinTimeDone] = useState(false);
  const targetAuthStateRef = React.useRef<'onboarding' | 'landing' | 'signedIn'>('onboarding');
  const postOnboardingStateRef = React.useRef<'signedIn' | 'landing'>('landing');
  const routeNameRef = React.useRef<string | undefined>(undefined);

  // Transition smoothly from launch screen once bootstrap and minimum animation time have elapsed
  useEffect(() => {
    if (isBootstrapDone && isLaunchMinTimeDone) {
      setIsLaunchScreenVisible(false);
      setAuthState(targetAuthStateRef.current);
    }
  }, [isBootstrapDone, isLaunchMinTimeDone]);

  const authStateRef = React.useRef(authState);
  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  const lastUpdateCheckRef = React.useRef<number>(0);
  const checkAndApplyUpdates = React.useCallback(async (isManual = false) => {
    if (__DEV__) return;
    const now = Date.now();
    if (!isManual && now - lastUpdateCheckRef.current < 3 * 60 * 1000) return;
    lastUpdateCheckRef.current = now;

    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        console.log('[UPDATES] Update found, downloading in background...');
        await Updates.fetchUpdateAsync();
        console.log('[UPDATES] Update downloaded successfully!');
        
        // If user is not logged in yet (on landing/onboarding), reload immediately to apply newest UI
        if (authStateRef.current !== 'signedIn') {
          await Updates.reloadAsync();
        } else {
          // If user is inside the app, prompt politely to avoid interrupting work
          Alert.alert(
            'Mise à jour prête ! 🚀',
            'Une nouvelle version de SnapSchool a été téléchargée. Voulez-vous redémarrer pour appliquer les nouveautés ?',
            [
              { text: 'Plus tard', style: 'cancel' },
              { text: 'Redémarrer', onPress: () => Updates.reloadAsync() },
            ]
          );
        }
      }
    } catch (err) {
      console.log('[UPDATES-CHECK-SILENT]', err);
    }
  }, []);

  // Check stored auth on launch
  useEffect(() => {

    const registerPush = async (uid: string) => {
      try {
        await notificationService.initChannels();
        let token = await notificationService.getPushToken();
        if (!token) {
          await new Promise(r => setTimeout(r, 2000));
          token = await notificationService.getPushToken();
        }
        if (token) {
          await authService.registerPushToken(uid, token);
          console.log("[DEBUG-PUSH] Token registered successfully:", token);
        }
      } catch (err) {
        console.warn("[PUSH-REG-FAIL]", err);
      }
    };

    const bootstrap = async () => {
      let nextPostOnboarding: 'signedIn' | 'landing' = 'landing';
      try {
        const loggedIn = await authStorage.isLoggedIn();

        if (loggedIn) {
          const uid = await authStorage.getUserId();
          const role = await authStorage.getUserRole();
          
          if (uid) {
            setUserId(uid);
            setUserRole(role as any);
            registerPush(uid);
            identifyUser(uid, { role });
          }

          // Fetch profile
          let profile: any = null;
          if (role === 'parent') {
            profile = await parentService.fetchParentProfile();
            const childrenData = await parentService.fetchChildren();
            if (childrenData && childrenData.length > 0) {
              setChildren(childrenData);
              setSelectedChildId(childrenData[0].id);
            }
          } else if (role === 'teacher') {
             profile = await teacherService.fetchProfile();
          } else if (role === 'admin') {
            profile = await adminService.fetchProfile().catch(() => null);
            if (profile) {
              setUserName(profile.name || 'Admin');
              setUserAvatarUrl(profile.img || null);
            } else {
              setUserName('Admin');
            }
          }

          if (profile && role !== 'admin') {
            setUserName(`${profile.name} ${profile.surname}`);
            setUserAvatarUrl(profile.img || null);
          }
          nextPostOnboarding = 'signedIn';
        } else {
          nextPostOnboarding = 'landing';
        }
      } catch (error) {
        console.error("[BOOTSTRAP-ERROR]", error);
        const uid = await authStorage.getUserId();
        if (uid) {
          nextPostOnboarding = 'signedIn';
        } else {
          nextPostOnboarding = 'landing';
        }
      } finally {
        postOnboardingStateRef.current = nextPostOnboarding;
        // In testing: always show onboarding after launch animation
        targetAuthStateRef.current = 'onboarding';
        setIsBootstrapDone(true);
      }
    };
    bootstrap();

    const { DeviceEventEmitter } = require('react-native');
    const authSubscription = DeviceEventEmitter.addListener('auth_unauthorized', () => {
      // Clear local state and go back to landing
      authService.logout().then(() => {
        setChildren([]);
        setUserName("User");
        setUserRole(null);
        setUserId(null);
        setAuthState('landing');
      });
    });

    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        authStorage.getUserId().then((storedUid) => {
          if (storedUid) registerPush(storedUid);
        });
        checkAndApplyUpdates();
      }
    });

    return () => {
      authSubscription.remove();
      appStateSub.remove();
    };
  }, []);

  const navigateToNotification = (data: any) => {
    if (!data) {
      if ((navigationRef as any)?.isReady?.()) {
        (navigationRef as any).navigate('Notifications');
      }
      return;
    }
    if (data.type === 'HOMEWORK' && data.homeworkId) {
      (navigationRef as any).navigate('HomeworkDetail', { 
        homework: { id: data.homeworkId },
        studentId: data.studentId
      });
    } else if (data.type === 'RESOURCE' && data.resourceId) {
      (navigationRef as any).navigate('Courses');
    } else if (data.type === 'PAYMENT') {
      (navigationRef as any).navigate('MainTabs', { screen: 'Payments' });
    } else {
      (navigationRef as any).navigate('NotificationDetail', { 
        notification: { 
          id: data.id || Date.now(),
          type: data.type || 'MESSAGE', 
          title: data.title || 'Notification',
          message: data.message || data.body || "Detailed message unavailable.",
          studentName: data.studentName || "SnapSchool",
          time: data.time || "À l'instant",
          isNew: false,
          createdAt: data.createdAt || new Date().toISOString(),
          ...data,
        } 
      });
    }
  };

  // Foreground notification listener — instant data refresh when push arrives
  // When teacher marks kid absent, this fires and triggers React Query refetch
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      console.log("[PUSH-FOREGROUND]", data?.type);
      // Invalidate relevant caches for instant UI update
      if (data?.type === 'ATTENDANCE' || data?.type === 'REMARK' || data?.type === 'GRADE') {
        queryClient.invalidateQueries({ queryKey: ['studentDay'] });
      }
      // Always refresh notification count
      queryClient.invalidateQueries({ queryKey: ['notifCount'] });
    });
    return () => subscription.remove();
  }, []);

  // Safe background OTA update check on launch
  useEffect(() => {
    checkAndApplyUpdates();
  }, [checkAndApplyUpdates]);

  // Notification Response Listener
  useEffect(() => {
    const subscription = notificationService.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log("[DEBUG-NOTIF-TAP]", data);
      
      if (navigationRef.isReady()) {
        navigateToNotification(data);
      } else {
        pendingNotificationRef.current = data;
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (authState === 'signedIn' && pendingNotificationRef.current) {
      const data = pendingNotificationRef.current;
      pendingNotificationRef.current = null;
      setTimeout(() => {
        if (navigationRef.isReady()) {
          navigateToNotification(data);
        }
      }, 500);
    }
  }, [authState]);

  const handleSignIn = async () => {
    const uid = await authStorage.getUserId();
    const role = await authStorage.getUserRole();
    
    if (uid) setUserId(uid);
    if (role) setUserRole(role as any);
    if (uid) identifyUser(uid, { role });

    // 1. Immediately transition to signedIn state for instant feedback
    setAuthState('signedIn');

    // 2. Hydrate children and profile concurrently in background
    (async () => {
      try {
        if (role === 'parent') {
          // Parallel fetch for profile and children
          const [profile, data] = await Promise.all([
            parentService.fetchParentProfile(),
            parentService.fetchChildren(),
          ]);

          if (Array.isArray(data) && data.length > 0) {
            setChildren(data);
            setSelectedChildId(data[0].id);
          }
          if (profile?.name) setUserName(`${profile.name} ${profile.surname}`);
          if (profile?.img) setUserAvatarUrl(profile.img);
        } else {
          const profile = await teacherService.fetchProfile();
          if (profile?.name) setUserName(`${profile.name} ${profile.surname}`);
          if (profile?.img) setUserAvatarUrl(profile.img);
        }
      } catch (err) {
        console.warn("[HYDRATE-FAIL]", err);
      }
    })();

    // 3. Register push token in background asynchronously without blocking UI
    if (uid) {
      (async () => {
        try {
          await notificationService.initChannels();
          let token = await notificationService.getPushToken();
          if (!token) {
            await new Promise(r => setTimeout(r, 2000));
            token = await notificationService.getPushToken();
          }
          if (token) {
            await authService.registerPushToken(uid, token);
            console.log("[DEBUG-PUSH] Token registered in background on login:", token);
          }
        } catch (err) {
          console.warn("[PUSH-LOGIN-FAIL]", err);
        }
      })();
    }
  };

  const handleSignOut = React.useCallback(async () => {
    await authService.logout();
    resetUser();
    setChildren([]);
    setUserName("User");
    setUserRole(null);
    setUserId(null);
    postOnboardingStateRef.current = 'landing';
    setAuthState('landing');
  }, [setChildren, setUserName, setUserRole, setUserId]);

  const MainTabsScreen = React.useCallback(
    () => <BottomTabsContent onSignOut={handleSignOut} />,
    [handleSignOut]
  );

  const onSelectRole = (role: 'parent' | 'teacher' | 'admin') => {
    setSelectedRole(role);
    setAuthState('signedOut');
  };

  return (
    <PostHogProvider client={posthog} autocapture>
      <PersistQueryClientProvider 
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <LanguageProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <View style={{ flex: 1, backgroundColor: '#f8fbff' }}>
                <NavigationContainer
                  ref={navigationRef}
                  onReady={() => {
                    routeNameRef.current = navigationRef.getCurrentRoute()?.name;
                    if (routeNameRef.current) {
                      trackScreen(routeNameRef.current);
                    }
                  }}
                  onStateChange={async () => {
                    const previousRouteName = routeNameRef.current;
                    const currentRouteName = navigationRef.getCurrentRoute()?.name;

                    if (previousRouteName !== currentRouteName && currentRouteName) {
                      trackScreen(currentRouteName);
                    }
                    routeNameRef.current = currentRouteName;
                  }}
                >
                  {authState === 'onboarding' || authState === 'loading' ? (
                    <OnboardingScreen
                      onComplete={async () => {
                        await AsyncStorage.setItem('@has_seen_onboarding', 'true');
                        setAuthState(postOnboardingStateRef.current);
                      }}
                    />
                  ) : authState === 'landing' ? (
                    <LandingScreen 
                      onSelectRole={onSelectRole}
                    />
                  ) : authState === 'signedOut' ? (
                    <SignInScreen role={selectedRole} onSignIn={handleSignIn} onBack={() => setAuthState('landing')} />
                  ) : (
                    <Stack.Navigator screenOptions={{ headerShown: false }}>
                      <Stack.Screen
                        name="MainTabs"
                        children={MainTabsScreen}
                      />
                      <Stack.Screen name="Attendance" component={AttendanceScreen} />
                      <Stack.Screen name="Notifications" component={NotificationsScreen} />
                      <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
                      <Stack.Screen name="HomeworkDetail" component={HomeworkDetailScreen} />
                      <Stack.Screen name="ExamDetail" component={ExamDetailScreen} />
                      <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} />
                      <Stack.Screen name="LinkChild" component={LinkChildScreen} />
                      <Stack.Screen name="Exams" component={ExamsScreen} />
                      <Stack.Screen name="Results" component={ResultsScreen} />
                      <Stack.Screen name="TeacherTaskDetail" component={TeacherTaskDetailScreen} />
                      <Stack.Screen name="StudentSubmission" component={StudentSubmissionScreen} />
                      <Stack.Screen name="TeacherClassRoster" component={TeacherClassRosterScreen} />
                      <Stack.Screen name="TeacherAttendance" component={TeacherAttendanceScreen} />
                      <Stack.Screen name="TeacherLessons" component={TeacherLessonsScreen} />
                      <Stack.Screen name="TeacherTasks" component={TeacherTasksScreen} />
                      <Stack.Screen name="TeacherGrades" component={TeacherGradeEntryScreen} />
                      <Stack.Screen name="TeacherProfile">
                        {(props) => <ProfileScreen {...props} onSignOut={handleSignOut} />}
                      </Stack.Screen>
                      <Stack.Screen name="Onboarding">
                        {(props) => (
                          <OnboardingScreen
                            onComplete={() => {
                              if (props.navigation.canGoBack()) {
                                props.navigation.goBack();
                              } else {
                                setAuthState('landing');
                              }
                            }}
                          />
                        )}
                      </Stack.Screen>
                    </Stack.Navigator>
                  )}
                </NavigationContainer>

                {/* Seamless Full-Screen Launch Overlay: rendered on top until ready */}
                {isLaunchScreenVisible && (
                  <View style={[StyleSheet.absoluteFill, { zIndex: 999999 }]} pointerEvents="auto">
                    <AppLaunchScreen 
                      onFinish={() => setIsLaunchMinTimeDone(true)} 
                      minDurationMs={1100} 
                    />
                  </View>
                )}
              </View>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </LanguageProvider>
      </PersistQueryClientProvider>
    </PostHogProvider>
  );
}
