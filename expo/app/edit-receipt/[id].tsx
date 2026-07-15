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
  Image,
  Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { usePortfolio } from "@/hooks/portfolio-store";
import { Receipt } from "@/types/property";
import * as ImagePicker from "expo-image-picker";
import { Camera, Tag, FileText, ChevronDown, Trash2, Calendar } from "lucide-react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditReceiptScreen() {
  const { id } = useLocalSearchParams();
  const { properties, receipts, updateReceipt, deleteReceipt } = usePortfolio();
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  
  const receipt = receipts.find(r => r.id === id);
  
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
    uri: "",
    date: "",
    amount: "",
    vendor: "",
    category: "",
    tags: "" as string,
    notes: "",
  });

  useEffect(() => {
    if (receipt) {
      const parsedDate = parseDate(receipt.date);
      setSelectedDate(parsedDate);
      setFormData({
        propertyId: receipt.propertyId,
        uri: receipt.uri,
        date: receipt.date,
        amount: receipt.amount?.toString() || "",
        vendor: receipt.vendor || "",
        category: receipt.category || "",
        tags: receipt.tags.join(", "),
        notes: receipt.notes || "",
      });
    }
  }, [receipt]);

  if (!receipt) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Receipt not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getRequiredFields = () => {
    const required = [];
    if (!formData.propertyId) required.push('Property');
    if (!formData.uri) required.push('Receipt Image');
    return required;
  };

  const handleSave = () => {
    const missingFields = getRequiredFields();
    
    if (missingFields.length > 0) {
      Alert.alert(
        "Save Receipt?", 
        `This receipt is missing some information:\n• ${missingFields.join('\n• ')}\n\nYou can save it now and complete the details later.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save Anyway", onPress: saveReceipt }
        ]
      );
      return;
    }
    
    saveReceipt();
  };

  const saveReceipt = async () => {
    try {
      setIsLoading(true);
      const updatedReceipt: Partial<Receipt> = {
        propertyId: formData.propertyId || properties[0]?.id || 'no-property',
        uri: formData.uri || '',
        date: formData.date,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
        vendor: formData.vendor || undefined,
        category: formData.category || undefined,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        notes: formData.notes || undefined,
      };

      console.log('Updating receipt:', updatedReceipt);
      await updateReceipt(receipt.id, updatedReceipt);
      Alert.alert('Success', 'Receipt updated successfully!');
      router.back();
    } catch (error) {
      console.error('Error updating receipt:', error);
      Alert.alert('Error', 'Failed to update receipt. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Receipt",
      "Are you sure you want to delete this receipt? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteReceipt(receipt.id);
              Alert.alert('Success', 'Receipt deleted successfully!');
              router.back();
            } catch (error) {
              console.error('Error deleting receipt:', error);
              Alert.alert('Error', 'Failed to delete receipt. Please try again.');
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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData({ ...formData, uri: result.assets[0].uri });
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData({ ...formData, uri: result.assets[0].uri });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        <View style={styles.form}>
          {/* Receipt Image */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Receipt Image</Text>
            
            {formData.uri ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: formData.uri }} style={styles.receiptImage} />
                <TouchableOpacity style={styles.changeImageButton} onPress={pickImage}>
                  <Text style={styles.changeImageText}>Change Image</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.imageButtons, !formData.uri && styles.selectorHighlight]}>
                <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                  <Camera size={24} color="#6B7280" />
                  <Text style={styles.imageButtonText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                  <FileText size={24} color="#6B7280" />
                  <Text style={styles.imageButtonText}>Choose from Library</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Property Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Property *</Text>
            <TouchableOpacity 
              style={[styles.dropdown, !formData.propertyId && styles.selectorHighlight]}
              onPress={() => setShowPropertyDropdown(true)}
            >
              <Text style={[styles.dropdownText, !formData.propertyId && styles.placeholderText]}>
                {getSelectedProperty()?.name || "Select a property"}
              </Text>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Receipt Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Receipt Details</Text>
            
            <Text style={styles.label}>Vendor/Store</Text>
            <TextInput
              style={styles.input}
              value={formData.vendor}
              onChangeText={(text) => setFormData({ ...formData, vendor: text })}
              placeholder="Home Depot, Lowe's, etc."
            />
            
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text })}
              placeholder="0.00"
              keyboardType="numeric"
            />
            
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              value={formData.category}
              onChangeText={(text) => setFormData({ ...formData, category: text })}
              placeholder="Maintenance, Supplies, etc."
            />
            
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

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Additional notes about this receipt..."
              multiline
              numberOfLines={3}
            />
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
                <Text style={styles.noPropertiesSubtext}>Add a property first to create receipts</Text>
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
              setFormData({ ...formData, date: formatDate(date) });
            }
          }}
        />
      )}
    </KeyboardAvoidingView>
    </SafeAreaView>
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
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  imageContainer: {
    alignItems: "center",
  },
  receiptImage: {
    width: 200,
    height: 250,
    borderRadius: 8,
    marginBottom: 12,
  },
  changeImageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#3B82F6",
    borderRadius: 6,
  },
  changeImageText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500" as const,
  },
  imageButtons: {
    flexDirection: "row",
    gap: 12,
  },
  imageButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  imageButtonText: {
    fontSize: 14,
    color: "#6B7280",
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
    marginBottom: 16,
  },
  dateButtonText: {
    fontSize: 16,
    color: "#111827",
  },
});