import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, router } from 'expo-router';
import {
  FileText,
  Folder,
  Calendar,
  User,
  Tag,
  Type,
  Check,
  X
} from 'lucide-react-native';
import { usePortfolio } from '@/hooks/portfolio-store';
import { LeaseDocument, LeaseFolder } from '@/types/property';

const DOCUMENT_TYPES = [
  { value: 'lease', label: 'Lease Agreement' },
  { value: 'communication', label: 'Communication' },
  { value: 'notice', label: 'Notice' },
  { value: 'other', label: 'Other' }
];

export default function CreateLeaseDocumentScreen() {
  const {
    properties,
    leaseFolders,
    addLeaseFolder,
    addLeaseDocument
  } = usePortfolio();
  
  // Form fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [documentType, setDocumentType] = useState<'lease' | 'communication' | 'notice' | 'other'>('lease');
  const [tenantName, setTenantName] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');

  const availableFolders = selectedProperty 
    ? leaseFolders.filter(f => f.propertyId === selectedProperty)
    : [];

  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateFolder = async () => {
    if (!selectedProperty) {
      Alert.alert('Error', 'Please select a property first.');
      return;
    }

    setNewFolderName('');
    setShowCreateFolderModal(true);
  };

  const handleCreateFolderConfirm = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name.');
      return;
    }

    try {
      const folder: LeaseFolder = {
        id: Date.now().toString(),
        name: newFolderName.trim(),
        propertyId: selectedProperty,
        color: '#3B82F6',
        createdAt: new Date().toISOString()
      };
      
      await addLeaseFolder(folder);
      setSelectedFolder(folder.id);
      setShowCreateFolderModal(false);
      setNewFolderName('');
    } catch (error) {
      console.error('Error creating folder:', error);
      Alert.alert('Error', 'Failed to create folder. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a document title.');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Error', 'Please enter document content.');
      return;
    }

    if (!selectedProperty) {
      Alert.alert('Error', 'Please select a property.');
      return;
    }

    if (!selectedFolder) {
      Alert.alert('Error', 'Please select or create a folder.');
      return;
    }

    try {
      const document: LeaseDocument = {
        id: Date.now().toString(),
        folderId: selectedFolder,
        propertyId: selectedProperty,
        type: documentType,
        title: title.trim(),
        content: content.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        tenantName: tenantName.trim() || undefined,
        dateOfDocument: documentDate || undefined,
        notes: notes.trim() || undefined
      };

      await addLeaseDocument(document);
      
      Alert.alert(
        'Success',
        'Document created successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error saving document:', error);
      Alert.alert('Error', 'Failed to save document. Please try again.');
    }
  };

  const canSave = title.trim() && content.trim() && selectedProperty && selectedFolder;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Create Document',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.back()}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleSave}
                disabled={!canSave}
              >
                <Check size={20} color={canSave ? '#3B82F6' : '#9CA3AF'} />
              </TouchableOpacity>
            </View>
          )
        }} 
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Document Details</Text>
          
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <FileText size={16} color="#6B7280" />
              <Text style={styles.inputLabel}>Title *</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter document title"
              testID="title-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Type size={16} color="#6B7280" />
              <Text style={styles.inputLabel}>Document Type</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {DOCUMENT_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeChip,
                    documentType === type.value && styles.typeChipActive
                  ]}
                  onPress={() => setDocumentType(type.value as any)}
                >
                  <Text style={[
                    styles.typeChipText,
                    documentType === type.value && styles.typeChipTextActive
                  ]}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Property *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {properties.map(property => (
                <TouchableOpacity
                  key={property.id}
                  style={[
                    styles.propertyChip,
                    selectedProperty === property.id && styles.propertyChipActive
                  ]}
                  onPress={() => {
                    setSelectedProperty(property.id);
                    setSelectedFolder(''); // Reset folder selection
                  }}
                >
                  <Text style={[
                    styles.propertyChipText,
                    selectedProperty === property.id && styles.propertyChipTextActive
                  ]}>{property.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {selectedProperty && (
            <View style={styles.inputGroup}>
              <View style={styles.folderHeader}>
                <View style={styles.inputLabelRow}>
                  <Folder size={16} color="#6B7280" />
                  <Text style={styles.inputLabel}>Folder *</Text>
                </View>
                <TouchableOpacity
                  style={styles.createFolderButton}
                  onPress={handleCreateFolder}
                  testID="create-folder-button"
                >
                  <Text style={styles.createFolderButtonText}>+ New Folder</Text>
                </TouchableOpacity>
              </View>
              
              {availableFolders.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {availableFolders.map(folder => (
                    <TouchableOpacity
                      key={folder.id}
                      style={[
                        styles.folderChip,
                        { borderColor: folder.color },
                        selectedFolder === folder.id && { backgroundColor: folder.color }
                      ]}
                      onPress={() => setSelectedFolder(folder.id)}
                    >
                      <Text style={[
                        styles.folderChipText,
                        selectedFolder === folder.id && styles.folderChipTextActive
                      ]}>{folder.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noFoldersText}>
                  No folders available. Create one to organize your documents.
                </Text>
              )}
            </View>
          )}

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <User size={16} color="#6B7280" />
              <Text style={styles.inputLabel}>Tenant Name</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={tenantName}
              onChangeText={setTenantName}
              placeholder="Enter tenant name"
              testID="tenant-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Calendar size={16} color="#6B7280" />
              <Text style={styles.inputLabel}>Document Date</Text>
            </View>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
              testID="date-picker-button"
            >
              <Text style={[
                styles.datePickerText,
                !documentDate && styles.datePickerPlaceholder
              ]}>
                {documentDate || 'Select date'}
              </Text>
              <Calendar size={16} color="#6B7280" />
            </TouchableOpacity>
            {documentDate && (
              <TouchableOpacity
                style={styles.clearDateButton}
                onPress={() => setDocumentDate('')}
              >
                <Text style={styles.clearDateText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Tag size={16} color="#6B7280" />
              <Text style={styles.inputLabel}>Tags</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={tags}
              onChangeText={setTags}
              placeholder="Enter tags separated by commas"
              testID="tags-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Document Content *</Text>
            <TextInput
              style={[styles.textInput, styles.contentTextArea]}
              value={content}
              onChangeText={setContent}
              placeholder="Enter the document content here..."
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              testID="content-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              testID="notes-input"
            />
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
              Create Document
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={documentDate ? new Date(documentDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setDocumentDate(selectedDate.toISOString().split('T')[0]);
            }
          }}
        />
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Create New Folder</Text>
            
            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Folder Name</Text>
              <TextInput
                style={styles.modalInput}
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder="Enter folder name"
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCreateFolderModal(false);
                  setNewFolderName('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCreateButton}
                onPress={handleCreateFolderConfirm}
              >
                <Text style={styles.modalCreateButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
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
  formSection: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
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
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    height: 200,
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
  propertyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  propertyChipActive: {
    backgroundColor: '#10B981',
  },
  propertyChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  propertyChipTextActive: {
    color: 'white',
  },
  folderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  createFolderButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EBF8FF',
    borderRadius: 6,
  },
  createFolderButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  folderChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 2,
  },
  folderChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  folderChipTextActive: {
    color: 'white',
  },
  noFoldersText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#9CA3AF',
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 32,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    color: '#1F2937',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCreateButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCreateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});