import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Bell, ChevronRight, History, Calculator, Microscope, Home, BookOpen, FileText, CreditCard, User } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';

const TimelineDay = ({ day, date, active }: any) => (
  <TouchableOpacity 
    className={`w-16 h-20 rounded-2xl items-center justify-center mr-3 ${active ? 'bg-brand-primary' : 'bg-surface-lowest opacity-60'}`}
    style={active ? {
      shadowColor: '#0055d4',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
      transform: [{ scale: 1.1 }]
    } : {}}
  >
    <Text className={`text-[10px] font-jakarta font-black uppercase ${active ? 'text-white' : 'text-text-secondary'}`}>{day}</Text>
    <Text className={`text-xl font-jakarta font-black ${active ? 'text-white' : 'text-text-primary'}`}>{date}</Text>
  </TouchableOpacity>
);

const ExamCard = ({ exam }: any) => {
  const Icon = exam.icon;
  return (
    <TouchableOpacity 
      className="bg-surface-lowest p-5 rounded-3xl mb-4 flex-row items-center border-l-4 border-surface-low shadow-sm"
      style={{ borderLeftColor: exam.accentColor }}
    >
      <View className="w-14 h-14 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: exam.bgColor }}>
        <Icon color={exam.accentColor} size={28} />
      </View>
      <View className="flex-1">
        <View className="flex-row justify-between items-start mb-1">
          <Text className="text-lg font-jakarta font-black text-text-primary">{exam.subject}</Text>
          <Text className="text-[10px] font-manrope font-bold text-text-muted uppercase">{exam.time}</Text>
        </View>
        <Text className="text-text-secondary text-xs font-manrope mb-3" numberOfLines={2}>{exam.description}</Text>
        <View className="flex-row flex-wrap gap-2">
          {exam.tags.map((tag: string, i: number) => (
            <View key={i} className="bg-surface-high px-3 py-1 rounded-lg">
              <Text className="text-[10px] font-jakarta font-bold text-text-primary uppercase">{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      <ChevronRight color="#dbe4e7" size={20} className="ml-2" />
    </TouchableOpacity>
  );
};

const MilestoneItem = ({ milestone }: any) => (
  <View className="relative pl-8 mb-8">
    <View 
      className="absolute left-0 top-1 w-4 h-4 rounded-full z-10" 
      style={{ backgroundColor: milestone.color, borderWidth: 3, borderColor: `${milestone.color}33` }} 
    />
    <View className="mb-1">
      <Text className="text-[10px] font-jakarta font-black uppercase" style={{ color: milestone.color }}>{milestone.date}</Text>
      <Text className="text-base font-jakarta font-black text-text-primary">{milestone.title}</Text>
    </View>
    <Text className="text-text-secondary text-xs font-manrope leading-relaxed">{milestone.description}</Text>
  </View>
);

export const ExamsScreen = () => {
  const { selectedChildId, children } = useAppStore();
  const selectedChild = children.find(c => c.id === selectedChildId);

  const exams = [
    { 
      id: 1, 
      subject: 'Histoire-Géo', 
      time: 'Oct 15 • 09:00 AM', 
      description: 'Exam focuses on the Industrial Revolution and Modern Borders.',
      icon: History,
      accentColor: '#0055d4',
      bgColor: '#dae2ff',
      tags: ['Chapter 3 & 4', 'Maps Required']
    },
    { 
      id: 2, 
      subject: 'Mathématiques', 
      time: 'Oct 18 • 10:30 AM', 
      description: 'Trigonometry finals including complex triangles and wave functions.',
      icon: Calculator,
      accentColor: '#865400',
      bgColor: '#f8a01044',
      tags: ['All Units', 'Calculator Needed']
    },
    { 
      id: 3, 
      subject: 'Science & Bio', 
      time: 'Oct 22 • 01:45 PM', 
      description: 'Cellular structure and photosynthesis experimental methodology.',
      icon: Microscope,
      accentColor: '#006d4a',
      bgColor: '#6ffbbe55',
      tags: ['Lab Notes']
    },
  ];

  const milestones = [
    { id: 1, date: 'Oct 24', title: 'Parent-Teacher Meeting', description: 'Mandatory quarterly review for Grade 10 students. 4:00 PM onwards.', color: '#0055d4' },
    { id: 2, date: 'Oct 30 - Nov 05', title: 'Fall Break Holidays', description: 'School remains closed for all grades. Special elective classes online only.', color: '#865400' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      {/* Header */}
      <View className="px-6 py-4 bg-surface-lowest/80 border-b border-surface-low flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-full bg-brand-primary items-center justify-center overflow-hidden">
            <Image source={{ uri: 'https://i.pravatar.cc/100?u=student' }} className="w-full h-full" />
          </View>
          <Text className="text-xl font-jakarta font-black text-brand-primary">SnapSchool</Text>
        </View>
        <TouchableOpacity className="p-2 rounded-full bg-surface-low">
          <Bell color="#737c7f" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerClassName="px-6 pb-32">
        {/* Title Section */}
        <View className="mt-6 mb-8 flex-row justify-between items-end">
          <View>
            <Text className="text-text-muted text-[10px] font-jakarta font-black uppercase tracking-widest mb-1">Academic Year 2023-24</Text>
            <Text className="text-3xl font-jakarta font-black text-text-primary">Exams & Dates</Text>
          </View>
          <View className="bg-surface-low rounded-xl px-4 py-2 flex-row items-center gap-2">
            <Calendar color="#0055d4" size={16} />
            <Text className="font-jakarta font-bold text-text-primary text-xs">Oct 2024</Text>
          </View>
        </View>

        {/* Timeline */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-10 py-2">
          <TimelineDay day="Mon" date="12" />
          <TimelineDay day="Tue" date="13" />
          <TimelineDay day="Wed" date="14" />
          <TimelineDay day="Thu" date="15" active />
          <TimelineDay day="Fri" date="16" />
          <TimelineDay day="Sat" date="17" />
          <TimelineDay day="Sun" date="18" />
        </ScrollView>

        {/* Exams List */}
        <View className="mb-10">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-jakarta font-black text-text-primary">Upcoming Exams</Text>
            <View className="bg-brand-primary/10 px-3 py-1 rounded-full">
              <Text className="text-[10px] font-jakarta font-black text-brand-primary uppercase">Next 14 Days</Text>
            </View>
          </View>
          {exams.map(exam => <ExamCard key={exam.id} exam={exam} />)}
        </View>

        {/* Milestones */}
        <View className="mb-20">
          <Text className="text-xl font-jakarta font-black text-text-primary mb-6">Key Milestones</Text>
          <View className="bg-surface-lowest rounded-[28px] p-6 shadow-sm relative">
            <View className="absolute left-8 top-10 bottom-10 w-0.5 bg-surface-low" />
            {milestones.map(m => <MilestoneItem key={m.id} milestone={m} />)}
            <TouchableOpacity className="w-full mt-4 py-4 rounded-3xl bg-surface-low items-center">
              <Text className="text-text-primary font-jakarta font-black text-sm">View Full Calendar</Text>
            </TouchableOpacity>
          </View>

          {/* Prep Tip */}
          <View className="mt-8 bg-brand-primary p-6 rounded-[28px]">
            <View className="flex-row items-center mb-2 gap-2">
              <Text className="text-white text-lg">💡</Text>
              <Text className="text-white text-lg font-jakarta font-black">Prep Tip</Text>
            </View>
            <Text className="text-white/90 text-sm font-manrope leading-relaxed">
              Historie-Géo students usually score 15% higher when using visual timelines for the Industrial Revolution chapter.
            </Text>
          </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
};
