import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, BookOpen, Clock, AlertCircle, Home, FileText, CreditCard, User, CheckCircle2 } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';

const UpdateItem = ({ update }: any) => {
  const Icon = update.icon;
  return (
    <TouchableOpacity className="bg-surface-low p-4 rounded-2xl flex-row items-start mb-3">
      <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 bg-surface-lowest shadow-sm`}>
        <Icon color={update.color} size={24} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-jakarta font-black text-text-primary leading-tight">{update.title}</Text>
        <Text className="text-xs text-text-secondary mt-0.5 font-manrope">{update.description}</Text>
        <Text className="text-[10px] font-manrope font-bold text-text-muted mt-2">{update.time}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const HomeScreen = () => {
  const { selectedChildId, children } = useAppStore();
  const selectedChild = children.find(c => c.id === selectedChildId);

  const updates = [
    { id: 1, title: 'New Homework added', description: 'Physics: Kinetic Energy worksheet due Friday.', time: '10 mins ago', icon: BookOpen, color: '#0055d4' },
    { id: 2, title: 'Exam in 2 days', description: 'Middle School French Literature - Chapters 4-6.', time: '2 hours ago', icon: FileText, color: '#865400' },
    { id: 3, title: 'Absence Alert', description: 'Previous Week: History lab (Tuesday Morning).', time: 'Yesterday', icon: AlertCircle, color: '#9f403d' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      {/* Header */}
      <View className="px-6 py-4 bg-surface-lowest/80 border-b border-surface-low flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity className="w-10 h-10 rounded-full bg-brand-primary/10 items-center justify-center overflow-hidden border border-brand-primary/20">
            <Image source={{ uri: 'https://i.pravatar.cc/100?u=sam' }} className="w-full h-full" />
          </TouchableOpacity>
          <Text className="text-xl font-jakarta font-black text-brand-primary">SnapSchool</Text>
        </View>
        <TouchableOpacity className="p-2 rounded-full bg-surface-low">
          <Bell color="#737c7f" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerClassName="px-6 pb-32">
        {/* Student Hero */}
        <View className="mt-8 mb-8 bg-surface-lowest p-8 rounded-[32px] shadow-sm relative overflow-hidden">
          <View className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full -mr-16 -mt-16" />
          <View className="relative z-10">
            <Text className="text-brand-primary text-[11px] font-jakarta font-black tracking-widest uppercase mb-2">Student Record</Text>
            <Text className="text-3xl font-jakarta font-black text-text-primary tracking-tight">{selectedChild?.name || 'Sami Mansouri'}</Text>
            <Text className="text-text-secondary font-manrope font-bold mt-1">Class: {selectedChild?.class || '3ème A'}</Text>
          </View>
          <View className="absolute bottom-8 right-8">
            <CheckCircle2 color="#006d4a" size={40} />
          </View>
        </View>

        {/* Quick Summary */}
        <View className="mb-8">
          <Text className="text-lg font-jakarta font-black text-text-primary mb-5">Quick Summary</Text>
          <View className="flex-row flex-wrap gap-4">
            {/* Latest Grade */}
            <View className="w-full bg-brand-primary p-6 rounded-[28px] flex-row items-center justify-between shadow-lg shadow-brand-primary/20">
              <View>
                <Text className="text-white/70 text-[10px] font-jakarta font-black tracking-widest uppercase mb-1">Latest Grade</Text>
                <Text className="text-4xl font-jakarta font-black text-white">18.5<Text className="text-lg text-white/60">/20</Text></Text>
                <Text className="text-sm font-manrope font-bold text-white/90 mt-1">Mathematics</Text>
              </View>
              <View className="w-14 h-14 bg-white/20 rounded-2xl items-center justify-center">
                <BookOpen color="white" size={32} />
              </View>
            </View>

            {/* Attendance */}
            <View className="flex-1 bg-surface-lowest p-6 rounded-[28px] shadow-sm">
              <View className="flex-row items-center gap-2 mb-3">
                <View className="w-2 h-2 rounded-full bg-brand-secondary" />
                <Text className="text-[10px] font-jakarta font-black text-text-muted uppercase">Attendance</Text>
              </View>
              <Text className="text-lg font-jakarta font-black text-text-primary leading-tight">Present Today</Text>
              <Text className="text-xs text-text-secondary mt-1 font-manrope">Arrival 08:15 AM</Text>
            </View>

            {/* Finance */}
            <View className="flex-1 bg-surface-lowest p-6 rounded-[28px] shadow-sm">
              <View className="flex-row items-center gap-2 mb-3">
                <View className="w-2 h-2 rounded-full bg-brand-secondary" />
                <Text className="text-[10px] font-jakarta font-black text-text-muted uppercase">Finance</Text>
              </View>
              <Text className="text-lg font-jakarta font-black text-text-primary leading-tight">Status: Paid</Text>
              <Text className="text-xs text-text-secondary mt-1 font-manrope">Tuition: Oct</Text>
            </View>
          </View>
        </View>

        {/* Recent Updates */}
        <View className="mb-20">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-jakarta font-black text-text-primary">Recent Updates</Text>
            <TouchableOpacity><Text className="text-brand-primary text-[10px] font-jakarta font-black uppercase">View All</Text></TouchableOpacity>
          </View>
          <View>
            {updates.map(update => <UpdateItem key={update.id} update={update} />)}
          </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
};
