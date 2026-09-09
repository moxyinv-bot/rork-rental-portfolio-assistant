import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Property, Transaction, Receipt, Reminder, LeaseFolder, LeaseDocument, PropertyPhoto, Appliance, PaintColor, CustomPropertyField, PortfolioContact, ContactPhoneNumber, ContactCategory } from '@/types/property';
import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/lib/supabase';
import { parseStoredDate, normalizeStoredDate } from '@/lib/dates';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import {
  cancelLocalReminderNotification,
  scheduleLocalReminderNotification,
  syncLocalReminderNotification,
} from '@/lib/reminder-notifications';

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

const PROPERTY_MEDIA_BUCKET = 'property-photos';
const RECEIPT_MEDIA_BUCKET = 'receipt-images';
const LEASE_MEDIA_BUCKET = 'lease-documents';

const isBucketMissingError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /bucket\s*not\s*found|not\s*found\s*bucket|bucket.*does not exist/i.test(message);
};

const getSingleBucketList = (bucketName: string): string[] => [bucketName];

export const parseTransactionDate = parseStoredDate;

const parseFlexibleDate = parseStoredDate;

const normalizeReminderDueDate = normalizeStoredDate;

const normalizeOptionalDate = (value?: string | null): string | undefined =>
  value ? normalizeStoredDate(value) : undefined;

const normalizeCustomFields = (value: unknown): CustomPropertyField[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((field, index) => {
      if (!field || typeof field !== 'object') return null;
      const record = field as Record<string, unknown>;
      const label = typeof record.label === 'string' ? record.label.trim() : '';
      const fieldValue = typeof record.value === 'string' ? record.value.trim() : '';
      if (!label || !fieldValue) return null;

      return {
        id: typeof record.id === 'string' && record.id.trim() ? record.id : `custom_${index}`,
        label,
        value: fieldValue,
      };
    })
    .filter((field): field is CustomPropertyField => Boolean(field))
    .slice(0, 10);
};

const CONTACT_CATEGORIES = new Set<ContactCategory>(['contractor', 'insurance', 'tenant', 'buyer-seller', 'lead', 'other']);

const normalizeContactCategory = (value: unknown): ContactCategory => {
  return typeof value === 'string' && CONTACT_CATEGORIES.has(value as ContactCategory)
    ? value as ContactCategory
    : 'other';
};

const normalizeContactPhoneNumbers = (value: unknown): ContactPhoneNumber[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((phone, index) => {
      if (!phone || typeof phone !== 'object') return null;
      const record = phone as Record<string, unknown>;
      const number = typeof record.number === 'string' ? record.number.trim() : '';
      if (!number) return null;

      return {
        id: typeof record.id === 'string' && record.id.trim() ? record.id : `phone_${index}`,
        label: typeof record.label === 'string' && record.label.trim() ? record.label.trim() : 'Phone',
        number,
      };
    })
    .filter((phone): phone is ContactPhoneNumber => Boolean(phone));
};

const normalizeTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(
    value
      .map(tag => typeof tag === 'string' ? tag.trim() : '')
      .filter(Boolean)
  ));
};

const getMimeTypeFromUri = (uri: string): string => {
  const normalized = uri.toLowerCase();
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
};

const getFileExtensionFromUri = (uri: string): string => {
  const cleanUri = uri.split('?')[0].split('#')[0];
  const parts = cleanUri.split('.');
  if (parts.length > 1) return parts[parts.length - 1].toLowerCase();
  return 'jpg';
};

async function uploadImageToStorage(localUri: string, buckets: string[], householdId: string, prefix: string): Promise<string> {
  if (!localUri) return localUri;
  if (Platform.OS === 'web') return localUri;
  if (localUri.startsWith('http://') || localUri.startsWith('https://')) return localUri;

  const mimeType = getMimeTypeFromUri(localUri);
  const ext = getFileExtensionFromUri(localUri);
  const path = `${householdId}/${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const orderedBuckets = getSingleBucketList(buckets[0] ?? PROPERTY_MEDIA_BUCKET);
  let lastError: unknown = null;

  for (const bucket of orderedBuckets) {
    const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      if (data?.publicUrl) return data.publicUrl;
      throw new Error(`Upload succeeded but public URL could not be generated for bucket ${bucket}.`);
    }

    if (isBucketMissingError(error)) {
      throw new Error(`Storage bucket not found: ${bucket}. Create the bucket in Supabase Storage and make it public.`);
    }

    lastError = error;
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to upload image to storage.');
}

async function uploadImageToStorageForProperty(localUri: string, buckets: string[], householdId: string, propertyId: string, prefix: string): Promise<string> {
  if (!localUri) return localUri;
  if (Platform.OS === 'web') return localUri;
  if (localUri.startsWith('http://') || localUri.startsWith('https://')) return localUri;

  const mimeType = getMimeTypeFromUri(localUri);
  const ext = getFileExtensionFromUri(localUri);
  const path = `${householdId}/${propertyId}/${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const orderedBuckets = getSingleBucketList(buckets[0] ?? PROPERTY_MEDIA_BUCKET);
  let lastError: unknown = null;

  for (const bucket of orderedBuckets) {
    const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      if (data?.publicUrl) return data.publicUrl;
      throw new Error(`Upload succeeded but public URL could not be generated for bucket ${bucket}.`);
    }

    if (isBucketMissingError(error)) {
      throw new Error(`Storage bucket not found: ${bucket}. Create the bucket in Supabase Storage and make it public.`);
    }

    lastError = error;
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to upload image to property storage.');
}

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
    squareFootage: row.square_footage ? Number(row.square_footage) : undefined,
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
    backgroundColor: row.background_color || undefined,
    customFields: normalizeCustomFields(row.custom_fields),
    displayOrder: typeof row.display_order === 'number' ? row.display_order : undefined,
  };
}

const formatSupabaseError = (error: any): string => {
  const code = error?.code ? ` (${error.code})` : '';
  const details = error?.details ? ` Details: ${error.details}` : '';
  const hint = error?.hint ? ` Hint: ${error.hint}` : '';
  const message = error?.message || 'Unknown database error';
  return `${message}${code}${details}${hint}`;
};

const extractMissingColumn = (error: any): string | null => {
  const message = String(error?.message || '');

  // PostgREST schema cache error: could not find the 'col' column of 'table'
  const pgrstMatch = message.match(/could not find the '([^']+)' column/i);
  if (pgrstMatch?.[1]) return pgrstMatch[1];

  // PostgreSQL: column "col" does not exist
  const pgMatch = message.match(/column\s+"([^"]+)"\s+does not exist/i);
  if (pgMatch?.[1]) return pgMatch[1];

  return null;
};

const NON_DROPPABLE_PROPERTY_COLUMNS = new Set<string>([
  'household_id',
  'user_id',
  'name',
  'address',
  'type',
  'purchase_date',
  'purchase_price',
  'monthly_rent',
]);

const compactPayload = (payload: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  }
  return result;
};

