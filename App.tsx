import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from './src/screens/HomeScreen';
import { ExamsScreen } from './src/screens/ExamsScreen';
import { PaymentsScreen } from './src/screens/PaymentsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { HomeworkDetailScreen } from './src/screens/HomeworkDetailScreen';
import { ExamDetailScreen } from './src/screens/ExamDetailScreen';
import { Home as HomeIcon, BookOpen, FileText, CreditCard, User } from 'lucide-react-native';
import { useAppStore } from './src/store/useAppStore';
import { parentService } from './src/services/api';
import "./src/styles/global.css";
import { View, Text } from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabs() {
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
        tabBarLabelStyle: {
          fontFamily: 'Plus Jakarta Sans',
          fontWeight: '900',
          fontSize: 9,
          marginTop: 2,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let Icon;
          if (route.name === 'Home') Icon = HomeIcon;
          else if (route.name === 'Exams') Icon = FileText;
          else if (route.name === 'Payments') Icon = CreditCard;
          else if (route.name === 'Profile') Icon = User;

          const LucideIcon = Icon as any;

          return (
            <View className={`${focused ? 'bg-brand-primary/10 px-4 py-2 rounded-2xl' : ''}`}>
              <LucideIcon color={color} size={focused ? 24 : 20} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Exams" component={ExamsScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { setChildren, setSelectedChildId } = useAppStore();

  useEffect(() => {
    parentService.fetchChildren().then(data => {
      setChildren(data);
      if (data.length > 0) setSelectedChildId(data[0].id);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={BottomTabs} />
            <Stack.Screen name="HomeworkDetail" component={HomeworkDetailScreen} />
            <Stack.Screen name="ExamDetail" component={ExamDetailScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
