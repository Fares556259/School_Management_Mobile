import { registerAccountCleanup } from "./src/services/accountCleanup";
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
import { ParentSignUpScreen } from './src/screens/ParentSignUpScreen';
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
import { authService, authStorage, studentService, API_BASE_URL } from './src/services/api';
import { notificationService } from './src/services/notificationService';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import "./src/styles/global.css";

import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

import { identifyUser, resetUser, trackScreen } from './src/services/posthog';
import { loadSessionSnapshot, type SessionRole } from './src/services/sessionHydration';

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


const clearAccountCache = async () => {
  try {
    await Promise.allSettled([
      queryClient.cancelQueries(),
      asyncStoragePersister.removeClient(),
    ]);
  } finally {
    queryClient.clear();
    useAppStore.setState({ children: [], selectedChildId: null, studentStatuses: {}, selectedTeacherClass: null, userAvatarUrl: null, schoolName: null, unreadNotificationsCount: 0 });
  }
};

registerAccountCleanup(clearAccountCache);

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

function BottomTabsContent({ onSignOut }: { onSignOut: () => void }) {
  const insets = useSafeAreaInsets();
  const userRole = useAppStore(s => s.userRole);
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
            freezeOnBlur: true,
            headerShown: false,
            tabBarHideOnKeyboard: true,
            tabBarStyle: {
              backgroundColor: '#ffffff',
              borderTopWidth: 1,
              borderTopColor: '#f1f5f9',
              height: 60 + insets.bottom,
              paddingBottom: 10 + insets.bottom,
              paddingTop: 8,
              elevation: 0,
              shadowOpacity: 0,
            },
            tabBarActiveTintColor: '#0055d4',
            tabBarInactiveTintColor: '#94a3b8',
            tabBarLabelStyle: {
              fontWeight: '700',
              fontSize: 10.5,
              marginTop: 2,
              letterSpacing: 0.1,
            },
          }}
        >
          <Tab.Screen name="Dashboard" component={AdminDashboardScreen} options={{ tabBarLabel: t.adminDashboard, tabBarIcon: ({ color, focused }) => <LayoutDashboard size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} /> }} />
          <Tab.Screen name="Hnia" component={HniaChatScreen} options={{ tabBarHideOnKeyboard: true, tabBarLabel: t.adminHnia, tabBarIcon: ({ color, focused }) => <Bot size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} /> }} />
          <Tab.Screen name="Caisse" component={AdminCaisseScreen} options={{ tabBarLabel: t.adminCaisse, tabBarIcon: ({ color, focused }) => <Wallet size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} /> }} />
          <Tab.Screen name="More" options={{ tabBarLabel: t.adminMore, tabBarIcon: ({ color, focused }) => <MoreHorizontal size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} /> }}>
            {props => <AdminMoreScreen {...props} onSignOut={onSignOut} />}
          </Tab.Screen>
        </Tab.Navigator>
      );
    }
