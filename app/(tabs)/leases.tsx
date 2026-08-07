import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import {
  Search,
  Plus,
  Folder,
  FileText,
  Filter,
  Camera,
  Users,
  Calendar,
  Tag,
  Edit3,
  Trash2
} from 'lucide-react-native';
import { usePortfolio, usePropertyLeaseFolders, usePropertyLeaseDocuments } from '@/hooks/portfolio-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeaseFolder, LeaseDocument } from '@/types/property';

const FOLDER_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
];

const DOCUMENT_TYPE_COLORS = {
  lease: '#3B82F6',
  communication: '#10B981',
  notice: '#F59E0B',
  other: '#6B7280'
};

export default function LeasesScreen() {
  const { properties, leaseFolders, leaseDocuments, addLeaseFolder, updateLeaseFolder, deleteLeaseFolder, isLoading } = usePortfolio();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter folders and documents based on search and filters
  const filteredData = useMemo(() => {
    let folders = leaseFolders;
    let documents = leaseDocuments;

    // Filter by property
    if (selectedProperty !== 'all') {
      folders = folders.filter(f => f.propertyId === selectedProperty);
      documents = documents.filter(d => d.propertyId === selectedProperty);
    }

    // Filter by document type
    if (selectedDocumentType !== 'all') {
      documents = documents.filter(d => d.type === selectedDocumentType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      folders = folders.filter(f => 
        f.name.toLowerCase().includes(query)
      );
      documents = documents.filter(d => 
        d.title.toLowerCase().includes(query) ||
        d.content.toLowerCase().includes(query) ||
        d.tenantName?.toLowerCase().includes(query) ||
        d.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return { folders, documents };
  }, [leaseFolders, leaseDocuments, selectedProperty, selectedDocumentType, searchQuery]);

  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedPropertyForFolder, setSelectedPropertyForFolder] = useState('');
  const [editingFolder, setEditingFolder] = useState<LeaseFolder | null>(null);
  const [editFolderName, setEditFolderName] = useState('');

  const handleCreateFolder = () => {
    if (properties.length === 0) {
      Alert.alert('No Properties', 'Please add a property first before creating folders.');
      return;
    }

    setNewFolderName('');
    setSelectedPropertyForFolder(properties.length === 1 ? properties[0].id : '');
    setShowCreateFolderModal(true);
  };

  const handleCreateFolderConfirm = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name.');
      return;
    }

    if (!selectedPropertyForFolder) {
      Alert.alert('Error', 'Please select a property.');
      return;
    }

    try {
      const folder: LeaseFolder = {
        id: Date.now().toString(),
        name: newFolderName.trim(),
        propertyId: selectedPropertyForFolder,
        color: FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)],
        createdAt: new Date().toISOString()
      };
      await addLeaseFolder(folder);
      setShowCreateFolderModal(false);
      setNewFolderName('');
      setSelectedPropertyForFolder('');
    } catch (error) {
      console.error('Error creating folder:', error);
      Alert.alert('Error', 'Failed to create folder. Please try again.');
    }
  };

  const handleScanDocument = () => {
    if (properties.length === 0) {
      Alert.alert('No Properties', 'Please add a property first before scanning documents.');
      return;
    }

    router.push('/scan-lease-document' as any);
  };

  const handleCreateDocument = () => {
    if (properties.length === 0) {
      Alert.alert('No Properties', 'Please add a property first before creating documents.');
      return;
    }

    router.push('/create-lease-document' as any);
  };

  const handleEditFolder = (folder: LeaseFolder) => {
    setEditingFolder(folder);
    setEditFolderName(folder.name);
  };

  const handleSaveEditFolder = async () => {
    if (!editingFolder || !editFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name.');
      return;
    }

    if (editFolderName.trim() === editingFolder.name) {
      setEditingFolder(null);
      setEditFolderName('');
      return;
    }

    try {
      await updateLeaseFolder(editingFolder.id, { name: editFolderName.trim() });
      setEditingFolder(null);
      setEditFolderName('');
    } catch (error) {
      console.error('Error updating folder:', error);
      Alert.alert('Error', 'Failed to update folder name. Please try again.');
    }
  };

  const handleCancelEditFolder = () => {
    setEditingFolder(null);
    setEditFolderName('');
  };

  const handleDeleteFolder = (folder: LeaseFolder) => {
    const documentsInFolder = leaseDocuments.filter(d => d.folderId === folder.id);
    
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folder.name}"?${documentsInFolder.length > 0 ? ` This will also delete ${documentsInFolder.length} document${documentsInFolder.length !== 1 ? 's' : ''} in this folder.` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLeaseFolder(folder.id);
            } catch (error) {
              console.error('Error deleting folder:', error);
              Alert.alert('Error', 'Failed to delete folder. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderFolderCard = (folder: LeaseFolder) => {
    const property = properties.find(p => p.id === folder.propertyId);
    const documentsInFolder = leaseDocuments.filter(d => d.folderId === folder.id);

    return (
      <View key={folder.id} style={[styles.folderCard, { borderLeftColor: folder.color }]}>
        <TouchableOpacity
          style={styles.folderContent}
          onPress={() => router.push(`/lease-folder/${folder.id}` as any)}
          testID={`folder-${folder.id}`}
        >
          <View style={styles.folderHeader}>
            <View style={styles.folderIconContainer}>
              <Folder size={24} color={folder.color} />
            </View>
            <View style={styles.folderInfo}>
              <Text style={styles.folderName}>{folder.name}</Text>
              <Text style={styles.folderProperty}>{property?.name || 'Unknown Property'}</Text>
              <Text style={styles.folderStats}>
                {documentsInFolder.length} document{documentsInFolder.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <Text style={styles.folderDate}>
            Created {new Date(folder.createdAt).toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.folderActions}>
          <TouchableOpacity
            style={styles.folderActionButton}
            onPress={() => handleEditFolder(folder)}
            testID={`edit-folder-${folder.id}`}
          >
            <Edit3 size={16} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.folderActionButton}
            onPress={() => handleDeleteFolder(folder)}
            testID={`delete-folder-${folder.id}`}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDocumentCard = (document: LeaseDocument) => {
    const property = properties.find(p => p.id === document.propertyId);
    const folder = leaseFolders.find(f => f.id === document.folderId);

    return (
      <TouchableOpacity
        key={document.id}
        style={[
          styles.documentCard,
          { borderLeftColor: DOCUMENT_TYPE_COLORS[document.type] }
        ]}
        onPress={() => router.push(`/lease-document/${document.id}` as any)}
        testID={`document-${document.id}`}
      >
        <View style={styles.documentHeader}>
          <View style={styles.documentIconContainer}>
            <FileText size={20} color={DOCUMENT_TYPE_COLORS[document.type]} />
          </View>
          <View style={styles.documentInfo}>
            <Text style={styles.documentTitle}>{document.title}</Text>
            <Text style={styles.documentProperty}>{property?.name || 'Unknown Property'}</Text>
            {!!folder && (
              <View style={styles.documentFolderRow}>
                <Folder size={12} color="#9CA3AF" />
                <Text style={styles.documentFolder}>{folder.name}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.documentMeta}>
          <View style={styles.documentMetaRow}>
            <Text style={styles.documentType}>
              {document.type.charAt(0).toUpperCase() + document.type.slice(1)}
            </Text>
            {!!document.tenantName && (
              <View style={styles.documentTenantRow}>
                <Users size={12} color="#6B7280" />
                <Text style={styles.documentTenant}>{document.tenantName}</Text>
              </View>
            )}
          </View>
          
          {!!document.dateOfDocument && (
            <View style={styles.documentDateRow}>
              <Calendar size={12} color="#6B7280" />
              <Text style={styles.documentDate}>
                {new Date(document.dateOfDocument).toLocaleDateString()}
              </Text>
            </View>
          )}
          
          {document.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <Tag size={12} color="#6B7280" />
              <Text style={styles.tagsText}>
                {document.tags.slice(0, 3).join(', ')}
                {document.tags.length > 3 ? ` +${document.tags.length - 3}` : ''}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.documentUpdated}>
          Updated {new Date(document.updatedAt).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading lease documents...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>

      <View style={styles.toolbarContainer}>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowFilters(!showFilters)}
            testID="filter-button"
          >
            <Filter size={20} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleScanDocument}
            testID="scan-button"
          >
            <Camera size={20} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleCreateFolder}
            testID="add-folder-button"
          >
            <Plus size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search folders and documents..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="search-input"
          />
        </View>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedProperty === 'all' && styles.filterChipActive
              ]}
              onPress={() => setSelectedProperty('all')}
            >
              <Text style={[
                styles.filterChipText,
                selectedProperty === 'all' && styles.filterChipTextActive
              ]}>All Properties</Text>
            </TouchableOpacity>
            
            {properties.map(property => (
              <TouchableOpacity
                key={property.id}
                style={[
                  styles.filterChip,
                  selectedProperty === property.id && styles.filterChipActive
                ]}
                onPress={() => setSelectedProperty(property.id)}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedProperty === property.id && styles.filterChipTextActive
                ]}>{property.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFilters}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedDocumentType === 'all' && styles.filterChipActive
              ]}
              onPress={() => setSelectedDocumentType('all')}
            >
              <Text style={[
                styles.filterChipText,
                selectedDocumentType === 'all' && styles.filterChipTextActive
              ]}>All Types</Text>
            </TouchableOpacity>
            
            {Object.keys(DOCUMENT_TYPE_COLORS).map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  selectedDocumentType === type && styles.filterChipActive
                ]}
                onPress={() => setSelectedDocumentType(type)}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedDocumentType === type && styles.filterChipTextActive
                ]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {properties.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No Properties Found</Text>
            <Text style={styles.emptyStateText}>
              Add a property first to start managing lease documents and communications.
            </Text>
            <TouchableOpacity
              style={styles.addPropertyButton}
              onPress={() => router.push('/add-property' as any)}
            >
              <Text style={styles.addPropertyButtonText}>Add Property</Text>
            </TouchableOpacity>
          </View>
        ) : filteredData.folders.length === 0 && filteredData.documents.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No Documents Found</Text>
            <Text style={styles.emptyStateText}>
              Create folders to organize your lease agreements and communications.
            </Text>
            <View style={styles.emptyStateButtons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCreateFolder}
              >
                <Folder size={16} color="white" />
                <Text style={styles.primaryButtonText}>Create Folder</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleScanDocument}
              >
                <Camera size={16} color="#3B82F6" />
                <Text style={styles.secondaryButtonText}>Scan Document</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {filteredData.folders.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Folders ({filteredData.folders.length})</Text>
                {filteredData.folders.map(renderFolderCard)}
              </View>
            )}
            
            {filteredData.documents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Documents ({filteredData.documents.length})</Text>
                {filteredData.documents
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .slice(0, 10)
                  .map(renderDocumentCard)
                }
              </View>
            )}
          </>
        )}
      </ScrollView>

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
                testID="folder-name-input"
              />
            </View>

            {properties.length > 1 && (
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Property</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {properties.map(property => (
                    <TouchableOpacity
                      key={property.id}
                      style={[
                        styles.modalPropertyChip,
                        selectedPropertyForFolder === property.id && styles.modalPropertyChipActive
                      ]}
                      onPress={() => setSelectedPropertyForFolder(property.id)}
                      testID={`property-chip-${property.id}`}
                    >
                      <Text style={[
                        styles.modalPropertyChipText,
                        selectedPropertyForFolder === property.id && styles.modalPropertyChipTextActive
                      ]}>{property.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCreateFolderModal(false);
                  setNewFolderName('');
                  setSelectedPropertyForFolder('');
                }}
                testID="cancel-create-folder"
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCreateButton}
                onPress={handleCreateFolderConfirm}
                testID="confirm-create-folder"
              >
                <Text style={styles.modalCreateButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Edit Folder Modal */}
      {editingFolder && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Folder Name</Text>
            
            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Folder Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editFolderName}
                onChangeText={setEditFolderName}
                placeholder="Enter folder name"
                autoFocus
                testID="edit-folder-name-input"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleCancelEditFolder}
                testID="cancel-edit-folder"
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCreateButton}
                onPress={handleSaveEditFolder}
                testID="save-edit-folder"
              >
                <Text style={styles.modalCreateButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.fab}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={handleCreateDocument}
          testID="create-document-fab"
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  toolbarContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  filtersContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginLeft: 12,
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: 'white',
  },
  typeFilters: {
    marginTop: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  folderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderContent: {
    flex: 1,
    padding: 16,
  },
  folderActions: {
    flexDirection: 'row',
    paddingRight: 12,
    gap: 8,
  },
  folderActionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  folderIconContainer: {
    marginRight: 12,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  folderProperty: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  folderStats: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  folderDate: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  documentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  documentIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  documentProperty: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  documentFolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  documentFolder: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  documentMeta: {
    marginBottom: 8,
  },
  documentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  documentType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3B82F6',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  documentTenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  documentTenant: {
    fontSize: 12,
    color: '#6B7280',
  },
  documentDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagsText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  documentUpdated: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyStateButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  addPropertyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addPropertyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fabButton: {
    backgroundColor: '#3B82F6',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  modalPropertyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  modalPropertyChipActive: {
    backgroundColor: '#10B981',
  },
  modalPropertyChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalPropertyChipTextActive: {
    color: 'white',
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