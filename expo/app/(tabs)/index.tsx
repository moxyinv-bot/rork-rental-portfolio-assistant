import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Plus, TrendingUp, TrendingDown, Home, AlertCircle, DollarSign } from "lucide-react-native";
import { usePortfolio } from "@/hooks/portfolio-store";

export default function DashboardScreen() {
  const { properties, portfolioMetrics, upcomingReminders, isLoading } = usePortfolio();

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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/add-property' as any)}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
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
          properties.map((property) => (
            <TouchableOpacity
              key={property.id}
              style={styles.propertyCard}
              onPress={() => router.push(`/property/${property.id}` as any)}
            >
              <View style={styles.propertyHeader}>
                <Text style={styles.propertyName}>{property.name}</Text>
                <Text style={styles.propertyRent}>{formatCurrency(property.monthlyRent)}/mo</Text>
              </View>
              <Text style={styles.propertyAddress}>{property.address}</Text>
              <View style={styles.propertyFooter}>
                <Text style={styles.propertyType}>{property.type}</Text>
                {!!property.tenantName && (
                  <Text style={styles.propertyTenant}>Tenant: {property.tenantName}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
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