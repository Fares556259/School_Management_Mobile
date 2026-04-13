import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, RefreshControl, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CreditCard, Download, Info, Lock, ChevronRight, AlertCircle, PieChart, Filter, DownloadCloud, ReceiptText } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';

const { width } = Dimensions.get('window');

// --- Helper Components ---

const ProgressBar = ({ progress, color = '#0055d4', height = 6 }: { progress: number, color?: string, height?: number }) => (
  <View style={{ height, width: '100%', backgroundColor: '#f1f4f6', borderRadius: height / 2, overflow: 'hidden' }}>
    <View style={{ height: '100%', width: `${Math.min(100, progress)}%`, backgroundColor: color, borderRadius: height / 2 }} />
  </View>
);

const StatusBadge = ({ status, isOverdue }: { status: string, isOverdue?: boolean }) => {
  const getColors = () => {
    if (isOverdue) return { bg: '#fef2f2', text: '#dc2626', label: 'OVERDUE' };
    switch (status) {
      case 'Paid': return { bg: '#f0fdf4', text: '#16a34a', label: 'PAID' };
      case 'Partial': return { bg: '#fffbeb', text: '#d97706', label: 'PARTIAL' };
      case 'Due': return { bg: '#fff7ed', text: '#c2410c', label: 'UPCOMING' };
      default: return { bg: '#f1f4f6', text: '#737c7f', label: 'PENDING' };
    }
  };
  const colors = getColors();
  return (
    <View style={{ backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
      <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.text, textTransform: 'uppercase' }}>{colors.label}</Text>
    </View>
  );
};

