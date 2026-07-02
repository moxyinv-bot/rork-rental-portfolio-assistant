import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Property, Transaction, Receipt, Reminder, LeaseFolder, LeaseDocument, PropertyPhoto } from '@/types/property';
import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

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

const STORAGE_KEYS = {
  PROPERTIES: 'portfolio_properties',
  TRANSACTIONS: 'portfolio_transactions',
  RECEIPTS: 'portfolio_receipts',
  REMINDERS: 'portfolio_reminders',
  LEASE_FOLDERS: 'portfolio_lease_folders',
  LEASE_DOCUMENTS: 'portfolio_lease_documents',
  PROPERTY_PHOTOS: 'portfolio_property_photos'
};

export const [PortfolioProvider, usePortfolio] = createContextHook(() => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [leaseFolders, setLeaseFolders] = useState<LeaseFolder[]>([]);
  const [leaseDocuments, setLeaseDocuments] = useState<LeaseDocument[]>([]);
  const [propertyPhotos, setPropertyPhotos] = useState<PropertyPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from AsyncStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading portfolio data from AsyncStorage...');
        const [propertiesData, transactionsData, receiptsData, remindersData, leaseFoldersData, leaseDocumentsData, propertyPhotosData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.PROPERTIES),
          AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS),
          AsyncStorage.getItem(STORAGE_KEYS.RECEIPTS),
          AsyncStorage.getItem(STORAGE_KEYS.REMINDERS),
          AsyncStorage.getItem(STORAGE_KEYS.LEASE_FOLDERS),
          AsyncStorage.getItem(STORAGE_KEYS.LEASE_DOCUMENTS),
          AsyncStorage.getItem(STORAGE_KEYS.PROPERTY_PHOTOS)
        ]);

        console.log('Raw data loaded:', {
          properties: propertiesData ? 'found' : 'empty',
          transactions: transactionsData ? 'found' : 'empty',
          receipts: receiptsData ? 'found' : 'empty',
          reminders: remindersData ? 'found' : 'empty',
          leaseFolders: leaseFoldersData ? 'found' : 'empty',
          leaseDocuments: leaseDocumentsData ? 'found' : 'empty',
          propertyPhotos: propertyPhotosData ? 'found' : 'empty'
        });

        if (propertiesData) {
          const parsed = JSON.parse(propertiesData);
          console.log('Loaded properties:', parsed.length);
          setProperties(parsed);
        }
        if (transactionsData) {
          const parsed = JSON.parse(transactionsData);
          console.log('Loaded transactions:', parsed.length);
          setTransactions(parsed);
        }
        if (receiptsData) {
          const parsed = JSON.parse(receiptsData);
          console.log('Loaded receipts:', parsed.length);
          setReceipts(parsed);
        }
        if (remindersData) {
          const parsed = JSON.parse(remindersData);
          console.log('Loaded reminders:', parsed.length);
          setReminders(parsed);
        }
        if (leaseFoldersData) {
          const parsed = JSON.parse(leaseFoldersData);
          console.log('Loaded lease folders:', parsed.length);
          setLeaseFolders(parsed);
        }
        if (leaseDocumentsData) {
          const parsed = JSON.parse(leaseDocumentsData);
          console.log('Loaded lease documents:', parsed.length);
          setLeaseDocuments(parsed);
        }
        if (propertyPhotosData) {
          const parsed = JSON.parse(propertyPhotosData);
          console.log('Loaded property photos:', parsed.length);
          setPropertyPhotos(parsed);
        }
      } catch (error) {
        console.error('Error loading portfolio data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Save data to AsyncStorage
  const saveProperties = useCallback(async (newProperties: Property[]) => {
    try {
      console.log('Saving properties:', newProperties.length);
      await AsyncStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(newProperties));
      setProperties(newProperties);
      console.log('Properties saved successfully');
    } catch (error) {
      console.error('Error saving properties:', error);
      throw error;
    }
  }, []);

  const saveTransactions = useCallback(async (newTransactions: Transaction[]) => {
    try {
      console.log('Saving transactions:', newTransactions.length);
      await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(newTransactions));
      setTransactions(newTransactions);
      console.log('Transactions saved successfully');
    } catch (error) {
      console.error('Error saving transactions:', error);
      throw error;
    }
  }, []);

  const saveReceipts = useCallback(async (newReceipts: Receipt[]) => {
    try {
      console.log('Saving receipts:', newReceipts.length);
      await AsyncStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(newReceipts));
      setReceipts(newReceipts);
      console.log('Receipts saved successfully');
    } catch (error) {
      console.error('Error saving receipts:', error);
      throw error;
    }
  }, []);

  const saveReminders = useCallback(async (newReminders: Reminder[]) => {
    try {
      console.log('Saving reminders:', newReminders.length);
      await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(newReminders));
      setReminders(newReminders);
      console.log('Reminders saved successfully');
    } catch (error) {
      console.error('Error saving reminders:', error);
      throw error;
    }
  }, []);

  const saveLeaseFolders = useCallback(async (newLeaseFolders: LeaseFolder[]) => {
    try {
      console.log('Saving lease folders:', newLeaseFolders.length);
      await AsyncStorage.setItem(STORAGE_KEYS.LEASE_FOLDERS, JSON.stringify(newLeaseFolders));
      setLeaseFolders(newLeaseFolders);
      console.log('Lease folders saved successfully');
    } catch (error) {
      console.error('Error saving lease folders:', error);
      throw error;
    }
  }, []);

  const saveLeaseDocuments = useCallback(async (newLeaseDocuments: LeaseDocument[]) => {
    try {
      console.log('Saving lease documents:', newLeaseDocuments.length);
      await AsyncStorage.setItem(STORAGE_KEYS.LEASE_DOCUMENTS, JSON.stringify(newLeaseDocuments));
      setLeaseDocuments(newLeaseDocuments);
      console.log('Lease documents saved successfully');
    } catch (error) {
      console.error('Error saving lease documents:', error);
      throw error;
    }
  }, []);

  const savePropertyPhotos = useCallback(async (newPhotos: PropertyPhoto[]) => {
    try {
      console.log('Saving property photos:', newPhotos.length);
      await AsyncStorage.setItem(STORAGE_KEYS.PROPERTY_PHOTOS, JSON.stringify(newPhotos));
      setPropertyPhotos(newPhotos);
      console.log('Property photos saved successfully');
    } catch (error) {
      console.error('Error saving property photos:', error);
      throw error;
    }
  }, []);

  // Property CRUD operations
  const addProperty = useCallback(async (property: Property) => {
    try {
      console.log('Adding property:', property.name);
      const newProperties = [...properties, property];
      await saveProperties(newProperties);
    } catch (error) {
      console.error('Error adding property:', error);
      throw error;
    }
  }, [properties, saveProperties]);

  const updateProperty = useCallback((id: string, updates: Partial<Property>) => {
    const newProperties = properties.map(p => 
      p.id === id ? { ...p, ...updates } : p
    );
    saveProperties(newProperties);
  }, [properties, saveProperties]);

  const deleteProperty = useCallback((id: string) => {
    const newProperties = properties.filter(p => p.id !== id);
    saveProperties(newProperties);
    // Also delete related transactions, receipts, and reminders
    saveTransactions(transactions.filter(t => t.propertyId !== id));
    saveReceipts(receipts.filter(r => r.propertyId !== id));
    saveReminders(reminders.filter(r => r.propertyId !== id));
    savePropertyPhotos(propertyPhotos.filter(p => p.propertyId !== id));
  }, [properties, transactions, receipts, reminders, propertyPhotos, saveProperties, saveTransactions, saveReceipts, saveReminders, savePropertyPhotos]);

  // Transaction CRUD operations
  const addTransaction = useCallback(async (transaction: Transaction) => {
    try {
      console.log('Adding transaction:', transaction.description);
      const newTransactions = [...transactions, transaction];
      await saveTransactions(newTransactions);
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }, [transactions, saveTransactions]);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    const newTransactions = transactions.map(t => 
      t.id === id ? { ...t, ...updates } : t
    );
    saveTransactions(newTransactions);
  }, [transactions, saveTransactions]);

  const deleteTransaction = useCallback((id: string) => {
    const newTransactions = transactions.filter(t => t.id !== id);
    saveTransactions(newTransactions);
  }, [transactions, saveTransactions]);

  // Receipt CRUD operations
  const addReceipt = useCallback(async (receipt: Receipt) => {
    try {
      console.log('Adding receipt for property:', receipt.propertyId);
      const newReceipts = [...receipts, receipt];
      await saveReceipts(newReceipts);
      
      // Automatically create a transaction from the receipt if it has amount and category
      if (receipt.amount && receipt.category) {
        const receiptTransaction: Transaction = {
          id: `receipt-${receipt.id}`,
          propertyId: receipt.propertyId,
          type: 'expense',
          category: receipt.category,
          amount: receipt.amount,
          date: receipt.date,
          description: receipt.vendor ? `Receipt from ${receipt.vendor}` : 'Receipt expense',
          receiptUri: receipt.uri,
          tags: receipt.tags || []
        };
        
        console.log('Creating transaction from receipt:', receiptTransaction);
        const newTransactions = [...transactions, receiptTransaction];
        await saveTransactions(newTransactions);
      }
    } catch (error) {
      console.error('Error adding receipt:', error);
      throw error;
    }
  }, [receipts, transactions, saveReceipts, saveTransactions]);

  const updateReceipt = useCallback(async (id: string, updates: Partial<Receipt>) => {

    const newReceipts = receipts.map(r => 
      r.id === id ? { ...r, ...updates } : r
    );
    await saveReceipts(newReceipts);
    
    // Update or create corresponding transaction
    const updatedReceipt = newReceipts.find(r => r.id === id);
    if (updatedReceipt && updatedReceipt.amount && updatedReceipt.category) {
      const transactionId = `receipt-${id}`;
      const existingTransaction = transactions.find(t => t.id === transactionId);
      
      const receiptTransaction: Transaction = {
        id: transactionId,
        propertyId: updatedReceipt.propertyId,
        type: 'expense',
        category: updatedReceipt.category,
        amount: updatedReceipt.amount,
        date: updatedReceipt.date,
        description: updatedReceipt.vendor ? `Receipt from ${updatedReceipt.vendor}` : 'Receipt expense',
        receiptUri: updatedReceipt.uri,
        tags: updatedReceipt.tags || []
      };
      
      if (existingTransaction) {
        const newTransactions = transactions.map(t => 
          t.id === transactionId ? receiptTransaction : t
        );
        await saveTransactions(newTransactions);
      } else {
        const newTransactions = [...transactions, receiptTransaction];
        await saveTransactions(newTransactions);
      }
    }
  }, [receipts, transactions, saveReceipts, saveTransactions]);

  const deleteReceipt = useCallback(async (id: string) => {
    const newReceipts = receipts.filter(r => r.id !== id);
    await saveReceipts(newReceipts);
    
    // Also delete the corresponding transaction if it exists
    const transactionId = `receipt-${id}`;
    const newTransactions = transactions.filter(t => t.id !== transactionId);
    await saveTransactions(newTransactions);
  }, [receipts, transactions, saveReceipts, saveTransactions]);

  // Reminder CRUD operations
  const addReminder = useCallback(async (reminder: Reminder) => {
    try {
      console.log('Adding reminder:', reminder.title);
      const newReminders = [...reminders, reminder];
      await saveReminders(newReminders);
    } catch (error) {
      console.error('Error adding reminder:', error);
      throw error;
    }
  }, [reminders, saveReminders]);

  const updateReminder = useCallback((id: string, updates: Partial<Reminder>) => {
    const newReminders = reminders.map(r => 
      r.id === id ? { ...r, ...updates } : r
    );
    saveReminders(newReminders);
  }, [reminders, saveReminders]);

  const deleteReminder = useCallback((id: string) => {
    const newReminders = reminders.filter(r => r.id !== id);
    saveReminders(newReminders);
  }, [reminders, saveReminders]);

  // Property Photo CRUD operations
  const addPropertyPhoto = useCallback(async (photo: PropertyPhoto) => {
    try {
      console.log('Adding property photo:', photo.caption || 'untitled');
      const newPhotos = [...propertyPhotos, photo];
      await savePropertyPhotos(newPhotos);
    } catch (error) {
      console.error('Error adding property photo:', error);
      throw error;
    }
  }, [propertyPhotos, savePropertyPhotos]);

  const deletePropertyPhoto = useCallback(async (id: string) => {
    const newPhotos = propertyPhotos.filter(p => p.id !== id);
    await savePropertyPhotos(newPhotos);
  }, [propertyPhotos, savePropertyPhotos]);

  // Lease Folder CRUD operations
  const addLeaseFolder = useCallback(async (folder: LeaseFolder) => {
    try {
      console.log('Adding lease folder:', folder.name);
      const newFolders = [...leaseFolders, folder];
      await saveLeaseFolders(newFolders);
    } catch (error) {
      console.error('Error adding lease folder:', error);
      throw error;
    }
  }, [leaseFolders, saveLeaseFolders]);

  const updateLeaseFolder = useCallback(async (id: string, updates: Partial<LeaseFolder>) => {
    const newFolders = leaseFolders.map(f => 
      f.id === id ? { ...f, ...updates } : f
    );
    await saveLeaseFolders(newFolders);
  }, [leaseFolders, saveLeaseFolders]);

  const reorderLeaseFolders = useCallback(async (reorderedFolders: LeaseFolder[]) => {
    await saveLeaseFolders(reorderedFolders);
  }, [saveLeaseFolders]);

  const deleteLeaseFolder = useCallback(async (id: string) => {
    const newFolders = leaseFolders.filter(f => f.id !== id);
    await saveLeaseFolders(newFolders);
    // Also delete all documents in this folder
    const newDocuments = leaseDocuments.filter(d => d.folderId !== id);
    await saveLeaseDocuments(newDocuments);
  }, [leaseFolders, leaseDocuments, saveLeaseFolders, saveLeaseDocuments]);

  // Lease Document CRUD operations
  const addLeaseDocument = useCallback(async (document: LeaseDocument) => {
    try {
      console.log('Adding lease document:', document.title);
      const newDocuments = [...leaseDocuments, document];
      await saveLeaseDocuments(newDocuments);
    } catch (error) {
      console.error('Error adding lease document:', error);
      throw error;
    }
  }, [leaseDocuments, saveLeaseDocuments]);

  const updateLeaseDocument = useCallback((id: string, updates: Partial<LeaseDocument>) => {
    const newDocuments = leaseDocuments.map(d => 
      d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
    );
    saveLeaseDocuments(newDocuments);
  }, [leaseDocuments, saveLeaseDocuments]);

  const deleteLeaseDocument = useCallback((id: string) => {
    const newDocuments = leaseDocuments.filter(d => d.id !== id);
    saveLeaseDocuments(newDocuments);
  }, [leaseDocuments, saveLeaseDocuments]);

  // OCR functionality using AI API
  const extractTextFromImage = useCallback(async (imageUri: string): Promise<string> => {
    try {
      console.log('Extracting text from image using OCR...');
      
      // Read the image file and convert to base64
      if (Platform.OS === 'web') {
        throw new Error('OCR is not available on web');
      }
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Use the AI API to extract text from the image
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please extract all text from this image. This appears to be a lease agreement or legal document. Return only the extracted text, maintaining the original formatting and structure as much as possible.'
                },
                {
                  type: 'image',
                  image: base64Image
                }
              ]
            }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error(`OCR API request failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('OCR extraction completed successfully');
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
      if (!document) {
        throw new Error('Document not found');
      }
      
      const property = properties.find(p => p.id === document.propertyId);
      const folder = leaseFolders.find(f => f.id === document.folderId);
      
      // Create formatted document content
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
        await FileSystem.writeAsStringAsync(uri, formattedContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        
        try {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
              mimeType: 'text/plain',
              dialogTitle: 'Save Document - Choose where to save'
            });
          } else {
            Alert.alert(
              'Export Complete',
              `Document exported successfully!\n\nFile saved to: ${uri}`,
              [{ text: 'OK' }]
            );
          }
        } catch (shareErr) {
          console.log('Sharing not available:', shareErr);
          Alert.alert('Export Complete', `Document saved to: ${uri}`);
        }
      }
      
      console.log('Document exported successfully:', filename);
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
        return t.type === 'income' && 
               date.getFullYear() === currentYear && 
               date.getMonth() === currentMonth;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlyExpenses = transactions
      .filter(t => {
        const date = parseTransactionDate(t.date);
        return t.type === 'expense' && 
               date.getFullYear() === currentYear && 
               date.getMonth() === currentMonth;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    const netCashFlow = totalMonthlyRent - totalMortgagePayment;
    const ytdProfit = ytdIncome - ytdExpenses;
    const monthlyProfit = monthlyIncome - monthlyExpenses;
    
    return {
      totalProperties,
      totalValue,
      totalMonthlyRent,
      totalMortgagePayment,
      netCashFlow,
      ytdIncome,
      ytdExpenses,
      ytdProfit,
      monthlyIncome,
      monthlyExpenses,
      monthlyProfit
    };
  }, [properties, transactions]);

  // Get upcoming reminders
  const upcomingReminders = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    return reminders
      .filter(r => !r.completed && new Date(r.dueDate) <= thirtyDaysFromNow)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [reminders]);

  // Export functionality - CSV format for better compatibility
  const exportTransactionsToExcel = useCallback(async (propertyId?: string, year?: number) => {
    try {
      let transactionsToExport = transactions;
      
      // Filter by property if specified
      if (propertyId && propertyId !== 'all') {
        transactionsToExport = transactionsToExport.filter(t => t.propertyId === propertyId);
      }
      
      // Filter by year if specified
      if (year) {
        transactionsToExport = transactionsToExport.filter(t => {
          const transactionYear = parseTransactionDate(t.date).getFullYear();
          return transactionYear === year;
        });
      }
      
      // Sort by date (newest first)
      transactionsToExport.sort((a, b) => parseTransactionDate(b.date).getTime() - parseTransactionDate(a.date).getTime());
      
      // Prepare CSV data
      const csvHeaders = [
        'Date',
        'Property',
        'Property Address',
        'Type',
        'Category',
        'Description',
        'Amount',
        'Tags',
        'Receipt'
      ];
      
      const csvRows = transactionsToExport.map(transaction => {
        const property = properties.find(p => p.id === transaction.propertyId);
        const transactionDate = parseTransactionDate(transaction.date);
        
        // Make expenses negative and income positive for Excel autosum functionality
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
      
      // Generate filename
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
        try {
          const uri = FileSystem.documentDirectory + filename;
          await FileSystem.writeAsStringAsync(uri, csvContent, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          
          console.log('File saved to app directory:', uri);
          
          try {
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(uri, {
                mimeType: 'text/csv',
                dialogTitle: 'Save CSV File - Choose where to save'
              });
              console.log('File shared successfully');
            } else {
              Alert.alert(
                'Export Complete',
                `CSV file created successfully!\n\nFile saved to: ${uri}`,
                [{ text: 'OK' }]
              );
            }
          } catch (shareErr) {
            console.log('Sharing not available:', shareErr);
            Alert.alert('Export Complete', `CSV saved to: ${uri}`);
          }
        } catch (error) {
          console.error('Error creating/sharing file:', error);
          throw new Error('Failed to create or share the CSV file.');
        }
      }
      
      console.log(`Exported ${transactionsToExport.length} transactions to CSV`);
      return { success: true, count: transactionsToExport.length, filename };
    } catch (error) {
      console.error('Error exporting transactions:', error);
      throw error;
    }
  }, [transactions, properties]);

  // Save receipt/image with location choice
  const saveReceiptWithLocation = useCallback(async (uri: string, filename: string) => {
    try {
      if (Platform.OS === 'web') {
        return uri;
      }
      
      console.log('Receipt saved to app directory:', uri);
      
      try {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/jpeg',
            dialogTitle: 'Save Receipt Image'
          });
        }
      } catch (shareError) {
        console.log('Could not share receipt image:', shareError);
      }
      
      return uri;
    } catch (error) {
      console.error('Error handling receipt:', error);
      return uri; // Return original URI as fallback
    }
  }, []);

  return {
    properties,
    transactions,
    receipts,
    reminders,
    leaseFolders,
    leaseDocuments,
    propertyPhotos,
    isLoading,
    addProperty,
    updateProperty,
    deleteProperty,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addReceipt,
    updateReceipt,
    deleteReceipt,
    addReminder,
    updateReminder,
    deleteReminder,
    addLeaseFolder,
    updateLeaseFolder,
    deleteLeaseFolder,
    addLeaseDocument,
    updateLeaseDocument,
    deleteLeaseDocument,
    addPropertyPhoto,
    deletePropertyPhoto,
    extractTextFromImage,
    exportLeaseDocument,
    portfolioMetrics,
    upcomingReminders,
    exportTransactionsToExcel,
    saveReceiptWithLocation
  };
});

// Helper hooks
export function usePropertyTransactions(propertyId: string) {
  const { transactions } = usePortfolio();
  return useMemo(() => 
    transactions.filter(t => t.propertyId === propertyId),
    [transactions, propertyId]
  );
}

export function usePropertyReceipts(propertyId: string) {
  const { receipts } = usePortfolio();
  return useMemo(() => 
    receipts.filter(r => r.propertyId === propertyId),
    [receipts, propertyId]
  );
}

export function usePropertyReminders(propertyId: string) {
  const { reminders } = usePortfolio();
  return useMemo(() => 
    reminders.filter(r => r.propertyId === propertyId && !r.completed),
    [reminders, propertyId]
  );
}

export function usePropertyMetrics(propertyId: string) {
  const transactions = usePropertyTransactions(propertyId);
  
  return useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const netProfit = totalIncome - totalExpenses;
    
    const currentYear = new Date().getFullYear();
    const ytdIncome = transactions
      .filter(t => t.type === 'income' && parseTransactionDate(t.date).getFullYear() === currentYear)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const ytdExpenses = transactions
      .filter(t => t.type === 'expense' && parseTransactionDate(t.date).getFullYear() === currentYear)
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      totalIncome,
      totalExpenses,
      netProfit,
      ytdIncome,
      ytdExpenses,
      ytdProfit: ytdIncome - ytdExpenses
    };
  }, [transactions]);
}

// Helper hooks for lease management
export function usePropertyLeaseFolders(propertyId: string) {
  const { leaseFolders } = usePortfolio();
  return useMemo(() => 
    leaseFolders.filter(f => f.propertyId === propertyId),
    [leaseFolders, propertyId]
  );
}

export function useFolderDocuments(folderId: string) {
  const { leaseDocuments } = usePortfolio();
  return useMemo(() => 
    leaseDocuments.filter(d => d.folderId === folderId),
    [leaseDocuments, folderId]
  );
}

export function usePropertyLeaseDocuments(propertyId: string) {
  const { leaseDocuments } = usePortfolio();
  return useMemo(() => 
    leaseDocuments.filter(d => d.propertyId === propertyId),
    [leaseDocuments, propertyId]
  );
}

// Helper hook for property photos
export function usePropertyPhotos(propertyId: string) {
  const { propertyPhotos } = usePortfolio();
  return useMemo(() => 
    propertyPhotos.filter(p => p.propertyId === propertyId).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    [propertyPhotos, propertyId]
  );
}