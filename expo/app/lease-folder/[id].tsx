import React, { useState, useMemo } from 'react';
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
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  Search,
  Plus,
  FileText,
  Edit3,
  Trash2,
  Users,
  Calendar,
  Tag,
  Download,
  Camera
} from 'lucide-react-native';
import { usePortfolio, useFolderDocuments } from '@/hooks/portfolio-store';
import { LeaseDocument } from '@/types/property';

const DOCUMENT_TYPE_COLORS = {
  lease: '#3B82F6',
  communication: '#10B981',
  notice: '#F59E0B',
  other: '#6B7280'
};

export default function LeaseFolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    properties,
    leaseFolders,
    updateLeaseFolder,
    deleteLeaseFolder,
    deleteLeaseDocument,
    exportLeaseDocument
  } = usePortfolio();
  
  const documents = useFolderDocuments(id!);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('all');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const folder = leaseFolders.find(f => f.id === id);
  const property = folder ? properties.find(p => p.id === folder.propertyId) : null;

  // Filter documents based on search and type
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Filter by document type
    if (selectedDocumentType !== 'all') {
      filtered = filtered.filter(d => d.type === selectedDocumentType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.title.toLowerCase().includes(query) ||
        d.content.toLowerCase().includes(query) ||
        d.tenantName?.toLowerCase().includes(query) ||
        d.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [documents, selectedDocumentType, searchQuery]);

  const handleEditFolder = () => {
    if (!folder) return;

    if (Platform.OS === 'web') {
      const newName = prompt('Edit Folder\n\nEnter new folder name:', folder.name);
      if (newName && newName.trim() && newName.trim() !== folder.name) {
        updateLeaseFolder(folder.id, { name: newName.trim() });
      }
    } else {
      Alert.prompt(
        'Edit Folder',
        'Enter new folder name:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: (newName?: string) => {
              if (newName?.trim() && newName.trim() !== folder.name) {
                updateLeaseFolder(folder.id, { name: newName.trim() });
              }
            }
          }
        ],
        'plain-text',
        folder.name
      );
    }
  };

  const handleDeleteFolder = () => {
    if (!folder) return;

    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folder.name}"? This will also delete all documents in this folder.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteLeaseFolder(folder.id);
            router.back();
          }
        }
      ]
    );
  };

  const handleDeleteDocument = (document: LeaseDocument) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteLeaseDocument(document.id)
        }
      ]
    );
  };

  const handleExportDocument = async (document: LeaseDocument) => {
    try {
      setIsExporting(document.id);
      await exportLeaseDocument(document.id);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Error', 'Failed to export document. Please try again.');
    } finally {
      setIsExporting(null);
    }
  };

  const renderDocumentCard = (document: LeaseDocument) => {
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
            <Text style={styles.documentType}>
              {document.type.charAt(0).toUpperCase() + document.type.slice(1)}
            </Text>
          </View>
          <View style={styles.documentActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleExportDocument(document)}
              disabled={isExporting === document.id}
            >
              <Download size={16} color={isExporting === document.id ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteDocument(document)}
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.documentMeta}>
          {!!document.tenantName && (
            <View style={styles.documentTenantRow}>
              <Users size={12} color="#6B7280" />
              <Text style={styles.documentTenant}>{document.tenantName}</Text>
            </View>
          )}
          
          {!!document.dateOfDocument && (
            <View style={styles.documentTenantRow}>
              <Calendar size={12} color="#6B7280" />
              <Text style={styles.documentDate}>{new Date(document.dateOfDocument).toLocaleDateString()}</Text>
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

  if (!folder) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Folder Not Found' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Folder not found</Text>
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
          title: folder.name,
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push('/scan-lease-document' as any)}
                testID="scan-button"
              >
                <Camera size={20} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleEditFolder}
                testID="edit-button"
              >
                <Edit3 size={20} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleDeleteFolder}
                testID="delete-button"
              >
                <Trash2 size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )
        }} 
      />

      <View style={styles.folderInfo}>
        <View style={styles.folderHeader}>
          <View style={[styles.folderColorIndicator, { backgroundColor: folder.color }]} />
          <View style={styles.folderDetails}>
            <Text style={styles.folderName}>{folder.name}</Text>
            <Text style={styles.folderProperty}>{property?.name || 'Unknown Property'}</Text>
            <Text style={styles.folderStats}>
              {documents.length} document{documents.length !== 1 ? 's' : ''} • Created {new Date(folder.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search documents..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="search-input"
          />
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredDocuments.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No Documents Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || selectedDocumentType !== 'all'
                ? 'No documents match your search criteria.'
                : 'Start by adding documents to this folder.'}
            </Text>
            <View style={styles.emptyStateButtons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/create-lease-document' as any)}
              >
                <Plus size={16} color="white" />
                <Text style={styles.primaryButtonText}>Create Document</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/scan-lease-document' as any)}
              >
                <Camera size={16} color="#3B82F6" />
                <Text style={styles.secondaryButtonText}>Scan Document</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.documentsSection}>
            <Text style={styles.sectionTitle}>
              {filteredDocuments.length} Document{filteredDocuments.length !== 1 ? 's' : ''}
            </Text>
            {filteredDocuments.map(renderDocumentCard)}
          </View>
        )}
      </ScrollView>

      <View style={styles.fab}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => router.push('/create-lease-document' as any)}
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
  folderInfo: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderColorIndicator: {
    width: 4,
    height: 48,
    borderRadius: 2,
    marginRight: 12,
  },
  folderDetails: {
    flex: 1,
  },
  folderName: {
    fontSize: 18,
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
  content: {
    flex: 1,
  },
  documentsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
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
  documentType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3B82F6',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  documentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  documentMeta: {
    marginBottom: 8,
  },
  documentTenant: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  documentTenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
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
});