const FintechPaymentCard = ({ item }: any) => {
  const isLocked = item.status === 'Locked';
  const progress = (item.paidAmount / item.totalAmount) * 100;
  
  return (
    <TouchableOpacity 
      style={{
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: item.isOverdue ? '#fee2e2' : '#f1f4f6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 12,
        elevation: 2
      }}
      disabled={isLocked}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437' }}>{item.month}</Text>
          <Text style={{ fontSize: 12, color: '#737c7f', marginTop: 2 }}>Annual Tuition Fee</Text>
        </View>
        <StatusBadge status={item.status} isOverdue={item.isOverdue} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
        <View>
          <Text style={{ fontSize: 13, color: '#737c7f' }}>Amount Tracked</Text>
          <Text style={{ fontSize: 20, fontWeight: 'black', color: '#2b3437', marginTop: 2 }}>
            {item.paidAmount.toLocaleString()} <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#abb3b7' }}>/ {item.totalAmount.toLocaleString()} DH</Text>
          </Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: 'bold', color: progress === 100 ? '#16a34a' : '#0055d4' }}>
          {Math.round(progress)}%
        </Text>
      </View>

      <ProgressBar progress={progress} color={item.isOverdue ? '#dc2626' : (progress === 100 ? '#16a34a' : '#0055d4')} />

      <View style={{ flexDirection: 'row', marginTop: 20, gap: 10 }}>
        {item.status === 'Paid' ? (
          <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f4f6', py: 12, borderRadius: 14, paddingVertical: 12 }}>
            <DownloadCloud size={18} color="#0055d4" style={{ marginRight: 8 }} />
            <Text style={{ color: '#0055d4', fontWeight: 'bold', fontSize: 14 }}>Receipt</Text>
          </TouchableOpacity>
        ) : !isLocked ? (
          <View style={{ flex: 1, backgroundColor: item.isOverdue ? '#fef2f2' : '#f8f9fa', borderDash: [4, 4], borderWidth: 1, borderColor: item.isOverdue ? '#dc2626' : '#d1d5db', paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: item.isOverdue ? '#dc2626' : '#737c7f', fontWeight: 'bold', fontSize: 13 }}>{item.isOverdue ? 'Overdue' : 'Due'}</Text>
          </View>
        ) : (
          <View style={{ flex: 1, backgroundColor: '#f8f9fa', borderDash: [4, 4], borderWidth: 1, borderColor: '#d1d5db', paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#737c7f', fontWeight: 'bold', fontSize: 13 }}>Upcoming</Text>
          </View>
        )}
        {!isLocked && (
          <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f1f4f6', alignItems: 'center', justifyContent: 'center' }}>
            <ReceiptText size={20} color="#737c7f" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// --- Main Screen ---

export const PaymentsScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const rawHistory = [
    { id: 1, month: 'September 2023', totalAmount: 1500, paidAmount: 1500, status: 'Paid', isOverdue: false },
    { id: 2, month: 'October 2023', totalAmount: 1500, paidAmount: 1500, status: 'Paid', isOverdue: false },
    { id: 3, month: 'November 2023', totalAmount: 1500, paidAmount: 800, status: 'Partial', isOverdue: true },
    { id: 4, month: 'December 2023', totalAmount: 1500, paidAmount: 0, status: 'Due', isOverdue: false },
    {id: 5, month: 'January 2024', totalAmount: 1500, paidAmount: 0, status: 'Due', isOverdue: false },
    { id: 6, month: 'February 2024', totalAmount: 1500, paidAmount: 0, status: 'Due', isOverdue: false },
    { id: 7, month: 'March 2024', totalAmount: 1500, paidAmount: 0, status: 'Due', isOverdue: false },
    { id: 8, month: 'April 2024', totalAmount: 1500, paidAmount: 0, status: 'Due', isOverdue: false },
    { id: 9, month: 'May 2024', totalAmount: 1500, paidAmount: 0, status: 'Due', isOverdue: false },
    { id: 10, month: 'June 2024', totalAmount: 1500, paidAmount: 0, status: 'Due', isOverdue: false },
  ];

  const filteredHistory = useMemo(() => {
    let list = [...rawHistory];
    
    // Sort logic: Strictly chronological by original sequence
    list.sort((a, b) => a.id - b.id);

    if (activeFilter === 'All') return list;
    if (activeFilter === 'Paid') return list.filter(i => i.status === 'Paid');
    if (activeFilter === 'Due') return list.filter(i => i.status === 'Due' || i.status === 'Partial');
    if (activeFilter === 'Overdue') return list.filter(i => i.isOverdue);
    return list;
  }, [activeFilter]);

  const stats = useMemo(() => {
    const total = 15000;
    const paid = rawHistory.reduce((acc, curr) => acc + curr.paidAmount, 0);
    const remaining = total - paid;
    const progress = (paid / total) * 100;
    return { total, paid, remaining, progress };
  }, []);

  const filters = ['All', 'Paid', 'Due', 'Overdue'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f4f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 2, borderColor: '#0055d410' }}>
            <Image source={{ uri: 'https://i.pravatar.cc/100?u=parent' }} style={{ width: '100%', height: '100%' }} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: 'black', color: '#0055d4', marginLeft: 12 }}>SnapSchool</Text>
        </View>
        <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center' }}>
          <Bell color="#737c7f" size={20} />
          {rawHistory.some(i => i.isOverdue) && (
            <View style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 2, borderColor: 'white' }} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} tintColor="#0055d4" />}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>


          {/* Filter Bar */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Filter size={16} color="#737c7f" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#737c7f', textTransform: 'uppercase', letterSpacing: 1 }}>Filter History</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {filters.map(filter => (
                <TouchableOpacity 
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: activeFilter === filter ? '#0055d4' : 'white',
                    borderWidth: 1,
                    borderColor: activeFilter === filter ? '#0055d4' : '#f1f4f6',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: activeFilter === filter ? 'white' : '#2b3437' }}>{filter}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Payment History List */}
          <View>
            {filteredHistory.length > 0 ? (
              filteredHistory.map((item) => <FintechPaymentCard key={item.id} item={item} />)
            ) : (
              <View style={{ padding: 60, alignItems: 'center', backgroundColor: 'white', borderRadius: 32, borderStyle: 'dashed', borderWidth: 1, borderColor: '#d1d5db' }}>
                <ReceiptText size={48} color="#d1d5db" style={{ marginBottom: 16 }} />
                <Text style={{ color: '#737c7f', fontWeight: 'bold' }}>No payments found in this category</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Footer Info instead of Sticky CTA */}
      <View style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        paddingHorizontal: 20, 
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        paddingTop: 20,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#f1f4f6'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f4f6', padding: 16, borderRadius: 20 }}>
          <Info size={18} color="#0055d4" style={{ marginRight: 10 }} />
          <Text style={{ color: '#586064', fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
            Please contact the school administration to settle any outstanding balances.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};
