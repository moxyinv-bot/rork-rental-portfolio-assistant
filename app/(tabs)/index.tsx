import React, { useMemo, useState, useEffect } from "react";
import {
  Alert,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Plus, TrendingUp, TrendingDown, Home, AlertCircle, DollarSign, ArrowDownUp, Check, GripVertical, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePortfolio } from "@/hooks/portfolio-store";
import { useHousehold } from "@/hooks/useHousehold";

type PropertySortOption = "custom" | "name" | "purchase-date" | "rent-desc";

const PROPERTY_SORT_OPTIONS: { value: PropertySortOption; label: string }[] = [
  { value: "custom", label: "Custom order" },
  { value: "name", label: "A-Z" },
  { value: "purchase-date", label: "Purchase date" },
  { value: "rent-desc", label: "Rent: high to low" },
];

const getPropertySortStorageKey = (householdId?: string | null) => (
  householdId ? `portfolio_property_sort_option:${householdId}` : "portfolio_property_sort_option"
);

const customOrderComparator = (left: { displayOrder?: number; name: string }, right: { displayOrder?: number; name: string }) => {
  const leftOrder = left.displayOrder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.displayOrder ?? Number.MAX_SAFE_INTEGER;
  return leftOrder === rightOrder ? left.name.localeCompare(right.name) : leftOrder - rightOrder;
};

