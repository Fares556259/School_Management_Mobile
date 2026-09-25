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
import { CoursesScreen } from './src/screens/CoursesScreen';
import { Home as HomeIcon, FileText, CreditCard, User, Megaphone, Calendar, BarChart3, ClipboardList, BookOpen, Users, ClipboardCheck, GraduationCap } from 'lucide-react-native';
import { View, ActivityIndicator, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from './src/store/useAppStore';
import { parentService, authService, authStorage, studentService, API_BASE_URL, teacherService } from './src/services/api';
import { notificationService } from './src/services/notificationService';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import "./src/styles/global.css";

import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

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

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
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
  const [authState, setAuthState] = useState<'loading' | 'onboarding' | 'landing' | 'signedIn' | 'signedOut'>('loading');
  const [selectedRole, setSelectedRole] = useState<'parent' | 'teacher'>('parent');
  const [isBootstrapDone, setIsBootstrapDone] = useState(false);
  const [isLaunchMinTimeDone, setIsLaunchMinTimeDone] = useState(false);
  const targetAuthStateRef = React.useRef<'onboarding' | 'landing' | 'signedIn'>('onboarding');
  const postOnboardingStateRef = React.useRef<'signedIn' | 'landing'>('landing');

  // Transition smoothly from launch screen once bootstrap and minimum animation time have elapsed
  useEffect(() => {
    if (isBootstrapDone && isLaunchMinTimeDone) {
      setAuthState(targetAuthStateRef.current);
    }
  }, [isBootstrapDone, isLaunchMinTimeDone]);

  // Check stored auth on launch
  useEffect(() => {

    const registerPush = async (uid: string) => {
      try {
        const pref = await AsyncStorage.getItem('notificationsEnabled');
        if (pref === 'false') {
          console.log("[DEBUG-PUSH] Notifications disabled by user preference");
          return;
        }
        await notificationService.initChannels();
        const hasPermission = await notificationService.requestPermissions();
        if (hasPermission) {
          const token = await notificationService.getPushToken();
          if (token) {
            await authService.registerPushToken(uid, token);
            console.log("[DEBUG-PUSH] Token registered successfully:", token);
          }
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
          } else {
             // Teacher profile fetching can be added here
             profile = await teacherService.fetchProfile();
          }

          if (profile) {
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

    return () => {
      authSubscription.remove();
    };
  }, []);

  const navigateToNotification = (data: any) => {
    if (data.type === 'HOMEWORK' && data.homeworkId) {
      (navigationRef as any).navigate('HomeworkDetail', { 
        homework: { id: data.homeworkId },
        studentId: data.studentId
      });
    } else if (data.type === 'RESOURCE' && data.resourceId) {
      (navigationRef as any).navigate('Courses');
    } else if (data.type === 'ANNOUNCEMENT' || data.type === 'ATTENDANCE') {
      (navigationRef as any).navigate('NotificationDetail', { 
        notification: { 
          ...data, 
          type: data.type, 
          message: data.message || data.body || "Detailed message unavailable.",
          studentName: data.studentName || "Student Update",
          time: "Just now" 
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
          const hasPermission = await notificationService.requestPermissions();
          if (hasPermission) {
            const token = await notificationService.getPushToken();
            if (token) {
              await authService.registerPushToken(uid, token);
              console.log("[DEBUG-PUSH] Token registered in background on login:", token);
            }
          }
        } catch (err) {
          console.warn("[PUSH-LOGIN-FAIL]", err);
        }
      })();
    }
  };

  const handleSignOut = React.useCallback(async () => {
    await authService.logout();
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

  const onSelectRole = (role: 'parent' | 'teacher') => {
    setSelectedRole(role);
    setAuthState('signedOut');
  };

  if (authState === 'loading') {
    return <AppLaunchScreen onFinish={() => setIsLaunchMinTimeDone(true)} minDurationMs={1200} />;
  }

  return (
    <PersistQueryClientProvider 
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <LanguageProvider>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <NavigationContainer ref={navigationRef}>
              {authState === 'onboarding' ? (
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
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </LanguageProvider>
    </PersistQueryClientProvider>
  );
}
