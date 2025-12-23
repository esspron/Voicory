/**
 * Real Estate Script Template Types
 * 
 * Type definitions for RE script templates used in outbound calling campaigns.
 */

// Script Categories
export type REScriptCategory = 
  | 'fsbo'           // For Sale By Owner
  | 'expired'        // Expired Listings
  | 'buyer_inquiry'  // Inbound buyer calls
  | 'seller_followup'// Follow up with potential sellers
  | 'open_house'     // Open house visitor follow-up
  | 'circle_prospecting' // Geographic farming
  | 'custom';        // User-created custom scripts

// Script Direction
export type ScriptDirection = 'inbound' | 'outbound';

// Variable types for dynamic content
export type VariableType = 'string' | 'number' | 'date' | 'currency' | 'boolean';

// Script variable definition
export interface REScriptVariable {
  name: string;              // Variable name (e.g., 'owner_name')
  displayName: string;       // Human-readable name (e.g., 'Owner Name')
  type: VariableType;
  description: string;
  required: boolean;
  defaultValue?: string;
  placeholder?: string;
  // For campaign integration - maps to lead field
  leadField?: string;        // e.g., 'first_name', 'property_address'
}

// Objection handler definition
export interface ObjectionHandler {
  objection: string;         // What the lead might say
  response: string;          // How to respond
  tags?: string[];           // e.g., ['price', 'timing', 'commitment']
}

// Qualification question
export interface QualificationQuestion {
  question: string;
  purpose: string;           // Why we ask this
  followUp?: string;         // Optional follow-up question
  scoringImpact?: number;    // Lead score impact (1-10)
}

// Script template structure
export interface REScript {
  id: string;
  name: string;
  description: string;
  category: REScriptCategory;
  direction: ScriptDirection;
  
  // Is this a system template (admin-managed) or user-created fork
  isSystemTemplate: boolean;
  
  // For forked scripts - reference to original
  parentTemplateId?: string;
  
  // Script content
  systemPrompt: string;
  firstMessage: string;
  
  // Structured script components
  qualificationQuestions: QualificationQuestion[];
  objectionHandlers: ObjectionHandler[];
  
  // Call outcomes / triggers
  appointmentBookingTrigger: string;
  transferTrigger: string;
  callbackTrigger?: string;
  
  // Variables used in this script
  variables: REScriptVariable[];
  
  // Metadata
  tags: string[];
  industry: 'real_estate';
  estimatedCallDuration?: number; // minutes
  successRate?: number;           // percentage (admin-tracked)
  usageCount?: number;            // How many times used
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;             // User ID or 'system'
}

// Form data for applying a script template
export interface ApplyScriptFormData {
  templateId: string;
  // Variable values to substitute
  variableValues: Record<string, string>;
  // Customizations
  customSystemPrompt?: string;
  customFirstMessage?: string;
  customObjectionHandlers?: ObjectionHandler[];
}

// Script template preview (for gallery display)
export interface REScriptPreview {
  id: string;
  name: string;
  description: string;
  category: REScriptCategory;
  direction: ScriptDirection;
  tags: string[];
  usageCount?: number;
  successRate?: number;
  variableCount: number;
  isSystemTemplate: boolean;
}

// Category metadata for UI
export interface REScriptCategoryInfo {
  id: REScriptCategory;
  name: string;
  description: string;
  icon: string;           // Phosphor icon name
  color: string;          // Tailwind color class
  direction: ScriptDirection;
}