export default function DashboardScreen() {
  const { household } = useHousehold();
  const { properties, portfolioMetrics, upcomingReminders, reorderProperties, isLoading } = usePortfolio();
  const [sortOption, setSortOption] = useState<PropertySortOption>("custom");
  const [showSortModal, setShowSortModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [customOrderIds, setCustomOrderIds] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrateSortOption = async () => {
      const storageKey = getPropertySortStorageKey(household?.id);
      try {
        const savedValue = await AsyncStorage.getItem(storageKey);
        if (!isMounted) return;

        if (savedValue && PROPERTY_SORT_OPTIONS.some(option => option.value === savedValue)) {
          setSortOption(savedValue as PropertySortOption);
          return;
        }

        setSortOption("custom");
      } catch (error) {
        console.error("Error loading saved property sort option:", error);
        if (isMounted) setSortOption("custom");
      }
    };

    hydrateSortOption();

    return () => {
      isMounted = false;
    };
  }, [household?.id]);

  useEffect(() => {
    const storageKey = getPropertySortStorageKey(household?.id);
    AsyncStorage.setItem(storageKey, sortOption).catch(error => {
      console.error("Error saving property sort option:", error);
    });
  }, [household?.id, sortOption]);

  const sortedProperties = useMemo(() => {
    const sorted = [...properties];
    if (sortOption === "name") return sorted.sort((left, right) => left.name.localeCompare(right.name));
    if (sortOption === "purchase-date") return sorted.sort((left, right) => new Date(right.purchaseDate || 0).getTime() - new Date(left.purchaseDate || 0).getTime());
    if (sortOption === "rent-desc") return sorted.sort((left, right) => right.monthlyRent - left.monthlyRent);
    return sorted.sort(customOrderComparator);
  }, [properties, sortOption]);

  const openCustomOrder = () => {
    setCustomOrderIds([...properties].sort(customOrderComparator).map(property => property.id));
    setShowSortModal(false);
    setShowReorderModal(true);
  };

  const moveCustomProperty = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= customOrderIds.length) return;
    setCustomOrderIds(previous => {
      const next = [...previous];
      const [movedId] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedId);
      return next;
    });
  };

  const saveCustomOrder = async () => {
    if (isSavingOrder) return;
    try {
      setIsSavingOrder(true);
      await reorderProperties(customOrderIds);
      setSortOption("custom");
      setShowReorderModal(false);
    } catch (error) {
      console.error("Error saving property order:", error);
      Alert.alert("Could not save order", "Please try again.");
    } finally {
      setIsSavingOrder(false);
    }
  };

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
    <SafeAreaView style={styles.container} edges={["top"]}>
    <ScrollView 
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Portfolio Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Portfolio Overview</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Home size={20} color="#3B82F6" />
              <Text style={styles.metricLabel}>Properties</Text>
            </View>
            <Text style={styles.metricValue}>{portfolioMetrics.totalProperties}</Text>
          </View>
          
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <TrendingUp size={20} color="#10B981" />
              <Text style={styles.metricLabel}>Total Value</Text>
            </View>
            <Text style={styles.metricValue}>{formatCurrency(portfolioMetrics.totalValue)}</Text>
          </View>
          
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <DollarSign size={20} color="#10B981" />
              <Text style={styles.metricLabel}>Monthly Income</Text>
            </View>
            <Text style={styles.metricValue}>{formatCurrency(portfolioMetrics.totalMonthlyRent)}</Text>
          </View>
          
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              {portfolioMetrics.netCashFlow >= 0 ? (
                <TrendingUp size={20} color="#10B981" />
              ) : (
                <TrendingDown size={20} color="#EF4444" />
              )}
              <Text style={styles.metricLabel}>Net Cash Flow</Text>
            </View>
            <Text style={[
              styles.metricValue,
              { color: portfolioMetrics.netCashFlow >= 0 ? '#10B981' : '#EF4444' }
            ]}>
              {formatCurrency(portfolioMetrics.netCashFlow)}
            </Text>
          </View>
        </View>
      </View>

      {/* YTD Performance */}
      <View style={styles.performanceSection}>
        <Text style={styles.sectionTitle}>Year-to-Date Performance</Text>
        <View style={styles.performanceCard}>
          <View style={styles.performanceRow}>
            <Text style={styles.performanceLabel}>Income</Text>
            <Text style={styles.performanceIncome}>{formatCurrency(portfolioMetrics.ytdIncome)}</Text>
          </View>
          <View style={styles.performanceRow}>
            <Text style={styles.performanceLabel}>Expenses</Text>
            <Text style={styles.performanceExpense}>{formatCurrency(portfolioMetrics.ytdExpenses)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.performanceRow}>
            <Text style={styles.performanceLabel}>Net Profit</Text>
            <Text style={[
              styles.performanceProfit,
              { color: portfolioMetrics.ytdProfit >= 0 ? '#10B981' : '#EF4444' }
            ]}>
              {formatCurrency(portfolioMetrics.ytdProfit)}
            </Text>
          </View>
        </View>
      </View>

      {/* Upcoming Reminders */}
      {upcomingReminders.length > 0 && (
        <View style={styles.remindersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Reminders</Text>
            <TouchableOpacity onPress={() => router.push('/reminders' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {upcomingReminders.slice(0, 3).map((reminder) => {
            const property = properties.find(p => p.id === reminder.propertyId);
            return (
              <TouchableOpacity
                key={reminder.id}
                style={styles.reminderCard}
                onPress={() => router.push('/reminders' as any)}
              >
                <View style={styles.reminderIcon}>
                  <AlertCircle size={20} color="#F59E0B" />
                </View>
                <View style={styles.reminderContent}>
                  <Text style={styles.reminderTitle}>{reminder.title}</Text>
                  <Text style={styles.reminderProperty}>{property?.name || 'Unknown Property'}</Text>
                  <Text style={styles.reminderDate}>Due: {formatDate(reminder.dueDate)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Properties List */}
      <View style={styles.propertiesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Properties</Text>
          <View style={styles.propertyActions}>
            <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
              <ArrowDownUp size={17} color="#3B82F6" />
              <Text style={styles.sortButtonText}>Sort</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/add-property' as any)}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {properties.length === 0 ? (
          <View style={styles.emptyState}>
            <Home size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No properties yet</Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => router.push('/add-property' as any)}
            >
              <Text style={styles.emptyStateButtonText}>Add Your First Property</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sortedProperties.map((property) => (
            <TouchableOpacity
              key={property.id}
              style={[
                styles.propertyCard,
                { backgroundColor: property.backgroundColor || "#0369A1" }
              ]}
              onPress={() => router.push(`/property/${property.id}` as any)}
            >
              <View style={styles.propertyHeader}>
                <Text style={[
                  styles.propertyName,
                  { color: "#FFFFFF" }
                ]}>
                  {property.name}
                </Text>
                <Text style={[
                  styles.propertyRent,
                  { color: "#FFFFFF" }
                ]}>
                  {formatCurrency(property.monthlyRent)}/mo
                </Text>
              </View>
              <Text style={[
                styles.propertyAddress,
                { color: "#F0F0F0" }
              ]}>
                {property.address}
              </Text>
              <View style={styles.propertyFooter}>
                <Text style={[
                  styles.propertyType,
                  { color: "#E0E0E0" }
                ]}>
                  {property.type}
                </Text>
                {!!property.tenantName && (
                  <Text style={[
                    styles.propertyTenant,
                    { color: "#E0E0E0" }
                  ]}>
                    Tenant: {property.tenantName}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>

    <Modal visible={showSortModal} animationType="fade" transparent onRequestClose={() => setShowSortModal(false)}>
      <SafeAreaView style={styles.modalOverlay} edges={["bottom"]}>
        <TouchableOpacity style={styles.modalDismissArea} activeOpacity={1} onPress={() => setShowSortModal(false)}>
          <View style={styles.sortModal} onStartShouldSetResponder={() => true}>
            <View style={styles.sortModalHeader}>
              <Text style={styles.sortModalTitle}>Sort Properties</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {PROPERTY_SORT_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={styles.sortOption}
                onPress={() => {
                  if (option.value === "custom") {
                    openCustomOrder();
                    return;
                  }
                  setSortOption(option.value);
                  setShowSortModal(false);
                }}
              >
                <Text style={[styles.sortOptionText, sortOption === option.value && styles.sortOptionTextActive]}>{option.label}</Text>
                {sortOption === option.value ? <Check size={20} color="#2563EB" /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>

    <Modal visible={showReorderModal} animationType="slide" onRequestClose={() => setShowReorderModal(false)}>
      <SafeAreaView style={styles.reorderContainer} edges={["top", "bottom"]}>
        <View style={styles.reorderHeader}>
          <TouchableOpacity onPress={() => setShowReorderModal(false)} disabled={isSavingOrder}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <View style={styles.reorderTitleContainer}>
            <Text style={styles.reorderTitle}>Custom Order</Text>
            <Text style={styles.reorderSubtitle}>Drag a row up or down, then save your order.</Text>
          </View>
          <View style={styles.reorderHeaderSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.reorderList} showsVerticalScrollIndicator={false}>
          {customOrderIds.map((propertyId, index) => {
            const property = properties.find(item => item.id === propertyId);
            if (!property) return null;
            const panResponder = PanResponder.create({
              onStartShouldSetPanResponder: () => true,
              onMoveShouldSetPanResponder: (_event, gestureState) => Math.abs(gestureState.dy) > 4,
              onPanResponderGrant: () => setDraggedIndex(index),
              onPanResponderRelease: (_event, gestureState) => {
                setDraggedIndex(null);
                const targetIndex = Math.max(0, Math.min(customOrderIds.length - 1, index + Math.round(gestureState.dy / 64)));
                moveCustomProperty(index, targetIndex);
              },
              onPanResponderTerminate: () => setDraggedIndex(null),
            });

            return (
              <View key={property.id} {...panResponder.panHandlers} style={[styles.reorderRow, draggedIndex === index && styles.reorderRowDragging]}>
                <GripVertical size={22} color="#64748B" />
                <View style={styles.reorderRowInfo}>
                  <Text style={styles.reorderRowName}>{property.name}</Text>
                  <Text style={styles.reorderRowAddress} numberOfLines={1}>{property.address}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
        <View style={styles.reorderFooter}>
          <TouchableOpacity style={styles.reorderSaveButton} onPress={saveCustomOrder} disabled={isSavingOrder}>
            <Text style={styles.reorderSaveText}>{isSavingOrder ? "Saving..." : "Save Custom Order"}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
    </SafeAreaView>
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
  summarySection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: "45%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#111827",
  },
  performanceSection: {
    padding: 16,
    paddingTop: 0,
  },
  performanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  performanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  performanceLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  performanceIncome: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#10B981",
  },
  performanceExpense: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#EF4444",
  },
  performanceProfit: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  remindersSection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500" as const,
  },
  reminderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  reminderIcon: {
    marginRight: 12,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 2,
  },
  reminderProperty: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  reminderDate: {
    fontSize: 12,
    color: "#F59E0B",
  },
  propertiesSection: {
    padding: 16,
    paddingTop: 0,
  },
  propertyActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  sortButtonText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600" as const,
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
  propertyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  modalDismissArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sortModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    padding: 16,
    paddingBottom: 28,
  },
  sortModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sortModalTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700" as const,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sortOptionText: {
    color: "#374151",
    fontSize: 16,
  },
  sortOptionTextActive: {
    color: "#2563EB",
    fontWeight: "700" as const,
  },
  reorderContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  reorderHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  reorderTitleContainer: {
    flex: 1,
    marginHorizontal: 14,
  },
  reorderTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700" as const,
  },
  reorderSubtitle: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
  },
  reorderHeaderSpacer: {
    width: 24,
  },
  reorderList: {
    padding: 16,
    paddingBottom: 100,
    gap: 8,
  },
  reorderRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 10,
  },
  reorderRowDragging: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
    opacity: 0.8,
  },
  reorderRowInfo: {
    flex: 1,
  },
  reorderRowName: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  reorderRowAddress: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 2,
  },
  reorderFooter: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  reorderSaveButton: {
    backgroundColor: "#3B82F6",
    alignItems: "center",
    borderRadius: 8,
    paddingVertical: 14,
  },
  reorderSaveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  propertyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
  },
  propertyRent: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#10B981",
  },
  propertyAddress: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  propertyFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  propertyType: {
    fontSize: 12,
    color: "#9CA3AF",
    textTransform: "capitalize" as const,
  },
  propertyTenant: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
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
});