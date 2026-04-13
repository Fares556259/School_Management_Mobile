import React, { useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { parentService } from '../services/api';
import { ChildCard } from '../components/ChildCard';
import { Users } from 'lucide-react-native';

export const ChildSelectorScreen: React.FC = () => {
  const { 
    children, 
    selectedChildId, 
    setChildren, 
    setSelectedChildId, 
    isLoading, 
    setLoading, 
    error, 
    setError 
  } = useAppStore();

  useEffect(() => {
    const loadChildren = async () => {
      setLoading(true);
      try {
        const data = await parentService.fetchChildren();
        setChildren(data);
      } catch (err) {
        setError('Failed to load children. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadChildren();
  }, []);

  const selectedChild = children.find(c => c.id === selectedChildId);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-6 py-8">
        <View className="flex-row items-center mb-8">
          <View className="bg-blue-100 p-3 rounded-2xl mr-4">
            <Users size={28} color="#3b82f6" />
          </View>
          <View>
            <Text className="text-3xl font-extrabold text-gray-900">Select Child</Text>
            <Text className="text-gray-500 font-medium mt-1">Choose a student to view their dashboard</Text>
          </View>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="mt-4 text-gray-400 font-medium">Fetching students...</Text>
          </View>
        ) : error ? (
          <View className="bg-red-50 p-4 rounded-xl border border-red-100">
            <Text className="text-red-600 font-medium text-center">{error}</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} className="h-full">
            {children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                isSelected={selectedChildId === child.id}
                onSelect={() => setSelectedChildId(child.id)}
              />
            ))}
            
            {selectedChild && (
              <View className="mt-8 bg-blue-600 p-6 rounded-3xl shadow-lg shadow-blue-200">
                <Text className="text-blue-100 font-bold uppercase tracking-wider text-xs mb-2">Active Selection</Text>
                <Text className="text-white text-2xl font-black mb-1">{selectedChild.name}</Text>
                <Text className="text-blue-100 font-medium opacity-90">{selectedChild.class}</Text>
                
                <View className="mt-6 pt-6 border-t border-blue-500/30">
                  <Text className="text-white text-center font-bold text-lg">Enter Dashboard →</Text>
                </View>
              </View>
            )}
            
            <View className="h-32" />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};
