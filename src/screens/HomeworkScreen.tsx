import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, Clock, Calendar, ChevronRight, Home, FileText, CreditCard, User } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';

const CourseCard = ({ course }: any) => (
  <TouchableOpacity 
    className="bg-surface-lowest p-5 rounded-3xl mb-4 border border-surface-low"
    style={{
      shadowColor: '#2b3437',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    }}
  >
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${course.bg || 'bg-blue-50'}`}>
          <BookOpen color={course.color || '#0055d4'} size={24} />
        </View>
        <View>
          <Text className="text-lg font-jakarta font-bold text-text-primary">{course.name}</Text>
          <Text className="text-text-secondary text-xs font-manrope">{course.teacher}</Text>
        </View>
      </View>
      <ChevronRight color="#dbe4e7" size={20} />
    </View>
  </TouchableOpacity>
);

const HomeworkItem = ({ homework }: any) => (
  <TouchableOpacity 
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

export const HomeworkScreen = () => {
  const { selectedChildId, children } = useAppStore();
  const selectedChild = children.find(c => c.id === selectedChildId);

  const courses = [
    { id: 1, name: 'Advanced Mathematics', teacher: 'Dr. Robert Smith', color: '#0055d4', bg: 'bg-blue-50' },
    { id: 2, name: 'Physics & Mechanics', teacher: 'Prof. Sarah Jane', color: '#865400', bg: 'bg-orange-50' },
    { id: 3, name: 'Computer Science', teacher: 'Mr. Alan Turing', color: '#006d4a', bg: 'bg-green-50' },
  ];

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

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerClassName="px-6 pb-32">
        {/* Upcoming Section */}
        <View className="mt-8">
          <Text className="text-xl font-jakarta font-black text-text-primary mb-4">Upcoming Tasks</Text>
          {homework.map(item => <HomeworkItem key={item.id} homework={item} />)}
        </View>

        {/* Courses Section */}
        <View className="mt-10 mb-20">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-jakarta font-black text-text-primary">Regular Courses</Text>
            <TouchableOpacity><Text className="text-brand-primary font-jakarta font-bold">See All</Text></TouchableOpacity>
          </View>
          {courses.map(course => <CourseCard key={course.id} course={course} />)}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
};
