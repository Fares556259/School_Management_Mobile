import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, Clock, Calendar, ChevronRight } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';

const HomeworkItem = ({ homework, onPress }: any) => (
  <TouchableOpacity 
    onPress={onPress}
    className="bg-surface-lowest p-4 rounded-2xl mb-3 border border-surface-low flex-row items-center"
  >
    <View className="p-2 bg-surface-low rounded-xl mr-4">
      <Clock size={18} color="#737c7f" />
    </View>
    <View className="flex-1">
      <Text className="text-base font-jakarta font-semibold text-text-primary">{homework.title}</Text>
      <View className="flex-row items-center mt-1">
        <Calendar size={12} color="#737c7f" className="mr-1" />
        <Text className="text-text-muted text-xs font-manrope">Due: {homework.dueDate}</Text>
      </View>
    </View>
    <View className={`px-3 py-1 rounded-full ${homework.isUrgent ? 'bg-red-50' : 'bg-green-50'}`}>
      <Text className={`text-[10px] font-jakarta font-black ${homework.isUrgent ? 'text-brand-error' : 'text-brand-secondary'}`}>
        {homework.isUrgent ? 'URGENT' : 'PENDING'}
      </Text>
    </View>
  </TouchableOpacity>
);

export const HomeworkScreen = ({ navigation }: any) => {
  const { selectedChildId, children } = useAppStore();
  const selectedChild = children.find(c => c.id === selectedChildId);

  const homework = [
    { id: 1, title: 'Calculus Assignment 4', dueDate: 'Tomorrow', isUrgent: true },
    { id: 2, title: 'Energy Transformation Lab Report', dueDate: 'Friday, Oct 24', isUrgent: false },
    { id: 3, title: 'Read Chapter 5: Operating Systems', dueDate: 'Next Monday', isUrgent: false },
  ];

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      {/* Header */}
      <View className="px-6 py-4 bg-surface-lowest pb-6 border-b border-surface-low">
        <Text className="text-text-muted text-xs font-jakarta font-black tracking-widest uppercase mb-1">Academics</Text>
        <Text className="text-3xl font-jakarta font-black text-text-primary">Homework</Text>
        <View className="mt-4 p-4 bg-brand-primary rounded-3xl flex-row items-center">
          <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-3">
            <BookOpen color="white" size={20} />
          </View>
          <View>
            <Text className="text-white/80 text-xs font-manrope font-bold">Currently Viewing</Text>
            <Text className="text-white text-lg font-jakarta font-black">{selectedChild?.name || 'Loading...'}</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-6 pb-32">
          {/* Upcoming Section */}
          <View className="mt-8">
            <Text className="text-xl font-jakarta font-black text-text-primary mb-4">Upcoming Tasks</Text>
            {homework.map(item => (
              <HomeworkItem 
                key={item.id} 
                homework={item} 
                onPress={() => navigation.navigate('HomeworkDetail', { homework: item })}
              />
            ))}
          </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
};
