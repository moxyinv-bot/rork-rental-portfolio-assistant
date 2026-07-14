import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { usePortfolio } from "@/hooks/portfolio-store";
import { Transaction } from "@/types/property";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/constants/categories";
import { DollarSign, Tag, ChevronDown, Trash2, Calendar } from "lucide-react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { properties, transactions, updateTransaction, deleteTransaction } = usePortfolio();
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  
  const transaction = transactions.find(t => t.id === id);
  
  const formatDate = (date: Date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${month}-${day}-${year}`;
  };
  
  const parseDate = (dateString: string) => {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const month = parseInt(parts[0]) - 1;
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]) + 2000;
      return new Date(year, month, day);
    }
    return new Date();
  };
  
  const [formData, setFormData] = useState({
    propertyId: "",
    type: "expense" as Transaction["type"],
    category: "",
    amount: "",
    date: "",
    description: "",
    tags: "" as string,
  });

  useEffect(() => {
    if (transaction) {
      const parsedDate = parseDate(transaction.date);
      setSelectedDate(parsedDate);
      setFormData({
        propertyId: transaction.propertyId,
        type: transaction.type,
        category: transaction.category,
        amount: transaction.amount.toString(),
        date: transaction.date,
        description: transaction.description,
        tags: transaction.tags.join(", "),
      });
    }
  }, [transaction]);

  if (!transaction) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Transaction not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const categories = formData.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const getRequiredFields = () => {
    const required = [];
    if (!formData.propertyId) required.push('Property');
    if (!formData.category) required.push('Category');
    if (!formData.amount.trim()) required.push('Amount');
    if (!formData.description.trim()) required.push('Description');
    return required;
  };

  const handleSave = () => {
    const missingFields = getRequiredFields();
    
    if (missingFields.length > 0) {
      Alert.alert(
        "Save Transaction?", 
        `This transaction is missing some information:\n• ${missingFields.join('\n• ')}\n\nYou can save it now and complete the details later.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save Anyway", onPress: saveTransaction }
        ]
      );
      return;
    }
    
    saveTransaction();
  };

  const saveTransaction = async () => {
    try {
      setIsLoading(true);
      const updatedTransaction: Partial<Transaction> = {
        propertyId: formData.propertyId || properties[0]?.id || 'no-property',
        type: formData.type,
        category: formData.category || 'Uncategorized',
        amount: parseFloat(formData.amount) || 0,
        date: formData.date,
        description: formData.description.trim() || 'No description provided',
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      };

      console.log('Updating transaction:', updatedTransaction);
      await updateTransaction(transaction.id, updatedTransaction);
      Alert.alert('Success', 'Transaction updated successfully!');
      router.back();
    } catch (error) {
      console.error('Error updating transaction:', error);
      Alert.alert('Error', 'Failed to update transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteTransaction(transaction.id);
              Alert.alert('Success', 'Transaction deleted successfully!');
              router.back();
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', 'Failed to delete transaction. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const getSelectedProperty = () => {
    return properties.find(p => p.id === formData.propertyId);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        <View style={styles.form}>
          {/* Transaction Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Type</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeOption, formData.type === "income" && styles.typeOptionActive]}
                onPress={() => setFormData({ ...formData, type: "income", category: "" })}
              >
                <Text style={[styles.typeOptionText, formData.type === "income" && styles.typeOptionTextActive]}>
                  Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeOption, formData.type === "expense" && styles.typeOptionActive]}
                onPress={() => setFormData({ ...formData, type: "expense", category: "" })}
              >
                <Text style={[styles.typeOptionText, formData.type === "expense" && styles.typeOptionTextActive]}>
                  Expense
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Property Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Property *</Text>
            <TouchableOpacity 
              style={[styles.dropdown, !formData.propertyId && styles.inputHighlight]}
              onPress={() => setShowPropertyDropdown(true)}
            >
              <Text style={[styles.dropdownText, !formData.propertyId && styles.placeholderText]}>
                {getSelectedProperty()?.name || "Select a property"}
              </Text>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Category *</Text>
            <View style={[styles.categorySelector, !formData.category && styles.selectorHighlight]}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryOption,
                    formData.category === category && styles.categoryOptionActive
                  ]}
                  onPress={() => setFormData({ ...formData, category })}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    formData.category === category && styles.categoryOptionTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Amount */}
          <View style={styles.section}>
            <Text style={styles.label}>Amount *</Text>
            <View style={[styles.amountContainer, !formData.amount.trim() && styles.inputHighlight]}>
              <DollarSign size={20} color="#6B7280" />
              <TextInput
                style={styles.amountInput}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, !formData.description.trim() && styles.inputHighlight]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="What was this transaction for?"
            />
          </View>

          {/* Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={20} color="#6B7280" />
              <Text style={styles.dateButtonText}>{formData.date}</Text>
            </TouchableOpacity>
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.label}>Tags (comma separated)</Text>
            <View style={styles.tagsContainer}>
              <Tag size={20} color="#6B7280" />
              <TextInput
                style={styles.tagsInput}
                value={formData.tags}
                onChangeText={(text) => setFormData({ ...formData, tags: text })}
                placeholder="tax-deductible, repair, maintenance"
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={isLoading}>
              <Trash2 size={16} color="#FFFFFF" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={isLoading}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isLoading}>
              <Text style={styles.saveButtonText}>{isLoading ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      {/* Property Dropdown Modal */}
      <Modal
        visible={showPropertyDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPropertyDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPropertyDropdown(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Property</Text>
            {properties.length === 0 ? (
              <View style={styles.noPropertiesContainer}>
                <Text style={styles.noPropertiesText}>No properties found</Text>
                <Text style={styles.noPropertiesSubtext}>Add a property first to create transactions</Text>
              </View>
            ) : (
              properties.map(property => (
                <TouchableOpacity
                  key={property.id}
                  style={[
                    styles.modalOption,
                    formData.propertyId === property.id && styles.modalOptionActive
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, propertyId: property.id });
                    setShowPropertyDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    formData.propertyId === property.id && styles.modalOptionTextActive
                  ]}>
                    {property.name}
                  </Text>
                  <Text style={styles.modalOptionAddress}>{property.address}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) {
              setSelectedDate(date);
              const formattedDate = formatDate(date);
              console.log('Date picker selected:', date, 'formatted as:', formattedDate);
              setFormData({ ...formData, date: formattedDate });
            }
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  form: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 80 : 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  typeSelector: {
    flexDirection: "row",
    gap: 12,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  typeOptionActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  typeOptionText: {
    fontSize: 16,
    fontWeight: "500" as const,
    color: "#6B7280",
  },
  typeOptionTextActive: {
    color: "#FFFFFF",
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: "#111827",
  },
  placeholderText: {
    color: "#9CA3AF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalOptionActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500" as const,
  },
  modalOptionTextActive: {
    color: "#3B82F6",
  },
  modalOptionAddress: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  noPropertiesContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noPropertiesText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  noPropertiesSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center",
  },
  categorySelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryOptionActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  categoryOptionText: {
    fontSize: 12,
    color: "#6B7280",
  },
  categoryOptionTextActive: {
    color: "#FFFFFF",
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  amountInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  tagsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  tagsInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 24,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  inputHighlight: {
    borderColor: "#FCD34D",
    borderWidth: 2,
    backgroundColor: "#FFFBEB",
  },
  selectorHighlight: {
    borderRadius: 8,
    borderColor: "#FCD34D",
    borderWidth: 2,
    backgroundColor: "#FFFBEB",
    padding: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#EF4444",
    marginBottom: 20,
    textAlign: "center",
  },
  backButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: "#111827",
  },
});