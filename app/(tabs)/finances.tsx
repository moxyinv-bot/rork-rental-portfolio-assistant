import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Plus, TrendingUp, TrendingDown, Filter, Calendar, Download } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePortfolio } from "@/hooks/portfolio-store";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/constants/categories";

// Utility function to parse MM-DD-YY date format
const parseTransactionDate = (dateString: string): Date => {
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const month = parseInt(parts[0]) - 1; // Month is 0-indexed
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]) + 2000; // Convert YY to YYYY
    return new Date(year, month, day);
  }
  return new Date(dateString); // Fallback to default parsing
};

export default function FinancesScreen() {
  const { properties, transactions, isLoading, exportTransactionsToExcel } = usePortfolio();
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<"month" | "year" | "all">("month");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportProperty, setExportProperty] = useState<string>("all");
  const [exportYear, setExportYear] = useState<number | undefined>(new Date().getFullYear());
  const [isExporting, setIsExporting] = useState(false);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    
    if (selectedProperty !== "all") {
      filtered = filtered.filter(t => t.propertyId === selectedProperty);
    }
    
    if (selectedPeriod !== "all") {
      const now = new Date();
      const startDate = new Date();
      
      if (selectedPeriod === "month") {
        startDate.setMonth(now.getMonth() - 1);
      } else if (selectedPeriod === "year") {
        startDate.setFullYear(now.getFullYear() - 1);
      }
      
      filtered = filtered.filter(t => parseTransactionDate(t.date) >= startDate);
    }
    
    return filtered.sort((a, b) => parseTransactionDate(b.date).getTime() - parseTransactionDate(a.date).getTime());
  }, [transactions, selectedProperty, selectedPeriod]);

  const metrics = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = filteredTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const categoryBreakdown = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map(category => {
      const categoryTransactions = filteredTransactions.filter(t => t.category === category);
      const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
      return { category, total, count: categoryTransactions.length };
    }).filter(c => c.total > 0);
    
    return {
      income,
      expenses,
      profit: income - expenses,
      categoryBreakdown,
    };
  }, [filteredTransactions]);

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
    return parseTransactionDate(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleExportToExcel = async () => {
    try {
      setIsExporting(true);
      const result = await exportTransactionsToExcel(
        exportProperty === 'all' ? undefined : exportProperty,
        exportYear
      );
      
      Alert.alert(
        'Export Successful',
        `Exported ${result.count} transactions to ${result.filename}. You can open this file in Excel or Google Sheets.`,
        [{ text: 'OK' }]
      );
      setShowExportModal(false);
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert(
        'Export Failed',
        'There was an error exporting your transactions. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsExporting(false);
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach(transaction => {
      const year = parseTransactionDate(transaction.date).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
    <ScrollView 
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Filters */}
      <View style={styles.filterSection}>
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
        
        <View style={styles.periodFilter}>
          {(["month", "year", "all"] as const).map(period => (
            <TouchableOpacity
              key={period}
              style={[styles.periodChip, selectedPeriod === period && styles.periodChipActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodChipText, selectedPeriod === period && styles.periodChipTextActive]}>
                {period === "month" ? "Month" : period === "year" ? "Year" : "All Time"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summarySection}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <TrendingUp size={20} color="#10B981" />
            <Text style={styles.summaryLabel}>Income</Text>
          </View>
          <Text style={styles.summaryValueIncome}>{formatCurrency(metrics.income)}</Text>
        </View>
        
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <TrendingDown size={20} color="#EF4444" />
            <Text style={styles.summaryLabel}>Expenses</Text>
          </View>
          <Text style={styles.summaryValueExpense}>{formatCurrency(metrics.expenses)}</Text>
        </View>
        
        <View style={[styles.summaryCard, styles.summaryCardWide]}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryLabel}>Net Profit</Text>
          </View>
          <Text style={[
            styles.summaryValueProfit,
            { color: metrics.profit >= 0 ? '#10B981' : '#EF4444' }
          ]}>
            {formatCurrency(metrics.profit)}
          </Text>
        </View>
      </View>

      {/* Category Breakdown */}
      {metrics.categoryBreakdown.length > 0 && (
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          {metrics.categoryBreakdown.map(({ category, total }) => (
            <View key={category} style={styles.categoryRow}>
              <Text style={styles.categoryName}>{category}</Text>
              <Text style={styles.categoryAmount}>{formatCurrency(total)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.transactionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => setShowExportModal(true)}
            >
              <Download size={16} color="#6B7280" />
              <Text style={styles.exportButtonText}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/add-transaction' as any)}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No transactions yet</Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => router.push('/add-transaction' as any)}
            >
              <Text style={styles.emptyStateButtonText}>Add Transaction</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTransactions.slice(0, 20).map(transaction => {
            const property = properties.find(p => p.id === transaction.propertyId);
            return (
              <TouchableOpacity 
                key={transaction.id} 
                style={styles.transactionCard}
                onPress={() => router.push(`/edit-transaction/${transaction.id}` as any)}
              >
                <View style={styles.transactionHeader}>
                  <View>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    <Text style={styles.transactionMeta}>
                      {property?.name} • {transaction.category}
                    </Text>
                  </View>
                  <View style={styles.transactionAmountContainer}>
                    <Text style={[
                      styles.transactionAmount,
                      { color: transaction.type === 'income' ? '#10B981' : '#EF4444' }
                    ]}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </Text>
                    <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
      
      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.exportModalContent}>
            <Text style={styles.exportModalTitle}>Export Transactions to CSV</Text>
            
            {/* Property Selection */}
            <View style={styles.exportSection}>
              <Text style={styles.exportLabel}>Property</Text>
              <View style={styles.exportOptions}>
                <TouchableOpacity
                  style={[styles.exportOption, exportProperty === 'all' && styles.exportOptionActive]}
                  onPress={() => setExportProperty('all')}
                >
                  <Text style={[styles.exportOptionText, exportProperty === 'all' && styles.exportOptionTextActive]}>
                    All Properties
                  </Text>
                </TouchableOpacity>
                {properties.map(property => (
                  <TouchableOpacity
                    key={property.id}
                    style={[styles.exportOption, exportProperty === property.id && styles.exportOptionActive]}
                    onPress={() => setExportProperty(property.id)}
                  >
                    <Text style={[styles.exportOptionText, exportProperty === property.id && styles.exportOptionTextActive]}>
                      {property.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Year Selection */}
            <View style={styles.exportSection}>
              <Text style={styles.exportLabel}>Year</Text>
              <View style={styles.exportOptions}>
                <TouchableOpacity
                  style={[styles.exportOption, exportYear === undefined && styles.exportOptionActive]}
                  onPress={() => setExportYear(undefined)}
                >
                  <Text style={[styles.exportOptionText, exportYear === undefined && styles.exportOptionTextActive]}>
                    All Years
                  </Text>
                </TouchableOpacity>
                {availableYears.map(year => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.exportOption, exportYear === year && styles.exportOptionActive]}
                    onPress={() => setExportYear(year)}
                  >
                    <Text style={[styles.exportOptionText, exportYear === year && styles.exportOptionTextActive]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.exportActions}>
              <TouchableOpacity
                style={styles.exportCancelButton}
                onPress={() => setShowExportModal(false)}
                disabled={isExporting}
              >
                <Text style={styles.exportCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportConfirmButton, isExporting && styles.exportConfirmButtonDisabled]}
                onPress={handleExportToExcel}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Download size={16} color="#FFFFFF" />
                    <Text style={styles.exportConfirmButtonText}>Export CSV</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  filterSection: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterScroll: {
    paddingHorizontal: 16,
    marginBottom: 8,
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
  periodFilter: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  periodChipActive: {
    backgroundColor: "#3B82F6",
  },
  periodChipText: {
    fontSize: 14,
    color: "#6B7280",
  },
  periodChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "500" as const,
  },
  summarySection: {
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
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
  summaryCardWide: {
    minWidth: "100%",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  summaryValueIncome: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#10B981",
  },
  summaryValueExpense: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#EF4444",
  },
  summaryValueProfit: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  categorySection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    color: "#374151",
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
  },
  transactionsSection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  exportButtonText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500" as const,
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
  transactionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#111827",
    marginBottom: 4,
  },
  transactionMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  transactionAmountContainer: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  exportModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxHeight: "80%",
  },
  exportModalTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 20,
    textAlign: "center",
  },
  exportSection: {
    marginBottom: 20,
  },
  exportLabel: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#374151",
    marginBottom: 8,
  },
  exportOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  exportOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  exportOptionActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  exportOptionText: {
    fontSize: 12,
    color: "#6B7280",
  },
  exportOptionTextActive: {
    color: "#FFFFFF",
  },
  exportActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  exportCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  exportCancelButtonText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#6B7280",
  },
  exportConfirmButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  exportConfirmButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  exportConfirmButtonText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#FFFFFF",
  },
});