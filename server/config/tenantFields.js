/**
 * Hardcoded per-tenant field definitions for estimate/inquiry forms.
 * Each tenantSlug maps to an array of fields:
 * {
 *   id: string (key in customFields),
 *   label: string,
 *   type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'date' | 'number',
 *   required: boolean,
 *   options?: string[] (for select/checkbox),
 *   helperText?: string,
 * }
 */

const defaultFields = [
  { id: 'preferredDate', label: 'Preferred Date', type: 'date', required: false },
  { id: 'pets', label: 'Do you have pets?', type: 'select', options: ['No', 'Dog', 'Cat', 'Other'], required: false },
  { id: 'homeSize', label: 'Home Size (sq ft)', type: 'number', required: false },
  { id: 'serviceType', label: 'Service Type', type: 'select', options: ['One-time', 'Recurring', 'Move-out'], required: true },
  { id: 'notes', label: 'Additional Notes', type: 'textarea', required: false }
];

const tenantFieldConfig = {
  // Example per-tenant override; add more as needed
  default: defaultFields,
  'pet-hospital-newport-9225': [
    { id: 'preferredDate', label: 'Preferred Date', type: 'date', required: false },
    { id: 'pets', label: 'Do you have pets?', type: 'select', options: ['No', 'Dog', 'Cat', 'Other'], required: false },
    { id: 'notes', label: 'Additional Notes', type: 'textarea', required: false }
  ]
  // 'another-tenant-slug': [...fields],
};

function getFieldsForTenant(slug) {
  if (!slug) return defaultFields;
  return tenantFieldConfig[slug] || defaultFields;
}

module.exports = {
  getFieldsForTenant
};