return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        freezeOnBlur: true,
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
  const lastHandledNotificationResponseRef = React.useRef<string | null>(null);
  // Subscribe only to account/navigation state. Attendance, notification and
  // child-status updates should not re-render the entire navigation tree.
  const setChildren = useAppStore(state => state.setChildren);
  const setSelectedChildId = useAppStore(state => state.setSelectedChildId);
  const setUserName = useAppStore(state => state.setUserName);
  const setUserAvatarUrl = useAppStore(state => state.setUserAvatarUrl);
  const setSchoolName = useAppStore(state => state.setSchoolName);
  const setUserRole = useAppStore(state => state.setUserRole);
  const setUserId = useAppStore(state => state.setUserId);
  const userRole = useAppStore(state => state.userRole);
  const userId = useAppStore(state => state.userId);
  const [authState, setAuthState] = useState<'loading' | 'onboarding' | 'landing' | 'signedIn' | 'signedOut' | 'signUp'>('onboarding');
  const [signUpInitialPhone, setSignUpInitialPhone] = useState('');
  const [isLaunchScreenVisible, setIsLaunchScreenVisible] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'parent' | 'teacher' | 'admin'>('parent');
  const [isBootstrapDone, setIsBootstrapDone] = useState(false);
  const [isLaunchMinTimeDone, setIsLaunchMinTimeDone] = useState(false);
  const targetAuthStateRef = React.useRef<'onboarding' | 'landing' | 'signedIn'>('onboarding');
  const postOnboardingStateRef = React.useRef<'signedIn' | 'landing'>('landing');
  const routeNameRef = React.useRef<string | undefined>(undefined);
  const sessionRevisionRef = React.useRef(0);
  const pushRegistrationRef = React.useRef<{ userId: string; lastAt: number; pending: Promise<void> | null }>({ userId: '', lastAt: 0, pending: null });

  // Transition smoothly from launch screen once bootstrap and minimum animation time have elapsed
  useEffect(() => {
    if (isBootstrapDone && isLaunchMinTimeDone) {
      setAuthState(targetAuthStateRef.current);
    }
  }, [isBootstrapDone, isLaunchMinTimeDone]);

  const authStateRef = React.useRef(authState);
  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  const applySessionSnapshot = React.useCallback(async (uid: string, role: SessionRole) => {
    const revision = ++sessionRevisionRef.current;
    const snapshot = await loadSessionSnapshot(role);
    const currentUid = await authStorage.getUserId();
    if (revision !== sessionRevisionRef.current || currentUid !== uid) return;

    if (snapshot.role === 'parent' && snapshot.children.length > 0) {
      setChildren(snapshot.children);
      setSelectedChildId(snapshot.children[0].id);
    }

    if (snapshot.profile?.name) {
      const fullName = `${snapshot.profile.name} ${snapshot.profile.surname || ''}`.trim();
      setUserName(fullName);
    } else if (snapshot.role === 'admin') {
      setUserName('Admin');
    }
    setUserAvatarUrl(snapshot.profile?.img || null);
    if (snapshot.role === 'admin') {
      setSchoolName(snapshot.profile?.schoolName || 'SnapSchool');
    }
  }, [setChildren, setSelectedChildId, setSchoolName, setUserAvatarUrl, setUserName]);

  const registerPush = React.useCallback((uid: string) => {
    const state = pushRegistrationRef.current;
    const now = Date.now();
    if (state.userId === uid && state.pending) return state.pending;
    if (state.userId === uid && now - state.lastAt < 6 * 60 * 60 * 1000) return Promise.resolve();

    const pending = (async () => {
      try {
        if (!(await notificationService.isEnabled())) return;
        await notificationService.initChannels();
        const token = await notificationService.getPushToken();
        if (token) {
          await authService.registerPushToken(uid, token);
          pushRegistrationRef.current.lastAt = Date.now();
        }
      } catch (error) {
        if (pushRegistrationRef.current.userId === uid) {
          pushRegistrationRef.current.lastAt = 0;
        }
        console.warn('[PUSH-REG-FAIL]', error);
      } finally {
        if (pushRegistrationRef.current.userId === uid) {
          pushRegistrationRef.current.pending = null;
        }
      }
    })();

    pushRegistrationRef.current = { userId: uid, lastAt: state.userId === uid ? state.lastAt : 0, pending };
    return pending;
  }, []);

  const clearLocalSession = React.useCallback(() => {
    sessionRevisionRef.current += 1;
    resetUser();
    setChildren([]);
    setSelectedChildId(null);
    setUserName('User');
    setUserAvatarUrl(null);
    setSchoolName(null);
    setUserRole(null);
    setUserId(null);
    postOnboardingStateRef.current = 'landing';
    targetAuthStateRef.current = 'landing';
    setAuthState('landing');
  }, [setChildren, setSchoolName, setSelectedChildId, setUserAvatarUrl, setUserId, setUserName, setUserRole]);

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
    const bootstrap = async () => {
      let nextPostOnboarding: 'signedIn' | 'landing' = 'landing';
      try {
        await authStorage.preload();
        const loggedIn = await authStorage.isLoggedIn();

        if (loggedIn) {
          const uid = await authStorage.getUserId();
          const role = await authStorage.getUserRole();
          
          if (uid) {
            setUserId(uid);
            setUserRole(role as any);
            void registerPush(uid);
            identifyUser(uid, { role });
          }

          // Stored credentials are enough to launch. Profile/network hydration
          // continues in the background and is discarded if the account changes.
          if (uid && (role === 'parent' || role === 'teacher' || role === 'admin')) {
            void applySessionSnapshot(uid, role);
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
      void authService.logout().catch(error => {
        console.warn('[LOGOUT-CLEANUP-FAIL]', error);
      }).finally(clearLocalSession);
    });

    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        authStorage.getUserId().then((storedUid) => {
          if (storedUid) void registerPush(storedUid);
        });
        checkAndApplyUpdates();
      }
    });

    return () => {
      authSubscription.remove();
      appStateSub.remove();
    };
  }, [applySessionSnapshot, checkAndApplyUpdates, clearLocalSession, registerPush, setUserId, setUserRole]);

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
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
    return () => subscription.remove();
  }, []);

  // Safe background OTA update check on launch
  useEffect(() => {
    checkAndApplyUpdates();
  }, [checkAndApplyUpdates]);

  // Notification Response Listener
  useEffect(() => {
    let mounted = true;
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const responseKey = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (lastHandledNotificationResponseRef.current === responseKey) return;
      lastHandledNotificationResponseRef.current = responseKey;
      const data = response.notification.request.content.data;
      console.log("[DEBUG-NOTIF-TAP]", data);

      if (authStateRef.current === 'signedIn' && navigationRef.isReady()) {
        navigateToNotification(data);
      } else {
        pendingNotificationRef.current = data;
      }
    };
    const subscription = notificationService.addNotificationResponseReceivedListener(response => {
      handleResponse(response);
      void Notifications.clearLastNotificationResponseAsync();
    });
    void Notifications.getLastNotificationResponseAsync().then(async response => {
      if (!mounted || !response) return;
      handleResponse(response);
      await Notifications.clearLastNotificationResponseAsync();
    }).catch(error => console.warn('[NOTIF-LAST-RESPONSE-FAIL]', error));
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (authState === 'signedIn' && pendingNotificationRef.current) {
      const data = pendingNotificationRef.current;
      pendingNotificationRef.current = null;
      const timeout = setTimeout(() => {
        if (navigationRef.isReady()) {
          navigateToNotification(data);
        }
      }, 500);
      return () => clearTimeout(timeout);
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

    if (uid && (role === 'parent' || role === 'teacher' || role === 'admin')) {
      void applySessionSnapshot(uid, role);
      void registerPush(uid);
    }
  };

  const handleSignOut = React.useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn('[LOGOUT-CLEANUP-FAIL]', error);
    } finally {
      clearLocalSession();
    }
  }, [clearLocalSession]);

  const MainTabsScreen = React.useCallback(
    () => <BottomTabsContent onSignOut={handleSignOut} />,
    [handleSignOut]
  );

  const onSelectRole = (role: 'parent' | 'teacher' | 'admin') => {
    setSelectedRole(role);
    setAuthState('signedOut');
  };

  return (
      <PersistQueryClientProvider 
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister, buster: "account-isolation-v2" }}
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
                    <SignInScreen
                      role={selectedRole}
                      onSignIn={handleSignIn}
                      onBack={() => setAuthState('landing')}
                      onNavigateToSignUp={(prefilledPhone) => {
                        setSignUpInitialPhone(prefilledPhone || '');
                        setAuthState('signUp');
                      }}
                    />
                  ) : authState === 'signUp' ? (
                    <ParentSignUpScreen
                      initialPhone={signUpInitialPhone}
                      onBack={() => setAuthState('signedOut')}
                      onSignUpSuccess={handleSignIn}
                    />
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
                      isReady={isBootstrapDone && isLaunchMinTimeDone}
                      onExit={() => setIsLaunchScreenVisible(false)}
                    />
                  </View>
                )}
              </View>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </LanguageProvider>
      </PersistQueryClientProvider>
  );
}
