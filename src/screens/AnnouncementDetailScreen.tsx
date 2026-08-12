import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, Share, ActivityIndicator, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Share2, Clock, Megaphone, Download, Calendar, X } from 'lucide-react-native';
import { downloadAndPreviewPDF } from '../utils/fileUtils';
import moment from 'moment';

const { width } = Dimensions.get('window');

export const AnnouncementDetailScreen = ({ route, navigation }: any) => {
  const { announcement } = route.params;

  const [downloading, setDownloading] = React.useState(false);
  const [downloadingImage, setDownloadingImage] = React.useState(false);
  const [schoolName, setSchoolName] = React.useState('School');
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

  React.useEffect(() => {
    import('../services/api').then(({ parentService }) => {
      parentService.fetchSchoolInfo().then(res => {
        if (res && res.schoolName) {
          setSchoolName(res.schoolName);
        }
      }).catch(() => {});
    });
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${announcement.title}\n\n${announcement.content}`,
        title: announcement.title,
      });
    } catch (error) {
      console.error('Error sharing announcement:', error);
    }
  };

  const handleDownload = async () => {
    if (!announcement.pdfUrl || announcement.pdfUrl === 'null') return;
    try {
      setDownloading(true);
      await downloadAndPreviewPDF(announcement.pdfUrl, `Announcement_${announcement.id}.pdf`);
    } catch (error) {
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadImage = async (imgUrl: string) => {
    try {
      setDownloadingImage(true);
      const fileName = `Image_${Date.now()}.jpg`;
      await downloadAndPreviewPDF(imgUrl, fileName);
    } catch (error) {
      console.error(error);
    } finally {
      setDownloadingImage(false);
    }
  };

  const isUrgent = announcement.category?.toUpperCase() === 'URGENT';
  const defaultImage = 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2000&auto=format&fit=crop';
  
  const imageUrl = announcement.image && announcement.image.trim() !== '' && announcement.image !== 'null' 
    ? announcement.image 
    : defaultImage;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Hero Image Section */}
        <View style={{ width: '100%', height: 320, position: 'relative' }}>
          <Image 
            source={{ uri: imageUrl }} 
            style={{ width: '100%', height: '100%' }} 
            resizeMode="cover"
          />
          {/* Gradient Overlay for better header visibility */}
          <View style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, height: 120,
            backgroundColor: 'rgba(0,0,0,0.4)',
          }} />

          {/* Header Controls (Overlay) */}
          <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              paddingHorizontal: 20, 
              paddingTop: 10,
            }}>
              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={{ 
                  width: 44, height: 44, 
                  alignItems: 'center', justifyContent: 'center', 
                  borderRadius: 22, 
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <ChevronLeft color="#ffffff" size={28} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleShare}
                style={{ 
                  width: 44, height: 44, 
                  alignItems: 'center', justifyContent: 'center', 
                  borderRadius: 22, 
                  backgroundColor: 'rgba(255,255,255,0.2)'
                }}
              >
                <Share2 color="#ffffff" size={22} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Content Card (Overlaps Image) */}
        <View style={{ 
          backgroundColor: '#ffffff', 
          borderTopLeftRadius: 32, 
          borderTopRightRadius: 32, 
          marginTop: -40,
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 40,
          minHeight: 500,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.05,
          shadowRadius: 15,
          elevation: 10,
        }}>
          
          {/* Metadata Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ 
              backgroundColor: isUrgent ? '#fee2e2' : '#e0f2fe', 
              paddingHorizontal: 12, 
              paddingVertical: 6, 
              borderRadius: 8 
            }}>
              <Text style={{ 
                fontSize: 12, 
                fontWeight: '800', 
                color: isUrgent ? '#ef4444' : '#0284c7', 
                textTransform: 'uppercase',
                letterSpacing: 0.8
              }}>
                {announcement.category}
              </Text>
            </View>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', marginHorizontal: 12 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Calendar size={14} color="#94a3b8" />
              <Text style={{ fontSize: 13, color: '#64748b', marginLeft: 6, fontWeight: '500' }}>{moment(announcement.date).format('DD MMM, YYYY')}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={{ 
            fontSize: 28, 
            fontWeight: '900', 
            color: '#0f172a', 
            lineHeight: 36,
            marginBottom: 24,
            letterSpacing: -0.5
          }}>
            {announcement.title}
          </Text>

          {/* Author / School Admin Banner */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: 32,
            backgroundColor: '#f8fafc',
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#f1f5f9'
          }}>
            <View style={{ 
              width: 44, height: 44, 
              borderRadius: 22, 
              backgroundColor: '#3b82f6', 
              alignItems: 'center', justifyContent: 'center' 
            }}>
              <Megaphone color="#ffffff" size={20} />
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b' }}>{schoolName} Admin</Text>
              <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Official Communication</Text>
            </View>
          </View>

          {/* Full Content Text */}
          <View style={{ marginBottom: 40 }}>
            <Text style={{ 
              fontSize: 16, 
              color: '#334155', 
              lineHeight: 28,
              textAlign: 'left'
            }}>
              {announcement.content}
            </Text>
          </View>

          {/* Attached Images */}
          {announcement.images && announcement.images.length > 0 && (
            <View style={{ marginBottom: 32, gap: 16 }}>
              {announcement.images.map((imgUrl: string, index: number) => (
                <TouchableOpacity key={index} onPress={() => setSelectedImage(imgUrl)} activeOpacity={0.8}>
                  <Image 
                    source={{ uri: imgUrl }} 
                    style={{ width: '100%', height: 250, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' }}
                    contentFit="cover"
                    transition={200}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Download Button Component */}
          {!!announcement.pdfUrl && announcement.pdfUrl.trim() !== '' && announcement.pdfUrl !== 'null' && (
            <TouchableOpacity 
              onPress={handleDownload}
              style={{
                backgroundColor: '#eff6ff',
                borderWidth: 1.5,
                borderColor: '#bfdbfe',
                padding: 18,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 32,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' }}>
                  <Download color="#ffffff" size={20} />
                </View>
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>Attached Document</Text>
                  <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Tap to view PDF file</Text>
                </View>
              </View>
              {downloading ? (
                <ActivityIndicator size="small" color="#3b82f6" style={{ marginLeft: 10 }} />
              ) : null}
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal visible={!!selectedImage} transparent={true} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, zIndex: 10 }}>
              <TouchableOpacity 
                onPress={() => setSelectedImage(null)}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}
              >
                <X color="#fff" size={24} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => selectedImage && handleDownloadImage(selectedImage)}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}
              >
                {downloadingImage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Download color="#fff" size={22} />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              {selectedImage && (
                <Image
                  source={{ uri: selectedImage }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};
