import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  Pressable,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { usePortfolio, usePropertyTransactions, usePropertyReceipts, usePropertyReminders, usePropertyPhotos } from "@/hooks/portfolio-store";
import { PropertyPhoto } from "@/types/property";
import * as ImagePicker from "expo-image-picker";
import { Edit, Home, DollarSign, FileText, Bell, Plus, Trash2, Image as ImageIcon, Camera, X, MessageSquare, Mail, CalendarDays } from "lucide-react-native";
import { Linking } from "react-native";
import * as Calendar from "expo-calendar";

export default function PropertyDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { properties, deleteProperty, deleteReminder } = usePortfolio();
  const transactions = usePropertyTransactions(id as string);
  const receipts = usePropertyReceipts(id as string);
  const reminders = usePropertyReminders(id as string);
  const photos = usePropertyPhotos(id as string);
  
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "documents" | "reminders">("overview");
  const [showGallery, setShowGallery] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [viewerCaption, setViewerCaption] = useState<string>("");
  
  const property = properties.find(p => p.id === id);

  if (!property) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Property not found</Text>
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
    const date = new Date(dateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${month}-${day}-${year}`;
  };

  const { addPropertyPhoto, deletePropertyPhoto } = usePortfolio();

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to add photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedPhotoUri(result.assets[0].uri);
      setPhotoCaption('');
      setShowPhotoModal(true);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera access to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedPhotoUri(result.assets[0].uri);
      setPhotoCaption('');
      setShowPhotoModal(true);
    }
  };

  const savePhoto = () => {
    if (!selectedPhotoUri) return;
    const newPhoto: PropertyPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      propertyId: id as string,
      uri: selectedPhotoUri,
      caption: photoCaption.trim(),
      date: new Date().toISOString(),
    };
    addPropertyPhoto(newPhoto);
    setShowPhotoModal(false);
    setSelectedPhotoUri(null);
    setPhotoCaption('');
  };

  const deletePhoto = (photoId: string) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePropertyPhoto(photoId),
        },
      ]
    );
  };

  const addToCalendar = async (reminder: typeof reminders[0]) => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Calendar access is required to add reminders. Please enable it in Settings.');
      return;
    }

    const dueDate = new Date(reminder.dueDate);
    dueDate.setHours(9, 0, 0, 0);
    const endDate = new Date(dueDate);
    endDate.setHours(10, 0, 0, 0);

    const messageBody = buildReminderMessage(reminder);

    try {
      const result = await Calendar.createEventInCalendarAsync({
        title: reminder.title,
        startDate: dueDate.toISOString(),
        endDate: endDate.toISOString(),
        notes: messageBody,
        location: property.address,
        alarms: [{ relativeOffset: -30 }],
      });
      if (result.action === 'saved') {
        Alert.alert('Added', `"${reminder.title}" was added to your calendar.`);
      }
    } catch {
      Alert.alert('Error', 'Could not open calendar. Make sure you have a calendar app installed.');
    }
  };

  const buildReminderMessage = (reminder: typeof reminders[0]) => {
    const lines: string[] = [];
    lines.push(`Property: ${property.name}`);
    lines.push(`Address: ${property.address}`);

    if (reminder.type === 'maintenance') {
      if (property.acFilterSize) lines.push(`AC Filter: ${property.acFilterSize}`);
      if (property.acCapacitorSize) lines.push(`AC Capacitor: ${property.acCapacitorSize}`);
      if (property.waterHeaterInfo) lines.push(`Water Heater: ${property.waterHeaterInfo}`);
      if (property.applianceInfo) lines.push(`Appliance: ${property.applianceInfo}`);
      if (property.paintColorsInside) lines.push(`Interior Paint: ${property.paintColorsInside}`);
      if (property.paintColorsOutside) lines.push(`Exterior Paint: ${property.paintColorsOutside}`);
    } else if (reminder.type === 'lease') {
      if (property.tenantName) lines.push(`Tenant: ${property.tenantName}`);
      if (property.tenantContact) lines.push(`Tenant Contact: ${property.tenantContact}`);
      if (property.leaseStart) lines.push(`Lease Start: ${formatDate(property.leaseStart)}`);
      if (property.leaseEnd) lines.push(`Lease End: ${formatDate(property.leaseEnd)}`);
      lines.push(`Monthly Rent: ${formatCurrency(property.monthlyRent)}`);
    } else if (reminder.type === 'mortgage') {
      if (property.mortgageAmount != null) lines.push(`Loan Amount: ${formatCurrency(property.mortgageAmount)}`);
      if (property.mortgagePayment != null) lines.push(`Monthly Payment: ${formatCurrency(property.mortgagePayment)}`);
      if (property.mortgageRenewalDate) lines.push(`Renewal Date: ${formatDate(property.mortgageRenewalDate)}`);
    } else if (reminder.type === 'insurance') {
      if (property.insuranceProvider) lines.push(`Provider: ${property.insuranceProvider}`);
      if (property.insurancePolicy) lines.push(`Policy #: ${property.insurancePolicy}`);
      if (property.insurancePremium != null) lines.push(`Annual Premium: ${formatCurrency(property.insurancePremium)}`);
      if (property.insuranceRenewalDate) lines.push(`Renewal Date: ${formatDate(property.insuranceRenewalDate)}`);
    }

    if (reminder.notes) {
      lines.push(`Notes: ${reminder.notes}`);
    }

    return lines.join('\n');
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Property",
      `Are you sure you want to delete "${property.name}"? This will also delete all related transactions, receipts, and reminders.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            deleteProperty(property.id);
            router.back();
          }
        }
      ]
    );
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        {!!property.imageUri && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => { setViewerCaption(""); setViewerUri(property.imageUri!); }}>
            <Image source={{ uri: property.imageUri }} style={styles.propertyImage} />
          </TouchableOpacity>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.propertyName}>{property.name}</Text>
          <Text style={styles.propertyAddress}>{property.address}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => router.push(`/edit-property/${property.id}` as any)}
            >
              <Edit size={16} color="#3B82F6" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.galleryHeaderBtn, showGallery && styles.galleryHeaderBtnActive]}
              onPress={() => setShowGallery(!showGallery)}
            >
              <ImageIcon size={16} color={showGallery ? "#FFFFFF" : "#8B5CF6"} />
              <Text style={[styles.galleryHeaderBtnText, showGallery && styles.galleryHeaderBtnTextActive]}>
                Gallery{photos.length > 0 ? ` (${photos.length})` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Trash2 size={16} color="#EF4444" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { key: "overview", label: "Overview", icon: Home },
          { key: "transactions", label: "Finances", icon: DollarSign },
          { key: "documents", label: "Documents", icon: FileText },
          { key: "reminders", label: "Reminders", icon: Bell },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Icon size={16} color={activeTab === tab.key ? "#3B82F6" : "#6B7280"} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Gallery Section (toggled via header button) */}
      {showGallery && (
        <View style={styles.gallerySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
            <View style={styles.galleryAddButtons}>
              <TouchableOpacity style={styles.galleryBtn} onPress={takePhoto}>
                <Camera size={16} color="#FFFFFF" />
                <Text style={styles.galleryBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.galleryBtnOutline} onPress={pickPhoto}>
                <ImageIcon size={16} color="#3B82F6" />
                <Text style={styles.galleryBtnOutlineText}>Library</Text>
              </TouchableOpacity>
            </View>
          </View>
          {photos.length === 0 ? (
            <View style={styles.emptyState}>
              <Camera size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>No photos yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Add photos of completed work, repairs, or property conditions
              </Text>
            </View>
          ) : (
            <View style={styles.galleryGrid}>
              {photos.map(photo => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.galleryItem}
                  onPress={() => { setViewerCaption(photo.caption); setViewerUri(photo.uri); }}
                  onLongPress={() => deletePhoto(photo.id)}
                >
                  <Image source={{ uri: photo.uri }} style={styles.galleryImage} />
                  {photo.caption ? (
                    <View style={styles.galleryCaption}>
                      <Text style={styles.galleryCaptionText} numberOfLines={1}>{photo.caption}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.galleryDate}>{formatDate(photo.date)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === "overview" && (
          <View>
            {/* Financial Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Financial Summary</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Monthly Rent</Text>
                  <Text style={styles.metricValue}>{formatCurrency(property.monthlyRent)}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Purchase Price</Text>
                  <Text style={styles.metricValue}>{formatCurrency(property.purchasePrice)}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Current Value</Text>
                  <Text style={styles.metricValue}>
                    {formatCurrency(property.currentValue || property.purchasePrice)}
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Net Profit</Text>
                  <Text style={[styles.metricValue, { color: netProfit >= 0 ? '#10B981' : '#EF4444' }]}>
                    {formatCurrency(netProfit)}
                  </Text>
                </View>
                {property.propertyTax != null && property.propertyTax > 0 && (
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Property Tax /yr</Text>
                    <Text style={styles.metricValue}>{formatCurrency(property.propertyTax)}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Mortgage Details */}
            {!!(property.mortgageAmount != null || property.mortgagePayment != null || property.mortgageRenewalDate) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mortgage Details</Text>
                <View style={styles.detailsGrid}>
                  {property.mortgageAmount != null && property.mortgageAmount > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Loan Amount</Text>
                      <Text style={styles.detailValue}>{formatCurrency(property.mortgageAmount)}</Text>
                    </View>
                  )}
                  {property.mortgagePayment != null && property.mortgagePayment > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Monthly Payment</Text>
                      <Text style={styles.detailValue}>{formatCurrency(property.mortgagePayment)}</Text>
                    </View>
                  )}
                  {!!property.mortgageRenewalDate && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Renewal Date</Text>
                      <Text style={styles.detailValue}>{formatDate(property.mortgageRenewalDate)}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Insurance Details */}
            {!!(property.insuranceProvider || property.insurancePolicy || property.insurancePremium != null || property.insuranceRenewalDate) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Insurance Details</Text>
                <View style={styles.detailsGrid}>
                  {!!property.insuranceProvider && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Provider</Text>
                      <Text style={styles.detailValue}>{property.insuranceProvider}</Text>
                    </View>
                  )}
                  {!!property.insurancePolicy && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Policy Number</Text>
                      <Text style={styles.detailValue}>{property.insurancePolicy}</Text>
                    </View>
                  )}
                  {property.insurancePremium != null && property.insurancePremium > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Annual Premium</Text>
                      <Text style={styles.detailValue}>{formatCurrency(property.insurancePremium)}</Text>
                    </View>
                  )}
                  {!!property.insuranceRenewalDate && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Renewal Date</Text>
                      <Text style={styles.detailValue}>{formatDate(property.insuranceRenewalDate)}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Property Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Property Details</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>{property.type.replace('-', ' ')}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Purchase Date</Text>
                  <Text style={styles.detailValue}>{formatDate(property.purchaseDate)}</Text>
                </View>
              </View>
            </View>

            {/* Tenant Information */}
            {!!(property.tenantName || property.tenantContact || property.leaseStart || property.leaseEnd) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tenant Information</Text>
                <View style={styles.detailsGrid}>
                  {!!property.tenantName && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tenant</Text>
                      <Text style={styles.detailValue}>{property.tenantName}</Text>
                    </View>
                  )}
                  {!!property.tenantContact && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Contact</Text>
                      <Text style={styles.detailValue}>{property.tenantContact}</Text>
                    </View>
                  )}
                  {!!property.leaseStart && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Lease Start</Text>
                      <Text style={styles.detailValue}>{formatDate(property.leaseStart)}</Text>
                    </View>
                  )}
                  {!!property.leaseEnd && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Lease End</Text>
                      <Text style={styles.detailValue}>{formatDate(property.leaseEnd)}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Appliances */}
            {property.appliances.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Appliances</Text>
                {property.appliances.map(appliance => (
                  <View key={appliance.id} style={styles.applianceCard}>
                    <Text style={styles.applianceName}>{appliance.name}</Text>
                    <Text style={styles.applianceDetails}>{appliance.type} - {appliance.model}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Paint Colors */}
            {property.paintColors.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Paint Colors</Text>
                {property.paintColors.map(paint => (
                  <View key={paint.id} style={styles.paintCard}>
                    <Text style={styles.paintRoom}>{paint.room}</Text>
                    <Text style={styles.paintDetails}>{paint.brand} - {paint.color} ({paint.finish})</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Maintenance & Property Specs */}
            {!!(property.acCapacitorSize || property.acFilterSize || property.paintColorsInside || property.paintColorsOutside || property.waterHeaterInfo || property.applianceInfo) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Maintenance & Property Specs</Text>
                <View style={styles.detailsGrid}>
                  {!!property.acCapacitorSize && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>AC Capacitor Size</Text>
                      <Text style={styles.detailValue}>{property.acCapacitorSize}</Text>
                    </View>
                  )}
                  {!!property.acFilterSize && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>AC Filter Size</Text>
                      <Text style={styles.detailValue}>{property.acFilterSize}</Text>
                    </View>
                  )}
                  {!!property.paintColorsInside && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Paint Colors Inside</Text>
                      <Text style={styles.detailValue}>{property.paintColorsInside}</Text>
                    </View>
                  )}
                  {!!property.paintColorsOutside && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Paint Colors Outside</Text>
                      <Text style={styles.detailValue}>{property.paintColorsOutside}</Text>
                    </View>
                  )}
                  {!!property.waterHeaterInfo && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Water Heater</Text>
                      <Text style={styles.detailValue}>{property.waterHeaterInfo}</Text>
                    </View>
                  )}
                  {!!property.applianceInfo && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Appliances</Text>
                      <Text style={styles.detailValue}>{property.applianceInfo}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Notes */}
            {!!property.notes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <View style={styles.notesCard}>
                  <Text style={styles.notesText}>{property.notes}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === "transactions" && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Transactions ({transactions.length})</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/add-transaction' as any)}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <DollarSign size={48} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>No transactions yet</Text>
              </View>
            ) : (
              transactions.map(transaction => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    <Text style={[
                      styles.transactionAmount,
                      { color: transaction.type === 'income' ? '#10B981' : '#EF4444' }
                    ]}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                  <Text style={styles.transactionMeta}>
                    {transaction.category} • {formatDate(transaction.date)}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "documents" && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Documents ({receipts.length})</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/add-receipt' as any)}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            {receipts.length === 0 ? (
              <View style={styles.emptyState}>
                <FileText size={48} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>No documents yet</Text>
              </View>
            ) : (
              <View style={styles.documentsGrid}>
                {receipts.map(receipt => (
                  <View key={receipt.id} style={styles.documentCard}>
                    {receipt.uri ? (
                      <Image source={{ uri: receipt.uri }} style={styles.documentImage} />
                    ) : (
                      <View style={styles.documentPlaceholder}>
                        <FileText size={24} color="#9CA3AF" />
                      </View>
                    )}
                    <Text style={styles.documentVendor}>{receipt.vendor || 'Unknown'}</Text>
                    {!!receipt.amount && (
                      <Text style={styles.documentAmount}>{formatCurrency(receipt.amount)}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === "reminders" && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Reminders ({reminders.length})</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/add-reminder' as any)}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            {reminders.length === 0 ? (
              <View style={styles.emptyState}>
                <Bell size={48} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>No reminders yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Add phone or email to a reminder to send messages from here
                </Text>
              </View>
            ) : (
              reminders.map(reminder => {
                // Build a rich message with all relevant property data
                const buildMessage = () => {
                  const lines: string[] = [];
                  lines.push(`\u{1F4CB} ${reminder.title}`);
                  lines.push(`\u{1F4C5} Due: ${formatDate(reminder.dueDate)}`);
                  lines.push(`\u{1F3E0} Property: ${property.name}`);
                  lines.push(`\u{1F4CD} ${property.address}`);

                  // Type-specific details
                  if (reminder.type === 'maintenance') {
                    if (property.acFilterSize) lines.push(`\n\u{1F4A8} AC Filter: ${property.acFilterSize}`);
                    if (property.acCapacitorSize) lines.push(`AC Capacitor: ${property.acCapacitorSize}`);
                    if (property.waterHeaterInfo) lines.push(`\u{1F6BF} Water Heater: ${property.waterHeaterInfo}`);
                    if (property.applianceInfo) lines.push(`\u{1F527} Appliance: ${property.applianceInfo}`);
                    if (property.paintColorsInside) lines.push(`\u{1F3A8} Interior Paint: ${property.paintColorsInside}`);
                    if (property.paintColorsOutside) lines.push(`Exterior Paint: ${property.paintColorsOutside}`);
                  } else if (reminder.type === 'lease') {
                    if (property.tenantName) lines.push(`\n\u{1F464} Tenant: ${property.tenantName}`);
                    if (property.tenantContact) lines.push(`\u{1F4F1} Tenant Contact: ${property.tenantContact}`);
                    if (property.leaseStart) lines.push(`Lease Start: ${formatDate(property.leaseStart)}`);
                    if (property.leaseEnd) lines.push(`Lease End: ${formatDate(property.leaseEnd)}`);
                    lines.push(`\u{1F4B0} Monthly Rent: ${formatCurrency(property.monthlyRent)}`);
                  } else if (reminder.type === 'mortgage') {
                    if (property.mortgageAmount != null) lines.push(`\n\u{1F3E6} Loan Amount: ${formatCurrency(property.mortgageAmount)}`);
                    if (property.mortgagePayment != null) lines.push(`\u{1F4B5} Monthly Payment: ${formatCurrency(property.mortgagePayment)}`);
                    if (property.mortgageRenewalDate) lines.push(`Renewal Date: ${formatDate(property.mortgageRenewalDate)}`);
                  } else if (reminder.type === 'insurance') {
                    if (property.insuranceProvider) lines.push(`\n\u{1F6E1} Provider: ${property.insuranceProvider}`);
                    if (property.insurancePolicy) lines.push(`Policy #: ${property.insurancePolicy}`);
                    if (property.insurancePremium != null) lines.push(`Annual Premium: ${formatCurrency(property.insurancePremium)}`);
                    if (property.insuranceRenewalDate) lines.push(`Renewal Date: ${formatDate(property.insuranceRenewalDate)}`);
                  }

                  if (reminder.notes) {
                    lines.push(`\n\u{1F4DD} Notes: ${reminder.notes}`);
                  }

                  return lines.join('\n');
                };

                const messageBody = buildMessage();
                
                return (
                <View key={reminder.id} style={styles.reminderCard}>
                  <View style={styles.reminderHeader}>
                    <View style={[styles.reminderTypeDot, { backgroundColor: 
                      reminder.type === 'maintenance' ? '#F59E0B' :
                      reminder.type === 'lease' ? '#3B82F6' :
                      reminder.type === 'mortgage' ? '#10B981' :
                      reminder.type === 'insurance' ? '#8B5CF6' : '#6B7280'
                    }]} />
                    <View style={styles.reminderInfo}>
                      <Text style={styles.reminderTitle}>{reminder.title}</Text>
                      <Text style={styles.reminderDate}>Due: {formatDate(reminder.dueDate)}</Text>
                      <Text style={styles.reminderType}>{reminder.type}</Text>
                    </View>
                  </View>
                  {!!(reminder.recipientPhone || reminder.recipientEmail) && (
                    <View style={styles.reminderActions}>
                      <Text style={styles.reminderActionsLabel}>Send via:</Text>
                      {reminder.recipientPhone ? (
                        <TouchableOpacity
                          style={styles.reminderActionBtn}
                          onPress={() => {
                            Alert.alert(
                              'Send SMS',
                              `Send reminder to ${reminder.recipientPhone}?\n\n${messageBody.slice(0, 150)}...`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Send',
                                  onPress: () => {
                                    const smsUrl = `sms:${reminder.recipientPhone}${Platform.OS === 'android' ? '?' : '&'}body=${encodeURIComponent(messageBody)}`;
                                    Linking.openURL(smsUrl).catch(() =>
                                      Alert.alert('Error', 'Could not open SMS app. Make sure you have a messaging app installed.')
                                    );
                                  },
                                },
                              ]
                            );
                          }}
                        >
                          <MessageSquare size={14} color="#3B82F6" />
                          <Text style={styles.reminderActionText}>SMS</Text>
                        </TouchableOpacity>
                      ) : null}
                      {reminder.recipientEmail ? (
                        <TouchableOpacity
                          style={[styles.reminderActionBtn, styles.reminderActionBtnEmail]}
                          onPress={() => {
                            Alert.alert(
                              'Send Email',
                              `Send reminder to ${reminder.recipientEmail}?\n\nSubject: ${reminder.title}`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Send',
                                  onPress: () => {
                                    const mailUrl = `mailto:${reminder.recipientEmail}?subject=${encodeURIComponent(reminder.title)}&body=${encodeURIComponent(messageBody)}`;
                                    Linking.openURL(mailUrl).catch(() =>
                                      Alert.alert('Error', 'Could not open email app. Make sure you have a mail app installed.')
                                    );
                                  },
                                },
                              ]
                            );
                          }}
                        >
                          <Mail size={14} color="#8B5CF6" />
                          <Text style={styles.reminderActionTextEmail}>Email</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                  <View style={styles.reminderEditActions}>
                    <TouchableOpacity
                      style={styles.reminderCalendarBtn}
                      onPress={() => addToCalendar(reminder)}
                    >
                      <CalendarDays size={14} color="#10B981" />
                      <Text style={styles.reminderCalendarBtnText}>Calendar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.reminderEditBtn}
                      onPress={() => router.push(`/edit-reminder/${reminder.id}` as any)}
                    >
                      <Edit size={14} color="#3B82F6" />
                      <Text style={styles.reminderEditBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.reminderDeleteBtn}
                      onPress={() => {
                        Alert.alert(
                          'Delete Reminder',
                          `Delete "${reminder.title}"? This cannot be undone.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => deleteReminder(reminder.id),
                            },
                          ]
                        );
                      }}
                    >
                      <Trash2 size={14} color="#EF4444" />
                      <Text style={styles.reminderDeleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )})
            )}
          </View>
        )}


      </View>

      {/* Full-screen Photo Viewer */}
      <Modal visible={!!viewerUri} animationType="fade" transparent onRequestClose={() => setViewerUri(null)}>
        <View style={styles.viewerOverlay}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerUri(null)} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <X size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {viewerUri && (
            <Image
              source={{ uri: viewerUri }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}
          {viewerCaption ? (
            <View style={styles.viewerCaptionBar}>
              <Text style={styles.viewerCaptionText}>{viewerCaption}</Text>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Add Photo Modal */}
      <Modal visible={showPhotoModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Photo</Text>
              <TouchableOpacity onPress={() => { setShowPhotoModal(false); setSelectedPhotoUri(null); }}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {selectedPhotoUri && (
              <Image source={{ uri: selectedPhotoUri }} style={styles.modalPreview} />
            )}
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption (optional)"
              placeholderTextColor="#9CA3AF"
              value={photoCaption}
              onChangeText={setPhotoCaption}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowPhotoModal(false); setSelectedPhotoUri(null); }}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={savePhoto}>
                <Text style={styles.modalSaveBtnText}>Save Photo</Text>
              </TouchableOpacity>
            </View>
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
  errorText: {
    fontSize: 16,
    color: "#EF4444",
  },
  header: {
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  propertyImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  headerContent: {
    gap: 8,
  },
  propertyName: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#111827",
  },
  propertyAddress: {
    fontSize: 16,
    color: "#6B7280",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#3B82F6",
    gap: 4,
  },
  editButtonText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "500" as const,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#EF4444",
    gap: 4,
  },
  deleteButtonText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "500" as const,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#3B82F6",
  },
  tabText: {
    fontSize: 12,
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#3B82F6",
    fontWeight: "500" as const,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#111827",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500" as const,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    flex: 1,
    minWidth: "45%",
  },
  metricLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
  },
  detailsGrid: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#111827",
    textTransform: "capitalize" as const,
  },
  applianceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  applianceName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
  },
  applianceDetails: {
    fontSize: 12,
    color: "#6B7280",
  },
  paintCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  paintRoom: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
  },
  paintDetails: {
    fontSize: 12,
    color: "#6B7280",
  },
  transactionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#111827",
    flex: 1,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  transactionMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  documentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  documentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    overflow: "hidden",
    width: "48%",
  },
  documentImage: {
    width: "100%",
    height: 100,
  },
  documentPlaceholder: {
    width: "100%",
    height: 100,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  documentVendor: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#111827",
    padding: 8,
  },
  documentAmount: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#3B82F6",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  reminderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  reminderHeader: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  reminderTypeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 2,
  },
  reminderDate: {
    fontSize: 12,
    color: "#F59E0B",
    marginBottom: 1,
  },
  reminderType: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "capitalize" as const,
  },
  reminderActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  reminderActionsLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#9CA3AF",
    marginRight: 2,
  },
  reminderActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#3B82F6",
    gap: 4,
  },
  reminderActionText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#3B82F6",
  },
  reminderActionBtnEmail: {
    borderColor: "#8B5CF6",
  },
  reminderActionTextEmail: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#8B5CF6",
  },
  reminderEditActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    flexWrap: "wrap" as const,
  },
  reminderCalendarBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#10B981",
    gap: 4,
  },
  reminderCalendarBtnText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#10B981",
  },
  reminderEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#3B82F6",
    gap: 4,
  },
  reminderEditBtnText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#3B82F6",
  },
  reminderDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#EF4444",
    gap: 4,
  },
  reminderDeleteBtnText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#EF4444",
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
  },
  notesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
  },
  notesText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center" as const,
  },
  galleryAddButtons: {
    flexDirection: "row",
    gap: 8,
  },
  galleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  galleryBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500" as const,
  },
  galleryBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#3B82F6",
    gap: 4,
  },
  galleryBtnOutlineText: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "500" as const,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  galleryItem: {
    width: "31%",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    overflow: "hidden",
  },
  galleryImage: {
    width: "100%",
    aspectRatio: 1,
  },
  galleryCaption: {
    paddingHorizontal: 6,
    paddingTop: 4,
  },
  galleryCaptionText: {
    fontSize: 11,
    color: "#111827",
    fontWeight: "500" as const,
  },
  galleryDate: {
    fontSize: 10,
    color: "#9CA3AF",
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#111827",
  },
  modalPreview: {
    width: "100%",
    height: 250,
  },
  captionInput: {
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    fontSize: 14,
    color: "#111827",
  },
  modalActions: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#6B7280",
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#3B82F6",
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  galleryHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#8B5CF6",
    gap: 4,
  },
  galleryHeaderBtnText: {
    color: "#8B5CF6",
    fontSize: 14,
    fontWeight: "500" as const,
  },
  galleryHeaderBtnActive: {
    backgroundColor: "#8B5CF6",
    borderColor: "#8B5CF6",
  },
  galleryHeaderBtnTextActive: {
    color: "#FFFFFF",
  },
  gallerySection: {
    padding: 16,
    backgroundColor: "#F9FAFB",
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerClose: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerImage: {
    width: "100%",
    height: "80%",
  },
  viewerCaptionBar: {
    position: "absolute",
    bottom: 60,
    left: 24,
    right: 24,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  viewerCaptionText: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center" as const,
  },
});