import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Edit3,
  Save,
  Trash2,
  Download,
  FileText,
  Calendar,
  User,
  Tag,
  Folder,
  Home,
  X,
  Check,
  Eye,
  Share2,
  ExternalLink,
  Printer,
  FileCheck
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import { usePortfolio } from '@/hooks/portfolio-store';
import { LeaseDocument } from '@/types/property';

const DOCUMENT_TYPE_COLORS = {
  lease: '#3B82F6',
  communication: '#10B981',
  notice: '#F59E0B',
  other: '#6B7280'
};

const DOCUMENT_TYPES = [
  { value: 'lease', label: 'Lease Agreement' },
  { value: 'communication', label: 'Communication' },
  { value: 'notice', label: 'Notice' },
  { value: 'other', label: 'Other' }
];

export default function LeaseDocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    properties,
    leaseFolders,
    leaseDocuments,
    updateLeaseDocument,
    deleteLeaseDocument,
    exportLeaseDocument
  } = usePortfolio();
  
  const document = leaseDocuments.find(d => d.id === id);
  const folder = document ? leaseFolders.find(f => f.id === document.folderId) : null;
  const property = document ? properties.find(p => p.id === document.propertyId) : null;
  
  const [isEditing, setIsEditing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isPreparingFile, setIsPreparingFile] = useState(false);
  
  // Edit form state
  const [editTitle, setEditTitle] = useState(document?.title || '');
  const [editContent, setEditContent] = useState(document?.content || '');
  const [editType, setEditType] = useState<'lease' | 'communication' | 'notice' | 'other'>(document?.type || 'lease');
  const [editTenantName, setEditTenantName] = useState(document?.tenantName || '');
  const [editDocumentDate, setEditDocumentDate] = useState(document?.dateOfDocument || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editTags, setEditTags] = useState(document?.tags.join(', ') || '');
  const [editNotes, setEditNotes] = useState(document?.notes || '');

  const isImageFile = (uri?: string) => {
    if (!uri) return false;
    const clean = uri.split('?')[0].split('#')[0].toLowerCase();
    return clean.endsWith('.png') || clean.endsWith('.jpg') || clean.endsWith('.jpeg') || clean.endsWith('.webp') || clean.endsWith('.heic') || clean.endsWith('.gif');
  };

  const isPdfFile = (uri?: string) => {
    if (!uri) return false;
    const clean = uri.split('?')[0].split('#')[0].toLowerCase();
    return clean.endsWith('.pdf');
  };

  const getMimeType = (uri: string) => {
    const clean = uri.split('?')[0].split('#')[0].toLowerCase();
    if (clean.endsWith('.pdf')) return 'application/pdf';
    if (clean.endsWith('.png')) return 'image/png';
    if (clean.endsWith('.webp')) return 'image/webp';
    if (clean.endsWith('.heic')) return 'image/heic';
    if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
    if (clean.endsWith('.txt')) return 'text/plain';
    if (clean.endsWith('.csv')) return 'text/csv';
    if (clean.endsWith('.doc')) return 'application/msword';
    if (clean.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return 'application/octet-stream';
  };

  const getCleanFileName = (uri: string, title?: string) => {
    const lastPart = uri.split('?')[0].split('#')[0].split('/').pop();
    if (lastPart && lastPart.length < 40) return lastPart;
    if (title) {
      const ext = uri.split('?')[0].split('.').pop() || 'file';
      return `${title}.${ext}`;
    }
    return 'Attached Document';
  };

  const prepareLocalFile = async (sourceUri: string, defaultName: string): Promise<string> => {
    if (sourceUri.startsWith('http://') || sourceUri.startsWith('https://')) {
      const ext = sourceUri.split('?')[0].split('.').pop() || 'pdf';
      const cleanName = `${defaultName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.${ext}`;
      const localPath = `${FileSystem.cacheDirectory}${cleanName}`;
      const downloadResult = await FileSystem.downloadAsync(sourceUri, localPath);
      return downloadResult.uri;
    }
    return sourceUri;
  };

  const handleOpenInSystemApp = async () => {
    if (!document?.originalImageUri) return;
    try {
      setIsPreparingFile(true);
      const localUri = await prepareLocalFile(document.originalImageUri, document.title || 'document');
      const mime = getMimeType(document.originalImageUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          mimeType: mime,
          dialogTitle: `Open ${document.title || 'Document'}`,
          UTI: isPdfFile(document.originalImageUri) ? 'com.adobe.pdf' : undefined,
        });
      } else if (document.originalImageUri.startsWith('http://') || document.originalImageUri.startsWith('https://')) {
        await WebBrowser.openBrowserAsync(document.originalImageUri);
      } else {
        Alert.alert('Preview', 'Document is saved on device.');
      }
    } catch (error) {
      console.error('Error opening file in system app:', error);
      Alert.alert('Open Failed', 'Could not open this file with external app.');
    } finally {
      setIsPreparingFile(false);
    }
  };

  const handleOpenInBrowser = async () => {
    if (!document?.originalImageUri) return;
    try {
      if (document.originalImageUri.startsWith('http://') || document.originalImageUri.startsWith('https://')) {
        await WebBrowser.openBrowserAsync(document.originalImageUri);
      } else {
        await handleOpenInSystemApp();
      }
    } catch (error) {
      console.error('Error opening in browser:', error);
      Alert.alert('Browser Error', 'Could not open document in web browser.');
    }
  };

  const handleShareUploadedFile = async () => {
    if (!document?.originalImageUri) return;

    try {
      setIsPreparingFile(true);
      const localUri = await prepareLocalFile(document.originalImageUri, document.title || 'document');
      const mime = getMimeType(document.originalImageUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          mimeType: mime,
          dialogTitle: `Share ${document.title || 'Document'}`,
        });
      } else {
        Alert.alert('Share', 'Sharing is not supported on this device.');
      }
    } catch (error) {
      console.error('Error sharing uploaded file:', error);
      Alert.alert('Share Failed', 'Could not share this file.');
    } finally {
      setIsPreparingFile(false);
    }
  };

  if (!document) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Document Not Found' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Document not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: isEditing ? 'Edit Document' : document.title,
          headerRight: () => (
            <View style={styles.headerButtons}>
              {isEditing ? (
                <>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleCancel}
                  >
                    <X size={20} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleSave}
                  >
                    <Check size={20} color="#3B82F6" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleExport}
                    disabled={isExporting}
                  >
                    <Download size={20} color={isExporting ? '#9CA3AF' : '#3B82F6'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleEdit}
                  >
                    <Edit3 size={20} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleDelete}
                  >
                    <Trash2 size={20} color="#EF4444" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )
        }} 
      />

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {!isEditing && (
          <View style={styles.documentInfo}>
            <View style={styles.documentHeader}>
              <View style={[
                styles.documentTypeIndicator,
                { backgroundColor: DOCUMENT_TYPE_COLORS[document.type] }
              ]} />
              <View style={styles.documentHeaderInfo}>
                <Text style={styles.documentTitle}>{document.title}</Text>
                <Text style={[
                  styles.documentType,
                  { color: DOCUMENT_TYPE_COLORS[document.type] }
                ]}>
                  {document.type.charAt(0).toUpperCase() + document.type.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.documentMeta}>
              <View style={styles.metaRow}>
                <Home size={16} color="#6B7280" />
                <Text style={styles.metaText}>{property?.name || 'Unknown Property'}</Text>
              </View>
              
              {!!folder && (
                <View style={styles.metaRow}>
                  <Folder size={16} color="#6B7280" />
                  <Text style={styles.metaText}>{folder.name}</Text>
                </View>
              )}
              
              {!!document.tenantName && (
                <View style={styles.metaRow}>
                  <User size={16} color="#6B7280" />
                  <Text style={styles.metaText}>{document.tenantName}</Text>
                </View>
              )}
              
              {!!document.dateOfDocument && (
                <View style={styles.metaRow}>
                  <Calendar size={16} color="#6B7280" />
                  <Text style={styles.metaText}>
                    {new Date(document.dateOfDocument).toLocaleDateString()}
                  </Text>
                </View>
              )}
              
              {document.tags.length > 0 && (
                <View style={styles.metaRow}>
                  <Tag size={16} color="#6B7280" />
                  <Text style={styles.metaText}>{document.tags.join(', ')}</Text>
                </View>
              )}
            </View>

            <View style={styles.timestamps}>
              <Text style={styles.timestampText}>
                Created: {new Date(document.createdAt).toLocaleDateString()}
              </Text>
              <Text style={styles.timestampText}>
                Updated: {new Date(document.updatedAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.contentSection}>
          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Enter document title"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Document Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {DOCUMENT_TYPES.map(type => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeChip,
                        editType === type.value && styles.typeChipActive
                      ]}
                      onPress={() => setEditType(type.value as any)}
                    >
                      <Text style={[
                        styles.typeChipText,
                        editType === type.value && styles.typeChipTextActive
                      ]}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tenant Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editTenantName}
                  onChangeText={setEditTenantName}
                  placeholder="Enter tenant name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Document Date</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[
                    styles.datePickerText,
                    !editDocumentDate && styles.datePickerPlaceholder
                  ]}>
                    {editDocumentDate || 'Select date'}
                  </Text>
                  <Calendar size={16} color="#6B7280" />
                </TouchableOpacity>
                {!!editDocumentDate && (
                  <TouchableOpacity
                    style={styles.clearDateButton}
                    onPress={() => setEditDocumentDate('')}
                  >
                    <Text style={styles.clearDateText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tags</Text>
                <TextInput
                  style={styles.textInput}
                  value={editTags}
                  onChangeText={setEditTags}
                  placeholder="Enter tags separated by commas"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Content *</Text>
                <TextInput
                  style={[styles.textInput, styles.contentTextArea]}
                  value={editContent}
                  onChangeText={setEditContent}
                  placeholder="Enter document content"
                  multiline
                  numberOfLines={15}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Additional notes..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
          ) : (
            <>
              {!!document.originalImageUri && (
                <View style={styles.uploadedFileContainer}>
                  <View style={styles.uploadedFileHeader}>
                    {isImageFile(document.originalImageUri) ? (
                      <View style={styles.fileIconBadge}>
                        <Image
                          source={{ uri: document.originalImageUri }}
                          style={styles.fileThumb}
                          resizeMode="cover"
                        />
                      </View>
                    ) : (
                      <View style={styles.fileIconBadge}>
                        <FileText size={22} color="#2563EB" />
                      </View>
                    )}
                    <View style={styles.fileHeaderInfo}>
                      <Text style={styles.uploadedFileTitle}>
                        {isImageFile(document.originalImageUri) ? 'Attached Photo / Scan' : 'Attached Document'}
                      </Text>
                      <Text style={styles.uploadedFileName} numberOfLines={1}>
                        {getCleanFileName(document.originalImageUri, document.title)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.uploadedFileActions}>
                    <TouchableOpacity
                      style={styles.uploadedFileButtonPrimary}
                      onPress={() => setShowPreviewModal(true)}
                    >
                      <Eye size={16} color="#FFFFFF" />
                      <Text style={styles.uploadedFileButtonPrimaryText}>View</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.uploadedFileButtonSecondary}
                      onPress={handleOpenInSystemApp}
                      disabled={isPreparingFile}
                    >
                      {isPreparingFile ? (
                        <ActivityIndicator size="small" color="#2563EB" />
                      ) : (
                        <>
                          <Printer size={16} color="#2563EB" />
                          <Text style={styles.uploadedFileButtonSecondaryText}>Open / Print</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.uploadedFileButtonSecondary}
                      onPress={handleShareUploadedFile}
                      disabled={isPreparingFile}
                    >
                      <Share2 size={16} color="#2563EB" />
                      <Text style={styles.uploadedFileButtonSecondaryText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Text style={styles.contentTitle}>Document Content</Text>
              <View style={styles.contentContainer}>
                <Text style={styles.contentText}>{document.content}</Text>
              </View>
              
              {!!document.notes && (
                <>
                  <Text style={styles.contentTitle}>Notes</Text>
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesText}>{document.notes}</Text>
                  </View>
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* In-App Preview Modal */}
      {showPreviewModal && !!document.originalImageUri && (
        <Modal
          visible={showPreviewModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPreviewModal(false)}
        >
          <SafeAreaView style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleGroup}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {document.title || 'Document Preview'}
                  </Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {getCleanFileName(document.originalImageUri, document.title)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowPreviewModal(false)}
                >
                  <X size={22} color="#374151" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {isImageFile(document.originalImageUri) ? (
                  <View style={styles.imagePreviewWrapper}>
                    <Image
                      source={{ uri: document.originalImageUri }}
                      style={styles.fullImagePreview}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <View style={styles.docPreviewPlaceholder}>
                    <View style={styles.docLargeIconCircle}>
                      <FileCheck size={48} color="#2563EB" />
                    </View>
                    <Text style={styles.docPlaceholderTitle}>
                      {isPdfFile(document.originalImageUri) ? 'PDF Document Ready' : 'Document File Attached'}
                    </Text>
                    <Text style={styles.docPlaceholderSub}>
                      Open with your device's PDF viewer, Google Drive, or system app to view full pages and print.
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalActionButtonPrimary}
                  onPress={() => {
                    setShowPreviewModal(false);
                    handleOpenInSystemApp();
                  }}
                  disabled={isPreparingFile}
                >
                  {isPreparingFile ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Printer size={18} color="#FFFFFF" />
                      <Text style={styles.modalActionButtonPrimaryText}>Open in Device App / Print</Text>
                    </>
                  )}
                </TouchableOpacity>

                {Boolean(document.originalImageUri.startsWith('http://') || document.originalImageUri.startsWith('https://')) && (
                  <TouchableOpacity
                    style={styles.modalActionButtonSecondary}
                    onPress={() => {
                      setShowPreviewModal(false);
                      handleOpenInBrowser();
                    }}
                  >
                    <ExternalLink size={18} color="#2563EB" />
                    <Text style={styles.modalActionButtonSecondaryText}>Open in Web Browser</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.modalSecondaryRow}>
                  <TouchableOpacity
                    style={styles.modalHalfButton}
                    onPress={() => {
                      setShowPreviewModal(false);
                      handleShareUploadedFile();
                    }}
                  >
                    <Share2 size={16} color="#4B5563" />
                    <Text style={styles.modalHalfButtonText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalHalfButton}
                    onPress={() => setShowPreviewModal(false)}
                  >
                    <Text style={styles.modalHalfButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={editDocumentDate ? new Date(editDocumentDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setEditDocumentDate(selectedDate.toISOString().split('T')[0]);
            }
          }}
        />
      )}

      {isExporting && (
        <View style={styles.exportingOverlay}>
          <View style={styles.exportingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.exportingText}>Exporting document...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  documentInfo: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  documentTypeIndicator: {
    width: 4,
    height: 48,
    borderRadius: 2,
    marginRight: 12,
  },
  documentHeaderInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  documentType: {
    fontSize: 14,
    fontWeight: '500',
  },
  documentMeta: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  timestamps: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  timestampText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  contentSection: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  contentContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  contentText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  notesContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  notesText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  uploadedFileContainer: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  uploadedFileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  fileIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fileThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  fileHeaderInfo: {
    flex: 1,
  },
  uploadedFileTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  uploadedFileName: {
    fontSize: 13,
    color: '#4B5563',
  },
  uploadedFileActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  uploadedFileButtonPrimary: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadedFileButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadedFileButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadedFileButtonSecondaryText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderTitleGroup: {
    flex: 1,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  modalCloseButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  modalBody: {
    minHeight: 220,
    maxHeight: 380,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  imagePreviewWrapper: {
    width: '100%',
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  docPreviewPlaceholder: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  docLargeIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  docPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  docPlaceholderSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  modalFooter: {
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  modalActionButtonPrimary: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalActionButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalActionButtonSecondary: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalActionButtonSecondaryText: {
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSecondaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  modalHalfButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 11,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalHalfButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  editForm: {
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  contentTextArea: {
    height: 300,
    textAlignVertical: 'top',
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  typeChipActive: {
    backgroundColor: '#3B82F6',
  },
  typeChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  typeChipTextActive: {
    color: 'white',
  },
  exportingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportingContainer: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerText: {
    fontSize: 16,
    color: '#1F2937',
  },
  datePickerPlaceholder: {
    color: '#9CA3AF',
  },
  clearDateButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearDateText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
});