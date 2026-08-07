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
  ActivityIndicator
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
  Check
} from 'lucide-react-native';
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
  
  // Edit form state
  const [editTitle, setEditTitle] = useState(document?.title || '');
  const [editContent, setEditContent] = useState(document?.content || '');
  const [editType, setEditType] = useState<'lease' | 'communication' | 'notice' | 'other'>(document?.type || 'lease');
  const [editTenantName, setEditTenantName] = useState(document?.tenantName || '');
  const [editDocumentDate, setEditDocumentDate] = useState(document?.dateOfDocument || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editTags, setEditTags] = useState(document?.tags.join(', ') || '');
  const [editNotes, setEditNotes] = useState(document?.notes || '');

  const handleEdit = () => {
    if (!document) return;
    
    setEditTitle(document.title);
    setEditContent(document.content);
    setEditType(document.type);
    setEditTenantName(document.tenantName || '');
    setEditDocumentDate(document.dateOfDocument || '');
    setEditTags(document.tags.join(', '));
    setEditNotes(document.notes || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!document) return;
    
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Please enter a document title.');
      return;
    }
    
    if (!editContent.trim()) {
      Alert.alert('Error', 'Please enter document content.');
      return;
    }

    const updates = {
      title: editTitle.trim(),
      content: editContent.trim(),
      type: editType,
      tenantName: editTenantName.trim() || undefined,
      dateOfDocument: editDocumentDate || undefined,
      tags: editTags.split(',').map(tag => tag.trim()).filter(tag => tag),
      notes: editNotes.trim() || undefined
    };

    updateLeaseDocument(document.id, updates);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!document) return;

    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteLeaseDocument(document.id);
            router.back();
          }
        }
      ]
    );
  };

  const handleExport = async () => {
    if (!document) return;

    try {
      setIsExporting(true);
      await exportLeaseDocument(document.id);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Error', 'Failed to export document. Please try again.');
    } finally {
      setIsExporting(false);
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