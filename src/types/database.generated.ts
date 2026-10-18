// Generated read-only from Supabase project pwhtguaevhlnzytneemp on 2026-10-18.
// Schema snapshot only. Staged migrations and hosted provider/SMTP settings are not verified.
// The existing JavaScript Supabase client has not been migrated to these types.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      account_access_requests: {
        Row: {
          auth_user_id: string | null
          created_at: string
          display_name: string
          email: string
          id: string
          message: string
          requested_features: string[]
          requested_permissions: string[]
          requested_role: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          display_name: string
          email: string
          id?: string
          message?: string
          requested_features?: string[]
          requested_permissions?: string[]
          requested_role: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          message?: string
          requested_features?: string[]
          requested_permissions?: string[]
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_access_requests_auth_user_id_fkey"
            columns: ["auth_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_access_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string | null
          created_at: string
          expires_at: string | null
          id: string
          kind: string
          published: boolean
          starts_at: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: string
          published?: boolean
          starts_at?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: string
          published?: boolean
          starts_at?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      community_campaigns: {
        Row: {
          category: string
          created_at: string
          id: string
          organiser: string
          owner_id: string | null
          reference: string
          review_note: string
          reviewed_by: string | null
          slug: string
          status: string
          story: string
          target_pence: number
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          organiser: string
          owner_id?: string | null
          reference?: string
          review_note?: string
          reviewed_by?: string | null
          slug?: string
          status?: string
          story: string
          target_pence: number
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          organiser?: string
          owner_id?: string | null
          reference?: string
          review_note?: string
          reviewed_by?: string | null
          slug?: string
          status?: string
          story?: string
          target_pence?: number
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_campaigns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_campaigns_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_finance_settings: {
        Row: {
          issuer_address: string
          issuer_email: string
          issuer_name: string
          non_vat_confirmed: boolean
          registration_note: string
          singleton: boolean
          updated_at: string
        }
        Insert: {
          issuer_address: string
          issuer_email: string
          issuer_name: string
          non_vat_confirmed?: boolean
          registration_note?: string
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          issuer_address?: string
          issuer_email?: string
          issuer_name?: string
          non_vat_confirmed?: boolean
          registration_note?: string
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      community_invoices: {
        Row: {
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          issued_at: string | null
          issuer: Json | null
          kind: string
          lines: Json
          member_id: string | null
          notes: string
          number: string | null
          recipient_address: string
          recipient_email: string
          recipient_name: string
          status: string
          supply_date: string
          total_pence: number
          version: number
          void_reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          issued_at?: string | null
          issuer?: Json | null
          kind: string
          lines: Json
          member_id?: string | null
          notes?: string
          number?: string | null
          recipient_address: string
          recipient_email?: string
          recipient_name: string
          status?: string
          supply_date: string
          total_pence: number
          version?: number
          void_reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          issued_at?: string | null
          issuer?: Json | null
          kind?: string
          lines?: Json
          member_id?: string | null
          notes?: string
          number?: string | null
          recipient_address?: string
          recipient_email?: string
          recipient_name?: string
          status?: string
          supply_date?: string
          total_pence?: number
          version?: number
          void_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_invoices_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_payments: {
        Row: {
          amount_pence: number
          campaign_id: string | null
          created_at: string
          created_by: string | null
          happened_on: string
          id: string
          idempotency_key: string
          invoice_id: string | null
          method: string
          reference: string
          reversal_of: string | null
        }
        Insert: {
          amount_pence: number
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          happened_on: string
          id?: string
          idempotency_key: string
          invoice_id?: string | null
          method: string
          reference: string
          reversal_of?: string | null
        }
        Update: {
          amount_pence?: number
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          happened_on?: string
          id?: string
          idempotency_key?: string
          invoice_id?: string | null
          method?: string
          reference?: string
          reversal_of?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_payments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "community_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "community_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_payments_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: true
            referencedRelation: "community_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      community_safeguarding_checks: {
        Row: {
          check_level: string
          checked_on: string
          id: string
          policy_confirmed: boolean
          policy_reference: string
          recorded_by: string | null
          retention_review_on: string
          review_on: string
          role_name: string
          status: string
          subject_name: string
          updated_at: string
          version: number
        }
        Insert: {
          check_level: string
          checked_on: string
          id?: string
          policy_confirmed: boolean
          policy_reference: string
          recorded_by?: string | null
          retention_review_on: string
          review_on: string
          role_name: string
          status: string
          subject_name: string
          updated_at?: string
          version?: number
        }
        Update: {
          check_level?: string
          checked_on?: string
          id?: string
          policy_confirmed?: boolean
          policy_reference?: string
          recorded_by?: string | null
          retention_review_on?: string
          review_on?: string
          role_name?: string
          status?: string
          subject_name?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_safeguarding_checks_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_schedule: {
        Row: {
          active: boolean
          created_at: string
          day_of_week: number
          end_time: string | null
          id: string
          location: string
          planner_visible: boolean
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          day_of_week: number
          end_time?: string | null
          id?: string
          location?: string
          planner_visible?: boolean
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          day_of_week?: number
          end_time?: string | null
          id?: string
          location?: string
          planner_visible?: boolean
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_form_staff: {
        Row: {
          form_id: string
          role: string
          user_id: string
        }
        Insert: {
          form_id: string
          role: string
          user_id: string
        }
        Update: {
          form_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_form_staff_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "custom_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_form_versions: {
        Row: {
          created_at: string
          description: string
          form_id: string
          published_by: string
          schema: Json
          title: string
          version: number
        }
        Insert: {
          created_at?: string
          description: string
          form_id: string
          published_by: string
          schema: Json
          title: string
          version: number
        }
        Update: {
          created_at?: string
          description?: string
          form_id?: string
          published_by?: string
          schema?: Json
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_form_versions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "custom_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_form_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_forms: {
        Row: {
          created_by: string
          description: string
          due_hours: number
          enabled: boolean
          id: string
          published_version: number | null
          schema: Json
          slug: string
          task_title: string
          title: string
          updated_at: string
        }
        Insert: {
          created_by: string
          description?: string
          due_hours?: number
          enabled?: boolean
          id?: string
          published_version?: number | null
          schema: Json
          slug: string
          task_title?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_by?: string
          description?: string
          due_hours?: number
          enabled?: boolean
          id?: string
          published_version?: number | null
          schema?: Json
          slug?: string
          task_title?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      display_code_allocations: {
        Row: {
          allocations: number
          client_hash: string
          screen_id: string
          window_started_at: string
        }
        Insert: {
          allocations: number
          client_hash: string
          screen_id: string
          window_started_at: string
        }
        Update: {
          allocations?: number
          client_hash?: string
          screen_id?: string
          window_started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "display_code_allocations_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "tv_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      display_connection_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          screen_id: string
          token_hash: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          screen_id: string
          token_hash: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          screen_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "display_connection_codes_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "tv_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          featured: boolean
          id: string
          livestream_url: string | null
          location: string | null
          poster_url: string | null
          published: boolean
          registration_url: string | null
          speaker: string | null
          start_time: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          featured?: boolean
          id?: string
          livestream_url?: string | null
          location?: string | null
          poster_url?: string | null
          published?: boolean
          registration_url?: string | null
          speaker?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          featured?: boolean
          id?: string
          livestream_url?: string | null
          location?: string | null
          poster_url?: string | null
          published?: boolean
          registration_url?: string | null
          speaker?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      form_attachments: {
        Row: {
          created_at: string
          field_id: string
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          submission_id: string
        }
        Insert: {
          created_at?: string
          field_id: string
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          submission_id: string
        }
        Update: {
          created_at?: string
          field_id?: string
          file_name?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_attachments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          internal: boolean
          submission_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          internal?: boolean
          submission_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          internal?: boolean
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_replies_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string
          custom_form_id: string | null
          form_version: number | null
          id: string
          kind: string
          payload: Json
          schema_snapshot: Json | null
          status: string
          submitter_id: string | null
        }
        Insert: {
          created_at?: string
          custom_form_id?: string | null
          form_version?: number | null
          id?: string
          kind: string
          payload: Json
          schema_snapshot?: Json | null
          status?: string
          submitter_id?: string | null
        }
        Update: {
          created_at?: string
          custom_form_id?: string | null
          form_version?: number | null
          id?: string
          kind?: string
          payload?: Json
          schema_snapshot?: Json | null
          status?: string
          submitter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_custom_form_id_fkey"
            columns: ["custom_form_id"]
            isOneToOne: false
            referencedRelation: "custom_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_version"
            columns: ["custom_form_id", "form_version"]
            isOneToOne: false
            referencedRelation: "custom_form_versions"
            referencedColumns: ["form_id", "version"]
          },
        ]
      }
      hall_bookings: {
        Row: {
          booking_date: string
          created_at: string
          end_time: string | null
          id: string
          start_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_date: string
          created_at?: string
          end_time?: string | null
          id?: string
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_date?: string
          created_at?: string
          end_time?: string | null
          id?: string
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      livestream_settings: {
        Row: {
          enabled: boolean
          id: number
          provider: string
          scheduled_at: string | null
          stream_url: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          id?: number
          provider?: string
          scheduled_at?: string | null
          stream_url?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          id?: number
          provider?: string
          scheduled_at?: string | null
          stream_url?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      page_content: {
        Row: {
          content_key: string
          content_type: string
          content_value: string | null
          id: string
          page: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content_key: string
          content_type?: string
          content_value?: string | null
          id?: string
          page?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content_key?: string
          content_type?: string
          content_value?: string | null
          id?: string
          page?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      page_sections: {
        Row: {
          background_image_url: string
          body: string
          created_at: string
          id: string
          image_urls: Json
          page_path: string
          published: boolean
          section_key: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          background_image_url?: string
          body?: string
          created_at?: string
          id?: string
          image_urls?: Json
          page_path: string
          published?: boolean
          section_key: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Update: {
          background_image_url?: string
          body?: string
          created_at?: string
          id?: string
          image_urls?: Json
          page_path?: string
          published?: boolean
          section_key?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      prayer_times: {
        Row: {
          asr_begins: string | null
          asr_jamah: string | null
          d_date: string
          fajr_begins: string | null
          fajr_jamah: string | null
          id: number
          is_ramadan: boolean
          isha_begins: string | null
          isha_jamah: string | null
          jummah_1_jamah: string | null
          jummah_1_start: string | null
          jummah_2_begins: string | null
          jummah_2_jamah: string | null
          maghrib_begins: string | null
          maghrib_jamah: string | null
          sunrise: string | null
          updated_at: string
          updated_by: string | null
          zuhr_begins: string | null
          zuhr_jamah: string | null
        }
        Insert: {
          asr_begins?: string | null
          asr_jamah?: string | null
          d_date: string
          fajr_begins?: string | null
          fajr_jamah?: string | null
          id?: number
          is_ramadan?: boolean
          isha_begins?: string | null
          isha_jamah?: string | null
          jummah_1_jamah?: string | null
          jummah_1_start?: string | null
          jummah_2_begins?: string | null
          jummah_2_jamah?: string | null
          maghrib_begins?: string | null
          maghrib_jamah?: string | null
          sunrise?: string | null
          updated_at?: string
          updated_by?: string | null
          zuhr_begins?: string | null
          zuhr_jamah?: string | null
        }
        Update: {
          asr_begins?: string | null
          asr_jamah?: string | null
          d_date?: string
          fajr_begins?: string | null
          fajr_jamah?: string | null
          id?: number
          is_ramadan?: boolean
          isha_begins?: string | null
          isha_jamah?: string | null
          jummah_1_jamah?: string | null
          jummah_1_start?: string | null
          jummah_2_begins?: string | null
          jummah_2_jamah?: string | null
          maghrib_begins?: string | null
          maghrib_jamah?: string | null
          sunrise?: string | null
          updated_at?: string
          updated_by?: string | null
          zuhr_begins?: string | null
          zuhr_jamah?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          is_owner: boolean
          permissions: string[]
          staff_kinds: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          is_active?: boolean
          is_owner?: boolean
          permissions?: string[]
          staff_kinds?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          is_owner?: boolean
          permissions?: string[]
          staff_kinds?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          form_id: string | null
          id: string
          image_url: string
          kind: string
          placement: string
          published: boolean
          registration: string
          schedule: string
          slug: string
          source_poster_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          form_id?: string | null
          id?: string
          image_url?: string
          kind?: string
          placement: string
          published?: boolean
          registration?: string
          schedule?: string
          slug: string
          source_poster_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          form_id?: string | null
          id?: string
          image_url?: string
          kind?: string
          placement?: string
          published?: boolean
          registration?: string
          schedule?: string
          slug?: string
          source_poster_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_pages_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "custom_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_pages_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          image_url: string | null
          member_group: string | null
          name: string
          published: boolean
          role_title: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          member_group?: string | null
          name: string
          published?: boolean
          role_title?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          member_group?: string | null
          name?: string
          published?: boolean
          role_title?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tv_devices: {
        Row: {
          applied_revision: string | null
          created_at: string
          expires_at: string
          id: string
          is_preview: boolean
          last_seen_at: string | null
          name: string
          presentation_id: string
          screen_id: string
          token_hash: string
        }
        Insert: {
          applied_revision?: string | null
          created_at?: string
          expires_at: string
          id?: string
          is_preview?: boolean
          last_seen_at?: string | null
          name?: string
          presentation_id: string
          screen_id: string
          token_hash: string
        }
        Update: {
          applied_revision?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_preview?: boolean
          last_seen_at?: string | null
          name?: string
          presentation_id?: string
          screen_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_devices_presentation_fk"
            columns: ["presentation_id", "screen_id"]
            isOneToOne: false
            referencedRelation: "tv_presentations"
            referencedColumns: ["id", "screen_id"]
          },
          {
            foreignKeyName: "tv_devices_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "tv_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_inputs: {
        Row: {
          device_name: string
          expires_at: string
          kind: string
          owner_id: string
          screen_id: string
          session_id: string
          slot: string
        }
        Insert: {
          device_name?: string
          expires_at: string
          kind: string
          owner_id: string
          screen_id: string
          session_id?: string
          slot: string
        }
        Update: {
          device_name?: string
          expires_at?: string
          kind?: string
          owner_id?: string
          screen_id?: string
          session_id?: string
          slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_inputs_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "tv_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_join_attempts: {
        Row: {
          attempts: number
          client_hash: string
          screen_id: string
          window_started_at: string
        }
        Insert: {
          attempts: number
          client_hash: string
          screen_id: string
          window_started_at: string
        }
        Update: {
          attempts?: number
          client_hash?: string
          screen_id?: string
          window_started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_join_attempts_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "tv_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_peers: {
        Row: {
          answer: Json | null
          device_id: string
          id: string
          last_seen_at: string
          offer: Json | null
          receiver_state: string | null
          screen_id: string
          session_id: string
        }
        Insert: {
          answer?: Json | null
          device_id: string
          id?: string
          last_seen_at?: string
          offer?: Json | null
          receiver_state?: string | null
          screen_id: string
          session_id: string
        }
        Update: {
          answer?: Json | null
          device_id?: string
          id?: string
          last_seen_at?: string
          offer?: Json | null
          receiver_state?: string | null
          screen_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_peers_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "tv_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_peers_input_fk"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tv_inputs"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "tv_peers_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "tv_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_presentations: {
        Row: {
          code: string
          expires_at: string | null
          id: string
          screen_id: string
          started_at: string
        }
        Insert: {
          code: string
          expires_at?: string | null
          id?: string
          screen_id: string
          started_at?: string
        }
        Update: {
          code?: string
          expires_at?: string | null
          id?: string
          screen_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_presentations_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: true
            referencedRelation: "tv_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_scene_templates: {
        Row: {
          created_by: string | null
          id: string
          name: string
          scene: Json
          screen_id: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_by?: string | null
          id?: string
          name: string
          scene: Json
          screen_id: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_by?: string | null
          id?: string
          name?: string
          scene?: Json
          screen_id?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_scene_templates_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "tv_screens"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_screens: {
        Row: {
          id: string
          label: string
          settings: Json
          updated_at: string
        }
        Insert: {
          id: string
          label: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          label?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          entity_id: string
          id: string
          kind: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          id?: string
          kind: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          id?: string
          kind?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_tasks: {
        Row: {
          assigned_to: string
          created_at: string
          created_by: string
          description: string
          due_at: string | null
          form_id: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          created_at?: string
          created_by: string
          description?: string
          due_at?: string | null
          form_id?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          created_at?: string
          created_by?: string
          description?: string
          due_at?: string | null
          form_id?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tasks_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_request_user: { Args: { p_request_id: string }; Returns: string }
      admin_form_catalogue: { Args: never; Returns: Json }
      admin_form_tasks: {
        Args: { p_form_id?: string; p_offset?: number }
        Returns: Json
      }
      admin_forms_overview: { Args: never; Returns: Json }
      approve_display_code: {
        Args: {
          actor: string
          connection_code: string
          display_name?: string
          hall: string
        }
        Returns: Json
      }
      assign_custom_form_task: {
        Args: {
          p_assigned_to: string
          p_due_at?: string
          p_submission_id: string
          p_title: string
        }
        Returns: string
      }
      community_finance_overview: { Args: never; Returns: Json }
      create_work_task: {
        Args: {
          p_assigned_to: string
          p_description?: string
          p_due_at?: string
          p_form_id?: string
          p_title: string
        }
        Returns: string
      }
      custom_attachment_object: {
        Args: { p_id: string; p_user_id: string }
        Returns: Json
      }
      custom_form_assignees: {
        Args: { p_form_id: string }
        Returns: {
          display_name: string
          id: string
        }[]
      }
      custom_form_export: {
        Args: { p_form_id: string; p_ids?: string[]; p_user_id: string }
        Returns: Json
      }
      custom_form_members: {
        Args: { p_form_id?: string }
        Returns: {
          display_name: string
          id: string
        }[]
      }
      delete_expired_custom_form_upload: {
        Args: { p_id: string }
        Returns: undefined
      }
      expired_custom_form_uploads: {
        Args: never
        Returns: {
          id: string
          object_key: string
        }[]
      }
      finance_member_by_email: { Args: { p_email: string }; Returns: string }
      finish_custom_form_upload: {
        Args: { p_id: string; p_token_hash: string }
        Returns: undefined
      }
      get_custom_form_upload: {
        Args: { p_id: string; p_token_hash: string }
        Returns: Json
      }
      get_my_profile: {
        Args: never
        Returns: {
          display_name: string
          has_assigned_forms: boolean
          id: string
          is_active: boolean
          is_owner: boolean
          permissions: string[]
          staff_kinds: string[]
        }[]
      }
      get_public_form: { Args: { p_slug: string }; Returns: Json }
      get_site_page: { Args: { p_slug: string }; Returns: Json }
      issue_community_invoice: {
        Args: { p_id: string; p_version: number }
        Returns: undefined
      }
      join_tv_presentation: {
        Args: {
          client_hash: string
          credential_hash: string
          hall: string
          session_code: string
          viewer_name: string
        }
        Returns: Json
      }
      join_tv_receiver: {
        Args: { hall: string; input_session: string; receiver_device: string }
        Returns: string
      }
      list_public_forms: {
        Args: never
        Returns: {
          description: string
          id: string
          slug: string
          title: string
          version: number
        }[]
      }
      list_site_pages: { Args: { p_placement?: string }; Returns: Json }
      manage_staff_access: {
        Args: {
          actor: string
          enabled?: boolean
          new_kinds?: string[]
          new_permissions?: string[]
          target: string
        }
        Returns: undefined
      }
      my_community_invoices: { Args: never; Returns: Json }
      prepare_custom_form_upload: {
        Args: {
          p_attempt: string
          p_field_id: string
          p_file_name: string
          p_mime_type: string
          p_size_bytes: number
          p_slug: string
          p_source_key: string
          p_token_hash: string
          p_user_id: string
          p_version: number
        }
        Returns: Json
      }
      public_community_campaigns: { Args: { p_slug?: string }; Returns: Json }
      publish_custom_form: {
        Args: { p_expected_updated_at?: string; p_form_id: string }
        Returns: number
      }
      reassign_form_task: {
        Args: {
          p_assigned_to: string
          p_expected_updated_at: string
          p_task_id: string
        }
        Returns: undefined
      }
      record_community_payment: {
        Args: {
          p_amount: number
          p_campaign: string
          p_date: string
          p_invoice: string
          p_key: string
          p_method: string
          p_reference: string
        }
        Returns: string
      }
      remove_community_safeguarding: {
        Args: { p_id: string }
        Returns: undefined
      }
      reply_custom_form: {
        Args: { p_body: string; p_internal?: boolean; p_submission_id: string }
        Returns: string
      }
      request_display_code: {
        Args: { client_hash: string; credential_hash: string; hall: string }
        Returns: Json
      }
      resolve_account_request: {
        Args: {
          p_actor: string
          p_approve: boolean
          p_kinds: string[]
          p_permissions: string[]
          p_request: string
          p_target: string
        }
        Returns: undefined
      }
      reverse_community_payment: {
        Args: { p_id: string; p_key: string; p_reason: string }
        Returns: string
      }
      review_community_campaign: {
        Args: {
          p_id: string
          p_note: string
          p_status: string
          p_version: number
        }
        Returns: undefined
      }
      salah_reminder_claim: { Args: { p_now?: string }; Returns: Json }
      salah_reminder_device: {
        Args: {
          p_action: string
          p_expected?: string
          p_hash: string
          p_id: string
          p_preferences?: Json
          p_subscription?: Json
        }
        Returns: Json
      }
      salah_reminder_finish: {
        Args: { p_gone_device?: string; p_jobs: Json; p_status: string }
        Returns: undefined
      }
      salah_reminder_heartbeat: { Args: never; Returns: undefined }
      salah_reminder_limit: { Args: { p_bucket: string }; Returns: boolean }
      salah_reminder_runtime: { Args: { p_keys?: Json }; Returns: Json }
      save_community_campaign: {
        Args: { p_body: Json; p_id: string; p_version?: number }
        Returns: string
      }
      save_community_finance_settings: {
        Args: { p_body: Json }
        Returns: undefined
      }
      save_community_invoice: {
        Args: { p_body: Json; p_id: string; p_version?: number }
        Returns: string
      }
      save_community_safeguarding: {
        Args: { p_body: Json; p_id: string; p_version?: number }
        Returns: string
      }
      save_custom_form: { Args: { p_form: Json }; Returns: string }
      save_page_sections: {
        Args: { p_expected: Json; p_page_path: string; p_sections: Json }
        Returns: Json
      }
      save_site_page: { Args: { p_page: Json }; Returns: Json }
      save_tv_presentation: {
        Args: {
          actor: string
          config: Json
          expected: string
          hall: string
          new_code: string
          restart?: boolean
        }
        Returns: Json
      }
      search_form_submissions: {
        Args: {
          p_form_id?: string
          p_from?: string
          p_kind?: string
          p_limit?: number
          p_mine?: boolean
          p_offset?: number
          p_oldest?: boolean
          p_search?: string
          p_status?: string
          p_to?: string
        }
        Returns: Json
      }
      set_custom_form_open: {
        Args: { p_enabled: boolean; p_form_id: string }
        Returns: undefined
      }
      set_custom_form_status: {
        Args: { p_status: string; p_submission_id: string }
        Returns: undefined
      }
      start_named_tv_input: {
        Args: {
          actor: string
          device_name: string
          hall: string
          input_kind: string
          input_slot: string
        }
        Returns: string
      }
      start_tv_input: {
        Args: {
          actor: string
          hall: string
          input_kind: string
          input_slot: string
        }
        Returns: string
      }
      submit_account_request: {
        Args: { p_body: Json; p_source_key: string }
        Returns: undefined
      }
      submit_custom_form: {
        Args: {
          p_answers: Json
          p_attempt: string
          p_slug: string
          p_source_key: string
          p_uploads?: Json
          p_user_id?: string
          p_version: number
        }
        Returns: string
      }
      submit_website_form: {
        Args: { p_kind: string; p_payload: Json; p_source_key: string }
        Returns: undefined
      }
      task_assignees: {
        Args: { p_form_id?: string }
        Returns: {
          display_name: string
          id: string
        }[]
      }
      update_form_task: {
        Args: { p_assigned_to: string; p_status: string; p_task_id: string }
        Returns: undefined
      }
      void_community_invoice: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

