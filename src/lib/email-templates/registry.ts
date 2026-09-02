import type { ComponentType } from 'react'
import { template as paymentConfirmationTemplate } from './payment-confirmation'
import {
  followupTemplate,
  liveNowTemplate,
  registrationTemplate,
  reminder1hTemplate,
  reminder24hTemplate,
} from './webinar-notices'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'payment-confirmation': paymentConfirmationTemplate,
  'webinar-registration': registrationTemplate,
  'webinar-reminder-24h': reminder24hTemplate,
  'webinar-reminder-1h': reminder1hTemplate,
  'webinar-live-now': liveNowTemplate,
  'webinar-followup': followupTemplate,
}
