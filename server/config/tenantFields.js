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
  { id: 'preferredDate', label: 'Preferred Date', type: 'date', required: false, span: 1 },
  { id: 'pets', label: 'Do you have pets?', type: 'select', options: ['No', 'Dog', 'Cat', 'Other'], required: false, span: 1 },
  { id: 'homeSize', label: 'Home Size (sq ft)', type: 'number', required: false, span: 1, placeholder: 'e.g., 2000' },
  { id: 'serviceType', label: 'Service Type', type: 'select', options: ['One-time', 'Recurring', 'Move-out'], required: false, span: 1 },
  { id: 'notes', label: 'Additional Notes', type: 'textarea', required: false, span: 2, rows: 5, helpText: 'Anything else we should know?' }
];

function getFieldsForTenant(slug) {
  if (!slug) return defaultFields;
  return defaultFields;
}

module.exports = {
  getFieldsForTenant
};

