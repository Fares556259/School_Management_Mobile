import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, Share, ActivityIndicator, Dimensions, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Share2, Clock, Megaphone, Download, Calendar, X } from 'lucide-react-native';
import { downloadAndPreviewPDF } from '../utils/fileUtils';
import { useLanguage } from '../context/LanguageContext';
import { useFonts } from 'expo-font';

const { width } = Dimensions.get('window');

export const AnnouncementDetailScreen = ({ route, navigation }: any) => {
  const { announcement } = route.params;
  const insets = useSafeAreaInsets();
  const { t, isRTL, language } = useLanguage();
  const [arabicFontLoaded] = useFonts({ NotoSansArabic: require('../../assets/fonts/NotoSansArabic.ttf') });
  const arabicText = isRTL && arabicFontLoaded ? { fontFamily: 'NotoSansArabic', fontWeight: 'normal' as const, letterSpacing: 0 } : undefined;

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
  const imageUrl = announcement.image && announcement.image.trim() !== '' && announcement.image !== 'null'
    ? announcement.image
    : null;
  const date = new Date(announcement.date);
  const locale = language === 'ar' ? 'ar-TN-u-nu-latn' : language === 'fr' ? 'fr-TN' : 'en-GB';
  const dateLabel = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
  const categoryLabel = isUrgent ? t.urgentBadge : t.schoolNewsBadge;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView showsVerticalScrollIndicator={false} bounces contentContainerStyle={{ paddingBottom: 54 }}>
        
        {/* Hero Image Section */}
        <View style={{ width: '100%', height: imageUrl ? 258 : 190, position: 'relative', backgroundColor: '#194F7A' }}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 28 }}>
              <View style={{ width: 62, height: 62, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                <Megaphone color="#FFFFFF" size={30} />
              </View>
            </View>
          )}
          {/* Gradient Overlay for better header visibility */}
          <View style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, height: 105,
            backgroundColor: 'rgba(8,18,32,0.36)',
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
                  backgroundColor: 'rgba(12,28,48,0.46)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
                }}
              >
                <ChevronLeft color="#ffffff" size={26} style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleShare}
                style={{ 
                  width: 44, height: 44, 
                  alignItems: 'center', justifyContent: 'center', 
                  borderRadius: 22, 
                  backgroundColor: 'rgba(12,28,48,0.46)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)'
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
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          marginTop: -24,
          paddingHorizontal: 22,
          paddingTop: 24,
          paddingBottom: 28,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.045,
          shadowRadius: 12,
          elevation: 5,
        }}>
          
          {/* Metadata Row */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ 
              backgroundColor: isUrgent ? '#fee2e2' : '#e0f2fe', 
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
            }}>
              <Text style={[{
                fontSize: 12, 
                fontWeight: '800', 
                color: isUrgent ? '#ef4444' : '#0284c7', 
                textTransform: 'uppercase',
                letterSpacing: 0.8
              }, arabicText]}>
                {categoryLabel}
              </Text>
            </View>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', marginHorizontal: 12 }} />
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
              <Calendar size={14} color="#94a3b8" />
              <Text style={[{ fontSize: 12, color: '#718096', marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0, fontWeight: '700' }, arabicText]}>{dateLabel}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[{
            fontSize: 25,
            fontWeight: '900', 
            color: '#0f172a', 
            lineHeight: 32,
            marginBottom: 18,
            letterSpacing: -0.5,
            textAlign: isRTL ? 'right' : 'left'
          }, arabicText]}>
            {announcement.title}
          </Text>

          {/* Author / School Admin Banner */}
          <View style={{ 
            flexDirection: isRTL ? 'row-reverse' : 'row', 
            alignItems: 'center', 
            marginBottom: 22,
            backgroundColor: '#F5F8FB',
            padding: 12,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: '#f1f5f9'
          }}>
            <View style={{ 
              width: 40, height: 40,
              borderRadius: 13,
              backgroundColor: '#E3F0FF',
              alignItems: 'center', justifyContent: 'center' 
            }}>
              <Megaphone color="#0B63CE" size={19} />
            </View>
            <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text numberOfLines={1} style={[{ fontSize: 14, fontWeight: '800', color: '#243044' }, arabicText]}>{schoolName} {t.announcementAdmin || 'Admin'}</Text>
              <Text style={[{ fontSize: 12, color: '#718096', marginTop: 1 }, arabicText]}>{t.officialCommunication || 'Official Communication'}</Text>
            </View>
          </View>

          {/* Full Content Text */}
          <View style={{ marginBottom: 26 }}>
            <Text style={[{
              fontSize: 16, 
              color: '#334155', 
              lineHeight: 26,
              textAlign: isRTL ? 'right' : 'left'
            }, arabicText]}>
              {announcement.content}
            </Text>
          </View>

          {/* Attached Images */}
          {announcement.images && announcement.images.length > 0 && (
            <View style={{ marginBottom: 24, gap: 12 }}>
              {announcement.images.map((imgUrl: string, index: number) => (
                <TouchableOpacity key={index} onPress={() => setSelectedImage(imgUrl)} activeOpacity={0.8}>
                  <Image 
                    source={{ uri: imgUrl }} 
                    style={{ width: '100%', height: 220, borderRadius: 18, borderWidth: 1, borderColor: '#E3E8EF' }}
                    resizeMode="cover"
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
                padding: 14,
                borderRadius: 18,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1 }}>
                <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: '#0B6FE8', alignItems: 'center', justifyContent: 'center' }}>
                  <Download color="#ffffff" size={20} />
                </View>
                <View style={{ marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0, flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[{ fontSize: 15, fontWeight: '800', color: '#1e293b' }, arabicText]}>{t.attachedDocument || 'Attached Document'}</Text>
                  <Text style={[{ fontSize: 12, color: '#64748b', marginTop: 2 }, arabicText]}>{t.tapToViewPdf || 'Tap to view PDF file'}</Text>
                </View>
              </View>
              {downloading ? (
                <ActivityIndicator size="small" color="#3b82f6" style={{ marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0 }} />
              ) : null}
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal visible={!!selectedImage} transparent={true} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
          <View style={{ 
            flexDirection: isRTL ? 'row-reverse' : 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            paddingHorizontal: 24, 
            paddingTop: Math.max(insets.top, 50) + 10, 
            paddingBottom: 20, 
            position: 'absolute',
            top: 0, left: 0, right: 0,
            zIndex: 999 
          }}>
            <TouchableOpacity 
              onPress={() => setSelectedImage(null)}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
            >
              <X color="#fff" size={24} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => selectedImage && handleDownloadImage(selectedImage)}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
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
        </View>
      </Modal>
    </View>
  );
};
