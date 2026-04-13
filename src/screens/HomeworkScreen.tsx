import React from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';

export const HomeworkScreen = () => {
  const { selectedChildId, children } = useAppStore();
  const selectedChild = children.find(c => c.id === selectedChildId);

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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <BookOpen size={40} color="#737c7f" />
          </View>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437', textAlign: 'center' }}>No Individual Tasks</Text>
          <Text style={{ fontSize: 14, color: '#737c7f', textAlign: 'center', marginTop: 8 }}>
            All your upcoming academic tasks have been moved to the main dashboard for easier access.
          </Text>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
};
