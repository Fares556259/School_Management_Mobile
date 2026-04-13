import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Student } from '../types';
import { Check } from 'lucide-react-native';

interface ChildCardProps {
  child: Student;
  isSelected: boolean;
  onSelect: () => void;
}

export const ChildCard: React.FC<ChildCardProps> = ({ child, isSelected, onSelect }) => {
  return (
    <TouchableOpacity
      onPress={onSelect}
      className={`flex-row items-center p-4 mb-4 rounded-2xl bg-white shadow-sm border ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
      }`}
    >
      <Image
        source={{ uri: child.avatarUrl || 'https://via.placeholder.com/50' }}
        className="w-16 h-16 rounded-full bg-gray-200"
      />
      <View className="flex-1 ml-4">
        <Text className="text-lg font-bold text-gray-800">{child.name}</Text>
        <Text className="text-gray-500 font-medium">{child.class}</Text>
      </View>
      {isSelected && (
        <View className="bg-blue-500 rounded-full p-1">
          <Check size={16} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );
};
