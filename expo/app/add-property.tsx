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
} from "react-native";
import { router } from "expo-router";
import { usePortfolio } from "@/hooks/portfolio-store";
import { Property } from "@/types/property";
import { PROPERTY_TYPES } from "@/constants/categories";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AddPropertyScreen() {
  const { addProperty } = usePortfolio();
  const insets = useSafeAreaInsets();
  
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    type: "single-family" as Property["type"],
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: "",
    currentValue: "",
    monthlyRent: "",
    tenantName: "",
    tenantContact: "",
    leaseStart: "",
    leaseEnd: "",
    mortgageAmount: "",
    mortgagePayment: "",
    mortgageRenewalDate: "",
    insuranceProvider: "",
    insurancePolicy: "",
    insuranceRenewalDate: "",
    insurancePremium: "",
    propertyTax: "",
    acCapacitorSize: "",
    acFilterSize: "",
    paintColorsInside: "",
    paintColorsOutside: "",
    waterHeaterInfo: "",
    applianceInfo: "",
    notes: "",
    imageUri: "",
  });

  const getRequiredFields = () => {
    const required = [];
    if (!formData.name.trim()) required.push('Property Name');
    if (!formData.address.trim()) required.push('Address');
    if (!formData.purchasePrice.trim()) required.push('Purchase Price');
    if (!formData.monthlyRent.trim()) required.push('Monthly Rent');
    return required;
  };

  const handleSave = () => {
    const missingFields = getRequiredFields();
    
    if (missingFields.length > 0) {
      Alert.alert(
        "Save Property?", 
        `This property is missing some information:\n• ${missingFields.join('\n• ')}\n\nYou can save it now and complete the details later.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Save Anyway", onPress: saveProperty }
        ]
      );
      return;
    }
    
    saveProperty();
  };

  const saveProperty = async () => {
    try {
      const newProperty: Property = {
        id: Date.now().toString(),
        name: formData.name.trim() || 'Untitled Property',
        address: formData.address.trim() || 'Address not provided',
        type: formData.type,
        purchaseDate: formData.purchaseDate,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        currentValue: formData.currentValue ? parseFloat(formData.currentValue) : undefined,
        monthlyRent: parseFloat(formData.monthlyRent) || 0,
        tenantName: formData.tenantName || undefined,
        tenantContact: formData.tenantContact || undefined,
        leaseStart: formData.leaseStart || undefined,
        leaseEnd: formData.leaseEnd || undefined,
        mortgageAmount: formData.mortgageAmount ? parseFloat(formData.mortgageAmount) : undefined,
        mortgagePayment: formData.mortgagePayment ? parseFloat(formData.mortgagePayment) : undefined,
        mortgageRenewalDate: formData.mortgageRenewalDate || undefined,
        insuranceProvider: formData.insuranceProvider || undefined,
        insurancePolicy: formData.insurancePolicy || undefined,
        insuranceRenewalDate: formData.insuranceRenewalDate || undefined,
        insurancePremium: formData.insurancePremium ? parseFloat(formData.insurancePremium) : undefined,
        propertyTax: formData.propertyTax ? parseFloat(formData.propertyTax) : undefined,
        acCapacitorSize: formData.acCapacitorSize || undefined,
        acFilterSize: formData.acFilterSize || undefined,
        paintColorsInside: formData.paintColorsInside || undefined,
        paintColorsOutside: formData.paintColorsOutside || undefined,
        waterHeaterInfo: formData.waterHeaterInfo || undefined,
        applianceInfo: formData.applianceInfo || undefined,
        notes: formData.notes || undefined,
        imageUri: formData.imageUri || undefined,
        appliances: [],
        paintColors: [],
      };

      console.log('Saving property:', newProperty);
      await addProperty(newProperty);
      Alert.alert('Success', 'Property saved successfully!');
      router.back();
    } catch (error) {
      console.error('Error saving property:', error);
      Alert.alert('Error', 'Failed to save property. Please try again.');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData({ ...formData, imageUri: result.assets[0].uri });
    }
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
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Camera size={24} color="#6B7280" />
              <Text style={styles.imageButtonText}>
                {formData.imageUri ? "Change Photo" : "Add Property Photo"}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.label}>Property Name *</Text>
            <TextInput
              style={[styles.input, !formData.name.trim() && styles.inputHighlight]}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="e.g., Main Street Apartment"
            />
            
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, !formData.address.trim() && styles.inputHighlight]}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="123 Main St, City, State ZIP"
              multiline
            />
            
            <Text style={styles.label}>Property Type</Text>
            <View style={styles.typeSelector}>
              {PROPERTY_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeOption,
                    formData.type === type.value && styles.typeOptionActive
                  ]}
                  onPress={() => setFormData({ ...formData, type: type.value as Property["type"] })}
                >
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

          {/* Financial Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Information</Text>
            
            <Text style={styles.label}>Purchase Price *</Text>
            <TextInput
              style={[styles.input, !formData.purchasePrice.trim() && styles.inputHighlight]}
              value={formData.purchasePrice}
              onChangeText={(text) => {
                // Allow only numbers and decimal points
                const numericText = text.replace(/[^0-9.]/g, '');
                setFormData({ ...formData, purchasePrice: numericText });
              }}
              placeholder="150000"
              keyboardType="decimal-pad"
            />
            
            <Text style={styles.label}>Current Value</Text>
            <TextInput
              style={styles.input}
              value={formData.currentValue}
              onChangeText={(text) => {
                // Allow only numbers and decimal points
                const numericText = text.replace(/[^0-9.]/g, '');
                setFormData({ ...formData, currentValue: numericText });
              }}
              placeholder="175000"
              keyboardType="decimal-pad"
            />
            
            <Text style={styles.label}>Monthly Rent *</Text>
            <TextInput
              style={[styles.input, !formData.monthlyRent.trim() && styles.inputHighlight]}
              value={formData.monthlyRent}
              onChangeText={(text) => {
                // Allow only numbers and decimal points
                const numericText = text.replace(/[^0-9.]/g, '');
                setFormData({ ...formData, monthlyRent: numericText });
              }}
              placeholder="1500"
              keyboardType="decimal-pad"
            />
            
            <Text style={styles.label}>Property Tax (Annual)</Text>
            <TextInput
              style={styles.input}
              value={formData.propertyTax}
              onChangeText={(text) => {
                // Allow only numbers and decimal points
                const numericText = text.replace(/[^0-9.]/g, '');
                setFormData({ ...formData, propertyTax: numericText });
              }}
              placeholder="3500"
              keyboardType="decimal-pad"
            />
          </View>

          {/* Mortgage Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mortgage Information</Text>
            
            <Text style={styles.label}>Mortgage Amount</Text>
            <TextInput
              style={styles.input}
              value={formData.mortgageAmount}
              onChangeText={(text) => {
                // Allow only numbers and decimal points
                const numericText = text.replace(/[^0-9.]/g, '');
                setFormData({ ...formData, mortgageAmount: numericText });
              }}
              placeholder="120000"
              keyboardType="decimal-pad"
            />
            
            <Text style={styles.label}>Monthly Payment</Text>
            <TextInput
              style={styles.input}
              value={formData.mortgagePayment}
              onChangeText={(text) => {
                // Allow only numbers and decimal points
                const numericText = text.replace(/[^0-9.]/g, '');
                setFormData({ ...formData, mortgagePayment: numericText });
              }}
              placeholder="850"
              keyboardType="decimal-pad"
            />
            
            <Text style={styles.label}>Renewal Date</Text>
            <TextInput
              style={styles.input}
              value={formData.mortgageRenewalDate}
              onChangeText={(text) => setFormData({ ...formData, mortgageRenewalDate: text })}
              placeholder="mm-dd-yy"
            />
          </View>

          {/* Insurance Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insurance Information</Text>
            
            <Text style={styles.label}>Provider</Text>
            <TextInput
              style={styles.input}
              value={formData.insuranceProvider}
              onChangeText={(text) => setFormData({ ...formData, insuranceProvider: text })}
              placeholder="Insurance Company Name"
            />
            
            <Text style={styles.label}>Policy Number</Text>
            <TextInput
              style={styles.input}
              value={formData.insurancePolicy}
              onChangeText={(text) => setFormData({ ...formData, insurancePolicy: text })}
              placeholder="Policy #"
            />
            
            <Text style={styles.label}>Annual Premium</Text>
            <TextInput
              style={styles.input}
              value={formData.insurancePremium}
              onChangeText={(text) => {
                // Allow only numbers and decimal points
                const numericText = text.replace(/[^0-9.]/g, '');
                setFormData({ ...formData, insurancePremium: numericText });
              }}
              placeholder="1200"
              keyboardType="decimal-pad"
            />
            
            <Text style={styles.label}>Renewal Date</Text>
            <TextInput
              style={styles.input}
              value={formData.insuranceRenewalDate}
              onChangeText={(text) => setFormData({ ...formData, insuranceRenewalDate: text })}
              placeholder="mm-dd-yy"
            />
          </View>

          {/* Tenant Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tenant Information</Text>
            
            <Text style={styles.label}>Tenant Name</Text>
            <TextInput
              style={styles.input}
              value={formData.tenantName}
              onChangeText={(text) => setFormData({ ...formData, tenantName: text })}
              placeholder="John Doe"
            />
            
            <Text style={styles.label}>Contact</Text>
            <TextInput
              style={styles.input}
              value={formData.tenantContact}
              onChangeText={(text) => setFormData({ ...formData, tenantContact: text })}
              placeholder="Phone or Email"
            />
            
            <Text style={styles.label}>Lease Start</Text>
            <TextInput
              style={styles.input}
              value={formData.leaseStart}
              onChangeText={(text) => setFormData({ ...formData, leaseStart: text })}
              placeholder="mm-dd-yy"
            />
            
            <Text style={styles.label}>Lease End</Text>
            <TextInput
              style={styles.input}
              value={formData.leaseEnd}
              onChangeText={(text) => setFormData({ ...formData, leaseEnd: text })}
              placeholder="mm-dd-yy"
            />
          </View>

          {/* Property Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property Details</Text>
            
            <Text style={styles.label}>AC Capacitor Size</Text>
            <TextInput
              style={styles.input}
              value={formData.acCapacitorSize}
              onChangeText={(text) => setFormData({ ...formData, acCapacitorSize: text })}
              placeholder="e.g., 45/5 MFD 370V"
            />
            
            <Text style={styles.label}>AC Filter Size</Text>
            <TextInput
              style={styles.input}
              value={formData.acFilterSize}
              onChangeText={(text) => setFormData({ ...formData, acFilterSize: text })}
              placeholder="e.g., 16x25x1"
            />
            
            <Text style={styles.label}>Paint Colors Inside</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.paintColorsInside}
              onChangeText={(text) => setFormData({ ...formData, paintColorsInside: text })}
              placeholder="e.g., Living Room: Sherwin Williams Agreeable Gray SW7029"
              multiline
              numberOfLines={3}
            />
            
            <Text style={styles.label}>Paint Colors Outside</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.paintColorsOutside}
              onChangeText={(text) => setFormData({ ...formData, paintColorsOutside: text })}
              placeholder="e.g., Exterior: Benjamin Moore White Dove OC-17"
              multiline
              numberOfLines={3}
            />
            
            <Text style={styles.label}>Water Heater Info</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.waterHeaterInfo}
              onChangeText={(text) => setFormData({ ...formData, waterHeaterInfo: text })}
              placeholder="e.g., Rheem 40 Gallon Electric, Model: XE40M06ST45U1, Installed: 2020"
              multiline
              numberOfLines={3}
            />
            
            <Text style={styles.label}>Appliance Info</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.applianceInfo}
              onChangeText={(text) => setFormData({ ...formData, applianceInfo: text })}
              placeholder="e.g., Refrigerator: GE Model GTS18GTHWW, Washer: Whirlpool WTW4816FW"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Additional notes..."
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
              <Text style={styles.saveButtonText}>Save Property</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  imageButtonText: {
    fontSize: 14,
    color: "#6B7280",
  },
  typeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  typeOptionActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  typeOptionText: {
    fontSize: 14,
    color: "#6B7280",
  },
  typeOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "500" as const,
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
});