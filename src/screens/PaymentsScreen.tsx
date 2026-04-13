import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CreditCard, Download, Info, Lock, Home, BookOpen, FileText, User, ChevronRight } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';

const PaymentItem = ({ item }: any) => (
  <TouchableOpacity 
    className="bg-surface-lowest px-6 py-5 flex-row items-center border-b border-surface-low"
    disabled={item.status === 'Locked'}
  >
    <View className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${
      item.status === 'Paid' ? 'bg-green-50' : 
      item.status === 'Due' ? 'bg-orange-50' : 
      'bg-surface-low'
    }`}>
      <CalendarIcon status={item.status} />
    </View>
    <View className="flex-1">
      <Text className={`font-jakarta font-bold text-text-primary ${item.status === 'Locked' ? 'opacity-50' : ''}`}>
        {item.month}
      </Text>
      <View className="flex-row items-center">
        <Text className="text-text-secondary text-xs font-manrope">{item.amount} • </Text>
        <Text className={`text-xs font-jakarta font-bold ${
          item.status === 'Paid' ? 'text-brand-secondary' : 
          item.status === 'Due' ? 'text-brand-tertiary' : 
          'text-text-muted'
        }`}>
          {item.status}
        </Text>
      </View>
    </View>
    <View className="items-end">
      {item.status === 'Paid' && (
        <TouchableOpacity className="p-2 bg-surface-low rounded-xl">
          <Download size={16} color="#737c7f" />
        </TouchableOpacity>
      )}
      {item.status === 'Due' && (
        <TouchableOpacity className="bg-brand-primary px-4 py-2 rounded-xl">
          <Text className="text-white text-xs font-jakarta font-bold">Pay</Text>
        </TouchableOpacity>
      )}
      {item.status === 'Locked' && <Lock size={16} color="#abb3b7" />}
    </View>
  </TouchableOpacity>
);

const CalendarIcon = ({ status }: any) => {
  if (status === 'Paid') return <CreditCard size={18} color="#006d4a" />;
  if (status === 'Due') return <Bell size={18} color="#865400" />;
  return <Lock size={18} color="#abb3b7" />;
};

export const PaymentsScreen = () => {
  const { selectedChildId, children } = useAppStore();
  const selectedChild = children.find(c => c.id === selectedChildId);

  const paymentHistory = [
    { id: 1, month: 'October 2023', amount: '2,500 DH', status: 'Paid', ref: '#TRX-982310' },
    { id: 2, month: 'September 2023', amount: '2,500 DH', status: 'Paid', ref: '#TRX-982104' },
    { id: 3, month: 'November 2023', amount: '2,500 DH', status: 'Due', ref: 'Pending' },
    { id: 4, month: 'December 2023', amount: '2,500 DH', status: 'Locked', ref: '—' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      {/* Header */}
      <View className="px-6 py-4 bg-surface-lowest/80 border-b border-surface-low flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-full bg-surface-low items-center justify-center overflow-hidden border border-surface-low">
             <Image source={{ uri: 'https://i.pravatar.cc/100?u=parent' }} className="w-full h-full" />
          </View>
          <Text className="text-xl font-jakarta font-black text-brand-primary">SnapSchool</Text>
        </View>
        <TouchableOpacity className="p-2 rounded-full bg-surface-low">
          <Bell color="#737c7f" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerClassName="pb-32">
        <View className="px-6 pt-8 pb-4">
          <Text className="text-3xl font-jakarta font-black text-text-primary">Financial Overview</Text>
          <Text className="text-text-secondary font-manrope mt-1">Manage your academic investments and invoices.</Text>
        </View>

        {/* Hero Card */}
        <View className="px-6 mb-8">
          <View className="bg-brand-primary p-8 rounded-[40px] relative overflow-hidden min-h-[220px] justify-between">
            <View>
              <Text className="text-white/60 text-[10px] font-jakarta font-black uppercase tracking-widest">Academic Year 2023-2024</Text>
              <Text className="text-4xl font-jakarta font-black text-white mt-1">15,000 DH</Text>
              <Text className="text-white/80 font-manrope font-bold mt-1">Total Tuition Fees</Text>
            </View>
            <View className="flex-row gap-3 mt-6">
              <View className="bg-white/10 px-4 py-3 rounded-2xl flex-1">
                <Text className="text-white/60 text-[8px] font-jakarta font-black uppercase">Paid</Text>
                <Text className="text-lg font-jakarta font-black text-white">10k DH</Text>
              </View>
              <View className="bg-white/10 px-4 py-3 rounded-2xl flex-1">
                <Text className="text-white/60 text-[8px] font-jakarta font-black uppercase">Due</Text>
                <Text className="text-lg font-jakarta font-black text-white">5k DH</Text>
              </View>
            </View>
            {/* Decorative circle */}
            <View className="absolute -right-20 -bottom-20 w-60 h-60 bg-white/5 rounded-full" />
          </View>
        </View>

        {/* Payment History Section */}
        <View className="mb-10">
          <View className="px-6 flex-row items-center justify-between mb-4">
            <Text className="text-xl font-jakarta font-black text-text-primary">Payment History</Text>
            <TouchableOpacity><Text className="text-brand-primary font-jakarta font-bold">Export</Text></TouchableOpacity>
          </View>
          <View className="bg-surface-lowest rounded-[32px] overflow-hidden mx-6 shadow-sm border border-surface-low">
            {paymentHistory.map(item => <PaymentItem key={item.id} item={item} />)}
          </View>
        </View>

        {/* Policy Note */}
        <View className="px-6 mb-20">
          <View className="bg-surface-low p-6 rounded-[32px] flex-row gap-4">
            <Info color="#0055d4" size={24} />
            <View className="flex-1">
              <Text className="font-jakarta font-black text-text-primary mb-1">Payment Policy</Text>
              <Text className="text-text-secondary text-xs font-manrope leading-relaxed">
                Payments are processed securely via encrypted channels. Invoices are generated automatically.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
};
