import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Plus, FileText, Tag, Calendar, Search, Filter, SortAsc, SortDesc, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePortfolio } from "@/hooks/portfolio-store";

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'vendor-asc' | 'vendor-desc';
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

export default function DocumentsScreen() {
  const { properties, receipts, isLoading } = usePortfolio();
  const insets = useSafeAreaInsets();
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [searchTag, setSearchTag] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [amountRange, setAmountRange] = useState<{ min: string; max: string }>({ min: '', max: '' });

  const filteredReceipts = useMemo(() => {
    let filtered = receipts;
    
    // Property filter
    if (selectedProperty !== "all") {
      filtered = filtered.filter(r => r.propertyId === selectedProperty);
    }
    
    // Tag filter
    if (searchTag) {
      filtered = filtered.filter(r => 
        r.tags.some(tag => tag.toLowerCase().includes(searchTag.toLowerCase()))
      );
    }
    
    // Text search filter (vendor, notes, category)
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(r => 
        (r.vendor?.toLowerCase().includes(searchLower)) ||
        (r.notes?.toLowerCase().includes(searchLower)) ||
        (r.category?.toLowerCase().includes(searchLower))
      );
    }
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }
    
    // Amount range filter
    if (amountRange.min || amountRange.max) {
      const minAmount = amountRange.min ? parseFloat(amountRange.min) : 0;
      const maxAmount = amountRange.max ? parseFloat(amountRange.max) : Infinity;
      filtered = filtered.filter(r => {
        const amount = r.amount || 0;
        return amount >= minAmount && amount <= maxAmount;
      });
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(r => {
        const receiptDate = new Date(r.date);
        
        switch (dateFilter) {
          case 'today':
            return receiptDate >= today;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            return receiptDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            return receiptDate >= monthAgo;
          case 'year':
            const yearAgo = new Date(today);
            yearAgo.setFullYear(today.getFullYear() - 1);
            return receiptDate >= yearAgo;
          default:
            return true;
        }
      });
    }
    
    // Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'amount-asc':
          return (a.amount || 0) - (b.amount || 0);
        case 'amount-desc':
          return (b.amount || 0) - (a.amount || 0);
        case 'vendor-asc':
          return (a.vendor || '').localeCompare(b.vendor || '');
        case 'vendor-desc':
          return (b.vendor || '').localeCompare(a.vendor || '');
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });
  }, [receipts, selectedProperty, searchTag, searchText, sortBy, dateFilter, selectedCategory, amountRange]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    receipts.forEach(receipt => {
      receipt.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [receipts]);
  
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    receipts.forEach(receipt => {
      if (receipt.category) {
        categories.add(receipt.category);
      }
    });
    return Array.from(categories).sort();
  }, [receipts]);
  
  const getSortIcon = () => {
    return sortBy.includes('asc') ? <SortAsc size={16} color="#6B7280" /> : <SortDesc size={16} color="#6B7280" />;
  };
  
  const getSortLabel = () => {
    switch (sortBy) {
      case 'date-asc': return 'Date (Oldest)';
      case 'date-desc': return 'Date (Newest)';
      case 'amount-asc': return 'Amount (Low)';
      case 'amount-desc': return 'Amount (High)';
      case 'vendor-asc': return 'Vendor (A-Z)';
      case 'vendor-desc': return 'Vendor (Z-A)';
      default: return 'Date (Newest)';
    }
  };
  
  const clearAllFilters = () => {
    setSelectedProperty('all');
    setSearchTag('');
    setSearchText('');
    setSortBy('date-desc');
    setDateFilter('all');
    setSelectedCategory('all');
    setAmountRange({ min: '', max: '' });
  };
  
  const hasActiveFilters = selectedProperty !== 'all' || searchTag || searchText || 
    dateFilter !== 'all' || selectedCategory !== 'all' || amountRange.min || amountRange.max;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      {/* Search and Filter Header */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search receipts..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#9CA3AF"
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <View style={styles.filterControls}>
          <TouchableOpacity
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(true)}
          >
            <Filter size={16} color={hasActiveFilters ? "#FFFFFF" : "#6B7280"} />
            <Text style={[styles.filterButtonText, hasActiveFilters && styles.filterButtonTextActive]}>
              Filters
            </Text>
            {hasActiveFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => {
              const sortOptions: SortOption[] = ['date-desc', 'date-asc', 'amount-desc', 'amount-asc', 'vendor-asc', 'vendor-desc'];
              const currentIndex = sortOptions.indexOf(sortBy);
              const nextIndex = (currentIndex + 1) % sortOptions.length;
              setSortBy(sortOptions[nextIndex]);
            }}
          >
            {getSortIcon()}
            <Text style={styles.sortButtonText}>{getSortLabel()}</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Quick Property Filters */}
      <View style={styles.quickFiltersSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, selectedProperty === "all" && styles.filterChipActive]}
            onPress={() => setSelectedProperty("all")}
          >
            <Text style={[styles.filterChipText, selectedProperty === "all" && styles.filterChipTextActive]}>
              All Properties
            </Text>
          </TouchableOpacity>
          {properties.map(property => (
            <TouchableOpacity
              key={property.id}
              style={[styles.filterChip, selectedProperty === property.id && styles.filterChipActive]}
              onPress={() => setSelectedProperty(property.id)}
            >
              <Text style={[styles.filterChipText, selectedProperty === property.id && styles.filterChipTextActive]}>
                {property.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tags */}
      {allTags.length > 0 && (
        <View style={styles.tagsSection}>
          <Text style={styles.sectionTitle}>Filter by Tags</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.tagChip, !searchTag && styles.tagChipActive]}
              onPress={() => setSearchTag("")}
            >
              <Text style={[styles.tagChipText, !searchTag && styles.tagChipTextActive]}>All</Text>
            </TouchableOpacity>
            {allTags.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, searchTag === tag && styles.tagChipActive]}
                onPress={() => setSearchTag(searchTag === tag ? "" : tag)}
              >
                <Tag size={12} color={searchTag === tag ? "#FFFFFF" : "#6B7280"} />
                <Text style={[styles.tagChipText, searchTag === tag && styles.tagChipTextActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Receipts Grid */}
      <View style={styles.receiptsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Receipts ({filteredReceipts.length})</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/add-receipt' as any)}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        
        {filteredReceipts.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No receipts yet</Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => router.push('/add-receipt' as any)}
            >
              <Text style={styles.emptyStateButtonText}>Add Receipt</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.receiptsGrid}>
            {filteredReceipts.map(receipt => {
              const property = properties.find(p => p.id === receipt.propertyId);
              return (
                <TouchableOpacity
                  key={receipt.id}
                  style={styles.receiptCard}
                  onPress={() => router.push(`/edit-receipt/${receipt.id}` as any)}
                >
                  {receipt.uri ? (
                    <Image source={{ uri: receipt.uri }} style={styles.receiptImage} />
                  ) : (
                    <View style={styles.receiptPlaceholder}>
                      <FileText size={32} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={styles.receiptInfo}>
                    <Text style={styles.receiptVendor} numberOfLines={1}>
                      {receipt.vendor || 'Unknown Vendor'}
                    </Text>
                    {receipt.amount && (
                      <Text style={styles.receiptAmount}>{formatCurrency(receipt.amount)}</Text>
                    )}
                    <Text style={styles.receiptProperty} numberOfLines={1}>
                      {property?.name || 'Unknown Property'}
                    </Text>
                    <Text style={styles.receiptDate}>{formatDate(receipt.date)}</Text>
                    {receipt.tags.length > 0 && (
                      <View style={styles.receiptTags}>
                        {receipt.tags.slice(0, 2).map((tag, index) => (
                          <View key={index} style={styles.receiptTag}>
                            <Text style={styles.receiptTagText}>{tag}</Text>
                          </View>
                        ))}
                        {receipt.tags.length > 2 && (
                          <Text style={styles.moreTags}>+{receipt.tags.length - 2}</Text>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
      
      {/* Advanced Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter & Sort</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Date Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Date Range</Text>
              <View style={styles.dateFilterRow}>
                {(['all', 'today', 'week', 'month', 'year'] as DateFilter[]).map(filter => (
                  <TouchableOpacity
                    key={filter}
                    style={[styles.dateFilterChip, dateFilter === filter && styles.dateFilterChipActive]}
                    onPress={() => setDateFilter(filter)}
                  >
                    <Text style={[styles.dateFilterText, dateFilter === filter && styles.dateFilterTextActive]}>
                      {filter === 'all' ? 'All Time' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Category Filter */}
            {allCategories.length > 0 && (
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipActive]}
                    onPress={() => setSelectedCategory('all')}
                  >
                    <Text style={[styles.categoryChipText, selectedCategory === 'all' && styles.categoryChipTextActive]}>
                      All Categories
                    </Text>
                  </TouchableOpacity>
                  {allCategories.map(category => (
                    <TouchableOpacity
                      key={category}
                      style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
            {/* Amount Range */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Amount Range</Text>
              <View style={styles.amountRangeRow}>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.amountLabel}>Min $</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amountRange.min}
                    onChangeText={(text) => setAmountRange(prev => ({ ...prev, min: text }))}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <Text style={styles.amountSeparator}>to</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.amountLabel}>Max $</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amountRange.max}
                    onChangeText={(text) => setAmountRange(prev => ({ ...prev, max: text }))}
                    placeholder="∞"
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>
            
            {/* Sort Options */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Sort By</Text>
              <View style={styles.sortOptionsGrid}>
                {([
                  { key: 'date-desc', label: 'Date (Newest First)' },
                  { key: 'date-asc', label: 'Date (Oldest First)' },
                  { key: 'amount-desc', label: 'Amount (Highest First)' },
                  { key: 'amount-asc', label: 'Amount (Lowest First)' },
                  { key: 'vendor-asc', label: 'Vendor (A-Z)' },
                  { key: 'vendor-desc', label: 'Vendor (Z-A)' }
                ] as { key: SortOption; label: string }[]).map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.sortOption, sortBy === option.key && styles.sortOptionActive]}
                    onPress={() => setSortBy(option.key)}
                  >
                    <Text style={[styles.sortOptionText, sortBy === option.key && styles.sortOptionTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearAllFilters}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchSection: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  filterControls: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    position: "relative",
  },
  filterButtonActive: {
    backgroundColor: "#3B82F6",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
    position: "absolute",
    top: 4,
    right: 4,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flex: 1,
  },
  sortButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  quickFiltersSection: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#3B82F6",
  },
  filterChipText: {
    fontSize: 14,
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "500" as const,
  },
  tagsSection: {
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 12,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
    gap: 4,
  },
  tagChipActive: {
    backgroundColor: "#3B82F6",
  },
  tagChipText: {
    fontSize: 12,
    color: "#6B7280",
  },
  tagChipTextActive: {
    color: "#FFFFFF",
  },
  receiptsSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500" as const,
  },
  receiptsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  receiptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    width: "48%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  receiptImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#F3F4F6",
  },
  receiptPlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  receiptInfo: {
    padding: 12,
  },
  receiptVendor: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 4,
  },
  receiptAmount: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#3B82F6",
    marginBottom: 4,
  },
  receiptProperty: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  receiptDate: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  receiptTags: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  receiptTag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  receiptTagText: {
    fontSize: 10,
    color: "#3B82F6",
  },
  moreTags: {
    fontSize: 10,
    color: "#6B7280",
  },
  emptyState: {
    alignItems: "center",
    padding: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#111827",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterGroupTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 12,
  },
  dateFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dateFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dateFilterChipActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  dateFilterText: {
    fontSize: 14,
    color: "#6B7280",
  },
  dateFilterTextActive: {
    color: "#FFFFFF",
    fontWeight: "500" as const,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  categoryChipText: {
    fontSize: 14,
    color: "#6B7280",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "500" as const,
  },
  amountRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  amountInputContainer: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  amountSeparator: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 20,
  },
  sortOptionsGrid: {
    gap: 8,
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sortOptionActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  sortOptionText: {
    fontSize: 14,
    color: "#6B7280",
  },
  sortOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "500" as const,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  clearButtonText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  applyButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600" as const,
  },
});