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
  Keyboard,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { usePortfolio, parseTransactionDate } from "@/hooks/portfolio-store";
import { CustomPropertyField, Property } from "@/types/property";
import { PROPERTY_TYPES, PROPERTY_BACKGROUND_COLORS } from "@/constants/categories";
import * as ImagePicker from "expo-image-picker";
import { Camera, Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from "react-native-safe-area-context";
import { toStoredDate, formatDisplayDate } from "@/lib/dates";

const MAX_CUSTOM_FIELDS = 10;
type PropertyDateField = "purchaseDate" | "mortgageRenewalDate" | "insuranceRenewalDate" | "leaseStart" | "leaseEnd" | "propertyTaxDueDate";

const createCustomField = (): CustomPropertyField => ({
  id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  label: "",
  value: "",
});

const cleanCustomFields = (fields: CustomPropertyField[]): CustomPropertyField[] =>
  fields
    .map(field => ({ ...field, label: field.label.trim(), value: field.value.trim() }))
    .filter(field => field.label && field.value)
    .slice(0, MAX_CUSTOM_FIELDS);

export default function EditPropertyScreen() {
  const { id } = useLocalSearchParams();
  const { properties, updateProperty, addReminder } = usePortfolio();
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<PropertyDateField>("purchaseDate");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [autoRenewalOptions, setAutoRenewalOptions] = useState({
    mortgage: false,
    insurance: false,
    lease: false,
    propertyTax: false,
  });

  const formatDate = toStoredDate;

  const property = properties.find(p => p.id === id);
  
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    type: "single-family" as Property["type"],
    purchaseDate: formatDate(new Date()),
    purchasePrice: "",
    currentValue: "",
    squareFootage: "",
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
    propertyTaxDueDate: "",
    acCapacitorSize: "",
    acFilterSize: "",
    paintColorsInside: "",
    paintColorsOutside: "",
    waterHeaterInfo: "",
    applianceInfo: "",
    notes: "",
    imageUri: "",
    backgroundColor: PROPERTY_BACKGROUND_COLORS[0].value,
    customFields: [] as CustomPropertyField[],
  });

  React.useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardOffset(event.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Load property data when component mounts
  useEffect(() => {
    if (property) {
      const parsedPurchaseDate = property.purchaseDate ? parseTransactionDate(property.purchaseDate) : new Date();
      setSelectedDate(parsedPurchaseDate);
      setFormData({
        name: property.name || "",
        address: property.address || "",
        type: property.type,
        purchaseDate: property.purchaseDate ? formatDate(parsedPurchaseDate) : formatDate(new Date()),
        purchasePrice: property.purchasePrice?.toString() || "",
        currentValue: property.currentValue?.toString() || "",
        squareFootage: property.squareFootage?.toString() || "",
        monthlyRent: property.monthlyRent?.toString() || "",
        tenantName: property.tenantName || "",
        tenantContact: property.tenantContact || "",
        leaseStart: property.leaseStart || "",
        leaseEnd: property.leaseEnd || "",
        mortgageAmount: property.mortgageAmount?.toString() || "",
        mortgagePayment: property.mortgagePayment?.toString() || "",
        mortgageRenewalDate: property.mortgageRenewalDate || "",
        insuranceProvider: property.insuranceProvider || "",
        insurancePolicy: property.insurancePolicy || "",
        insuranceRenewalDate: property.insuranceRenewalDate || "",
        insurancePremium: property.insurancePremium?.toString() || "",
        propertyTax: property.propertyTax?.toString() || "",
        propertyTaxDueDate: property.propertyTaxDueDate || "",
        acCapacitorSize: property.acCapacitorSize || "",
        acFilterSize: property.acFilterSize || "",
        paintColorsInside: property.paintColorsInside || "",
        paintColorsOutside: property.paintColorsOutside || "",
        waterHeaterInfo: property.waterHeaterInfo || "",
        applianceInfo: property.applianceInfo || "",
        notes: property.notes || "",
        imageUri: property.imageUri || "",
        backgroundColor: property.backgroundColor || PROPERTY_BACKGROUND_COLORS[0].value,
        customFields: property.customFields || [],
      });
    }
  }, [property]);

  if (!property) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Property not found</Text>
      </View>
    );
  }

  const getRequiredFields = () => {
    const required = [];
    if (!formData.name.trim()) required.push('Property Name');
    if (!formData.address.trim()) required.push('Address');
    return required;
  };

  const handleSave = () => {
    if (isSaving) return;

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
    if (isSaving) return;

    try {
      setIsSaving(true);
      const updatedProperty: Partial<Property> = {
        name: formData.name.trim() || 'Untitled Property',
        address: formData.address.trim() || 'Address not provided',
        type: formData.type,
        purchaseDate: formData.purchaseDate,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        currentValue: formData.currentValue ? parseFloat(formData.currentValue) : undefined,
        squareFootage: formData.squareFootage ? parseFloat(formData.squareFootage) : undefined,
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
        propertyTaxDueDate: formData.propertyTaxDueDate || undefined,
        acCapacitorSize: formData.acCapacitorSize || undefined,
        acFilterSize: formData.acFilterSize || undefined,
        paintColorsInside: formData.paintColorsInside || undefined,
        paintColorsOutside: formData.paintColorsOutside || undefined,
        waterHeaterInfo: formData.waterHeaterInfo || undefined,
        applianceInfo: formData.applianceInfo || undefined,
        notes: formData.notes || undefined,
        imageUri: formData.imageUri || undefined,
        backgroundColor: formData.backgroundColor || undefined,
        customFields: cleanCustomFields(formData.customFields),
      };

      console.log('Updating property:', updatedProperty);
      await updateProperty(property.id, updatedProperty);
      const reminderResults: boolean[] = [];
      if (autoRenewalOptions.mortgage && updatedProperty.mortgageRenewalDate) {
        reminderResults.push(await createRenewalReminder('mortgage', updatedProperty.mortgageRenewalDate, updatedProperty.name || property.name, property.id));
      }
      if (autoRenewalOptions.insurance && updatedProperty.insuranceRenewalDate) {
        reminderResults.push(await createRenewalReminder('insurance', updatedProperty.insuranceRenewalDate, updatedProperty.name || property.name, property.id));
      }
      if (autoRenewalOptions.lease && updatedProperty.leaseEnd) {
        reminderResults.push(await createRenewalReminder('lease', updatedProperty.leaseEnd, updatedProperty.name || property.name, property.id));
      }
      if (autoRenewalOptions.propertyTax && updatedProperty.propertyTaxDueDate) {
        reminderResults.push(await createRenewalReminder('propertyTax', updatedProperty.propertyTaxDueDate, updatedProperty.name || property.name, property.id));
      }

      const failedReminderCount = reminderResults.filter(result => !result).length;
      if (failedReminderCount > 0) {
        Alert.alert('Property saved', `${failedReminderCount} reminder(s) could not be created. Please try adding them from the Reminders tab.`);
        return;
      }

      Alert.alert('Success', 'Property updated successfully!');
      router.back();
    } catch (error) {
      console.error('Error updating property:', error);
      const message = error instanceof Error ? error.message : 'Failed to update property. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const createRenewalReminder = async (
    type: 'mortgage' | 'insurance' | 'lease' | 'propertyTax',
    renewalDate: string,
    propertyName: string,
    propertyId: string,
  ): Promise<boolean> => {
    try {
      if (!renewalDate || !propertyId) return false;
      const due = new Date(renewalDate);
      if (Number.isNaN(due.getTime())) return false;

      const titleMap = {
        mortgage: `Mortgage renewal for ${propertyName}`,
        insurance: `Insurance renewal for ${propertyName}`,
        lease: `Lease renewal for ${propertyName}`,
        propertyTax: `Property tax due for ${propertyName}`,
      } as const;

      const reminderDate = new Date(due);
      reminderDate.setFullYear(reminderDate.getFullYear() + 1);

      await addReminder({
        id: `renewal_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        propertyId,
        type: type === 'propertyTax' ? 'other' : type,
        title: titleMap[type],
        dueDate: toStoredDate(reminderDate),
        notes: 'Auto-created yearly renewal reminder.',
        completed: false,
      });

      return true;
    } catch (error) {
      console.warn('Failed to create yearly renewal reminder:', error);
      return false;
    }
  };

  const openDatePicker = (field: PropertyDateField) => {
    const currentDate = formData[field] ? parseTransactionDate(formData[field]) : new Date();
    setActiveDateField(field);
    setSelectedDate(Number.isNaN(currentDate.getTime()) ? new Date() : currentDate);
    setShowDatePicker(true);
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

  const addCustomField = () => {
    if (formData.customFields.length >= MAX_CUSTOM_FIELDS) return;
    setFormData({ ...formData, customFields: [...formData.customFields, createCustomField()] });
  };

  const updateCustomField = (fieldId: string, updates: Partial<CustomPropertyField>) => {
    setFormData({
      ...formData,
      customFields: formData.customFields.map(field => field.id === fieldId ? { ...field, ...updates } : field),
    });
  };

  const removeCustomField = (fieldId: string) => {
    setFormData({ ...formData, customFields: formData.customFields.filter(field => field.id !== fieldId) });
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
    <KeyboardAvoidingView 
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 96}
      style={{ flex: 1 }}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: Math.max(16, keyboardOffset + 24) }}
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
              placeholderTextColor="#6B7280"
            />
            
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, !formData.address.trim() && styles.inputHighlight]}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="123 Main St, City, State ZIP"
              placeholderTextColor="#6B7280"
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

            <Text style={styles.label}>Dashboard Color</Text>
            <View style={styles.colorGrid}>
              {PROPERTY_BACKGROUND_COLORS.map(color => (
                <TouchableOpacity
                  key={color.value}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color.value },
                    formData.backgroundColor === color.value && styles.colorOptionActive
                  ]}
                  onPress={() => setFormData({ ...formData, backgroundColor: color.value })}
                  accessibilityLabel={color.label}
                >
                  {formData.backgroundColor === color.value && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.colorNote}>Select a color for the property button on the dashboard</Text>
          </View>

          {/* Financial Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Information</Text>
            
            <Text style={styles.label}>Purchase Price</Text>
            <TextInput
              style={styles.input}
              value={formData.purchasePrice}
              onChangeText={(text) => {
                // Allow only numbers and decimal points
                const numericText = text.replace(/[^0-9.]/g, '');
                setFormData({ ...formData, purchasePrice: numericText });
              }}
              placeholder="150000"
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Purchase Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => openDatePicker("purchaseDate")}
            >
              <CalendarIcon size={20} color="#6B7280" />
              <Text style={styles.dateButtonText}>{formatDisplayDate(formData.purchaseDate)}</Text>
            </TouchableOpacity>
            
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

            <Text style={styles.label}>Square Footage</Text>
            <TextInput
              style={styles.input}
              value={formData.squareFootage}
              onChangeText={(text) => {
                const numericText = text.replace(/[^0-9.]/g, '');
                setFormData({ ...formData, squareFootage: numericText });
              }}
              placeholder="1200"
              keyboardType="decimal-pad"
            />
            
            <Text style={styles.label}>Monthly Rent</Text>
            <TextInput
              style={styles.input}
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

            <Text style={styles.label}>Property Tax Due Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => openDatePicker("propertyTaxDueDate")}
            >
              <CalendarIcon size={20} color="#6B7280" />
              <Text style={styles.dateButtonText}>{formData.propertyTaxDueDate ? formatDisplayDate(formData.propertyTaxDueDate) : "Select date"}</Text>
            </TouchableOpacity>
            {formData.propertyTaxDueDate ? (
              <TouchableOpacity
                style={[styles.reminderToggle, autoRenewalOptions.propertyTax && styles.reminderToggleActive]}
                onPress={() => setAutoRenewalOptions({ ...autoRenewalOptions, propertyTax: !autoRenewalOptions.propertyTax })}
              >
                <Text style={[styles.reminderToggleText, autoRenewalOptions.propertyTax && styles.reminderToggleTextActive]}>
                  {autoRenewalOptions.propertyTax ? 'Auto reminder on' : 'Create yearly reminder'}
                </Text>
              </TouchableOpacity>
            ) : null}
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
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => openDatePicker("mortgageRenewalDate")}
            >
              <CalendarIcon size={20} color="#6B7280" />
              <Text style={styles.dateButtonText}>{formData.mortgageRenewalDate ? formatDisplayDate(formData.mortgageRenewalDate) : "Select date"}</Text>
            </TouchableOpacity>
            {formData.mortgageRenewalDate ? (
              <TouchableOpacity
                style={[styles.reminderToggle, autoRenewalOptions.mortgage && styles.reminderToggleActive]}
                onPress={() => setAutoRenewalOptions({ ...autoRenewalOptions, mortgage: !autoRenewalOptions.mortgage })}
              >
                <Text style={[styles.reminderToggleText, autoRenewalOptions.mortgage && styles.reminderToggleTextActive]}>
                  {autoRenewalOptions.mortgage ? 'Auto reminder on' : 'Create yearly reminder'}
                </Text>
              </TouchableOpacity>
            ) : null}
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
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => openDatePicker("insuranceRenewalDate")}
            >
              <CalendarIcon size={20} color="#6B7280" />
              <Text style={styles.dateButtonText}>{formData.insuranceRenewalDate ? formatDisplayDate(formData.insuranceRenewalDate) : "Select date"}</Text>
            </TouchableOpacity>
            {formData.insuranceRenewalDate ? (
              <TouchableOpacity
                style={[styles.reminderToggle, autoRenewalOptions.insurance && styles.reminderToggleActive]}
                onPress={() => setAutoRenewalOptions({ ...autoRenewalOptions, insurance: !autoRenewalOptions.insurance })}
              >
                <Text style={[styles.reminderToggleText, autoRenewalOptions.insurance && styles.reminderToggleTextActive]}>
                  {autoRenewalOptions.insurance ? 'Auto reminder on' : 'Create yearly reminder'}
                </Text>
              </TouchableOpacity>
            ) : null}
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
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => openDatePicker("leaseStart")}
            >
              <CalendarIcon size={20} color="#6B7280" />
              <Text style={styles.dateButtonText}>{formData.leaseStart ? formatDisplayDate(formData.leaseStart) : "Select date"}</Text>
            </TouchableOpacity>
            
            <Text style={styles.label}>Lease End</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => openDatePicker("leaseEnd")}
            >
              <CalendarIcon size={20} color="#6B7280" />
              <Text style={styles.dateButtonText}>{formData.leaseEnd ? formatDisplayDate(formData.leaseEnd) : "Select date"}</Text>
            </TouchableOpacity>
            {formData.leaseEnd ? (
              <TouchableOpacity
                style={[styles.reminderToggle, autoRenewalOptions.lease && styles.reminderToggleActive]}
                onPress={() => setAutoRenewalOptions({ ...autoRenewalOptions, lease: !autoRenewalOptions.lease })}
              >
                <Text style={[styles.reminderToggleText, autoRenewalOptions.lease && styles.reminderToggleTextActive]}>
                  {autoRenewalOptions.lease ? 'Auto reminder on' : 'Create yearly reminder'}
                </Text>
              </TouchableOpacity>
            ) : null}
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

            <View style={styles.customFieldsHeader}>
              <View>
                <Text style={styles.label}>Custom Rows</Text>
                <Text style={styles.customFieldsCount}>{formData.customFields.length}/{MAX_CUSTOM_FIELDS}</Text>
              </View>
              <TouchableOpacity
                style={[styles.addCustomFieldButton, formData.customFields.length >= MAX_CUSTOM_FIELDS && styles.addCustomFieldButtonDisabled]}
                onPress={addCustomField}
                disabled={formData.customFields.length >= MAX_CUSTOM_FIELDS}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addCustomFieldButtonText}>Add Row</Text>
              </TouchableOpacity>
            </View>

            {formData.customFields.map((field, index) => (
              <View key={field.id} style={styles.customFieldRow}>
                <View style={styles.customFieldInputs}>
                  <TextInput
                    style={styles.input}
                    value={field.label}
                    onChangeText={(text) => updateCustomField(field.id, { label: text })}
                    placeholder={`Label ${index + 1}`}
                    placeholderTextColor="#6B7280"
                  />
                  <TextInput
                    style={[styles.input, styles.customFieldValueInput]}
                    value={field.value}
                    onChangeText={(text) => updateCustomField(field.id, { value: text })}
                    placeholder="Value"
                    placeholderTextColor="#6B7280"
                    multiline
                  />
                </View>
                <TouchableOpacity style={styles.removeCustomFieldButton} onPress={() => removeCustomField(field.id)}>
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
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
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={isSaving}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
              <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Update Property'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) {
              setSelectedDate(date);
              setFormData({ ...formData, [activeDateField]: formatDate(date) });
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
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
    color: "#111827",
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
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  dateButtonText: {
    fontSize: 16,
    color: "#111827",
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
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  colorOption: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorOptionActive: {
    borderColor: "#FFFFFF",
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  checkmark: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700" as const,
  },
  colorNote: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic" as const,
  },
  customFieldsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  customFieldsCount: {
    fontSize: 12,
    color: "#6B7280",
  },
  addCustomFieldButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addCustomFieldButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  addCustomFieldButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  customFieldRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginBottom: 4,
  },
  customFieldInputs: {
    flex: 1,
  },
  customFieldValueInput: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  removeCustomFieldButton: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 10,
  },
});