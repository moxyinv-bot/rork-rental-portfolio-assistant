import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Property, Transaction, Receipt, Reminder, LeaseFolder, LeaseDocument, PropertyPhoto, Appliance, PaintColor } from '@/types/property';
import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';

// Legacy AsyncStorage keys for migration
const LEGACY_KEYS = {
  PROPERTIES: 'portfolio_properties',
  TRANSACTIONS: 'portfolio_transactions',
  RECEIPTS: 'portfolio_receipts',
  REMINDERS: 'portfolio_reminders',
  LEASE_FOLDERS: 'portfolio_lease_folders',
  LEASE_DOCUMENTS: 'portfolio_lease_documents',
  PROPERTY_PHOTOS: 'portfolio_property_photos'
};

const MIGRATION_DONE_KEY = 'portfolio_migration_done';

const parseTransactionDate = (dateString: string): Date => {
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const month = parseInt(parts[0]) - 1;
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]) + 2000;
    return new Date(year, month, day);
  }
  return new Date(dateString);
};

// Convert DB rows to app types
function dbToProperty(row: any): Property {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    type: row.type,
    purchaseDate: row.purchase_date || '',
    purchasePrice: Number(row.purchase_price) || 0,
    currentValue: row.current_value ? Number(row.current_value) : undefined,
    monthlyRent: Number(row.monthly_rent) || 0,
    tenantName: row.tenant_name || undefined,
    tenantContact: row.tenant_contact || undefined,
    leaseStart: row.lease_start || undefined,
    leaseEnd: row.lease_end || undefined,
    mortgageAmount: row.mortgage_amount ? Number(row.mortgage_amount) : undefined,
    mortgagePayment: row.mortgage_payment ? Number(row.mortgage_payment) : undefined,
    mortgageRenewalDate: row.mortgage_renewal_date || undefined,
    insuranceProvider: row.insurance_provider || undefined,
    insurancePolicy: row.insurance_policy || undefined,
    insuranceRenewalDate: row.insurance_renewal_date || undefined,
    insurancePremium: row.insurance_premium ? Number(row.insurance_premium) : undefined,
    propertyTax: row.property_tax ? Number(row.property_tax) : undefined,
    appliances: [],
    paintColors: [],
    acCapacitorSize: row.ac_capacitor_size || undefined,
    acFilterSize: row.ac_filter_size || undefined,
    paintColorsInside: row.paint_colors_inside || undefined,
    paintColorsOutside: row.paint_colors_outside || undefined,
    waterHeaterInfo: row.water_heater_info || undefined,
    applianceInfo: row.appliance_info || undefined,
    notes: row.notes || undefined,
    imageUri: row.image_uri || undefined,
  };
}

function dbToTransaction(row: any): Transaction {
  return {
    id: row.id,
    propertyId: row.property_id,
    type: row.type,
    category: row.category,
    amount: Number(row.amount) || 0,
    date: row.date,
    description: row.description,
    receiptUri: row.receipt_uri || undefined,
    tags: row.tags || [],
  };
}

function dbToReceipt(row: any): Receipt {
  return {
    id: row.id,
    propertyId: row.property_id,
    transactionId: row.transaction_id || undefined,
    uri: row.uri,
    date: row.date,
    amount: row.amount ? Number(row.amount) : undefined,
    vendor: row.vendor || undefined,
    category: row.category || undefined,
    tags: row.tags || [],
    notes: row.notes || undefined,
  };
}

function dbToReminder(row: any): Reminder {
  return {
    id: row.id,
    propertyId: row.property_id,
    type: row.type,
    title: row.title,
    dueDate: row.due_date,
    notes: row.notes || undefined,
    completed: row.completed || false,
    recipientPhone: row.recipient_phone || undefined,
    recipientEmail: row.recipient_email || undefined,
  };
}

function dbToLeaseFolder(row: any): LeaseFolder {
  return {
    id: row.id,
    name: row.name,
    propertyId: row.property_id,
    color: row.color || '#3B82F6',
    createdAt: row.created_at,
  };
}

function dbToLeaseDocument(row: any): LeaseDocument {
  return {
    id: row.id,
    folderId: row.folder_id || '',
    propertyId: row.property_id,
    type: row.type,
    title: row.title,
    content: row.content,
    originalImageUri: row.original_image_uri || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: row.tags || [],
    tenantName: row.tenant_name || undefined,
    dateOfDocument: row.date_of_document || undefined,
    notes: row.notes || undefined,
  };
}

function dbToPropertyPhoto(row: any): PropertyPhoto {
  return {
    id: row.id,
    propertyId: row.property_id,
    uri: row.uri,
    caption: row.caption || '',
    date: row.date,
  };
}

