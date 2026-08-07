import React, { useState } from "react";
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
import { router } from "expo-router";
import { usePortfolio } from "@/hooks/portfolio-store";
import { Reminder } from "@/types/property";
import { REMINDER_TYPES } from "@/constants/categories";
import { Calendar, Bell, ChevronDown, Phone, Mail } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AddReminderScreen() {
  const { properties, addReminder } = usePortfolio();
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    propertyId: "",
    type: "other" as Reminder["type"],
    title: "",
    dueDate: "",
    notes: "",
    recipientPhone: "",
    recipientEmail: "",
  });

  const getRequiredFields = () => {
    const required = [];
    if (!formData.propertyId) required.push('Property');
    if (!formData.title.trim()) required.push('Title');
    if (!formData.dueDate.trim()) required.push('Due Date');
    return required;
  };

  const handleSave = () => {
    const missingFields = getRequiredFields();
    
    if (missingFields.length > 0) {
      Alert.alert(
        "Save Reminder?", 
        `This reminder is missing some information:\n• ${missingFields.join('\n• ')}\n\nYou can save it now and complete the details later.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save Anyway", onPress: saveReminder }
        ]
      );
      return;
    }
    
    saveReminder();
  };

  const saveReminder = async () => {
    try {
      const newReminder: Reminder = {
        id: Date.now().toString(),
        propertyId: formData.propertyId || properties[0]?.id || 'no-property',
        type: formData.type,
        title: formData.title.trim() || 'Untitled Reminder',
        dueDate: formData.dueDate.trim() || new Date().toISOString().split('T')[0],
        notes: formData.notes || undefined,
        completed: false,
        recipientPhone: formData.recipientPhone.trim() || undefined,
        recipientEmail: formData.recipientEmail.trim() || undefined,
      };

      console.log('Saving reminder:', newReminder);
      await addReminder(newReminder);
      Alert.alert('Success', 'Reminder saved successfully!');
      router.back();
    } catch (error) {
      console.error('Error saving reminder:', error);
      Alert.alert('Error', 'Failed to save reminder. Please try again.');
    }
  };

  const getSelectedProperty = () => {
    return properties.find(p => p.id === formData.propertyId);
  };

  const getReminderTypeColor = (type: string) => {
    const reminderType = REMINDER_TYPES.find(t => t.value === type);
    return reminderType?.color || '#6B7280';
  };

  const generateSuggestedTitle = (type: string, propertyName: string) => {
    const property = properties.find(p => p.id === formData.propertyId);
    const name = property?.name || propertyName;
    
    switch (type) {
      case 'mortgage':
        return `Mortgage renewal for ${name}`;
      case 'insurance':
        return `Insurance renewal for ${name}`;
      case 'lease':
        return `Lease renewal for ${name}`;
      case 'maintenance':
        return `Maintenance check for ${name}`;
      default:
        return '';
    }
  };

  const handleTypeChange = (type: Reminder["type"]) => {
    const property = properties.find(p => p.id === formData.propertyId);
    const suggestedTitle = generateSuggestedTitle(type, property?.name || '');
    
    setFormData({ 
      ...formData, 
      type,
      title: suggestedTitle || formData.title
    });
  };

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    const suggestedTitle = generateSuggestedTitle(formData.type, property?.name || '');
    
    setFormData({
      ...formData,
      propertyId,
      title: suggestedTitle || formData.title,
      recipientPhone: property?.tenantContact || formData.recipientPhone,
    });
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

          {/* Reminder Type */}
          <View style={styles.section}>
            <Text style={styles.label}>Reminder Type</Text>
            <View style={styles.typeSelector}>
              {REMINDER_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeOption,
                    formData.type === type.value && styles.typeOptionActive,
                    { borderColor: type.color }
                  ]}
                  onPress={() => handleTypeChange(type.value as Reminder["type"])}
                >
                  <View style={[styles.typeIndicator, { backgroundColor: type.color }]} />
                  <Text style={[
                    styles.typeOptionText,
                    formData.type === type.value && styles.typeOptionTextActive
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.label}>Title *</Text>
            <View style={[styles.titleContainer, !formData.title.trim() && styles.inputHighlight]}>
              <Bell size={20} color={getReminderTypeColor(formData.type)} />
              <TextInput
                style={styles.titleInput}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="What do you need to be reminded about?"
              />
            </View>
          </View>

          {/* Due Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Due Date *</Text>
            <View style={[styles.dateContainer, !formData.dueDate.trim() && styles.inputHighlight]}>
              <Calendar size={20} color="#6B7280" />
              <TextInput
                style={styles.dateInput}
                value={formData.dueDate}
                onChangeText={(text) => setFormData({ ...formData, dueDate: text })}
                placeholder="mm-dd-yy"
              />
            </View>
          </View>

          {/* Quick Date Options */}
          <View style={styles.section}>
            <Text style={styles.label}>Quick Options</Text>
            <View style={styles.quickDateOptions}>
              {[
                { label: "1 Week", days: 7 },
                { label: "1 Month", days: 30 },
                { label: "3 Months", days: 90 },
                { label: "6 Months", days: 180 },
                { label: "1 Year", days: 365 },
              ].map(option => (
                <TouchableOpacity
                  key={option.label}
                  style={styles.quickDateOption}
                  onPress={() => {
                    const date = new Date();
                    date.setDate(date.getDate() + option.days);
                    setFormData({ ...formData, dueDate: date.toISOString().split('T')[0] });
                  }}
                >
                  <Text style={styles.quickDateOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notification Contact */}
          <View style={styles.section}>
            <Text style={styles.label}>Notification Contact (optional)</Text>
            <Text style={styles.hintText}>Add a phone number or email to send reminders from the property page.</Text>
            
            {/* Recipient Phone */}
            <View style={styles.contactRow}>
              <Phone size={20} color="#6B7280" />
              <TextInput
                style={styles.contactInput}
                value={formData.recipientPhone}
                onChangeText={(text) => setFormData({ ...formData, recipientPhone: text })}
                placeholder="Phone number (e.g. 555-123-4567)"
                keyboardType="phone-pad"
              />
            </View>

            {/* Recipient Email */}
            <View style={[styles.contactRow, { marginTop: 8 }]}>
              <Mail size={20} color="#6B7280" />
              <TextInput
                style={styles.contactInput}
                value={formData.recipientEmail}
                onChangeText={(text) => setFormData({ ...formData, recipientEmail: text })}
                placeholder="Email address (e.g. tenant@email.com)"
                keyboardType="email-address"
                autoCapitalize="none"
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
              placeholder="Additional details or instructions..."
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Reminder</Text>
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
                <Text style={styles.noPropertiesSubtext}>Add a property first to create reminders</Text>
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
                    handlePropertyChange(property.id);
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
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
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
  typeSelector: {
    gap: 8,
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    gap: 12,
  },
  typeOptionActive: {
    backgroundColor: "#F8FAFC",
  },
  typeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  typeOptionText: {
    fontSize: 14,
    color: "#374151",
  },
  typeOptionTextActive: {
    fontWeight: "500" as const,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  titleInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dateInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  quickDateOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickDateOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quickDateOptionText: {
    fontSize: 12,
    color: "#6B7280",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
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
  hintText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: -4,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  contactInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#111827",
  },
});