const TABLE_COLUMN_ALLOWLIST: Record<string, Set<string>> = {
  properties: new Set([
    'id', 'household_id', 'user_id', 'name', 'address', 'type', 'purchase_date', 'purchase_price', 'current_value', 'square_footage',
    'monthly_rent', 'tenant_name', 'tenant_contact', 'lease_start', 'lease_end', 'mortgage_amount', 'mortgage_payment',
    'mortgage_renewal_date', 'insurance_provider', 'insurance_policy', 'insurance_renewal_date', 'insurance_premium',
    'property_tax', 'ac_capacitor_size', 'ac_filter_size', 'paint_colors_inside', 'paint_colors_outside',
    'water_heater_info', 'appliance_info', 'notes', 'image_uri', 'background_color', 'custom_fields', 'display_order', 'created_at', 'updated_at'
  ]),
  transactions: new Set([
    'id', 'user_id', 'household_id', 'property_id', 'type', 'category', 'amount', 'tx_date', 'description', 'receipt_uri', 'tags',
    'created_at', 'updated_at'
  ]),
  receipts: new Set([
    'id', 'user_id', 'household_id', 'property_id', 'transaction_id', 'uri', 'receipt_date', 'amount', 'vendor', 'category', 'tags', 'notes',
    'created_at', 'updated_at'
  ]),
  reminders: new Set([
    'id', 'user_id', 'household_id', 'property_id', 'type', 'title', 'due_date', 'notes', 'completed', 'recipient_phone',
    'recipient_email', 'created_at', 'updated_at'
  ]),
  lease_folders: new Set([
    'id', 'user_id', 'household_id', 'property_id', 'name', 'color', 'created_at', 'updated_at'
  ]),
  lease_documents: new Set([
    'id', 'user_id', 'household_id', 'property_id', 'folder_id', 'type', 'title', 'content', 'original_image_uri', 'tags',
    'tenant_name', 'date_of_document', 'notes', 'created_at', 'updated_at'
  ]),
  property_photos: new Set([
    'id', 'user_id', 'property_id', 'uri', 'caption', 'created_at', 'updated_at'
  ]),
};

const sanitizeTablePayload = (tableName: string, payload: Record<string, any>): Record<string, any> => {
  const allowList = TABLE_COLUMN_ALLOWLIST[tableName];
  if (!allowList) return compactPayload(payload);

  const filtered: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (allowList.has(key) && value !== undefined && value !== null) {
      filtered[key] = value;
    }
  }
  return filtered;
};

const retryMissingColumnOperation = async <T>(
  tableName: string,
  payload: Record<string, any>,
  operation: 'insert' | 'update',
  idValue?: string,
  selectFields = '*'
): Promise<{ data: T | null; error: any }> => {
  let currentPayload = sanitizeTablePayload(tableName, payload);
  const seen = new Set<string>();
  let lastError: any = null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    let query = supabase.from(tableName);
    if (operation === 'insert') {
      query = query.insert(currentPayload as any);
    } else {
      query = query.update(currentPayload as any);
      if (idValue) {
        query = query.eq('id', idValue) as any;
      }
    }

    const result = operation === 'insert'
      ? await query.select(selectFields).single()
      : await query.select(selectFields).single();

    if (!result.error) {
      return { data: result.data as T, error: null };
    }

    lastError = result.error;
    const missingColumn = extractMissingColumn(result.error);
    if (!missingColumn || !Object.prototype.hasOwnProperty.call(currentPayload, missingColumn)) {
      break;
    }

    const signature = `${missingColumn}:${Object.keys(currentPayload).sort().join(',')}`;
    if (seen.has(signature)) break;
    seen.add(signature);

    delete currentPayload[missingColumn];
    if (Object.keys(currentPayload).length === 0) break;
  }

  return { data: null, error: lastError };
};

const fetchTableRows = async (tableName: string, options?: { filterKey?: string; filterValue?: string; orderBy?: { column: string; ascending?: boolean } }): Promise<any[]> => {
  let query = supabase.from(tableName).select('*');
  if (options?.filterKey && options.filterValue !== undefined) {
    query = query.eq(options.filterKey, options.filterValue) as any;
  }
  if (options?.orderBy) {
    query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true }) as any;
  }

  const { data, error } = await query;
  if (!error) return data ?? [];

  const missingColumn = extractMissingColumn(error);
  if (missingColumn && options?.filterKey && options.filterKey === missingColumn) {
    const fallbackQuery = supabase.from(tableName).select('*');
    if (options?.orderBy) {
      (fallbackQuery as any).order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }
    const fallback = await fallbackQuery;
    if (!fallback.error) return fallback.data ?? [];
  }

  throw error;
};

const createInsertId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

function dbToTransaction(row: any): Transaction {
  return {
    id: row.id,
    propertyId: row.property_id,
    type: row.type,
    category: row.category,
    amount: Number(row.amount) || 0,
    date: row.tx_date || row.date,
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
    date: row.receipt_date || row.date,
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
    date: row.date ?? row.created_at ?? undefined,
  };
}

