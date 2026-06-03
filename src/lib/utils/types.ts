export type Company = {
  id: string
  slug: string
  name: string
  plan: 'essencial' | 'pro'
  whatsapp_instance: string | null
  ai_name: string
  ai_context: string | null
  settings: {
    owner_phone?: string
    schedule?: Record<string, { open: string; close: string; active: boolean }>
    interval_minutes?: number
    professionals?: string[]
  }
  active: boolean
  created_at: string
}

export type User = {
  id: string
  company_id: string
  email: string
  name: string | null
  role: 'admin' | 'staff'
  created_at: string
}

export type Contact = {
  id: string
  company_id: string
  name: string | null
  phone: string
  tags: string[]
  notes: string | null
  created_at: string
}

export type Service = {
  id: string
  company_id: string
  name: string
  duration_minutes: number
  price: number
  active: boolean
  created_at: string
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export type Appointment = {
  id: string
  company_id: string
  contact_id: string
  service_id: string | null
  professional: string | null
  start_at: string
  end_at: string
  status: AppointmentStatus
  reminder_sent: boolean
  notes: string | null
  created_at: string
  contacts?: Contact
  services?: Service
}

export type Message = {
  role: 'user' | 'assistant'
  content: string
}

export type Conversation = {
  id: string
  company_id: string
  contact_id: string
  messages: Message[]
  handled_by_ai: boolean
  escalated_at: string | null
  last_message_at: string
  created_at: string
  contacts?: Contact
}

export type TransactionStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'

export type Transaction = {
  id: string
  company_id: string
  contact_id: string | null
  appointment_id: string | null
  amount: number
  status: TransactionStatus
  due_date: string | null
  paid_at: string | null
  payment_link: string | null
  external_id: string | null
  notes: string | null
  created_at: string
  contacts?: Contact
}