// Script categories with metadata
export const RE_SCRIPT_CATEGORIES: REScriptCategoryInfo[] = [
  {
    id: 'fsbo',
    name: 'FSBO Outbound',
    description: 'Call For Sale By Owner leads',
    icon: 'House',
    color: 'text-emerald-400',
    direction: 'outbound',
  },
  {
    id: 'expired',
    name: 'Expired Listing',
    description: 'Call expired MLS listings',
    icon: 'CalendarX',
    color: 'text-amber-400',
    direction: 'outbound',
  },
  {
    id: 'buyer_inquiry',
    name: 'Buyer Inquiry',
    description: 'Answer inbound calls about listings',
    icon: 'PhoneIncoming',
    color: 'text-blue-400',
    direction: 'inbound',
  },
  {
    id: 'seller_followup',
    name: 'Seller Follow-up',
    description: 'Follow up with potential sellers',
    icon: 'UserCircle',
    color: 'text-purple-400',
    direction: 'outbound',
  },
  {
    id: 'open_house',
    name: 'Open House Follow-up',
    description: 'Call open house visitors',
    icon: 'DoorOpen',
    color: 'text-rose-400',
    direction: 'outbound',
  },
  {
    id: 'circle_prospecting',
    name: 'Circle Prospecting',
    description: 'Geographic farming calls',
    icon: 'MapPin',
    color: 'text-cyan-400',
    direction: 'outbound',
  },
  {
    id: 'custom',
    name: 'Custom Script',
    description: 'Create your own script',
    icon: 'PencilSimple',
    color: 'text-gray-400',
    direction: 'outbound',
  },
];

// Common RE variables used across scripts
export const COMMON_RE_VARIABLES: REScriptVariable[] = [
  {
    name: 'owner_name',
    displayName: 'Owner Name',
    type: 'string',
    description: 'Property owner\'s name',
    required: true,
    placeholder: 'John Smith',
    leadField: 'first_name',
  },
  {
    name: 'property_address',
    displayName: 'Property Address',
    type: 'string',
    description: 'Full property address',
    required: true,
    placeholder: '123 Main St, Austin, TX',
    leadField: 'property_address',
  },
  {
    name: 'agent_name',
    displayName: 'Agent Name',
    type: 'string',
    description: 'Real estate agent\'s name',
    required: true,
    placeholder: 'Sarah Johnson',
  },
  {
    name: 'brokerage_name',
    displayName: 'Brokerage Name',
    type: 'string',
    description: 'Real estate brokerage/company name',
    required: true,
    placeholder: 'Keller Williams Realty',
  },
  {
    name: 'days_on_market',
    displayName: 'Days on Market',
    type: 'number',
    description: 'Number of days property has been listed',
    required: false,
    placeholder: '45',
    leadField: 'days_on_market',
  },
  {
    name: 'listing_price',
    displayName: 'Listing Price',
    type: 'currency',
    description: 'Property listing price',
    required: false,
    placeholder: '$450,000',
    leadField: 'listing_price',
  },
  {
    name: 'original_price',
    displayName: 'Original Price',
    type: 'currency',
    description: 'Original listing price (for expired)',
    required: false,
    placeholder: '$475,000',
  },
  {
    name: 'days_expired',
    displayName: 'Days Expired',
    type: 'number',
    description: 'Days since listing expired',
    required: false,
    placeholder: '7',
  },
  {
    name: 'bedrooms',
    displayName: 'Bedrooms',
    type: 'number',
    description: 'Number of bedrooms',
    required: false,
    placeholder: '4',
  },
  {
    name: 'bathrooms',
    displayName: 'Bathrooms',
    type: 'number',
    description: 'Number of bathrooms',
    required: false,
    placeholder: '2.5',
  },
  {
    name: 'last_contact_date',
    displayName: 'Last Contact Date',
    type: 'date',
    description: 'Date of last contact with lead',
    required: false,
    placeholder: 'December 10, 2025',
    leadField: 'last_call_at',
  },
  {
    name: 'visit_date',
    displayName: 'Visit Date',
    type: 'date',
    description: 'Date they visited (open house)',
    required: false,
    placeholder: 'December 15, 2025',
  },
  {
    name: 'timeline',
    displayName: 'Timeline',
    type: 'string',
    description: 'Selling/buying timeline',
    required: false,
    placeholder: '3-6 months',
  },
];
