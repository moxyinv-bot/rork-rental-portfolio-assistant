export interface Appliance {
  id: string;
  name: string;
  model: string;
  type: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  notes?: string;
}

export interface PaintColor {
  id: string;
  room: string;
  brand: string;
  color: string;
  finish: string;
  purchaseDate?: string;
  notes?: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  type: 'single-family' | 'multi-family' | 'condo' | 'townhouse' | 'apartment';
  purchaseDate: string;
  purchasePrice: number;
  currentValue?: number;
  monthlyRent: number;
  tenantName?: string;
  tenantContact?: string;
  leaseStart?: string;
  leaseEnd?: string;
  mortgageAmount?: number;
  mortgagePayment?: number;
  mortgageRenewalDate?: string;
  insuranceProvider?: string;
  insurancePolicy?: string;
  insuranceRenewalDate?: string;
  insurancePremium?: number;
  propertyTax?: number;
  appliances: Appliance[];
  paintColors: PaintColor[];
  acCapacitorSize?: string;
  acFilterSize?: string;
  paintColorsInside?: string;
  paintColorsOutside?: string;
  waterHeaterInfo?: string;
  applianceInfo?: string;
  notes?: string;
  imageUri?: string;
}

export interface Transaction {
  id: string;
  propertyId: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  description: string;
  receiptUri?: string;
  tags: string[];
}

export interface Receipt {
  id: string;
  propertyId: string;
  transactionId?: string;
  uri: string;
  date: string;
  amount?: number;
  vendor?: string;
  category?: string;
  tags: string[];
  notes?: string;
}

export interface Reminder {
  id: string;
  propertyId: string;
  type: 'mortgage' | 'insurance' | 'lease' | 'maintenance' | 'other';
  title: string;
  dueDate: string;
  notes?: string;
  completed: boolean;
  recipientPhone?: string;
  recipientEmail?: string;
}

export interface PropertyPhoto {
  id: string;
  propertyId: string;
  uri: string;
  caption: string;
  date: string;
}

export interface LeaseFolder {
  id: string;
  name: string;
  propertyId: string;
  color: string;
  createdAt: string;
}

export interface LeaseDocument {
  id: string;
  folderId: string;
  propertyId: string;
  type: 'lease' | 'communication' | 'notice' | 'other';
  title: string;
  content: string;
  originalImageUri?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  tenantName?: string;
  dateOfDocument?: string;
  notes?: string;
}