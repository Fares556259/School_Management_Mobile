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
import { ExamsScreen } from './src/screens/ExamsScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { DocumentCenterScreen } from './src/screens/DocumentCenterScreen';
import { TeacherClassesScreen } from './src/screens/teacher/TeacherClassesScreen';
import { TeacherHomeScreen } from './src/screens/teacher/TeacherHomeScreen';
import { TeacherAttendanceScreen } from './src/screens/teacher/TeacherAttendanceScreen';
import { TeacherLessonsScreen } from './src/screens/teacher/TeacherLessonsScreen';
import { TeacherTasksScreen } from './src/screens/teacher/TeacherTasksScreen';
import { TeacherTaskDetailScreen } from './src/screens/teacher/TeacherTaskDetailScreen';
import { StudentSubmissionScreen } from './src/screens/teacher/StudentSubmissionScreen';
import { TeacherClassRosterScreen } from './src/screens/teacher/TeacherClassRosterScreen';
import { CoursesScreen } from './src/screens/CoursesScreen';
import { Home as HomeIcon, FileText, CreditCard, User, Megaphone, Calendar, BarChart3, ClipboardList, BookOpen, Users, ClipboardCheck, GraduationCap } from 'lucide-react-native';
import { View, ActivityIndicator, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from './src/store/useAppStore';
import { parentService, authService, authStorage, studentService, API_BASE_URL, teacherService } from './src/services/api';
import { notificationService } from './src/services/notificationService';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import "./src/styles/global.css";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

function BottomTabs({ onSignOut }: { onSignOut: () => void }) {
  const { userRole } = useAppStore();
  const isTeacher = userRole === 'teacher';

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
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          height: 72,
          paddingBottom: 10,
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
          <Tab.Screen name="Home" component={TeacherHomeScreen} />
          <Tab.Screen name="Attendance" component={TeacherAttendanceScreen} />
          <Tab.Screen name="Lessons" component={TeacherLessonsScreen} />
          <Tab.Screen name="Tasks" component={TeacherTasksScreen} />
          <Tab.Screen name="Classes" component={TeacherClassesScreen} />
        </>
      ) : (
        <>
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Courses" component={CoursesScreen} />
          <Tab.Screen name="Announcements" component={AnnouncementsScreen} />
          <Tab.Screen name="Payments" component={PaymentsScreen} />
        </>
      )}
      <Tab.Screen
        name="Profile"
        children={(props: any) => <ProfileScreen {...props} onSignOut={onSignOut} />}
      />
    </Tab.Navigator>
  );
}


export default function App() {
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
  const [authState, setAuthState] = useState<'loading' | 'landing' | 'signedIn' | 'signedOut'>('loading');
  const [selectedRole, setSelectedRole] = useState<'parent' | 'teacher'>('parent');

  // Check stored auth on launch
  useEffect(() => {
    // Diagnostic Alert for APK debugging
    const showDiagnostics = () => {
      const isNewArch = Constants.expoConfig?.newArchEnabled;
      Alert.alert(
        "SnapSchool Diagnostic",
        `API URL: ${API_BASE_URL}\nNew Arch: ${isNewArch ? 'Enabled' : 'Disabled'}\nVersion: ${Constants.expoConfig?.version}`,
        [{ text: "Continue", style: "default" }]
      );
    };
    
    // Only show alert in non-development mode (APK/Build)
    if (Constants.appOwnership !== 'expo') {
      showDiagnostics();
    }

    const registerPush = async (uid: string) => {
      try {
        const hasPermission = await notificationService.requestPermissions();
        if (hasPermission) {
          const token = await notificationService.getPushToken();
          if (token) {
            await authService.registerPushToken(uid, token);
            console.log("[DEBUG-PUSH] Token registered successfully");
          }
        }
      } catch (err) {
        console.warn("[PUSH-REG-FAIL]", err);
      }
    };

    const bootstrap = async () => {
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

  // Notification Response Listener
  useEffect(() => {
    const subscription = notificationService.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log("[DEBUG-NOTIF-TAP]", data);
      
      if (navigationRef.isReady()) {
        if (data.type === 'HOMEWORK' && data.homeworkId) {
          (navigationRef as any).navigate('HomeworkDetail', { 
            homework: { id: data.homeworkId },
            studentId: data.studentId
          });
        } else if (data.type === 'RESOURCE' && data.resourceId) {
          (navigationRef as any).navigate('DocumentCenter');
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
      }
    });
    return () => subscription.remove();
  }, []);

  const handleSignIn = async () => {
    const uid = await authStorage.getUserId();
    const role = await authStorage.getUserRole();
    
    setUserId(uid);
    setUserRole(role as any);

    let profile: any = null;
    if (role === 'parent') {
      profile = await parentService.fetchParentProfile();
      const data = await parentService.fetchChildren();
      setChildren(data);
      if (data.length > 0) setSelectedChildId(data[0].id);
    } else {
      profile = await teacherService.fetchProfile();
    }

    if (profile?.name) setUserName(`${profile.name} ${profile.surname}`);
    if (profile?.img) setUserAvatarUrl(profile.img);

    // Register Push Token on Login
    try {
      const hasPermission = await notificationService.requestPermissions();
      if (uid && hasPermission) {
        const token = await notificationService.getPushToken();
        if (token) await authService.registerPushToken(uid, token);
      }
    } catch (err) {
      console.warn("[PUSH-LOGIN-FAIL]", err);
    }
    
    setAuthState('signedIn');
  };

  const handleSignOut = async () => {
    await authService.logout();
    setChildren([]);
    setUserName("User");
    setUserRole(null);
    setUserId(null);
    setAuthState('landing');
  };

  const onSelectRole = (role: 'parent' | 'teacher') => {
    setSelectedRole(role);
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
        <NavigationContainer ref={navigationRef}>
          {authState === 'landing' ? (
            <LandingScreen onSelectRole={onSelectRole} />
          ) : authState === 'signedOut' ? (
            <SignInScreen role={selectedRole} onSignIn={handleSignIn} onBack={() => setAuthState('landing')} />
          ) : (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen
                name="MainTabs"
                children={() => <BottomTabs onSignOut={handleSignOut} />}
              />
              <Stack.Screen name="Attendance" component={AttendanceScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
              <Stack.Screen name="HomeworkDetail" component={HomeworkDetailScreen} />
              <Stack.Screen name="ExamDetail" component={ExamDetailScreen} />
              <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} />
              <Stack.Screen name="LinkChild" component={LinkChildScreen} />
              <Stack.Screen name="DocumentCenter" component={DocumentCenterScreen} />
              <Stack.Screen name="Exams" component={ExamsScreen} />
              <Stack.Screen name="Results" component={ResultsScreen} />
              <Stack.Screen name="TeacherTaskDetail" component={TeacherTaskDetailScreen} />
              <Stack.Screen name="StudentSubmission" component={StudentSubmissionScreen} />
              <Stack.Screen name="TeacherClassRoster" component={TeacherClassRosterScreen} />
            </Stack.Navigator>
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
