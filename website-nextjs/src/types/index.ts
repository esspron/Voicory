export interface Metric {
  label: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ElementType
}

export interface Voice {
  id: string
  name: string
  provider: '11labs' | 'playht' | 'vapi' | 'azure'
  language: string
  accent: string
  gender: 'Male' | 'Female'
  costPerMin: number // in USD
  previewUrl: string
  tags: string[]
}

export interface Assistant {
  id: string
  name: string
  model: string
  voiceId: string
  transcriber: string
  createdAt: string
  status: 'active' | 'inactive'
}

export interface PhoneNumber {
  id: string
  number: string
  provider: 'Vapi' | 'Twilio' | 'Vonage'
  assistantId?: string
  label?: string
}

export interface ApiKey {
  id: string
  label: string
  key: string // partial display
  type: 'public' | 'private'
  createdAt: string
}

export interface CallLog {
  id: string
  assistantName: string
  phoneNumber: string
  duration: string
  cost: number
  status: 'completed' | 'failed' | 'ongoing'
  date: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phoneNumber: string
  variables: Record<string, string> // Context variables for the bot
  createdAt: string
}

export interface SolutionPageData {
  category: string
  slug: string
  title: string
  description: string
  features: {
    title: string
    description: string
    icon: string
  }[]
}
