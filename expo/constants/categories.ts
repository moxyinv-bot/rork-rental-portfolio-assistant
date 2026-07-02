export const EXPENSE_CATEGORIES = [
  'Mortgage',
  'Insurance',
  'Property Tax',
  'HOA Fees',
  'Utilities',
  'Maintenance',
  'Repairs',
  'Landscaping',
  'Cleaning',
  'Supplies',
  'Advertising',
  'Legal Fees',
  'Property Management',
  'Capital Improvements',
  'Other'
] as const;

export const INCOME_CATEGORIES = [
  'Rent',
  'Late Fees',
  'Pet Rent',
  'Parking',
  'Storage',
  'Laundry',
  'Other'
] as const;

export const PROPERTY_TYPES = [
  { value: 'single-family', label: 'Single Family' },
  { value: 'multi-family', label: 'Multi Family' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'apartment', label: 'Apartment' }
] as const;

export const REMINDER_TYPES = [
  { value: 'mortgage', label: 'Mortgage Renewal', color: '#3B82F6' },
  { value: 'insurance', label: 'Insurance Renewal', color: '#10B981' },
  { value: 'lease', label: 'Lease Renewal', color: '#F59E0B' },
  { value: 'maintenance', label: 'Maintenance', color: '#8B5CF6' },
  { value: 'other', label: 'Other', color: '#6B7280' }
] as const;

export const APPLIANCE_TYPES = [
  'Refrigerator',
  'Stove/Range',
  'Dishwasher',
  'Microwave',
  'Washer',
  'Dryer',
  'Water Heater',
  'HVAC',
  'Garbage Disposal',
  'Other'
] as const;

export const PAINT_FINISHES = [
  'Flat',
  'Eggshell',
  'Satin',
  'Semi-Gloss',
  'Gloss'
] as const;