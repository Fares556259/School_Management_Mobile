import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, User, Calendar, ShieldCheck, Info } from 'lucide-react-native';
import { parentService } from '../services/api';
import { useAppStore } from '../store/useAppStore';

export const LinkChildScreen = ({ navigation }: any) => {
  const [studentId, setStudentId] = useState('');
  const [birthday, setBirthday] = useState(''); // Expected: YYYY-MM-DD
  const [loading, setLoading] = useState(false);
  const { setChildren, setSelectedChildId } = useAppStore();

  const handleLink = async () => {
    if (!studentId || !birthday) {
      Alert.alert('Missing Info', 'Please provide both the Student ID and Birthday.');
      return;
    }

    // Basic date format validation (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthday)) {
      Alert.alert('Invalid Format', 'Please enter the birthday in YYYY-MM-DD format (e.g., 2012-05-15).');
      return;
    }

    setLoading(true);
    try {
      const response = await parentService.linkStudent(studentId, birthday);
      
      if (response && response.success) {
        Alert.alert('Success ✨', `${response.student.name} has been linked to your account.`, [
          {
            text: 'Great!',
            onPress: async () => {
              // Refresh children list
              const data = await parentService.fetchChildren();
              setChildren(data);
              if (data.length > 0) setSelectedChildId(response.student.id);
              navigation.goBack();
            }
          }
        ]);
      } else {
        Alert.alert('Linking Failed', 'We couldn\'t verify this student. Please check the ID and Birthday and try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 px-6">
            {/* Header */}
            <View className="flex-row items-center py-4 mb-4">
              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                className="p-2 -ml-2 bg-surface-low rounded-full"
              >
                <ChevronLeft size={24} color="#0055d4" />
              </TouchableOpacity>
              <Text className="text-2xl font-jakarta font-black text-brand-primary ml-4">Link Student</Text>
            </View>

            {/* Info Message */}
            <View className="bg-blue-50/50 p-4 rounded-3xl border border-brand-primary/10 mb-8">
              <View className="flex-row items-center mb-2">
                <Info size={18} color="#0055d4" />
                <Text className="text-brand-primary font-jakarta font-bold ml-2 text-sm uppercase tracking-widest">Verification Required</Text>
              </View>
              <Text className="text-text-muted font-manrope text-sm leading-relaxed">
                To securely link a child to your parent account, please provide their unique Student ID and Date of Birth as registered with the school administration.
              </Text>
            </View>

            {/* Form */}
            <View className="gap-6">
              <View>
                <Text className="text-text-muted font-jakarta font-bold text-[10px] tracking-widest uppercase mb-2 ml-1">Student unique ID</Text>
                <View className="flex-row items-center bg-surface-low rounded-[24px] px-5 py-4 border border-surface-low focus:border-brand-primary">
                  <User size={20} color="#0055d4" />
                  <TextInput 
                    className="flex-1 ml-3 text-lg text-text-primary font-manrope font-semibold"
                    placeholder="e.g. STU12345"
                    value={studentId}
                    onChangeText={setStudentId}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View>
                <Text className="text-text-muted font-jakarta font-bold text-[10px] tracking-widest uppercase mb-2 ml-1">Date of Birth (YYYY-MM-DD)</Text>
                <View className="flex-row items-center bg-surface-low rounded-[24px] px-5 py-4 border border-surface-low">
                  <Calendar size={20} color="#0055d4" />
                  <TextInput 
                    className="flex-1 ml-3 text-lg text-text-primary font-manrope font-semibold"
                    placeholder="e.g. 2012-05-15"
                    value={birthday}
                    onChangeText={setBirthday}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleLink}
                disabled={loading}
                className={`flex-row items-center justify-center p-5 rounded-[24px] mt-4 shadow-xl shadow-brand-primary/20 ${loading ? 'bg-brand-primary/70' : 'bg-brand-primary'}`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <ShieldCheck size={20} color="white" className="mr-2" />
                    <Text className="text-white font-jakarta font-black text-lg">Verify & Link Profile</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View className="mt-auto mb-10 items-center">
              <Text className="text-text-muted font-manrope text-[11px] text-center px-8">
                By linking a student, you agree that you are their legal guardian or authorized parent. 
                Data access will be logged for security.
              </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
