import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CreditCard, Download, Info, Lock, ChevronRight, AlertCircle, PieChart } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';

const StatusBadge = ({ status }: { status: string }) => {
  const getColors = () => {
    switch (status) {
      case 'Paid': return { bg: '#f0fdf4', text: '#16a34a', label: 'FULL PAYMENT' };
      case 'Partial': return { bg: '#fffbeb', text: '#d97706', label: 'PARTIAL PAID' };
      case 'Due': return { bg: '#fef2f2', text: '#dc2626', label: 'PAYMENT DUE' };
      default: return { bg: '#f1f4f6', text: '#737c7f', label: 'LOCKED' };
    }
  };
  const colors = getColors();
  return (
    <View style={{ backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
      <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.text, textTransform: 'uppercase' }}>{colors.label}</Text>
    </View>
  );
};

const PaymentItem = ({ item }: any) => {
  const isLocked = item.status === 'Locked';
  const Icon = item.status === 'Paid' ? CreditCard : 
               item.status === 'Partial' ? PieChart : 
               item.status === 'Due' ? AlertCircle : Lock;
  const iconColor = item.status === 'Paid' ? '#16a34a' : 
                    item.status === 'Partial' ? '#d97706' : 
                    item.status === 'Due' ? '#dc2626' : '#abb3b7';

  return (
    <TouchableOpacity 
      style={{
        backgroundColor: 'white',
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f4f6',
        opacity: isLocked ? 0.6 : 1
      }}
      disabled={isLocked}
    >
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
        <Icon size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#2b3437' }}>{item.month}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Text style={{ fontSize: 12, color: '#737c7f', marginRight: 8 }}>{item.amount}</Text>
          <StatusBadge status={item.status} />
        </View>
      </View>
      <View>
        {item.status === 'Paid' && (
          <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f4f6', alignItems: 'center', justifyContent: 'center' }}>
            <Download size={16} color="#0055d4" />
          </TouchableOpacity>
        )}
        {(item.status === 'Due' || item.status === 'Partial') && (
          <TouchableOpacity style={{ backgroundColor: '#0055d4', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Pay</Text>
          </TouchableOpacity>
        )}
        {isLocked && <Lock size={16} color="#abb3b7" />}
      </View>
    </TouchableOpacity>
  );
};

export const PaymentsScreen = () => {
  const { selectedChildId, children } = useAppStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const paymentHistory = [
    { id: 1, month: 'September 2023', amount: '1,500 DH', status: 'Paid' },
    { id: 2, month: 'October 2023', amount: '1,500 DH', status: 'Paid' },
    { id: 3, month: 'November 2023', amount: '1,500 DH', status: 'Partial' },
    { id: 4, month: 'December 2023', amount: '1,500 DH', status: 'Due' },
    { id: 5, month: 'January 2024', amount: '1,500 DH', status: 'Locked' },
    { id: 6, month: 'February 2024', amount: '1,500 DH', status: 'Locked' },
    { id: 7, month: 'March 2024', amount: '1,500 DH', status: 'Locked' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f4f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 2, borderColor: '#0055d410' }}>
            <Image source={{ uri: 'https://i.pravatar.cc/100?u=parent' }} style={{ width: '100%', height: '100%' }} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0055d4', marginLeft: 12 }}>SnapSchool</Text>
        </View>
        <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center' }}>
          <Bell color="#737c7f" size={20} />
          <View style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 2, borderColor: 'white' }} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} tintColor="#0055d4" />}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#2b3437' }}>Financial Overview</Text>
          <Text style={{ fontSize: 14, color: '#737c7f', marginTop: 4, marginBottom: 24 }}>Manage your academic investments and invoices.</Text>

          {/* Premium Summary Card */}
          <View style={{ 
            backgroundColor: '#0055d4', 
            borderRadius: 32, 
            padding: 24, 
            marginBottom: 32,
            shadowColor: '#0055d4',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 20,
            elevation: 8
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>Academic Year 2023-24</Text>
                <Text style={{ color: 'white', fontSize: 36, fontWeight: 'bold', marginTop: 4 }}>15,000 DH</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' }}>Total Tuition Fees</Text>
              </View>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard color="white" size={24} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', marginTop: 32, gap: 12 }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>Total Paid</Text>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 4 }}>9,500 DH</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>Balance Due</Text>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 4 }}>5,500 DH</Text>
              </View>
            </View>
          </View>

          {/* Payment History */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
             <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Payment History</Text>
             <TouchableOpacity style={{ paddingVertical: 4, paddingHorizontal: 12, backgroundColor: '#f1f4f6', borderRadius: 8 }}>
               <Text style={{ color: '#0055d4', fontSize: 12, fontWeight: 'bold' }}>Export PDF</Text>
             </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: 'white', borderRadius: 28, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 16, elevation: 2, borderWidth: 1, borderColor: '#f1f4f6' }}>
            {paymentHistory.map((item) => <PaymentItem key={item.id} item={item} />)}
          </View>

          {/* Policy Info */}
          <View style={{ mt: 32, padding: 20, backgroundColor: '#fdf2f2', borderRadius: 24, flexDirection: 'row', alignItems: 'center', marginTop: 32 }}>
            <Info size={20} color="#dc2626" style={{ marginRight: 12 }} />
            <Text style={{ flex: 1, fontSize: 12, color: '#991b1b', lineHeight: 18 }}>
              Invoices are issued on the 1st of every month. Please ensure payments are settled within 10 days to avoid service interruption.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
