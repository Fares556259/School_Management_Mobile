import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Linking, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, FileText, Download, Search, Filter, BookOpen, Clock, FileCheck, FileCode, X, Info, GraduationCap, Building2, PartyPopper } from 'lucide-react-native';
import { studentService, parentService } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import Animated, { FadeInUp, Layout, FadeIn } from 'react-native-reanimated';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: FileText, color: '#0055d4' },
  { id: 'academic', label: 'Academic', icon: GraduationCap, color: '#8b5cf6' },
  { id: 'admin', label: 'Admin', icon: Building2, color: '#f59e0b' },
  { id: 'events', label: 'Events', icon: PartyPopper, color: '#ec4899' },
];

const FileIcon = ({ type, color }: { type: string, color: string }) => {
  const t = type.toLowerCase();
  if (t === 'pdf') return <FileText size={24} color={color} />;
  if (t === 'doc' || t === 'docx') return <FileCheck size={24} color={color} />;
  if (t === 'xls' || t === 'xlsx') return <FileCode size={24} color={color} />;
  return <BookOpen size={24} color={color} />;
};

const DocumentItem = ({ item }: { item: any }) => {
  const category = CATEGORIES.find(c => c.id === (item.category?.toLowerCase() || 'academic')) || CATEGORIES[0];
  
  const handleDownload = () => {
    if (item.url) Linking.openURL(item.url);
  };

  return (
    <Animated.View 
      entering={FadeInUp.duration(400)}
      layout={Layout.springify()}
    >
      <TouchableOpacity 
        onPress={handleDownload}
        className="bg-white p-5 rounded-[32px] flex-row items-center mb-4 border border-surface-low"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.03,
          shadowRadius: 10,
          elevation: 2
        }}
      >
        <View className="w-14 h-14 rounded-2xl bg-surface-lowest items-center justify-center mr-4">
          <View style={{ backgroundColor: category.color + '15', padding: 10, borderRadius: 14 }}>
            <FileIcon type={item.type || 'pdf'} color={category.color} />
          </View>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-jakarta font-bold text-text-primary mb-1" numberOfLines={1}>{item.name}</Text>
          <View className="flex-row items-center">
            <View style={{ backgroundColor: category.color + '10', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ color: category.color, fontSize: 10, fontWeight: '800', fontFamily: 'PlusJakartaSans-ExtraBold', textTransform: 'uppercase' }}>
                {category.label}
              </Text>
            </View>
            <Text className="text-xs text-text-muted font-manrope font-bold ml-2">• {new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>
        <View className="w-10 h-10 rounded-full bg-surface-low items-center justify-center">
          <Download size={18} color="#737c7f" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const DocumentCenterScreen = ({ navigation }: any) => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

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

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || (file.category?.toLowerCase() || 'academic') === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [files, searchQuery, activeCategory]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between bg-white border-b border-surface-low">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#2b3437" />
        </TouchableOpacity>
        
        {!isSearchVisible ? (
          <>
            <Animated.Text entering={FadeIn} className="text-xl font-jakarta font-black text-text-primary">Archive</Animated.Text>
            <TouchableOpacity onPress={() => setIsSearchVisible(true)} className="p-2 -mr-2">
              <Search size={24} color="#2b3437" />
            </TouchableOpacity>
          </>
        ) : (
          <Animated.View entering={FadeIn} className="flex-1 flex-row items-center ml-4 bg-surface-lowest px-4 py-2 rounded-2xl border border-surface-low">
            <Search size={18} color="#737c7f" />
            <TextInput
              autoFocus
              placeholder="Search documents..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2 font-jakarta font-bold text-sm text-text-primary"
              placeholderTextColor="#a0aab0"
            />
            <TouchableOpacity onPress={() => { setIsSearchVisible(false); setSearchQuery(''); }}>
              <X size={18} color="#737c7f" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} />}
      >
        <View className="px-6 pt-8 mb-6">
          <Text className="text-3xl font-jakarta font-black text-text-primary mb-2">School Archive</Text>
          <Text className="text-text-muted font-manrope font-bold text-sm">Organized resources for your children.</Text>
        </View>

        {/* Categories Scroller */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          className="mb-8 px-6"
          contentContainerStyle={{ paddingRight: 40 }}
        >
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <TouchableOpacity 
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={{ 
                  backgroundColor: isActive ? cat.color : 'white',
                  borderColor: isActive ? cat.color : '#f1f4f6'
                }}
                className="flex-row items-center px-5 py-3 rounded-2xl mr-3 border shadow-sm shadow-black/5"
              >
                <Icon size={16} color={isActive ? 'white' : cat.color} />
                <Text 
                  className="ml-2 font-jakarta font-black text-xs uppercase tracking-widest"
                  style={{ color: isActive ? 'white' : '#2b3437' }}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View className="px-6 pb-32">
          {loading ? (
            <View className="py-20 items-center">
              <ActivityIndicator size="large" color="#0055d4" />
            </View>
          ) : filteredFiles.length > 0 ? (
            filteredFiles.map((file, idx) => <DocumentItem key={file.id || idx} item={file} />)
          ) : (
            <Animated.View entering={FadeIn} className="py-20 items-center bg-white rounded-[40px] border border-surface-low border-dashed">
              <View className="w-20 h-20 bg-surface-lowest rounded-full items-center justify-center mb-6">
                <FileText size={32} color="#d1d5db" strokeWidth={1.5} />
              </View>
              <Text className="text-text-primary font-jakarta font-black text-lg">No results found</Text>
              <Text className="text-text-muted font-manrope font-bold mt-2 text-center px-10">
                {searchQuery ? `We couldn't find any documents matching "${searchQuery}"` : "This section is currently empty."}
              </Text>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
