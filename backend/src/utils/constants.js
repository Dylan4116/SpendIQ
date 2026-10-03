// This project uses ES modules; package.json must contain: "type": "module".

export const CATEGORIES = Object.freeze([
  'FOOD', 'CLOTHING', 'FUEL', 'ELECTRONICS', 'ENTERTAINMENT',
  'HEALTHCARE', 'TRAVEL', 'HOUSEHOLD', 'EDUCATION', 'OTHER',
]);

export const CATEGORY_TAXONOMY = Object.freeze({
  FOOD: Object.freeze(['DAIRY', 'GROCERIES', 'SNACKS', 'BEVERAGES', 'OTHER']),
  CLOTHING: Object.freeze(['APPAREL', 'FOOTWEAR', 'ACCESSORY', 'OTHER']),
  FUEL: Object.freeze(['PETROL', 'DIESEL', 'CNG', 'OTHER']),
  ELECTRONICS: Object.freeze(['APPLIANCE', 'SENSOR', 'COMPUTER_HARDWARE', 'MOBILE', 'COMPONENT', 'ACCESSORY', 'OTHER']),
  ENTERTAINMENT: Object.freeze(['MOVIES', 'GAMES', 'EVENTS', 'STREAMING', 'OTHER']),
  HEALTHCARE: Object.freeze(['MEDICINE', 'DOCTOR', 'DENTAL', 'PHARMACY', 'OTHER']),
  TRAVEL: Object.freeze(['TRANSPORT', 'ACCOMMODATION', 'FLIGHTS', 'LOCAL_TRANSIT', 'OTHER']),
  HOUSEHOLD: Object.freeze(['CLEANING', 'KITCHEN', 'FURNITURE', 'UTILITIES', 'OTHER']),
  EDUCATION: Object.freeze(['BOOKS', 'COURSES', 'STATIONERY', 'FEES', 'OTHER']),
  OTHER: Object.freeze(['OTHER']),
});

export const SUBCATEGORIES = Object.freeze([...new Set(Object.values(CATEGORY_TAXONOMY).flat())]);
export const ITEM_TYPES = Object.freeze(['CONSUMABLE', 'DURABLE', 'COMPONENT', 'SERVICE', 'OTHER']);
export const CLASSIFIED_BY = Object.freeze(['RULE', 'AI', 'USER']);
export const GENDERS = Object.freeze(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']);
export const PERIOD_TYPES = Object.freeze(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);
export const RECOMMENDATION_TYPES = Object.freeze([
  'OVERSPENDING', 'RECURRING_PURCHASE', 'SPENDING_INCREASE', 'LARGE_EXPENSE',
  'CATEGORY_TREND', 'STORE_PATTERN', 'GENERAL_INSIGHT',
]);
export const SEVERITIES = Object.freeze(['LOW', 'MEDIUM', 'HIGH']);
export const RECEIPT_STATUS = Object.freeze(['PROCESSED', 'NEEDS_REVIEW']);
