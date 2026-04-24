import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Linking, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, FileText, Download, Search, Filter, BookOpen, Clock, FileCheck, FileCode } from 'lucide-react-native';
import { studentService, parentService } from '../services/api';
import { useAppStore } from '../store/useAppStore';

const FileIcon = ({ type, color }: { type: string, color: string }) => {
  const t = type.toLowerCase();
  if (t === 'pdf') return <FileText size={24} color={color} />;
  if (t === 'doc' || t === 'docx') return <FileCheck size={24} color={color} />;
  if (t === 'xls' || t === 'xlsx') return <FileCode size={24} color={color} />;
  return <BookOpen size={24} color={color} />;
};

const DocumentItem = ({ item }: { item: any }) => {
  const handleDownload = () => {
    if (item.url) Linking.openURL(item.url);
  };

  return (
    <TouchableOpacity 
      onPress={handleDownload}
      className="bg-white p-5 rounded-[28px] flex-row items-center mb-4 border border-surface-low"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2
      }}
    >
      <View className="w-14 h-14 rounded-2xl bg-brand-primary/5 items-center justify-center mr-4">
        <FileIcon type={item.type || 'pdf'} color="#0055d4" />
      </View>
      <View className="flex-1">
        <Text className="text-lg font-jakarta font-bold text-text-primary mb-1" numberOfLines={1}>{item.name}</Text>
        <View className="flex-row items-center">
          <Text className="text-xs text-brand-primary font-jakarta font-black uppercase tracking-wider">{item.studentName || 'School'}</Text>
          <Text className="text-xs text-text-muted font-manrope font-bold ml-2">• {new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
      <View className="w-10 h-10 rounded-full bg-surface-low items-center justify-center">
        <Download size={18} color="#737c7f" />
      </View>
    </TouchableOpacity>
  );
};

export const DocumentCenterScreen = ({ navigation }: any) => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFiles = async () => {
    try {
      const parentId = await parentService.getParentId();
      if (parentId) {
        const data = await studentService.fetchAllFiles(parentId);
        setFiles(data);
      }
    } catch (error) {
      console.error("[DOC-CENTER-ERROR]", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadFiles();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between bg-white border-b border-surface-low">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#2b3437" />
        </TouchableOpacity>
        <Text className="text-xl font-jakarta font-black text-text-primary">Document Center</Text>
        <TouchableOpacity className="p-2 -mr-2">
          <Search size={24} color="#2b3437" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} />}
      >
        <View className="mb-8">
          <Text className="text-2xl font-jakarta font-black text-text-primary mb-2">School Archive</Text>
          <Text className="text-text-muted font-manrope font-bold">All your children's resources in one place.</Text>
        </View>

        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#0055d4" />
          </View>
        ) : files.length > 0 ? (
          <View className="pb-20">
            {files.map((file, idx) => <DocumentItem key={file.id || idx} item={file} />)}
          </View>
        ) : (
          <View className="py-20 items-center bg-white rounded-[32px] border border-surface-low border-dashed">
            <FileText size={48} color="#d1d5db" strokeWidth={1} />
            <Text className="text-text-muted font-jakarta font-bold mt-4">No documents shared yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