export const [PortfolioProvider, usePortfolio] = createContextHook(() => {
  const { user } = useAuth();
  const { household } = useHousehold();
  const [properties, setProperties] = useState<Property[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [leaseFolders, setLeaseFolders] = useState<LeaseFolder[]>([]);
  const [leaseDocuments, setLeaseDocuments] = useState<LeaseDocument[]>([]);
  const [propertyPhotos, setPropertyPhotos] = useState<PropertyPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const householdId = household?.id;

  // Load all data from Supabase when household changes
  const loadAllData = useCallback(async (hhId: string) => {
    setIsSyncing(true);
    try {
      const [propsRes, txRes, recRes, remRes, foldersRes, docsRes, photosRes] = await Promise.all([
        supabase.from('properties').select('*').eq('household_id', hhId).order('created_at', { ascending: true }),
        supabase.from('transactions').select('*').eq('household_id', hhId).order('date', { ascending: false }),
        supabase.from('receipts').select('*').eq('household_id', hhId).order('date', { ascending: false }),
        supabase.from('reminders').select('*').eq('household_id', hhId).order('due_date', { ascending: true }),
        supabase.from('lease_folders').select('*').eq('household_id', hhId).order('created_at', { ascending: true }),
        supabase.from('lease_documents').select('*').eq('household_id', hhId).order('updated_at', { ascending: false }),
        supabase.from('property_photos').select('*').eq('household_id', hhId).order('date', { ascending: false }),
      ]);

      if (propsRes.data) setProperties(propsRes.data.map(dbToProperty));
      if (txRes.data) setTransactions(txRes.data.map(dbToTransaction));
      if (recRes.data) setReceipts(recRes.data.map(dbToReceipt));
      if (remRes.data) setReminders(remRes.data.map(dbToReminder));
      if (foldersRes.data) setLeaseFolders(foldersRes.data.map(dbToLeaseFolder));
      if (docsRes.data) setLeaseDocuments(docsRes.data.map(dbToLeaseDocument));
      if (photosRes.data) setPropertyPhotos(photosRes.data.map(dbToPropertyPhoto));
    } catch (error) {
      console.error('Error loading portfolio data:', error);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // Load data when household is available
  useEffect(() => {
    if (!householdId) {
      setProperties([]);
      setTransactions([]);
      setReceipts([]);
      setReminders([]);
      setLeaseFolders([]);
      setLeaseDocuments([]);
      setPropertyPhotos([]);
      setIsLoading(false);
      return;
    }

    loadAllData(householdId);

    // Set up realtime subscriptions for live sync
    const channel = supabase
      .channel(`portfolio-${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties', filter: `household_id=eq.${householdId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setProperties(prev => [...prev, dbToProperty(payload.new)]);
          } else if (payload.eventType === 'UPDATE') {
            setProperties(prev => prev.map(p => p.id === payload.new.id ? dbToProperty(payload.new) : p));
          } else if (payload.eventType === 'DELETE') {
            setProperties(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `household_id=eq.${householdId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTransactions(prev => [dbToTransaction(payload.new), ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTransactions(prev => prev.map(t => t.id === payload.new.id ? dbToTransaction(payload.new) : t));
          } else if (payload.eventType === 'DELETE') {
            setTransactions(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts', filter: `household_id=eq.${householdId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReceipts(prev => [dbToReceipt(payload.new), ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setReceipts(prev => prev.map(r => r.id === payload.new.id ? dbToReceipt(payload.new) : r));
          } else if (payload.eventType === 'DELETE') {
            setReceipts(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders', filter: `household_id=eq.${householdId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReminders(prev => [...prev, dbToReminder(payload.new)]);
          } else if (payload.eventType === 'UPDATE') {
            setReminders(prev => prev.map(r => r.id === payload.new.id ? dbToReminder(payload.new) : r));
          } else if (payload.eventType === 'DELETE') {
            setReminders(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lease_folders', filter: `household_id=eq.${householdId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLeaseFolders(prev => [...prev, dbToLeaseFolder(payload.new)]);
          } else if (payload.eventType === 'UPDATE') {
            setLeaseFolders(prev => prev.map(f => f.id === payload.new.id ? dbToLeaseFolder(payload.new) : f));
          } else if (payload.eventType === 'DELETE') {
            setLeaseFolders(prev => prev.filter(f => f.id !== payload.old.id));
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lease_documents', filter: `household_id=eq.${householdId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLeaseDocuments(prev => [dbToLeaseDocument(payload.new), ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLeaseDocuments(prev => prev.map(d => d.id === payload.new.id ? dbToLeaseDocument(payload.new) : d));
          } else if (payload.eventType === 'DELETE') {
            setLeaseDocuments(prev => prev.filter(d => d.id !== payload.old.id));
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_photos', filter: `household_id=eq.${householdId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPropertyPhotos(prev => [dbToPropertyPhoto(payload.new), ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setPropertyPhotos(prev => prev.map(p => p.id === payload.new.id ? dbToPropertyPhoto(payload.new) : p));
          } else if (payload.eventType === 'DELETE') {
            setPropertyPhotos(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId]);

  // Migrate legacy AsyncStorage data on first login
  useEffect(() => {
    if (!user || !householdId) return;
    migrateLegacyData(householdId);
  }, [user, householdId]);

  const migrateLegacyData = useCallback(async (hhId: string) => {
    try {
      const migrated = await AsyncStorage.getItem(MIGRATION_DONE_KEY);
      if (migrated === hhId) return; // Already migrated for this household

      const [propsData, txData, recData, remData, foldersData, docsData, photosData] = await Promise.all([
        AsyncStorage.getItem(LEGACY_KEYS.PROPERTIES),
        AsyncStorage.getItem(LEGACY_KEYS.TRANSACTIONS),
        AsyncStorage.getItem(LEGACY_KEYS.RECEIPTS),
        AsyncStorage.getItem(LEGACY_KEYS.REMINDERS),
        AsyncStorage.getItem(LEGACY_KEYS.LEASE_FOLDERS),
        AsyncStorage.getItem(LEGACY_KEYS.LEASE_DOCUMENTS),
        AsyncStorage.getItem(LEGACY_KEYS.PROPERTY_PHOTOS),
      ]);

      // Only migrate if there's legacy data
      if (!propsData && !txData && !recData && !remData) {
        await AsyncStorage.setItem(MIGRATION_DONE_KEY, hhId);
        return;
      }

      const legacyProps: Property[] = propsData ? JSON.parse(propsData) : [];
      const legacyTx: Transaction[] = txData ? JSON.parse(txData) : [];
      const legacyRecs: Receipt[] = recData ? JSON.parse(recData) : [];
      const legacyRems: Reminder[] = remData ? JSON.parse(remData) : [];
      const legacyFolders: LeaseFolder[] = foldersData ? JSON.parse(foldersData) : [];
      const legacyDocs: LeaseDocument[] = docsData ? JSON.parse(docsData) : [];
      const legacyPhotos: PropertyPhoto[] = photosData ? JSON.parse(photosData) : [];

      if (legacyProps.length === 0) {
        await AsyncStorage.setItem(MIGRATION_DONE_KEY, hhId);
        return;
      }

      // Map old property IDs to new Supabase UUIDs
      const propertyIdMap: Record<string, string> = {};

      for (const prop of legacyProps) {
        const { data, error } = await supabase.from('properties').insert({
          household_id: hhId,
          name: prop.name,
          address: prop.address,
          type: prop.type,
          purchase_date: prop.purchaseDate,
          purchase_price: prop.purchasePrice,
          current_value: prop.currentValue,
          monthly_rent: prop.monthlyRent,
          tenant_name: prop.tenantName,
          tenant_contact: prop.tenantContact,
          lease_start: prop.leaseStart,
          lease_end: prop.leaseEnd,
          mortgage_amount: prop.mortgageAmount,
          mortgage_payment: prop.mortgagePayment,
          mortgage_renewal_date: prop.mortgageRenewalDate,
          insurance_provider: prop.insuranceProvider,
          insurance_policy: prop.insurancePolicy,
          insurance_renewal_date: prop.insuranceRenewalDate,
          insurance_premium: prop.insurancePremium,
          property_tax: prop.propertyTax,
          ac_capacitor_size: prop.acCapacitorSize,
          ac_filter_size: prop.acFilterSize,
          paint_colors_inside: prop.paintColorsInside,
          paint_colors_outside: prop.paintColorsOutside,
          water_heater_info: prop.waterHeaterInfo,
          appliance_info: prop.applianceInfo,
          notes: prop.notes,
          image_uri: prop.imageUri,
        }).select().single();

        if (!error && data) {
          propertyIdMap[prop.id] = data.id;
        }
      }

      // Migrate transactions
      for (const tx of legacyTx) {
        const newPropId = propertyIdMap[tx.propertyId];
        if (!newPropId) continue;
        await supabase.from('transactions').insert({
          household_id: hhId,
          property_id: newPropId,
          type: tx.type,
          category: tx.category,
          amount: tx.amount,
          date: tx.date,
          description: tx.description,
          receipt_uri: tx.receiptUri,
          tags: tx.tags,
        });
      }

      // Migrate receipts
      for (const rec of legacyRecs) {
        const newPropId = propertyIdMap[rec.propertyId];
        if (!newPropId) continue;
        await supabase.from('receipts').insert({
          household_id: hhId,
          property_id: newPropId,
          uri: rec.uri,
          date: rec.date,
          amount: rec.amount,
          vendor: rec.vendor,
          category: rec.category,
          tags: rec.tags,
          notes: rec.notes,
        });
      }

      // Migrate reminders
      for (const rem of legacyRems) {
        const newPropId = propertyIdMap[rem.propertyId];
        if (!newPropId) continue;
        await supabase.from('reminders').insert({
          household_id: hhId,
          property_id: newPropId,
          type: rem.type,
          title: rem.title,
          due_date: rem.dueDate,
          notes: rem.notes,
          completed: rem.completed,
          recipient_phone: rem.recipientPhone,
          recipient_email: rem.recipientEmail,
        });
      }

      // Migrate lease folders
      const folderIdMap: Record<string, string> = {};
      for (const folder of legacyFolders) {
        const newPropId = propertyIdMap[folder.propertyId];
        if (!newPropId) continue;
        const { data, error } = await supabase.from('lease_folders').insert({
          household_id: hhId,
          property_id: newPropId,
          name: folder.name,
          color: folder.color,
        }).select().single();
        if (!error && data) {
          folderIdMap[folder.id] = data.id;
        }
      }

      // Migrate lease documents
      for (const doc of legacyDocs) {
        const newPropId = propertyIdMap[doc.propertyId];
        if (!newPropId) continue;
        const newFolderId = doc.folderId ? folderIdMap[doc.folderId] : null;
        await supabase.from('lease_documents').insert({
          household_id: hhId,
          property_id: newPropId,
          folder_id: newFolderId,
          type: doc.type,
          title: doc.title,
          content: doc.content,
          original_image_uri: doc.originalImageUri,
          tags: doc.tags,
          tenant_name: doc.tenantName,
          date_of_document: doc.dateOfDocument,
          notes: doc.notes,
        });
      }

      // Migrate property photos
      for (const photo of legacyPhotos) {
        const newPropId = propertyIdMap[photo.propertyId];
        if (!newPropId) continue;
        await supabase.from('property_photos').insert({
          household_id: hhId,
          property_id: newPropId,
          uri: photo.uri,
          caption: photo.caption,
          date: photo.date,
        });
      }

      // Reload all data after migration
      await loadAllData(hhId);

      // Mark migration as done
      await AsyncStorage.setItem(MIGRATION_DONE_KEY, hhId);
      console.log('Legacy data migration complete');
    } catch (error) {
      console.error('Error migrating legacy data:', error);
    }
  }, [loadAllData]);

  // Property CRUD operations
  const addProperty = useCallback(async (property: Property) => {
    if (!householdId) return;
    const { error } = await supabase.from('properties').insert({
      household_id: householdId,
      name: property.name,
      address: property.address,
      type: property.type,
      purchase_date: property.purchaseDate,
      purchase_price: property.purchasePrice,
      current_value: property.currentValue,
      monthly_rent: property.monthlyRent,
      tenant_name: property.tenantName,
      tenant_contact: property.tenantContact,
      lease_start: property.leaseStart,
      lease_end: property.leaseEnd,
      mortgage_amount: property.mortgageAmount,
      mortgage_payment: property.mortgagePayment,
      mortgage_renewal_date: property.mortgageRenewalDate,
      insurance_provider: property.insuranceProvider,
      insurance_policy: property.insurancePolicy,
      insurance_renewal_date: property.insuranceRenewalDate,
      insurance_premium: property.insurancePremium,
      property_tax: property.propertyTax,
      ac_capacitor_size: property.acCapacitorSize,
      ac_filter_size: property.acFilterSize,
      paint_colors_inside: property.paintColorsInside,
      paint_colors_outside: property.paintColorsOutside,
      water_heater_info: property.waterHeaterInfo,
      appliance_info: property.applianceInfo,
      notes: property.notes,
      image_uri: property.imageUri,
    });
    if (error) {
      console.error('Error adding property:', error);
      Alert.alert('Error', 'Failed to save property. Please try again.');
    }
  }, [householdId]);

  const updateProperty = useCallback(async (id: string, updates: Partial<Property>) => {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.purchaseDate !== undefined) updateData.purchase_date = updates.purchaseDate;
    if (updates.purchasePrice !== undefined) updateData.purchase_price = updates.purchasePrice;
    if (updates.currentValue !== undefined) updateData.current_value = updates.currentValue;
    if (updates.monthlyRent !== undefined) updateData.monthly_rent = updates.monthlyRent;
    if (updates.tenantName !== undefined) updateData.tenant_name = updates.tenantName;
    if (updates.tenantContact !== undefined) updateData.tenant_contact = updates.tenantContact;
    if (updates.leaseStart !== undefined) updateData.lease_start = updates.leaseStart;
    if (updates.leaseEnd !== undefined) updateData.lease_end = updates.leaseEnd;
    if (updates.mortgageAmount !== undefined) updateData.mortgage_amount = updates.mortgageAmount;
    if (updates.mortgagePayment !== undefined) updateData.mortgage_payment = updates.mortgagePayment;
    if (updates.mortgageRenewalDate !== undefined) updateData.mortgage_renewal_date = updates.mortgageRenewalDate;
    if (updates.insuranceProvider !== undefined) updateData.insurance_provider = updates.insuranceProvider;
    if (updates.insurancePolicy !== undefined) updateData.insurance_policy = updates.insurancePolicy;
    if (updates.insuranceRenewalDate !== undefined) updateData.insurance_renewal_date = updates.insuranceRenewalDate;
    if (updates.insurancePremium !== undefined) updateData.insurance_premium = updates.insurancePremium;
    if (updates.propertyTax !== undefined) updateData.property_tax = updates.propertyTax;
    if (updates.acCapacitorSize !== undefined) updateData.ac_capacitor_size = updates.acCapacitorSize;
    if (updates.acFilterSize !== undefined) updateData.ac_filter_size = updates.acFilterSize;
    if (updates.paintColorsInside !== undefined) updateData.paint_colors_inside = updates.paintColorsInside;
    if (updates.paintColorsOutside !== undefined) updateData.paint_colors_outside = updates.paintColorsOutside;
    if (updates.waterHeaterInfo !== undefined) updateData.water_heater_info = updates.waterHeaterInfo;
    if (updates.applianceInfo !== undefined) updateData.appliance_info = updates.applianceInfo;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.imageUri !== undefined) updateData.image_uri = updates.imageUri;

    const { error } = await supabase.from('properties').update(updateData).eq('id', id);
    if (error) {
      console.error('Error updating property:', error);
      Alert.alert('Error', 'Failed to update property. Please try again.');
    }
  }, []);

  const deleteProperty = useCallback(async (id: string) => {
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) {
      console.error('Error deleting property:', error);
      Alert.alert('Error', 'Failed to delete property. Please try again.');
    }
  }, []);

  // Transaction CRUD operations
  const addTransaction = useCallback(async (transaction: Transaction) => {
    if (!householdId) return;
    const { error } = await supabase.from('transactions').insert({
      household_id: householdId,
      property_id: transaction.propertyId,
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      date: transaction.date,
      description: transaction.description,
      receipt_uri: transaction.receiptUri,
      tags: transaction.tags,
    });
    if (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', 'Failed to save transaction. Please try again.');
    }
  }, [householdId]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.receiptUri !== undefined) updateData.receipt_uri = updates.receiptUri;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.propertyId !== undefined) updateData.property_id = updates.propertyId;

    const { error } = await supabase.from('transactions').update(updateData).eq('id', id);
    if (error) {
      console.error('Error updating transaction:', error);
      Alert.alert('Error', 'Failed to update transaction. Please try again.');
    }
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      console.error('Error deleting transaction:', error);
      Alert.alert('Error', 'Failed to delete transaction. Please try again.');
    }
  }, []);

  // Receipt CRUD operations
  const addReceipt = useCallback(async (receipt: Receipt) => {
    if (!householdId) return;
    try {
      const { data: recData, error: recErr } = await supabase.from('receipts').insert({
        household_id: householdId,
        property_id: receipt.propertyId,
        uri: receipt.uri,
        date: receipt.date,
        amount: receipt.amount,
        vendor: receipt.vendor,
        category: receipt.category,
        tags: receipt.tags,
        notes: receipt.notes,
      }).select().single();

      if (recErr) throw recErr;

      // Automatically create a transaction from the receipt if it has amount and category
      if (receipt.amount && receipt.category && recData) {
        const { error: txErr } = await supabase.from('transactions').insert({
          household_id: householdId,
          property_id: receipt.propertyId,
          type: 'expense',
          category: receipt.category,
          amount: receipt.amount,
          date: receipt.date,
          description: receipt.vendor ? `Receipt from ${receipt.vendor}` : 'Receipt expense',
          receipt_uri: receipt.uri,
          tags: receipt.tags || [],
        });
        if (txErr) console.error('Error creating transaction from receipt:', txErr);
      }
    } catch (error) {
      console.error('Error adding receipt:', error);
      Alert.alert('Error', 'Failed to save receipt. Please try again.');
    }
  }, [householdId]);

  const updateReceipt = useCallback(async (id: string, updates: Partial<Receipt>) => {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.uri !== undefined) updateData.uri = updates.uri;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.vendor !== undefined) updateData.vendor = updates.vendor;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.propertyId !== undefined) updateData.property_id = updates.propertyId;

    const { error } = await supabase.from('receipts').update(updateData).eq('id', id);
    if (error) {
      console.error('Error updating receipt:', error);
      Alert.alert('Error', 'Failed to update receipt. Please try again.');
    }
  }, []);

  const deleteReceipt = useCallback(async (id: string) => {
    const { error } = await supabase.from('receipts').delete().eq('id', id);
    if (error) {
      console.error('Error deleting receipt:', error);
      Alert.alert('Error', 'Failed to delete receipt. Please try again.');
    }
  }, []);

  // Reminder CRUD operations
  const addReminder = useCallback(async (reminder: Reminder) => {
    if (!householdId) return;
    const { error } = await supabase.from('reminders').insert({
      household_id: householdId,
      property_id: reminder.propertyId,
      type: reminder.type,
      title: reminder.title,
      due_date: reminder.dueDate,
      notes: reminder.notes,
      completed: reminder.completed,
      recipient_phone: reminder.recipientPhone,
      recipient_email: reminder.recipientEmail,
    });
    if (error) {
      console.error('Error adding reminder:', error);
      Alert.alert('Error', 'Failed to save reminder. Please try again.');
    }
  }, [householdId]);

  const updateReminder = useCallback(async (id: string, updates: Partial<Reminder>) => {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.completed !== undefined) updateData.completed = updates.completed;
    if (updates.recipientPhone !== undefined) updateData.recipient_phone = updates.recipientPhone;
    if (updates.recipientEmail !== undefined) updateData.recipient_email = updates.recipientEmail;
    if (updates.propertyId !== undefined) updateData.property_id = updates.propertyId;

    const { error } = await supabase.from('reminders').update(updateData).eq('id', id);
    if (error) {
      console.error('Error updating reminder:', error);
      Alert.alert('Error', 'Failed to update reminder. Please try again.');
    }
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) {
      console.error('Error deleting reminder:', error);
      Alert.alert('Error', 'Failed to delete reminder. Please try again.');
    }
  }, []);

  // Property Photo CRUD operations
  const addPropertyPhoto = useCallback(async (photo: PropertyPhoto) => {
    if (!householdId) return;
    const { error } = await supabase.from('property_photos').insert({
      household_id: householdId,
      property_id: photo.propertyId,
      uri: photo.uri,
      caption: photo.caption,
      date: photo.date,
    });
    if (error) {
      console.error('Error adding property photo:', error);
      Alert.alert('Error', 'Failed to save photo. Please try again.');
    }
  }, [householdId]);

  const deletePropertyPhoto = useCallback(async (id: string) => {
    const { error } = await supabase.from('property_photos').delete().eq('id', id);
    if (error) {
      console.error('Error deleting property photo:', error);
      Alert.alert('Error', 'Failed to delete photo. Please try again.');
    }
  }, []);

  // Lease Folder CRUD operations
  const addLeaseFolder = useCallback(async (folder: LeaseFolder) => {
    if (!householdId) return;
    const { error } = await supabase.from('lease_folders').insert({
      household_id: householdId,
      property_id: folder.propertyId,
      name: folder.name,
      color: folder.color,
    });
    if (error) {
      console.error('Error adding lease folder:', error);
      Alert.alert('Error', 'Failed to save folder. Please try again.');
    }
  }, [householdId]);

  const updateLeaseFolder = useCallback(async (id: string, updates: Partial<LeaseFolder>) => {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.color !== undefined) updateData.color = updates.color;

    const { error } = await supabase.from('lease_folders').update(updateData).eq('id', id);
    if (error) {
      console.error('Error updating lease folder:', error);
      Alert.alert('Error', 'Failed to update folder. Please try again.');
    }
  }, []);

  const reorderLeaseFolders = useCallback(async (reorderedFolders: LeaseFolder[]) => {
    // Supabase doesn't have built-in reordering; we'd need an order column.
    // For now, we just update each folder's position if an order field existed.
    // This is a no-op with the current schema but maintains API compatibility.
  }, []);

  const deleteLeaseFolder = useCallback(async (id: string) => {
    const { error } = await supabase.from('lease_folders').delete().eq('id', id);
    if (error) {
      console.error('Error deleting lease folder:', error);
      Alert.alert('Error', 'Failed to delete folder. Please try again.');
    }
  }, []);

  // Lease Document CRUD operations
  const addLeaseDocument = useCallback(async (document: LeaseDocument) => {
    if (!householdId) return;
    const { error } = await supabase.from('lease_documents').insert({
      household_id: householdId,
      property_id: document.propertyId,
      folder_id: document.folderId || null,
      type: document.type,
      title: document.title,
      content: document.content,
      original_image_uri: document.originalImageUri,
      tags: document.tags,
      tenant_name: document.tenantName,
      date_of_document: document.dateOfDocument,
      notes: document.notes,
    });
    if (error) {
      console.error('Error adding lease document:', error);
      Alert.alert('Error', 'Failed to save document. Please try again.');
    }
  }, [householdId]);

  const updateLeaseDocument = useCallback(async (id: string, updates: Partial<LeaseDocument>) => {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.originalImageUri !== undefined) updateData.original_image_uri = updates.originalImageUri;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.tenantName !== undefined) updateData.tenant_name = updates.tenantName;
    if (updates.dateOfDocument !== undefined) updateData.date_of_document = updates.dateOfDocument;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.folderId !== undefined) updateData.folder_id = updates.folderId || null;
    if (updates.propertyId !== undefined) updateData.property_id = updates.propertyId;

    const { error } = await supabase.from('lease_documents').update(updateData).eq('id', id);
    if (error) {
      console.error('Error updating lease document:', error);
      Alert.alert('Error', 'Failed to update document. Please try again.');
    }
  }, []);

  const deleteLeaseDocument = useCallback(async (id: string) => {
    const { error } = await supabase.from('lease_documents').delete().eq('id', id);
    if (error) {
      console.error('Error deleting lease document:', error);
      Alert.alert('Error', 'Failed to delete document. Please try again.');
    }
  }, []);

  // OCR functionality using AI API
  const extractTextFromImage = useCallback(async (imageUri: string): Promise<string> => {
    try {
      if (Platform.OS === 'web') {
        throw new Error('OCR is not available on web');
      }
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: 'Please extract all text from this image. This appears to be a lease agreement or legal document. Return only the extracted text, maintaining the original formatting and structure as much as possible.' },
              { type: 'image', image: base64Image }
            ]
          }]
        })
      });

      if (!response.ok) throw new Error(`OCR API request failed: ${response.status}`);
      const result = await response.json();
      return result.completion || '';
    } catch (error) {
      console.error('Error extracting text from image:', error);
      throw new Error('Failed to extract text from image. Please try again.');
    }
  }, []);

  // Export lease document to printable format
  const exportLeaseDocument = useCallback(async (documentId: string) => {
    try {
      const document = leaseDocuments.find(d => d.id === documentId);
      if (!document) throw new Error('Document not found');

      const property = properties.find(p => p.id === document.propertyId);
      const folder = leaseFolders.find(f => f.id === document.folderId);

      const formattedContent = `
${document.title}
${'='.repeat(document.title.length)}

Property: ${property?.name || 'Unknown'}
Address: ${property?.address || 'N/A'}
Folder: ${folder?.name || 'N/A'}
Document Type: ${document.type.charAt(0).toUpperCase() + document.type.slice(1)}
Tenant: ${document.tenantName || 'N/A'}
Document Date: ${document.dateOfDocument || 'N/A'}
Created: ${new Date(document.createdAt).toLocaleDateString()}
Last Updated: ${new Date(document.updatedAt).toLocaleDateString()}

${'-'.repeat(50)}

${document.content}

${document.notes ? `\nNotes:\n${document.notes}` : ''}

${document.tags.length > 0 ? `\nTags: ${document.tags.join(', ')}` : ''}
      `.trim();

      const filename = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;

      if (Platform.OS === 'web') {
        const blob = new Blob([formattedContent], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = (globalThis as any).document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const uri = FileSystem.documentDirectory + filename;
        await FileSystem.writeAsStringAsync(uri, formattedContent, { encoding: FileSystem.EncodingType.UTF8 });
        try {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, { mimeType: 'text/plain', dialogTitle: 'Save Document - Choose where to save' });
          } else {
            Alert.alert('Export Complete', `Document exported successfully!\n\nFile saved to: ${uri}`, [{ text: 'OK' }]);
          }
        } catch (shareErr) {
          console.log('Sharing not available:', shareErr);
          Alert.alert('Export Complete', `Document saved to: ${uri}`);
        }
      }
      return { success: true, filename };
    } catch (error) {
      console.error('Error exporting document:', error);
      throw error;
    }
  }, [leaseDocuments, properties, leaseFolders]);

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    const totalProperties = properties.length;
    const totalValue = properties.reduce((sum, p) => sum + (p.currentValue || p.purchasePrice), 0);
    const totalMonthlyRent = properties.reduce((sum, p) => sum + p.monthlyRent, 0);
    const totalMortgagePayment = properties.reduce((sum, p) => sum + (p.mortgagePayment || 0), 0);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const ytdIncome = transactions
      .filter(t => t.type === 'income' && parseTransactionDate(t.date).getFullYear() === currentYear)
      .reduce((sum, t) => sum + t.amount, 0);

    const ytdExpenses = transactions
      .filter(t => t.type === 'expense' && parseTransactionDate(t.date).getFullYear() === currentYear)
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyIncome = transactions
      .filter(t => {
        const date = parseTransactionDate(t.date);
        return t.type === 'income' && date.getFullYear() === currentYear && date.getMonth() === currentMonth;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = transactions
      .filter(t => {
        const date = parseTransactionDate(t.date);
        return t.type === 'expense' && date.getFullYear() === currentYear && date.getMonth() === currentMonth;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const netCashFlow = totalMonthlyRent - totalMortgagePayment;
    const ytdProfit = ytdIncome - ytdExpenses;
    const monthlyProfit = monthlyIncome - monthlyExpenses;

    return {
      totalProperties, totalValue, totalMonthlyRent, totalMortgagePayment,
      netCashFlow, ytdIncome, ytdExpenses, ytdProfit, monthlyIncome, monthlyExpenses, monthlyProfit
    };
  }, [properties, transactions]);

  const upcomingReminders = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return reminders
      .filter(r => !r.completed && new Date(r.dueDate) <= thirtyDaysFromNow)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [reminders]);

  // Export functionality - CSV format
  const exportTransactionsToExcel = useCallback(async (propertyId?: string, year?: number) => {
    try {
      let transactionsToExport = transactions;

      if (propertyId && propertyId !== 'all') {
        transactionsToExport = transactionsToExport.filter(t => t.propertyId === propertyId);
      }

      if (year) {
        transactionsToExport = transactionsToExport.filter(t => parseTransactionDate(t.date).getFullYear() === year);
      }

      transactionsToExport.sort((a, b) => parseTransactionDate(b.date).getTime() - parseTransactionDate(a.date).getTime());

      const csvHeaders = ['Date', 'Property', 'Property Address', 'Type', 'Category', 'Description', 'Amount', 'Tags', 'Receipt'];
      const csvRows = transactionsToExport.map(transaction => {
        const property = properties.find(p => p.id === transaction.propertyId);
        const transactionDate = parseTransactionDate(transaction.date);
        const signedAmount = transaction.type === 'expense' ? -transaction.amount : transaction.amount;
        return [
          transactionDate.toLocaleDateString('en-US'),
          `"${property?.name || 'Unknown Property'}"`,
          `"${property?.address || ''}"`,
          transaction.type === 'income' ? 'Income' : 'Expense',
          `"${transaction.category}"`,
          `"${transaction.description}"`,
          signedAmount.toString(),
          `"${transaction.tags.join(', ')}"`,
          transaction.receiptUri ? 'Yes' : 'No'
        ].join(',');
      });

      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
      const currentDate = new Date().toISOString().split('T')[0];
      const yearSuffix = year ? `_${year}` : '';
      const propertySuffix = propertyId && propertyId !== 'all'
        ? `_${properties.find(p => p.id === propertyId)?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Property'}`
        : '_All_Properties';
      const filename = `Transactions${propertySuffix}${yearSuffix}_${currentDate}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = (globalThis as any).document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const uri = FileSystem.documentDirectory + filename;
        await FileSystem.writeAsStringAsync(uri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        try {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Save CSV File - Choose where to save' });
          } else {
            Alert.alert('Export Complete', `CSV file created successfully!\n\nFile saved to: ${uri}`, [{ text: 'OK' }]);
          }
        } catch (shareErr) {
          console.log('Sharing not available:', shareErr);
          Alert.alert('Export Complete', `CSV saved to: ${uri}`);
        }
      }
      return { success: true, count: transactionsToExport.length, filename };
    } catch (error) {
      console.error('Error exporting transactions:', error);
      throw error;
    }
  }, [transactions, properties]);

  const saveReceiptWithLocation = useCallback(async (uri: string, _filename: string) => {
    try {
      if (Platform.OS === 'web') return uri;
      try {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Save Receipt Image' });
        }
      } catch (shareError) {
        console.log('Could not share receipt image:', shareError);
      }
      return uri;
    } catch (error) {
      console.error('Error handling receipt:', error);
      return uri;
    }
  }, []);

  return {
    properties, transactions, receipts, reminders, leaseFolders, leaseDocuments, propertyPhotos,
    isLoading, isSyncing,
    addProperty, updateProperty, deleteProperty,
    addTransaction, updateTransaction, deleteTransaction,
    addReceipt, updateReceipt, deleteReceipt,
    addReminder, updateReminder, deleteReminder,
    addLeaseFolder, updateLeaseFolder, deleteLeaseFolder, reorderLeaseFolders,
    addLeaseDocument, updateLeaseDocument, deleteLeaseDocument,
    addPropertyPhoto, deletePropertyPhoto,
    extractTextFromImage, exportLeaseDocument,
    portfolioMetrics, upcomingReminders,
    exportTransactionsToExcel, saveReceiptWithLocation,
  };
});

// Helper hooks (same interface as before)
export function usePropertyTransactions(propertyId: string) {
  const { transactions } = usePortfolio();
  return useMemo(() => transactions.filter(t => t.propertyId === propertyId), [transactions, propertyId]);
}

export function usePropertyReceipts(propertyId: string) {
  const { receipts } = usePortfolio();
  return useMemo(() => receipts.filter(r => r.propertyId === propertyId), [receipts, propertyId]);
}

export function usePropertyReminders(propertyId: string) {
  const { reminders } = usePortfolio();
  return useMemo(() => reminders.filter(r => r.propertyId === propertyId && !r.completed), [reminders, propertyId]);
}

export function usePropertyMetrics(propertyId: string) {
  const transactions = usePropertyTransactions(propertyId);
  return useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netProfit = totalIncome - totalExpenses;
    const currentYear = new Date().getFullYear();
    const ytdIncome = transactions.filter(t => t.type === 'income' && parseTransactionDate(t.date).getFullYear() === currentYear).reduce((sum, t) => sum + t.amount, 0);
    const ytdExpenses = transactions.filter(t => t.type === 'expense' && parseTransactionDate(t.date).getFullYear() === currentYear).reduce((sum, t) => sum + t.amount, 0);
    return { totalIncome, totalExpenses, netProfit, ytdIncome, ytdExpenses, ytdProfit: ytdIncome - ytdExpenses };
  }, [transactions]);
}

export function usePropertyLeaseFolders(propertyId: string) {
  const { leaseFolders } = usePortfolio();
  return useMemo(() => leaseFolders.filter(f => f.propertyId === propertyId), [leaseFolders, propertyId]);
}

export function useFolderDocuments(folderId: string) {
  const { leaseDocuments } = usePortfolio();
  return useMemo(() => leaseDocuments.filter(d => d.folderId === folderId), [leaseDocuments, folderId]);
}

export function usePropertyLeaseDocuments(propertyId: string) {
  const { leaseDocuments } = usePortfolio();
  return useMemo(() => leaseDocuments.filter(d => d.propertyId === propertyId), [leaseDocuments, propertyId]);
}

export function usePropertyPhotos(propertyId: string) {
  const { propertyPhotos } = usePortfolio();
  return useMemo(() => propertyPhotos.filter(p => p.propertyId === propertyId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [propertyPhotos, propertyId]);
}