function dbToContact(row: any): PortfolioContact {
  return {
    id: row.id,
    name: row.name,
    category: normalizeContactCategory(row.category),
    phoneNumbers: normalizeContactPhoneNumbers(row.phone_numbers),
    company: row.company || undefined,
    email: row.email || undefined,
    address: row.address || undefined,
    tags: normalizeTags(row.tags),
    notes: row.notes || undefined,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
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
  const [contacts, setContacts] = useState<PortfolioContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const householdId = household?.id;

  const normalizeHouseholdId = useCallback((value: string | null | undefined): string | null => {
    if (!value) return null;
    return String(value).trim();
  }, []);

  // Load all data from Supabase when household changes
  const loadAllData = useCallback(async (hhId: string) => {
    setIsSyncing(true);
    try {
      if (!user?.id) {
        return;
      }

      const normalizedHouseholdId = normalizeHouseholdId(hhId);
      if (!normalizedHouseholdId) {
        setProperties([]);
        setTransactions([]);
        setReceipts([]);
        setReminders([]);
        setLeaseFolders([]);
        setLeaseDocuments([]);
        setPropertyPhotos([]);
        setContacts([]);
        return;
      }

      const [propsRes, txRes, recRes, remRes, foldersRes, docsRes, contactsRes] = await Promise.all([
        fetchTableRows('properties', { filterKey: 'household_id', filterValue: normalizedHouseholdId, orderBy: { column: 'created_at', ascending: true } }).catch(() => []),
        fetchTableRows('transactions', { filterKey: 'household_id', filterValue: normalizedHouseholdId, orderBy: { column: 'tx_date', ascending: false } }).catch(() => []),
        fetchTableRows('receipts', { filterKey: 'household_id', filterValue: normalizedHouseholdId, orderBy: { column: 'receipt_date', ascending: false } }).catch(() => []),
        fetchTableRows('reminders', { filterKey: 'household_id', filterValue: normalizedHouseholdId, orderBy: { column: 'due_date', ascending: true } }).catch(() => []),
        fetchTableRows('lease_folders', { filterKey: 'household_id', filterValue: normalizedHouseholdId, orderBy: { column: 'created_at', ascending: true } }).catch(() => []),
        fetchTableRows('lease_documents', { filterKey: 'household_id', filterValue: normalizedHouseholdId, orderBy: { column: 'updated_at', ascending: false } }).catch(() => []),
        fetchTableRows('household_contacts', { filterKey: 'household_id', filterValue: normalizedHouseholdId, orderBy: { column: 'name', ascending: true } }).catch(() => []),
      ]);

      const householdPropertyIds = propsRes.map((property: any) => property.id).filter(Boolean);
      let photosRes: any[] = [];
      if (householdPropertyIds.length > 0) {
        const { data: photoRows, error: photoError } = await supabase
          .from('property_photos')
          .select('*')
          .in('property_id', householdPropertyIds)
          .order('created_at', { ascending: false });
        if (photoError) {
          console.error('Error loading household property photos:', photoError);
        } else {
          photosRes = photoRows ?? [];
        }
      }

      setProperties(propsRes.map(dbToProperty));
      setTransactions(txRes.map(dbToTransaction));
      setReceipts(recRes.map(dbToReceipt));
      setReminders(remRes.map(dbToReminder));
      setLeaseFolders(foldersRes.map(dbToLeaseFolder));
      setLeaseDocuments(docsRes.map(dbToLeaseDocument));
      setPropertyPhotos(photosRes.map(dbToPropertyPhoto));
      setContacts(contactsRes.map(dbToContact));
    } catch (error) {
      console.error('Error loading portfolio data:', error);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [normalizeHouseholdId, user?.id]);

  // Load data when household is available
  useEffect(() => {
    const normalizedHouseholdId = normalizeHouseholdId(householdId);

    if (!normalizedHouseholdId) {
      if (!user) {
        setProperties([]);
        setTransactions([]);
        setReceipts([]);
        setReminders([]);
        setLeaseFolders([]);
        setLeaseDocuments([]);
        setPropertyPhotos([]);
        setContacts([]);
      } else {
        console.log('Household not ready yet; preserving current portfolio state.');
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    loadAllData(normalizedHouseholdId);

    // Set up realtime subscriptions for live sync
    const channel = supabase
      .channel(`portfolio-${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties', filter: `household_id=eq.${householdId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = dbToProperty(payload.new);
            setProperties(prev => prev.some(p => p.id === inserted.id) ? prev : [...prev, inserted]);
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
            const inserted = dbToTransaction(payload.new);
            setTransactions(prev => prev.some(t => t.id === inserted.id) ? prev : [inserted, ...prev]);
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
            const inserted = dbToReceipt(payload.new);
            setReceipts(prev => prev.some(r => r.id === inserted.id) ? prev : [inserted, ...prev]);
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
            const inserted = dbToReminder(payload.new);
            setReminders(prev => prev.some(r => r.id === inserted.id) ? prev : [...prev, inserted]);
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
            const inserted = dbToLeaseFolder(payload.new);
            setLeaseFolders(prev => prev.some(f => f.id === inserted.id) ? prev : [...prev, inserted]);
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
            const inserted = dbToLeaseDocument(payload.new);
            setLeaseDocuments(prev => prev.some(d => d.id === inserted.id) ? prev : [inserted, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLeaseDocuments(prev => prev.map(d => d.id === payload.new.id ? dbToLeaseDocument(payload.new) : d));
          } else if (payload.eventType === 'DELETE') {
            setLeaseDocuments(prev => prev.filter(d => d.id !== payload.old.id));
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_photos' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = dbToPropertyPhoto(payload.new);
            setPropertyPhotos(prev => prev.some(p => p.id === inserted.id) ? prev : [inserted, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setPropertyPhotos(prev => prev.map(p => p.id === payload.new.id ? dbToPropertyPhoto(payload.new) : p));
          } else if (payload.eventType === 'DELETE') {
            setPropertyPhotos(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_contacts', filter: `household_id=eq.${householdId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = dbToContact(payload.new);
            setContacts(prev => prev.some(contact => contact.id === inserted.id) ? prev : [...prev, inserted].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'UPDATE') {
            setContacts(prev => prev.map(contact => contact.id === payload.new.id ? dbToContact(payload.new) : contact).sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'DELETE') {
            setContacts(prev => prev.filter(contact => contact.id !== payload.old.id));
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
        const propertyInsertId = prop.id && prop.id.trim() ? prop.id : createInsertId('property');
        const { data, error } = await supabase.from('properties').insert({
          id: propertyInsertId,
          household_id: hhId,
          user_id: user.id,
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
          custom_fields: normalizeCustomFields(prop.customFields),
        }).select().single();

        if (!error && data) {
          propertyIdMap[prop.id] = data.id;
        }
      }

      // Migrate transactions
      for (const tx of legacyTx) {
        const newPropId = propertyIdMap[tx.propertyId];
        if (!newPropId) continue;
        await supabase.from('transactions').insert(sanitizeTablePayload('transactions', {
          id: createInsertId('tx'),
          user_id: user.id,
          household_id: hhId,
          property_id: newPropId,
          type: tx.type,
          category: tx.category,
          amount: tx.amount,
          date: tx.date,
          description: tx.description,
          receipt_uri: tx.receiptUri,
          tags: tx.tags,
        }));
      }

      // Migrate receipts
      for (const rec of legacyRecs) {
        const newPropId = propertyIdMap[rec.propertyId];
        if (!newPropId) continue;
        await supabase.from('receipts').insert(sanitizeTablePayload('receipts', {
          id: createInsertId('receipt'),
          user_id: user.id,
          household_id: hhId,
          property_id: newPropId,
          uri: rec.uri,
          date: rec.date,
          amount: rec.amount,
          vendor: rec.vendor,
          category: rec.category,
          tags: rec.tags,
          notes: rec.notes,
        }));
      }

      // Migrate reminders
      for (const rem of legacyRems) {
        const newPropId = propertyIdMap[rem.propertyId];
        if (!newPropId) continue;
        await supabase.from('reminders').insert(sanitizeTablePayload('reminders', {
          id: createInsertId('reminder'),
          user_id: user.id,
          household_id: hhId,
          property_id: newPropId,
          type: rem.type,
          title: rem.title,
          due_date: rem.dueDate,
          notes: rem.notes,
          completed: rem.completed,
          recipient_phone: rem.recipientPhone,
          recipient_email: rem.recipientEmail,
        }));
      }

      // Migrate lease folders
      const folderIdMap: Record<string, string> = {};
      for (const folder of legacyFolders) {
        const newPropId = propertyIdMap[folder.propertyId];
        if (!newPropId) continue;
        const { data, error } = await supabase.from('lease_folders').insert(sanitizeTablePayload('lease_folders', {
          id: createInsertId('folder'),
          user_id: user.id,
          household_id: hhId,
          property_id: newPropId,
          name: folder.name,
          color: folder.color,
        })).select().single();
        if (!error && data) {
          folderIdMap[folder.id] = data.id;
        }
      }

      // Migrate lease documents
      for (const doc of legacyDocs) {
        const newPropId = propertyIdMap[doc.propertyId];
        if (!newPropId) continue;
        const newFolderId = doc.folderId ? folderIdMap[doc.folderId] : null;
        await supabase.from('lease_documents').insert(sanitizeTablePayload('lease_documents', {
          id: createInsertId('doc'),
          user_id: user.id,
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
        }));
      }

      // Migrate property photos
      for (const photo of legacyPhotos) {
        const newPropId = propertyIdMap[photo.propertyId];
        if (!newPropId) continue;
        await supabase.from('property_photos').insert({
          id: createInsertId('photo'),
          user_id: user.id,
          property_id: newPropId,
          uri: photo.uri,
          caption: photo.caption,
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
  const addProperty = useCallback(async (property: Property): Promise<Property> => {
    if (!householdId) {
      throw new Error('No household selected. Please create or join a household first.');
    }

    if (!user?.id) {
      throw new Error('No authenticated user found. Please sign in again and retry.');
    }

    const propertyInsertId = property.id && property.id.trim() ? property.id : createInsertId('property');
    const optimisticId = `tmp_property_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimisticProperty: Property = { ...property, id: optimisticId };
    setProperties(prev => [...prev, optimisticProperty]);

    let uploadedImageUri = property.imageUri;
    if (property.imageUri) {
      try {
        uploadedImageUri = await uploadImageToStorageForProperty(
          property.imageUri,
          [PROPERTY_MEDIA_BUCKET],
          householdId,
          propertyInsertId,
          'cover'
        );
      } catch (uploadError) {
        setProperties(prev => prev.filter(p => p.id !== optimisticId));
        console.error('Property cover image upload failed:', uploadError);
        throw new Error('Failed to upload property photo to cloud storage. Please try again.');
      }
    }

    const fullPayload = {
      id: propertyInsertId,
      household_id: householdId,
      user_id: user.id,
      name: property.name,
      address: property.address,
      type: property.type,
      purchase_date: normalizeOptionalDate(property.purchaseDate),
      purchase_price: property.purchasePrice,
      current_value: property.currentValue,
      square_footage: property.squareFootage,
      monthly_rent: property.monthlyRent,
      tenant_name: property.tenantName,
      tenant_contact: property.tenantContact,
      lease_start: normalizeOptionalDate(property.leaseStart),
      lease_end: normalizeOptionalDate(property.leaseEnd),
      mortgage_amount: property.mortgageAmount,
      mortgage_payment: property.mortgagePayment,
      mortgage_renewal_date: normalizeOptionalDate(property.mortgageRenewalDate),
      insurance_provider: property.insuranceProvider,
      insurance_policy: property.insurancePolicy,
      insurance_renewal_date: normalizeOptionalDate(property.insuranceRenewalDate),
      insurance_premium: property.insurancePremium,
      property_tax: property.propertyTax,
      ac_capacitor_size: property.acCapacitorSize,
      ac_filter_size: property.acFilterSize,
      paint_colors_inside: property.paintColorsInside,
      paint_colors_outside: property.paintColorsOutside,
      water_heater_info: property.waterHeaterInfo,
      appliance_info: property.applianceInfo,
      notes: property.notes,
      image_uri: uploadedImageUri,
      background_color: property.backgroundColor,
      custom_fields: normalizeCustomFields(property.customFields),
      display_order: property.displayOrder,
    };

    const requiredValues: Record<string, any> = {
      household_id: householdId,
      user_id: user.id,
      name: property.name,
      address: property.address,
      type: property.type,
      purchase_price: property.purchasePrice,
      monthly_rent: property.monthlyRent,
    };

    // Adaptive retry: keep required fields, only remove columns explicitly
    // reported as missing by the backend schema.
    const queue: Record<string, any>[] = [compactPayload(fullPayload)];
    const seenPayloadSignatures = new Set<string>();
    const attemptDiagnostics: string[] = [];
    const maxAttempts = 8;
    let data: any = null;
    let lastError: any = null;

    for (let i = 0; i < maxAttempts && queue.length > 0; i += 1) {
      const payload = queue.shift()!;
      const signature = JSON.stringify(Object.keys(payload).sort());
      if (seenPayloadSignatures.has(signature)) {
        continue;
      }
      seenPayloadSignatures.add(signature);

      const result = await supabase.from('properties').insert(payload).select('*').single();
      if (!result.error && result.data) {
        data = result.data;
        lastError = null;
        break;
      }

      lastError = result.error;
      const keyList = Object.keys(payload).sort().join(', ');
      attemptDiagnostics.push(`Attempt ${attemptDiagnostics.length + 1} [${keyList}] -> ${formatSupabaseError(result.error)}`);

      const missingColumn = extractMissingColumn(result.error);
      if (
        missingColumn &&
        !NON_DROPPABLE_PROPERTY_COLUMNS.has(missingColumn) &&
        Object.prototype.hasOwnProperty.call(payload, missingColumn)
      ) {
        const nextPayload = { ...payload };
        delete nextPayload[missingColumn];

        // Re-assert required values when the column still exists and is needed.
        if (missingColumn !== 'household_id' && !Object.prototype.hasOwnProperty.call(nextPayload, 'household_id')) {
          nextPayload.household_id = requiredValues.household_id;
        }
        if (missingColumn !== 'user_id' && !Object.prototype.hasOwnProperty.call(nextPayload, 'user_id')) {
          nextPayload.user_id = requiredValues.user_id;
        }
        if (!Object.prototype.hasOwnProperty.call(nextPayload, 'name')) nextPayload.name = requiredValues.name;
        if (!Object.prototype.hasOwnProperty.call(nextPayload, 'address')) nextPayload.address = requiredValues.address;
        if (!Object.prototype.hasOwnProperty.call(nextPayload, 'type')) nextPayload.type = requiredValues.type;
        if (!Object.prototype.hasOwnProperty.call(nextPayload, 'purchase_price')) nextPayload.purchase_price = requiredValues.purchase_price;
        if (!Object.prototype.hasOwnProperty.call(nextPayload, 'monthly_rent')) nextPayload.monthly_rent = requiredValues.monthly_rent;

        queue.push(compactPayload(nextPayload));
      }
    }

    if (lastError || !data) {
      setProperties(prev => prev.filter(p => p.id !== optimisticId));
      console.error('Error adding property:', lastError);
      const details = attemptDiagnostics.length > 0 ? ` Attempts: ${attemptDiagnostics.join(' | ')}` : '';
      throw new Error(`Failed to save property: ${formatSupabaseError(lastError)}${details}`);
    }

    const insertedProperty = {
      ...dbToProperty(data),
      backgroundColor: dbToProperty(data).backgroundColor || property.backgroundColor,
      imageUri: dbToProperty(data).imageUri || uploadedImageUri,
    };
    setProperties(prev => prev.map(p => (p.id === optimisticId ? insertedProperty : p)));
    return insertedProperty;
  }, [householdId, user?.id]);

  const updateProperty = useCallback(async (id: string, updates: Partial<Property>) => {
    const previousProperty = properties.find(p => p.id === id);
    if (!previousProperty) {
      throw new Error('Property not found.');
    }

    let normalizedUpdates = updates;
    if (updates.imageUri !== undefined && updates.imageUri !== previousProperty.imageUri && updates.imageUri) {
      if (!householdId) {
        throw new Error('No household selected. Please create or join a household first.');
      }

      try {
        const uploadedImageUri = await uploadImageToStorageForProperty(
          updates.imageUri,
          [PROPERTY_MEDIA_BUCKET],
          householdId,
          id,
          'cover'
        );
        normalizedUpdates = { ...updates, imageUri: uploadedImageUri };
      } catch (uploadError) {
        console.error('Property cover image upload failed:', uploadError);
        throw new Error('Failed to upload property photo to cloud storage. Please try again.');
      }
    }

    setProperties(prev => prev.map(p => (p.id === id ? { ...p, ...normalizedUpdates } : p)));

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (normalizedUpdates.name !== undefined) updateData.name = normalizedUpdates.name;
    if (normalizedUpdates.address !== undefined) updateData.address = normalizedUpdates.address;
    if (normalizedUpdates.type !== undefined) updateData.type = normalizedUpdates.type;
    if (normalizedUpdates.purchaseDate !== undefined) updateData.purchase_date = normalizeOptionalDate(normalizedUpdates.purchaseDate);
    if (normalizedUpdates.purchasePrice !== undefined) updateData.purchase_price = normalizedUpdates.purchasePrice;
    if (normalizedUpdates.currentValue !== undefined) updateData.current_value = normalizedUpdates.currentValue;
    if (normalizedUpdates.squareFootage !== undefined) updateData.square_footage = normalizedUpdates.squareFootage;
    if (normalizedUpdates.monthlyRent !== undefined) updateData.monthly_rent = normalizedUpdates.monthlyRent;
    if (normalizedUpdates.tenantName !== undefined) updateData.tenant_name = normalizedUpdates.tenantName;
    if (normalizedUpdates.tenantContact !== undefined) updateData.tenant_contact = normalizedUpdates.tenantContact;
    if (normalizedUpdates.leaseStart !== undefined) updateData.lease_start = normalizeOptionalDate(normalizedUpdates.leaseStart);
    if (normalizedUpdates.leaseEnd !== undefined) updateData.lease_end = normalizeOptionalDate(normalizedUpdates.leaseEnd);
    if (normalizedUpdates.mortgageAmount !== undefined) updateData.mortgage_amount = normalizedUpdates.mortgageAmount;
    if (normalizedUpdates.mortgagePayment !== undefined) updateData.mortgage_payment = normalizedUpdates.mortgagePayment;
    if (normalizedUpdates.mortgageRenewalDate !== undefined) updateData.mortgage_renewal_date = normalizeOptionalDate(normalizedUpdates.mortgageRenewalDate);
    if (normalizedUpdates.insuranceProvider !== undefined) updateData.insurance_provider = normalizedUpdates.insuranceProvider;
    if (normalizedUpdates.insurancePolicy !== undefined) updateData.insurance_policy = normalizedUpdates.insurancePolicy;
    if (normalizedUpdates.insuranceRenewalDate !== undefined) updateData.insurance_renewal_date = normalizeOptionalDate(normalizedUpdates.insuranceRenewalDate);
    if (normalizedUpdates.insurancePremium !== undefined) updateData.insurance_premium = normalizedUpdates.insurancePremium;
    if (normalizedUpdates.propertyTax !== undefined) updateData.property_tax = normalizedUpdates.propertyTax;
    if (normalizedUpdates.acCapacitorSize !== undefined) updateData.ac_capacitor_size = normalizedUpdates.acCapacitorSize;
    if (normalizedUpdates.acFilterSize !== undefined) updateData.ac_filter_size = normalizedUpdates.acFilterSize;
    if (normalizedUpdates.paintColorsInside !== undefined) updateData.paint_colors_inside = normalizedUpdates.paintColorsInside;
    if (normalizedUpdates.paintColorsOutside !== undefined) updateData.paint_colors_outside = normalizedUpdates.paintColorsOutside;
    if (normalizedUpdates.waterHeaterInfo !== undefined) updateData.water_heater_info = normalizedUpdates.waterHeaterInfo;
    if (normalizedUpdates.applianceInfo !== undefined) updateData.appliance_info = normalizedUpdates.applianceInfo;
    if (normalizedUpdates.notes !== undefined) updateData.notes = normalizedUpdates.notes;
    if (normalizedUpdates.imageUri !== undefined) updateData.image_uri = normalizedUpdates.imageUri;
    if (normalizedUpdates.backgroundColor !== undefined) updateData.background_color = normalizedUpdates.backgroundColor;
    if (normalizedUpdates.customFields !== undefined) updateData.custom_fields = normalizeCustomFields(normalizedUpdates.customFields);
    if (normalizedUpdates.displayOrder !== undefined) updateData.display_order = normalizedUpdates.displayOrder;

    let currentUpdateData = compactPayload(updateData);
    let lastError: any = null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { error } = await supabase.from('properties').update(currentUpdateData).eq('id', id);
      if (!error) {
        lastError = null;
        break;
      }

      lastError = error;
      const missingColumn = extractMissingColumn(error);
      if (
        !missingColumn ||
        NON_DROPPABLE_PROPERTY_COLUMNS.has(missingColumn) ||
        !Object.prototype.hasOwnProperty.call(currentUpdateData, missingColumn)
      ) {
        break;
      }

      delete currentUpdateData[missingColumn];
      if (Object.keys(currentUpdateData).length === 0) break;
    }

    if (lastError) {
      setProperties(prev => prev.map(p => (p.id === id ? previousProperty : p)));
      console.error('Error updating property:', lastError);
      throw lastError;
    }
  }, [properties]);

  const reorderProperties = useCallback(async (orderedPropertyIds: string[]) => {
    const previousProperties = properties;
    const displayOrderById = new Map(orderedPropertyIds.map((id, index) => [id, index]));

    setProperties(prev => prev.map(property => ({
      ...property,
      displayOrder: displayOrderById.get(property.id) ?? property.displayOrder,
    })));

    const results = await Promise.all(
      orderedPropertyIds.map((id, index) =>
        supabase
          .from('properties')
          .update({ display_order: index, updated_at: new Date().toISOString() })
          .eq('id', id)
      )
    );
    const failed = results.find(result => result.error);

    if (failed?.error) {
      setProperties(previousProperties);
      console.error('Error reordering properties:', failed.error);
      throw failed.error;
    }
  }, [properties]);

  const deleteProperty = useCallback(async (id: string) => {
    const propertiesSnapshot = properties;
    const transactionsSnapshot = transactions;
    const receiptsSnapshot = receipts;
    const remindersSnapshot = reminders;
    const leaseFoldersSnapshot = leaseFolders;
    const leaseDocumentsSnapshot = leaseDocuments;
    const propertyPhotosSnapshot = propertyPhotos;

    setProperties(prev => prev.filter(p => p.id !== id));
    setTransactions(prev => prev.filter(t => t.propertyId !== id));
    setReceipts(prev => prev.filter(r => r.propertyId !== id));
    setReminders(prev => prev.filter(r => r.propertyId !== id));
    setLeaseFolders(prev => prev.filter(f => f.propertyId !== id));
    setLeaseDocuments(prev => prev.filter(d => d.propertyId !== id));
    setPropertyPhotos(prev => prev.filter(photo => photo.propertyId !== id));

    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) {
      setProperties(propertiesSnapshot);
      setTransactions(transactionsSnapshot);
      setReceipts(receiptsSnapshot);
      setReminders(remindersSnapshot);
      setLeaseFolders(leaseFoldersSnapshot);
      setLeaseDocuments(leaseDocumentsSnapshot);
      setPropertyPhotos(propertyPhotosSnapshot);
      console.error('Error deleting property:', error);
      throw error;
    }
  }, [properties, transactions, receipts, reminders, leaseFolders, leaseDocuments, propertyPhotos]);

  // Transaction CRUD operations
  const addTransaction = useCallback(async (transaction: Transaction): Promise<Transaction> => {
    if (!householdId) {
      throw new Error('No household selected. Please create or join a household first.');
    }

    const optimisticId = `tmp_tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimisticTransaction: Transaction = { ...transaction, id: optimisticId };
    setTransactions(prev => [optimisticTransaction, ...prev]);

    const { data, error } = await retryMissingColumnOperation<Transaction>('transactions', {
      id: createInsertId('tx'),
      user_id: user.id,
      household_id: householdId,
      property_id: transaction.propertyId,
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      tx_date: normalizeStoredDate(transaction.date),
      date: normalizeStoredDate(transaction.date),
      description: transaction.description,
      receipt_uri: transaction.receiptUri,
      tags: transaction.tags,
    }, 'insert');
    if (error) {
      setTransactions(prev => prev.filter(t => t.id !== optimisticId));
      console.error('Error adding transaction:', error);
      throw error;
    }

    if (!data) {
      setTransactions(prev => prev.filter(t => t.id !== optimisticId));
      throw new Error('Transaction insert succeeded but no row was returned.');
    }

    const insertedTransaction = dbToTransaction(data);
    setTransactions(prev => prev.map(t => (t.id === optimisticId ? insertedTransaction : t)));
    return insertedTransaction;
  }, [householdId]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    const previousTransaction = transactions.find(t => t.id === id);
    if (!previousTransaction) {
      throw new Error('Transaction not found.');
    }

    setTransactions(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.date !== undefined) {
      updateData.tx_date = normalizeStoredDate(updates.date);
      updateData.date = normalizeStoredDate(updates.date);
    }
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.receiptUri !== undefined) updateData.receipt_uri = updates.receiptUri;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.propertyId !== undefined) updateData.property_id = updates.propertyId;

    const { error } = await supabase.from('transactions').update(updateData).eq('id', id);
    if (error) {
      setTransactions(prev => prev.map(t => (t.id === id ? previousTransaction : t)));
      console.error('Error updating transaction:', error);
      throw error;
    }
  }, [transactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    const snapshot = transactions;
    setTransactions(prev => prev.filter(t => t.id !== id));

    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      setTransactions(snapshot);
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }, [transactions]);

  // Receipt CRUD operations
  const addReceipt = useCallback(async (receipt: Receipt): Promise<Receipt> => {
    if (!householdId) {
      throw new Error('No household selected. Please create or join a household first.');
    }

    const optimisticId = `tmp_receipt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimisticReceipt: Receipt = { ...receipt, id: optimisticId };
    setReceipts(prev => prev.some(r => r.id === optimisticId) ? prev : [optimisticReceipt, ...prev]);

    let uploadedUri = receipt.uri;
    if (receipt.uri) {
      try {
        uploadedUri = await uploadImageToStorage(
          receipt.uri,
          [RECEIPT_MEDIA_BUCKET],
          householdId,
          'receipt'
        );
      } catch (uploadError) {
        setReceipts(prev => prev.filter(r => r.id !== optimisticId));
        console.error('Receipt image upload failed:', uploadError);
        throw new Error('Failed to upload receipt image to cloud storage. Please try again.');
      }
    }

    const { data: recData, error: recErr } = await retryMissingColumnOperation<Receipt>('receipts', {
      id: createInsertId('receipt'),
      user_id: user.id,
      household_id: householdId,
      property_id: receipt.propertyId,
      uri: uploadedUri,
      receipt_date: normalizeStoredDate(receipt.date),
      date: normalizeStoredDate(receipt.date),
      amount: receipt.amount,
      vendor: receipt.vendor,
      category: receipt.category,
      tags: receipt.tags,
      notes: receipt.notes,
    }, 'insert');

    if (recErr) {
      setReceipts(prev => prev.filter(r => r.id !== optimisticId));
      console.error('Error adding receipt:', recErr);
      throw recErr;
    }

    if (!recData) {
      setReceipts(prev => prev.filter(r => r.id !== optimisticId));
      throw new Error('Receipt insert succeeded but no row was returned.');
    }

    const insertedReceipt = dbToReceipt(recData);
    setReceipts(prev => prev.map(r => (r.id === optimisticId ? insertedReceipt : r)));

    // Best-effort transaction creation from receipt metadata.
    if (receipt.amount && receipt.category) {
      const { error: txErr } = await supabase.from('transactions').insert(sanitizeTablePayload('transactions', {
        id: createInsertId('tx'),
        user_id: user.id,
        household_id: householdId,
        property_id: receipt.propertyId,
        type: 'expense',
        category: receipt.category,
        amount: receipt.amount,
        tx_date: normalizeStoredDate(receipt.date),
        date: normalizeStoredDate(receipt.date),
        description: receipt.vendor ? `Receipt from ${receipt.vendor}` : 'Receipt expense',
        receipt_uri: uploadedUri,
        tags: receipt.tags || [],
      }));
      if (txErr) console.error('Error creating transaction from receipt:', txErr);
    }

    return insertedReceipt;
  }, [householdId]);

  const updateReceipt = useCallback(async (id: string, updates: Partial<Receipt>) => {
    const previousReceipt = receipts.find(r => r.id === id);
    if (!previousReceipt) {
      throw new Error('Receipt not found.');
    }

    setReceipts(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)));

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.uri !== undefined) updateData.uri = updates.uri;
    if (updates.date !== undefined) {
      updateData.receipt_date = normalizeStoredDate(updates.date);
      updateData.date = normalizeStoredDate(updates.date);
    }
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.vendor !== undefined) updateData.vendor = updates.vendor;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.propertyId !== undefined) updateData.property_id = updates.propertyId;

    const { error } = await supabase.from('receipts').update(updateData).eq('id', id);
    if (error) {
      setReceipts(prev => prev.map(r => (r.id === id ? previousReceipt : r)));
      console.error('Error updating receipt:', error);
      throw error;
    }
  }, [receipts]);

  const deleteReceipt = useCallback(async (id: string) => {
    const snapshot = receipts;
    setReceipts(prev => prev.filter(r => r.id !== id));

    const { error } = await supabase.from('receipts').delete().eq('id', id);
    if (error) {
      setReceipts(snapshot);
      console.error('Error deleting receipt:', error);
      throw error;
    }
  }, [receipts]);

  // Reminder CRUD operations
  const addReminder = useCallback(async (reminder: Reminder): Promise<Reminder> => {
    if (!householdId) {
      throw new Error('No household selected. Please create or join a household first.');
    }

    const optimisticId = `tmp_reminder_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimisticReminder: Reminder = { ...reminder, id: optimisticId };
    setReminders(prev => prev.some(r => r.id === optimisticId) ? prev : [...prev, optimisticReminder]);

    const normalizedDueDate = normalizeReminderDueDate(reminder.dueDate);

    const { data, error } = await retryMissingColumnOperation<Reminder>('reminders', {
      id: createInsertId('reminder'),
      user_id: user.id,
      household_id: householdId,
      property_id: reminder.propertyId,
      type: reminder.type,
      title: reminder.title,
      due_date: normalizedDueDate,
      notes: reminder.notes,
      completed: reminder.completed,
      recipient_phone: reminder.recipientPhone,
      recipient_email: reminder.recipientEmail,
    }, 'insert');
    if (error) {
      setReminders(prev => prev.filter(r => r.id !== optimisticId));
      console.error('Error adding reminder:', error);
      throw error;
    }

    if (!data) {
      setReminders(prev => prev.filter(r => r.id !== optimisticId));
      throw new Error('Reminder insert succeeded but no row was returned.');
    }

    const insertedReminder = dbToReminder(data);
    setReminders(prev => prev.map(r => (r.id === optimisticId ? insertedReminder : r)));

    try {
      await scheduleLocalReminderNotification(insertedReminder);
    } catch (notificationError) {
      console.warn('Failed to schedule local reminder notification:', notificationError);
    }

    return insertedReminder;
  }, [householdId]);

  const updateReminder = useCallback(async (id: string, updates: Partial<Reminder>) => {
    const previousReminder = reminders.find(r => r.id === id);
    if (!previousReminder) {
      throw new Error('Reminder not found.');
    }

    const nextReminder: Reminder = { ...previousReminder, ...updates };

    setReminders(prev => prev.map(r => (r.id === id ? { ...r, ...updates } : r)));

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.dueDate !== undefined) updateData.due_date = normalizeReminderDueDate(updates.dueDate);
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.completed !== undefined) updateData.completed = updates.completed;
    if (updates.recipientPhone !== undefined) updateData.recipient_phone = updates.recipientPhone;
    if (updates.recipientEmail !== undefined) updateData.recipient_email = updates.recipientEmail;
    if (updates.propertyId !== undefined) updateData.property_id = updates.propertyId;

    const { error } = await supabase.from('reminders').update(updateData).eq('id', id);
    if (error) {
      setReminders(prev => prev.map(r => (r.id === id ? previousReminder : r)));
      console.error('Error updating reminder:', error);
      throw error;
    }

    try {
      await syncLocalReminderNotification(nextReminder);
    } catch (notificationError) {
      console.warn('Failed to sync local reminder notification:', notificationError);
    }
  }, [reminders]);

  const deleteReminder = useCallback(async (id: string) => {
    const snapshot = reminders;
    setReminders(prev => prev.filter(r => r.id !== id));

    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) {
      setReminders(snapshot);
      console.error('Error deleting reminder:', error);
      throw error;
    }

    try {
      await cancelLocalReminderNotification(id);
    } catch (notificationError) {
      console.warn('Failed to cancel local reminder notification:', notificationError);
    }
  }, [reminders]);

  // Property Photo CRUD operations
  const addPropertyPhoto = useCallback(async (photo: PropertyPhoto): Promise<PropertyPhoto> => {
    if (!householdId) {
      throw new Error('No household selected. Please create or join a household first.');
    }

    if (!user?.id) {
      throw new Error('No authenticated user found. Please sign in again and retry.');
    }

    const optimisticId = `tmp_photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimisticPhoto: PropertyPhoto = { ...photo, id: optimisticId };
    setPropertyPhotos(prev => prev.some(p => p.id === optimisticId) ? prev : [optimisticPhoto, ...prev]);

    let uploadedUri = photo.uri;
    try {
      uploadedUri = await uploadImageToStorage(
        photo.uri,
        [PROPERTY_MEDIA_BUCKET],
        householdId,
        'property_photo'
      );
    } catch (uploadError) {
      setPropertyPhotos(prev => prev.filter(p => p.id !== optimisticId));
      console.error('Property photo upload failed:', uploadError);
      throw new Error('Failed to upload photo to cloud storage. Please try again.');
    }

    const photoInsertPayload = sanitizeTablePayload('property_photos', {
      id: createInsertId('photo'),
      user_id: user.id,
      property_id: photo.propertyId,
      uri: uploadedUri,
      caption: photo.caption,
    });

    const { data, error } = await supabase.from('property_photos').insert(photoInsertPayload).select('*').single();
    if (error) {
      setPropertyPhotos(prev => prev.filter(p => p.id !== optimisticId));
      console.error('Error adding property photo:', error);
      throw error;
    }

    if (!data) {
      setPropertyPhotos(prev => prev.filter(p => p.id !== optimisticId));
      throw new Error('Photo insert succeeded but no row was returned.');
    }

    const insertedPhoto = dbToPropertyPhoto(data);
    setPropertyPhotos(prev => prev.map(p => (p.id === optimisticId ? insertedPhoto : p)));

    return insertedPhoto;
  }, [householdId]);

  const deletePropertyPhoto = useCallback(async (id: string) => {
    const snapshot = propertyPhotos;
    setPropertyPhotos(prev => prev.filter(photo => photo.id !== id));

    const { error } = await supabase.from('property_photos').delete().eq('id', id);
    if (error) {
      setPropertyPhotos(snapshot);
      console.error('Error deleting property photo:', error);
      throw error;
    }
  }, [propertyPhotos]);

  const updatePropertyPhoto = useCallback(async (id: string, updates: Partial<PropertyPhoto>) => {
    const previousPhoto = propertyPhotos.find(photo => photo.id === id);
    if (!previousPhoto) return;

    setPropertyPhotos(prev => prev.map(photo => (photo.id === id ? { ...photo, ...updates } : photo)));

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.caption !== undefined) updateData.caption = updates.caption;
    if (updates.uri !== undefined) updateData.uri = updates.uri;
    if (updates.propertyId !== undefined) updateData.property_id = updates.propertyId;

    const safeUpdateData = sanitizeTablePayload('property_photos', updateData);

    const { data, error } = await supabase
      .from('property_photos')
      .update(safeUpdateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      setPropertyPhotos(prev => prev.map(photo => (photo.id === id ? previousPhoto : photo)));
      console.error('Error updating property photo:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Photo update succeeded but no row was returned.');
    }

    const updatedPhoto = dbToPropertyPhoto(data);
    setPropertyPhotos(prev => prev.map(photo => (photo.id === id ? updatedPhoto : photo)));
  }, [propertyPhotos]);

  const addContact = useCallback(async (contact: PortfolioContact): Promise<PortfolioContact> => {
    if (!householdId) {
      throw new Error('No household selected. Please create or join a household first.');
    }

    if (!user?.id) {
      throw new Error('No authenticated user found. Please sign in again and retry.');
    }

    const optimisticId = `tmp_contact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimisticContact: PortfolioContact = { ...contact, id: optimisticId };
    setContacts(prev => [...prev, optimisticContact].sort((a, b) => a.name.localeCompare(b.name)));

    const { data, error } = await supabase.from('household_contacts').insert(compactPayload({
      household_id: householdId,
      user_id: user.id,
      name: contact.name.trim(),
      category: normalizeContactCategory(contact.category),
      phone_numbers: normalizeContactPhoneNumbers(contact.phoneNumbers),
      company: contact.company?.trim() || undefined,
      email: contact.email?.trim() || undefined,
      address: contact.address?.trim() || undefined,
      tags: normalizeTags(contact.tags),
      notes: contact.notes?.trim() || undefined,
    })).select('*').single();

    if (error) {
      setContacts(prev => prev.filter(item => item.id !== optimisticId));
      console.error('Error adding contact:', error);
      throw error;
    }

    if (!data) {
      setContacts(prev => prev.filter(item => item.id !== optimisticId));
      throw new Error('Contact insert succeeded but no row was returned.');
    }

    const insertedContact = dbToContact(data);
    setContacts(prev => prev.map(item => item.id === optimisticId ? insertedContact : item).sort((a, b) => a.name.localeCompare(b.name)));
    return insertedContact;
  }, [householdId, user?.id]);

  const updateContact = useCallback(async (id: string, updates: Partial<PortfolioContact>) => {
    const previousContact = contacts.find(contact => contact.id === id);
    if (!previousContact) {
      throw new Error('Contact not found.');
    }

    const optimisticContact = { ...previousContact, ...updates };
    setContacts(prev => prev.map(contact => contact.id === id ? optimisticContact : contact).sort((a, b) => a.name.localeCompare(b.name)));

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.category !== undefined) updateData.category = normalizeContactCategory(updates.category);
    if (updates.phoneNumbers !== undefined) updateData.phone_numbers = normalizeContactPhoneNumbers(updates.phoneNumbers);
    if (updates.company !== undefined) updateData.company = updates.company.trim() || null;
    if (updates.email !== undefined) updateData.email = updates.email.trim() || null;
    if (updates.address !== undefined) updateData.address = updates.address.trim() || null;
    if (updates.tags !== undefined) updateData.tags = normalizeTags(updates.tags);
    if (updates.notes !== undefined) updateData.notes = updates.notes.trim() || null;

    const { data, error } = await supabase
      .from('household_contacts')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      setContacts(prev => prev.map(contact => contact.id === id ? previousContact : contact).sort((a, b) => a.name.localeCompare(b.name)));
      console.error('Error updating contact:', error);
      throw error;
    }

    if (data) {
      const updatedContact = dbToContact(data);
      setContacts(prev => prev.map(contact => contact.id === id ? updatedContact : contact).sort((a, b) => a.name.localeCompare(b.name)));
    }
  }, [contacts]);

  const deleteContact = useCallback(async (id: string) => {
    const snapshot = contacts;
    setContacts(prev => prev.filter(contact => contact.id !== id));

    const { error } = await supabase.from('household_contacts').delete().eq('id', id);
    if (error) {
      setContacts(snapshot);
      console.error('Error deleting contact:', error);
      throw error;
    }
  }, [contacts]);

  // Lease Folder CRUD operations
  const addLeaseFolder = useCallback(async (folder: LeaseFolder): Promise<LeaseFolder> => {
    if (!householdId) {
      throw new Error('No household selected. Please create or join a household first.');
    }

    if (!user?.id) {
      throw new Error('No authenticated user found. Please sign in again and retry.');
    }

    const optimisticId = `tmp_folder_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimisticFolder: LeaseFolder = {
      ...folder,
      id: optimisticId,
      createdAt: folder.createdAt || new Date().toISOString(),
    };
    setLeaseFolders(prev => prev.some(f => f.id === optimisticId) ? prev : [...prev, optimisticFolder]);

    const { data, error } = await retryMissingColumnOperation<LeaseFolder>('lease_folders', {
      user_id: user.id,
      household_id: householdId,
      property_id: folder.propertyId,
      name: folder.name,
      color: folder.color,
    }, 'insert');
    if (error) {
      setLeaseFolders(prev => prev.filter(f => f.id !== optimisticId));
      console.error('Error adding lease folder:', error);
      throw error;
    }

    if (!data) {
      setLeaseFolders(prev => prev.filter(f => f.id !== optimisticId));
      throw new Error('Lease folder insert succeeded but no row was returned.');
    }

    const insertedFolder = dbToLeaseFolder(data);
    setLeaseFolders(prev => prev.map(f => (f.id === optimisticId ? insertedFolder : f)));
    return insertedFolder;
  }, [householdId, user?.id]);

  const updateLeaseFolder = useCallback(async (id: string, updates: Partial<LeaseFolder>) => {
    const previousFolder = leaseFolders.find(folder => folder.id === id);
    if (!previousFolder) {
      throw new Error('Folder not found.');
    }

    setLeaseFolders(prev => prev.map(folder => (folder.id === id ? { ...folder, ...updates } : folder)));

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.color !== undefined) updateData.color = updates.color;

    const { error } = await supabase.from('lease_folders').update(updateData).eq('id', id);
    if (error) {
      setLeaseFolders(prev => prev.map(folder => (folder.id === id ? previousFolder : folder)));
      console.error('Error updating lease folder:', error);
      throw error;
    }
  }, [leaseFolders]);

  const reorderLeaseFolders = useCallback(async (reorderedFolders: LeaseFolder[]) => {
    // Supabase doesn't have built-in reordering; we'd need an order column.
    // For now, we just update each folder's position if an order field existed.
    // This is a no-op with the current schema but maintains API compatibility.
  }, []);

  const deleteLeaseFolder = useCallback(async (id: string) => {
    const leaseFoldersSnapshot = leaseFolders;
    const leaseDocumentsSnapshot = leaseDocuments;

    setLeaseFolders(prev => prev.filter(folder => folder.id !== id));
    setLeaseDocuments(prev => prev.filter(document => document.folderId !== id));

    const { error } = await supabase.from('lease_folders').delete().eq('id', id);
    if (error) {
      setLeaseFolders(leaseFoldersSnapshot);
      setLeaseDocuments(leaseDocumentsSnapshot);
      console.error('Error deleting lease folder:', error);
      throw error;
    }
  }, [leaseFolders, leaseDocuments]);

  // Lease Document CRUD operations
  const addLeaseDocument = useCallback(async (document: LeaseDocument): Promise<LeaseDocument> => {
    if (!householdId) {
      throw new Error('No household selected. Please create or join a household first.');
    }

    if (!user?.id) {
      throw new Error('No authenticated user found. Please sign in again and retry.');
    }

    const optimisticId = `tmp_doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();
    const optimisticDocument: LeaseDocument = {
      ...document,
      id: optimisticId,
      createdAt: document.createdAt || nowIso,
      updatedAt: document.updatedAt || nowIso,
    };
    setLeaseDocuments(prev => prev.some(d => d.id === optimisticId) ? prev : [optimisticDocument, ...prev]);

    const savedOriginalImageUri = document.originalImageUri;

    const { data, error } = await retryMissingColumnOperation<LeaseDocument>('lease_documents', {
      user_id: user.id,
      household_id: householdId,
      property_id: document.propertyId,
      folder_id: document.folderId || null,
      type: document.type,
      title: document.title,
      content: document.content,
      original_image_uri: savedOriginalImageUri,
      tags: document.tags,
      tenant_name: document.tenantName,
      date_of_document: normalizeOptionalDate(document.dateOfDocument),
      notes: document.notes,
    }, 'insert');
    if (error) {
      setLeaseDocuments(prev => prev.filter(d => d.id !== optimisticId));
      console.error('Error adding lease document:', error);
      throw error;
    }

    if (!data) {
      setLeaseDocuments(prev => prev.filter(d => d.id !== optimisticId));
      throw new Error('Lease document insert succeeded but no row was returned.');
    }

    const insertedDocument = dbToLeaseDocument(data);
    setLeaseDocuments(prev => prev.map(d => (d.id === optimisticId ? insertedDocument : d)));

    return insertedDocument;
  }, [householdId, user?.id]);

  const updateLeaseDocument = useCallback(async (id: string, updates: Partial<LeaseDocument>) => {
    const previousDocument = leaseDocuments.find(document => document.id === id);
    if (!previousDocument) {
      throw new Error('Document not found.');
    }

    setLeaseDocuments(prev => prev.map(document => (document.id === id ? { ...document, ...updates } : document)));

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.originalImageUri !== undefined) updateData.original_image_uri = updates.originalImageUri;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.tenantName !== undefined) updateData.tenant_name = updates.tenantName;
    if (updates.dateOfDocument !== undefined) updateData.date_of_document = normalizeOptionalDate(updates.dateOfDocument);
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.folderId !== undefined) updateData.folder_id = updates.folderId || null;
    if (updates.propertyId !== undefined) updateData.property_id = updates.propertyId;

    const { error } = await supabase.from('lease_documents').update(updateData).eq('id', id);
    if (error) {
      setLeaseDocuments(prev => prev.map(document => (document.id === id ? previousDocument : document)));
      console.error('Error updating lease document:', error);
      throw error;
    }
  }, [leaseDocuments]);

  const deleteLeaseDocument = useCallback(async (id: string) => {
    const snapshot = leaseDocuments;
    setLeaseDocuments(prev => prev.filter(document => document.id !== id));

    const { error } = await supabase.from('lease_documents').delete().eq('id', id);
    if (error) {
      setLeaseDocuments(snapshot);
      console.error('Error deleting lease document:', error);
      throw error;
    }
  }, [leaseDocuments]);

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
      // Keep URI unchanged; receipt save should not trigger a share prompt.
      return uri;
    } catch (error) {
      console.error('Error handling receipt:', error);
      return uri;
    }
  }, []);

  return {
    properties, transactions, receipts, reminders, leaseFolders, leaseDocuments, propertyPhotos, contacts,
    isLoading, isSyncing,
    addProperty, updateProperty, reorderProperties, deleteProperty,
    addTransaction, updateTransaction, deleteTransaction,
    addReceipt, updateReceipt, deleteReceipt,
    addReminder, updateReminder, deleteReminder,
    addLeaseFolder, updateLeaseFolder, deleteLeaseFolder, reorderLeaseFolders,
    addLeaseDocument, updateLeaseDocument, deleteLeaseDocument,
    addPropertyPhoto, updatePropertyPhoto, deletePropertyPhoto,
    addContact, updateContact, deleteContact,
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
