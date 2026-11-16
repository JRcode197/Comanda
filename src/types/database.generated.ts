
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "booking_financials": {
                  Row: {
                    "booking_id": string,"commission_minor": number,"created_at": string,"currency": string,"due_at": string | null,"gross_minor": number,"id": string,"net_minor": number | null,"organization_id": string,"pricing_snapshot": NonNullable<Json>,"settlement_party": string,"tax_minor": number | null,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"commission_minor"?: number,"created_at"?: string,"currency"?: string,"due_at"?: string | null,"gross_minor": number,"id"?: string,"net_minor"?: number | null,"organization_id": string,"pricing_snapshot": NonNullable<Json>,"settlement_party": string,"tax_minor"?: number | null,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "booking_id"?: string,"commission_minor"?: number,"created_at"?: string,"currency"?: string,"due_at"?: string | null,"gross_minor"?: number,"id"?: string,"net_minor"?: number | null,"organization_id"?: string,"pricing_snapshot"?: NonNullable<Json>,"settlement_party"?: string,"tax_minor"?: number | null,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_financials_organization_id_booking_id_fkey"
      columns: ["organization_id","booking_id"]
isOneToOne: true
      referencedRelation: "bookings"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "booking_financials_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"booking_operational_contacts": {
                  Row: {
                    "booking_id": string,"contact_name": string,"created_at": string,"id": string,"meeting_note": string | null,"organization_id": string,"phone": string | null,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"contact_name": string,"created_at"?: string,"id"?: string,"meeting_note"?: string | null,"organization_id": string,"phone"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "booking_id"?: string,"contact_name"?: string,"created_at"?: string,"id"?: string,"meeting_note"?: string | null,"organization_id"?: string,"phone"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_operational_contacts_organization_id_booking_id_fkey"
      columns: ["organization_id","booking_id"]
isOneToOne: true
      referencedRelation: "bookings"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "booking_operational_contacts_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"booking_price_lines": {
                  Row: {
                    "booking_id": string,"category": string,"created_at": string,"id": string,"label": string,"line_gross_minor": number,"organization_id": string,"quantity": number,"tax_minor": number | null,"tax_rate": number | null,"unit_gross_minor": number,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"category": string,"created_at"?: string,"id"?: string,"label": string,"line_gross_minor": number,"organization_id": string,"quantity": number,"tax_minor"?: number | null,"tax_rate"?: number | null,"unit_gross_minor": number,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "booking_id"?: string,"category"?: string,"created_at"?: string,"id"?: string,"label"?: string,"line_gross_minor"?: number,"organization_id"?: string,"quantity"?: number,"tax_minor"?: number | null,"tax_rate"?: number | null,"unit_gross_minor"?: number,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_price_lines_organization_id_booking_id_fkey"
      columns: ["organization_id","booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "booking_price_lines_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"booking_requests": {
                  Row: {
                    "adults": number,"approved_booking_id": string | null,"channel_id": string,"children": number,"contact_id": string | null,"created_at": string,"desired_experience_id": string | null,"desired_service_id": string | null,"id": string,"organization_id": string,"partner_id": string | null,"requested_at": string,"requested_changes": Json | null,"source_reference": string | null,"status": string,"target_booking_id": string | null,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "adults": number,"approved_booking_id"?: string | null,"channel_id": string,"children"?: number,"contact_id"?: string | null,"created_at"?: string,"desired_experience_id"?: string | null,"desired_service_id"?: string | null,"id"?: string,"organization_id": string,"partner_id"?: string | null,"requested_at"?: string,"requested_changes"?: Json | null,"source_reference"?: string | null,"status"?: string,"target_booking_id"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "adults"?: number,"approved_booking_id"?: string | null,"channel_id"?: string,"children"?: number,"contact_id"?: string | null,"created_at"?: string,"desired_experience_id"?: string | null,"desired_service_id"?: string | null,"id"?: string,"organization_id"?: string,"partner_id"?: string | null,"requested_at"?: string,"requested_changes"?: Json | null,"source_reference"?: string | null,"status"?: string,"target_booking_id"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_requests_organization_id_approved_booking_id_fkey"
      columns: ["organization_id","approved_booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "booking_requests_organization_id_channel_id_fkey"
      columns: ["organization_id","channel_id"]
isOneToOne: false
      referencedRelation: "channels"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "booking_requests_organization_id_contact_id_fkey"
      columns: ["organization_id","contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "booking_requests_organization_id_desired_experience_id_fkey"
      columns: ["organization_id","desired_experience_id"]
isOneToOne: false
      referencedRelation: "experiences"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "booking_requests_organization_id_desired_service_id_fkey"
      columns: ["organization_id","desired_service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "booking_requests_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "booking_requests_organization_id_partner_id_fkey"
      columns: ["organization_id","partner_id"]
isOneToOne: false
      referencedRelation: "partners"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "booking_requests_organization_id_target_booking_id_fkey"
      columns: ["organization_id","target_booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"bookings": {
                  Row: {
                    "adults": number,"cancellation_reason": string | null,"cancelled_at": string | null,"channel_id": string,"children": number,"code": string,"confirmed_at": string | null,"contact_id": string,"created_at": string,"customer_user_id": string | null,"external_reference": string | null,"hold_expires_at": string | null,"id": string,"organization_id": string,"partner_id": string | null,"service_id": string,"status": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "adults": number,"cancellation_reason"?: string | null,"cancelled_at"?: string | null,"channel_id": string,"children"?: number,"code": string,"confirmed_at"?: string | null,"contact_id": string,"created_at"?: string,"customer_user_id"?: string | null,"external_reference"?: string | null,"hold_expires_at"?: string | null,"id"?: string,"organization_id": string,"partner_id"?: string | null,"service_id": string,"status": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "adults"?: number,"cancellation_reason"?: string | null,"cancelled_at"?: string | null,"channel_id"?: string,"children"?: number,"code"?: string,"confirmed_at"?: string | null,"contact_id"?: string,"created_at"?: string,"customer_user_id"?: string | null,"external_reference"?: string | null,"hold_expires_at"?: string | null,"id"?: string,"organization_id"?: string,"partner_id"?: string | null,"service_id"?: string,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_organization_id_channel_id_fkey"
      columns: ["organization_id","channel_id"]
isOneToOne: false
      referencedRelation: "channels"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "bookings_organization_id_contact_id_fkey"
      columns: ["organization_id","contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "bookings_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_organization_id_partner_id_fkey"
      columns: ["organization_id","partner_id"]
isOneToOne: false
      referencedRelation: "partners"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "bookings_organization_id_service_id_fkey"
      columns: ["organization_id","service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"channels": {
                  Row: {
                    "created_at": string,"id": string,"integration_mode": string,"kind": string,"name": string,"organization_id": string,"partner_id": string | null,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"integration_mode"?: string,"kind": string,"name": string,"organization_id": string,"partner_id"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"integration_mode"?: string,"kind"?: string,"name"?: string,"organization_id"?: string,"partner_id"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "channels_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "channels_organization_id_partner_id_fkey"
      columns: ["organization_id","partner_id"]
isOneToOne: false
      referencedRelation: "partners"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"contacts": {
                  Row: {
                    "created_at": string,"display_name": string,"email": string | null,"id": string,"locale": string,"organization_id": string,"partner_id": string | null,"phone": string | null,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"email"?: string | null,"id"?: string,"locale"?: string,"organization_id": string,"partner_id"?: string | null,"phone"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"email"?: string | null,"id"?: string,"locale"?: string,"organization_id"?: string,"partner_id"?: string | null,"phone"?: string | null,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "contacts_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contacts_organization_id_partner_id_fkey"
      columns: ["organization_id","partner_id"]
isOneToOne: false
      referencedRelation: "partners"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"dietary_acknowledgements": {
                  Row: {
                    "acknowledged_at": string,"acknowledged_by": string,"assignment_id": string,"created_at": string,"dietary_revision": number,"id": string,"organization_id": string,"service_id": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "acknowledged_at"?: string,"acknowledged_by": string,"assignment_id": string,"created_at"?: string,"dietary_revision": number,"id"?: string,"organization_id": string,"service_id": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "acknowledged_at"?: string,"acknowledged_by"?: string,"assignment_id"?: string,"created_at"?: string,"dietary_revision"?: number,"id"?: string,"organization_id"?: string,"service_id"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "dietary_acknowledgements_organization_id_assignment_id_fkey"
      columns: ["organization_id","assignment_id"]
isOneToOne: false
      referencedRelation: "staff_assignments"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "dietary_acknowledgements_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dietary_acknowledgements_organization_id_service_id_fkey"
      columns: ["organization_id","service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"dietary_instructions": {
                  Row: {
                    "authored_by": string,"created_at": string,"dietary_requirement_id": string,"id": string,"instruction": string,"organization_id": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "authored_by": string,"created_at"?: string,"dietary_requirement_id": string,"id"?: string,"instruction": string,"organization_id": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "authored_by"?: string,"created_at"?: string,"dietary_requirement_id"?: string,"id"?: string,"instruction"?: string,"organization_id"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "dietary_instructions_organization_id_dietary_requirement_i_fkey"
      columns: ["organization_id","dietary_requirement_id"]
isOneToOne: false
      referencedRelation: "dietary_requirements"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "dietary_instructions_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"dietary_requirements": {
                  Row: {
                    "created_at": string,"declared_at": string,"expires_at": string,"id": string,"label": string,"organization_id": string,"participant_id": string,"revision": number,"severity": string,"source": string,"type": string,"updated_at": string,"verification_status": string,"verified_at": string | null,"verified_by": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"declared_at"?: string,"expires_at": string,"id"?: string,"label": string,"organization_id": string,"participant_id": string,"revision"?: number,"severity": string,"source": string,"type": string,"updated_at"?: string,"verification_status"?: string,"verified_at"?: string | null,"verified_by"?: string | null,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"declared_at"?: string,"expires_at"?: string,"id"?: string,"label"?: string,"organization_id"?: string,"participant_id"?: string,"revision"?: number,"severity"?: string,"source"?: string,"type"?: string,"updated_at"?: string,"verification_status"?: string,"verified_at"?: string | null,"verified_by"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "dietary_requirements_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dietary_requirements_organization_id_participant_id_fkey"
      columns: ["organization_id","participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"experience_staff_requirements": {
                  Row: {
                    "capability": string | null,"created_at": string,"experience_id": string,"id": string,"language_code": string | null,"operational_role": string,"organization_id": string,"required_count": number,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "capability"?: string | null,"created_at"?: string,"experience_id": string,"id"?: string,"language_code"?: string | null,"operational_role": string,"organization_id": string,"required_count": number,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "capability"?: string | null,"created_at"?: string,"experience_id"?: string,"id"?: string,"language_code"?: string | null,"operational_role"?: string,"organization_id"?: string,"required_count"?: number,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "experience_staff_requirements_organization_id_experience_i_fkey"
      columns: ["organization_id","experience_id"]
isOneToOne: false
      referencedRelation: "experiences"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "experience_staff_requirements_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"experiences": {
                  Row: {
                    "active": boolean,"booking_mode": string,"color": string,"created_at": string,"default_capacity": number,"description": string,"duration_minutes": number,"id": string,"kind": string,"language_codes": (string)[],"name": string,"organization_id": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"booking_mode": string,"color"?: string,"created_at"?: string,"default_capacity": number,"description"?: string,"duration_minutes": number,"id"?: string,"kind"?: string,"language_codes"?: (string)[],"name": string,"organization_id": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "active"?: boolean,"booking_mode"?: string,"color"?: string,"created_at"?: string,"default_capacity"?: number,"description"?: string,"duration_minutes"?: number,"id"?: string,"kind"?: string,"language_codes"?: (string)[],"name"?: string,"organization_id"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "experiences_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"invitations": {
                  Row: {
                    "accepted_at": string | null,"created_at": string,"email": string,"expires_at": string,"id": string,"invited_by": string,"organization_id": string,"partner_id": string | null,"role": string,"token_hash": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"created_at"?: string,"email": string,"expires_at": string,"id"?: string,"invited_by": string,"organization_id": string,"partner_id"?: string | null,"role": string,"token_hash": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "accepted_at"?: string | null,"created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string,"organization_id"?: string,"partner_id"?: string | null,"role"?: string,"token_hash"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitations_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_organization_id_partner_id_fkey"
      columns: ["organization_id","partner_id"]
isOneToOne: false
      referencedRelation: "partners"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"locations": {
                  Row: {
                    "active": boolean,"address": string,"created_at": string,"id": string,"meeting_instructions": string | null,"name": string,"organization_id": string,"timezone": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"address"?: string,"created_at"?: string,"id"?: string,"meeting_instructions"?: string | null,"name": string,"organization_id": string,"timezone"?: string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "active"?: boolean,"address"?: string,"created_at"?: string,"id"?: string,"meeting_instructions"?: string | null,"name"?: string,"organization_id"?: string,"timezone"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "locations_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"membership_roles": {
                  Row: {
                    "created_at": string,"id": string,"membership_id": string,"organization_id": string,"role": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"membership_id": string,"organization_id": string,"role": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"membership_id"?: string,"organization_id"?: string,"role"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "membership_roles_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "membership_roles_organization_id_membership_id_fkey"
      columns: ["organization_id","membership_id"]
isOneToOne: false
      referencedRelation: "organization_memberships"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"organization_memberships": {
                  Row: {
                    "created_at": string,"id": string,"organization_id": string,"status": string,"updated_at": string,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"organization_id": string,"status"?: string,"updated_at"?: string,"user_id": string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"organization_id"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "organization_memberships_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "created_at": string,"currency": string,"id": string,"name": string,"settings": NonNullable<Json>,"slug": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"currency"?: string,"id"?: string,"name": string,"settings"?: NonNullable<Json>,"slug": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: string,"id"?: string,"name"?: string,"settings"?: NonNullable<Json>,"slug"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                  ]
                },"participants": {
                  Row: {
                    "booking_id": string,"category": string,"created_at": string,"dietary_collection_status": string,"display_name": string | null,"id": string,"ordinal": number,"organization_id": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"category": string,"created_at"?: string,"dietary_collection_status"?: string,"display_name"?: string | null,"id"?: string,"ordinal": number,"organization_id": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "booking_id"?: string,"category"?: string,"created_at"?: string,"dietary_collection_status"?: string,"display_name"?: string | null,"id"?: string,"ordinal"?: number,"organization_id"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "participants_organization_id_booking_id_fkey"
      columns: ["organization_id","booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "participants_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"partners": {
                  Row: {
                    "active": boolean,"billing_details": Json | null,"billing_email": string | null,"created_at": string,"id": string,"kind": string,"name": string,"organization_id": string,"payment_terms_days": number,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"billing_details"?: Json | null,"billing_email"?: string | null,"created_at"?: string,"id"?: string,"kind"?: string,"name": string,"organization_id": string,"payment_terms_days"?: number,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "active"?: boolean,"billing_details"?: Json | null,"billing_email"?: string | null,"created_at"?: string,"id"?: string,"kind"?: string,"name"?: string,"organization_id"?: string,"payment_terms_days"?: number,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "partners_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_entries": {
                  Row: {
                    "amount_minor": number,"booking_id": string,"created_at": string,"currency": string,"external_reference": string | null,"id": string,"kind": string,"method": string,"occurred_at": string,"organization_id": string,"payer_type": string,"recorded_by": string,"reverses_entry_id": string | null,"status": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"booking_id": string,"created_at"?: string,"currency"?: string,"external_reference"?: string | null,"id"?: string,"kind": string,"method": string,"occurred_at"?: string,"organization_id": string,"payer_type": string,"recorded_by": string,"reverses_entry_id"?: string | null,"status": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "amount_minor"?: number,"booking_id"?: string,"created_at"?: string,"currency"?: string,"external_reference"?: string | null,"id"?: string,"kind"?: string,"method"?: string,"occurred_at"?: string,"organization_id"?: string,"payer_type"?: string,"recorded_by"?: string,"reverses_entry_id"?: string | null,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_entries_organization_id_booking_id_fkey"
      columns: ["organization_id","booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "payment_entries_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_entries_organization_id_reverses_entry_id_fkey"
      columns: ["organization_id","reverses_entry_id"]
isOneToOne: true
      referencedRelation: "payment_entries"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"privacy_records": {
                  Row: {
                    "contact_id": string | null,"created_at": string,"evidence_reference": string | null,"id": string,"lawful_basis": string,"notice_version": string,"organization_id": string,"participant_id": string | null,"purpose": string,"recorded_at": string,"recorded_by": string,"special_category_condition": string | null,"updated_at": string,"version": number,"withdrawn_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "contact_id"?: string | null,"created_at"?: string,"evidence_reference"?: string | null,"id"?: string,"lawful_basis": string,"notice_version": string,"organization_id": string,"participant_id"?: string | null,"purpose": string,"recorded_at"?: string,"recorded_by": string,"special_category_condition"?: string | null,"updated_at"?: string,"version"?: number,"withdrawn_at"?: string | null
                  }
                  Update: {
                    "contact_id"?: string | null,"created_at"?: string,"evidence_reference"?: string | null,"id"?: string,"lawful_basis"?: string,"notice_version"?: string,"organization_id"?: string,"participant_id"?: string | null,"purpose"?: string,"recorded_at"?: string,"recorded_by"?: string,"special_category_condition"?: string | null,"updated_at"?: string,"version"?: number,"withdrawn_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "privacy_records_organization_id_contact_id_fkey"
      columns: ["organization_id","contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "privacy_records_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "privacy_records_organization_id_participant_id_fkey"
      columns: ["organization_id","participant_id"]
isOneToOne: false
      referencedRelation: "participants"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"display_name": string,"locale": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"display_name": string,"locale"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"display_name"?: string,"locale"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                  ]
                },"rate_cards": {
                  Row: {
                    "active": boolean,"category": string,"commission_bps": number,"created_at": string,"currency": string,"experience_id": string,"id": string,"organization_id": string,"partner_id": string | null,"pricing_basis": string,"tax_rate": number | null,"unit_gross_minor": number,"updated_at": string,"valid_from": string,"valid_to": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"category": string,"commission_bps"?: number,"created_at"?: string,"currency"?: string,"experience_id": string,"id"?: string,"organization_id": string,"partner_id"?: string | null,"pricing_basis": string,"tax_rate"?: number | null,"unit_gross_minor": number,"updated_at"?: string,"valid_from": string,"valid_to": string,"version"?: number
                  }
                  Update: {
                    "active"?: boolean,"category"?: string,"commission_bps"?: number,"created_at"?: string,"currency"?: string,"experience_id"?: string,"id"?: string,"organization_id"?: string,"partner_id"?: string | null,"pricing_basis"?: string,"tax_rate"?: number | null,"unit_gross_minor"?: number,"updated_at"?: string,"valid_from"?: string,"valid_to"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "rate_cards_organization_id_experience_id_fkey"
      columns: ["organization_id","experience_id"]
isOneToOne: false
      referencedRelation: "experiences"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "rate_cards_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rate_cards_organization_id_partner_id_fkey"
      columns: ["organization_id","partner_id"]
isOneToOne: false
      referencedRelation: "partners"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"resource_reservations": {
                  Row: {
                    "created_at": string,"id": string,"organization_id": string,"reserved_from": string,"reserved_to": string,"resource_id": string,"service_id": string,"status": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"organization_id": string,"reserved_from": string,"reserved_to": string,"resource_id": string,"service_id": string,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"organization_id"?: string,"reserved_from"?: string,"reserved_to"?: string,"resource_id"?: string,"service_id"?: string,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "resource_reservations_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resource_reservations_organization_id_resource_id_fkey"
      columns: ["organization_id","resource_id"]
isOneToOne: false
      referencedRelation: "resources"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "resource_reservations_organization_id_service_id_fkey"
      columns: ["organization_id","service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"resources": {
                  Row: {
                    "active": boolean,"capacity": number,"created_at": string,"id": string,"kind": string,"location_id": string,"name": string,"organization_id": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"capacity": number,"created_at"?: string,"id"?: string,"kind": string,"location_id": string,"name": string,"organization_id": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "active"?: boolean,"capacity"?: number,"created_at"?: string,"id"?: string,"kind"?: string,"location_id"?: string,"name"?: string,"organization_id"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "resources_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "resources_organization_id_location_id_fkey"
      columns: ["organization_id","location_id"]
isOneToOne: false
      referencedRelation: "locations"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"service_notes": {
                  Row: {
                    "author_id": string,"body": string,"booking_id": string | null,"created_at": string,"id": string,"organization_id": string,"partner_id": string | null,"service_id": string,"updated_at": string,"version": number,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"booking_id"?: string | null,"created_at"?: string,"id"?: string,"organization_id": string,"partner_id"?: string | null,"service_id": string,"updated_at"?: string,"version"?: number,"visibility": string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"booking_id"?: string | null,"created_at"?: string,"id"?: string,"organization_id"?: string,"partner_id"?: string | null,"service_id"?: string,"updated_at"?: string,"version"?: number,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_notes_organization_id_booking_id_fkey"
      columns: ["organization_id","booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "service_notes_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_notes_organization_id_partner_id_fkey"
      columns: ["organization_id","partner_id"]
isOneToOne: false
      referencedRelation: "partners"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "service_notes_organization_id_service_id_fkey"
      columns: ["organization_id","service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"service_staff_requirements": {
                  Row: {
                    "capability": string | null,"created_at": string,"id": string,"language_code": string | null,"operational_role": string,"organization_id": string,"required_count": number,"service_id": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "capability"?: string | null,"created_at"?: string,"id"?: string,"language_code"?: string | null,"operational_role": string,"organization_id": string,"required_count": number,"service_id": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "capability"?: string | null,"created_at"?: string,"id"?: string,"language_code"?: string | null,"operational_role"?: string,"organization_id"?: string,"required_count"?: number,"service_id"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "service_staff_requirements_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "service_staff_requirements_organization_id_service_id_fkey"
      columns: ["organization_id","service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"services": {
                  Row: {
                    "booking_mode": string,"capacity": number,"created_at": string,"dietary_revision": number,"ends_at": string,"experience_id": string,"id": string,"language_code": string,"location_id": string,"meeting_point": string | null,"organization_id": string,"starts_at": string,"status": string,"timezone": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_mode": string,"capacity": number,"created_at"?: string,"dietary_revision"?: number,"ends_at": string,"experience_id": string,"id"?: string,"language_code"?: string,"location_id": string,"meeting_point"?: string | null,"organization_id": string,"starts_at": string,"status"?: string,"timezone"?: string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "booking_mode"?: string,"capacity"?: number,"created_at"?: string,"dietary_revision"?: number,"ends_at"?: string,"experience_id"?: string,"id"?: string,"language_code"?: string,"location_id"?: string,"meeting_point"?: string | null,"organization_id"?: string,"starts_at"?: string,"status"?: string,"timezone"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "services_organization_id_experience_id_fkey"
      columns: ["organization_id","experience_id"]
isOneToOne: false
      referencedRelation: "experiences"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "services_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "services_organization_id_location_id_fkey"
      columns: ["organization_id","location_id"]
isOneToOne: false
      referencedRelation: "locations"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"staff_assignments": {
                  Row: {
                    "capabilities": (string)[],"created_at": string,"decline_reason": string | null,"id": string,"operational_role": string,"organization_id": string,"reserved_from": string,"reserved_to": string,"responded_at": string | null,"response_deadline": string | null,"revenue_weight": number | null,"service_id": string,"staff_id": string,"status": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "capabilities"?: (string)[],"created_at"?: string,"decline_reason"?: string | null,"id"?: string,"operational_role": string,"organization_id": string,"reserved_from": string,"reserved_to": string,"responded_at"?: string | null,"response_deadline"?: string | null,"revenue_weight"?: number | null,"service_id": string,"staff_id": string,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "capabilities"?: (string)[],"created_at"?: string,"decline_reason"?: string | null,"id"?: string,"operational_role"?: string,"organization_id"?: string,"reserved_from"?: string,"reserved_to"?: string,"responded_at"?: string | null,"response_deadline"?: string | null,"revenue_weight"?: number | null,"service_id"?: string,"staff_id"?: string,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_assignments_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "staff_assignments_organization_id_service_id_fkey"
      columns: ["organization_id","service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "staff_assignments_organization_id_staff_id_fkey"
      columns: ["organization_id","staff_id"]
isOneToOne: false
      referencedRelation: "staff_profiles"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"staff_availability": {
                  Row: {
                    "created_at": string,"ends_at": string,"id": string,"kind": string,"note": string | null,"organization_id": string,"source": string,"staff_id": string,"starts_at": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_at": string,"id"?: string,"kind": string,"note"?: string | null,"organization_id": string,"source"?: string,"staff_id": string,"starts_at": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string,"id"?: string,"kind"?: string,"note"?: string | null,"organization_id"?: string,"source"?: string,"staff_id"?: string,"starts_at"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_availability_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "staff_availability_organization_id_staff_id_fkey"
      columns: ["organization_id","staff_id"]
isOneToOne: false
      referencedRelation: "staff_profiles"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"staff_capabilities": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"organization_id": string,"staff_id": string,"updated_at": string,"value": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": string,"organization_id": string,"staff_id": string,"updated_at"?: string,"value": string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"organization_id"?: string,"staff_id"?: string,"updated_at"?: string,"value"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_capabilities_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "staff_capabilities_organization_id_staff_id_fkey"
      columns: ["organization_id","staff_id"]
isOneToOne: false
      referencedRelation: "staff_profiles"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"staff_profiles": {
                  Row: {
                    "active": boolean,"created_at": string,"home_location_id": string | null,"id": string,"membership_id": string,"organization_id": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"home_location_id"?: string | null,"id"?: string,"membership_id": string,"organization_id": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"home_location_id"?: string | null,"id"?: string,"membership_id"?: string,"organization_id"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_profiles_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "staff_profiles_organization_id_home_location_id_fkey"
      columns: ["organization_id","home_location_id"]
isOneToOne: false
      referencedRelation: "locations"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "staff_profiles_organization_id_membership_id_fkey"
      columns: ["organization_id","membership_id"]
isOneToOne: true
      referencedRelation: "organization_memberships"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invitation":
{ Args: { "token": string }; Returns: string
                           },
"audit_log":
{ Args: { "p_org": string }; Returns: unknown[]
                          SetofOptions: {
        from: "*"
        to: "audit_events"
        isOneToOne: false
        isSetofReturn: true
      } },
"command":
{ Args: { "p_key": string,"p_operation": string,"p_org": string,"p_payload": Json }; Returns: string
                           },
"service_readiness":
{ Args: { "p_org": string,"p_service": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
          }
        },"public": {
          Enums: {
          }
        }
} as const
