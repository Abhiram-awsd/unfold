/**
 * Database types for supabase-js, matching supabase/migrations (0001–0004).
 * Regenerate after schema changes with:
 *   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Plan = "free" | "pro" | "teams";
/** Portfolio template ids. Keep in sync with lib/templates.ts and the theme check in the migrations. */
export type Theme = "minimal" | "dark" | "interactive" | "creative" | "modern" | "developer" | "atelier" | "prism" | "mono";

/** A link from the resume: LinkedIn, GitHub, personal site, Dribbble… */
export type PortfolioLink = { label: string; url: string };
/** A school, course or certification from the resume. */
export type Education = { school: string; degree: string | null; period: string | null };
/** Appearance options (accent, font pair, light/dark); see lib/theme.ts. Stored as jsonb. */
export type StoredThemeOptions = { accent?: string | null; font?: string; mode?: string };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string | null; plan: Plan; created_at: string };
        Insert: { id?: string; email?: string | null; plan?: Plan; created_at?: string };
        Update: { email?: string | null };
        Relationships: [];
      };
      resumes: {
        Row: { id: string; user_id: string; file_path: string; file_name: string; parsed: Json; created_at: string };
        Insert: { id?: string; user_id?: string; file_path: string; file_name: string; parsed: Json; created_at?: string };
        Update: { file_name?: string };
        Relationships: [];
      };
      portfolios: {
        Row: {
          id: string;
          user_id: string;
          slug: string;
          custom_domain: string | null;
          theme: Theme;
          published: boolean;
          show_badge: boolean;
          name: string;
          headline: string;
          bio: string;
          location: string | null;
          email: string | null;
          show_email: boolean;
          skills: string[];
          links: PortfolioLink[];
          education: Education[];
          avatar_url: string | null;
          theme_options: StoredThemeOptions;
          contact_enabled: boolean;
          resume_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          slug: string;
          theme?: Theme;
          published?: boolean;
          name?: string;
          headline?: string;
          bio?: string;
          location?: string | null;
          email?: string | null;
          show_email?: boolean;
          skills?: string[];
          links?: PortfolioLink[];
          education?: Education[];
          avatar_url?: string | null;
          theme_options?: StoredThemeOptions;
          contact_enabled?: boolean;
          resume_url?: string | null;
          custom_domain?: string | null;
        };
        Update: {
          slug?: string;
          theme?: Theme;
          published?: boolean;
          name?: string;
          headline?: string;
          bio?: string;
          location?: string | null;
          email?: string | null;
          show_email?: boolean;
          skills?: string[];
          links?: PortfolioLink[];
          education?: Education[];
          avatar_url?: string | null;
          theme_options?: StoredThemeOptions;
          contact_enabled?: boolean;
          resume_url?: string | null;
          custom_domain?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          portfolio_id: string;
          user_id: string;
          position: number;
          title: string;
          organization: string | null;
          period: string | null;
          summary: string;
          story: string;
          approved: boolean;
          image_url: string | null;
          link_url: string | null;
          repo: string | null;
          stars: number | null;
          language: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          portfolio_id: string;
          user_id?: string;
          position?: number;
          title: string;
          organization?: string | null;
          period?: string | null;
          summary?: string;
          story?: string;
          approved?: boolean;
          image_url?: string | null;
          link_url?: string | null;
          repo?: string | null;
          stars?: number | null;
          language?: string | null;
        };
        Update: {
          position?: number;
          title?: string;
          organization?: string | null;
          period?: string | null;
          summary?: string;
          story?: string;
          approved?: boolean;
          image_url?: string | null;
          link_url?: string | null;
          repo?: string | null;
          stars?: number | null;
          language?: string | null;
        };
        Relationships: [];
      };
      page_views: {
        Row: { id: number; portfolio_id: string; path: string; referrer: string | null; created_at: string };
        Insert: { portfolio_id: string; path?: string; referrer?: string | null };
        Update: Record<string, never>;
        Relationships: [];
      };
      portfolio_clicks: {
        Row: { id: number; portfolio_id: string; target: string; created_at: string };
        Insert: { portfolio_id: string; target: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      messages: {
        Row: { id: string; portfolio_id: string; user_id: string; sender_name: string; sender_email: string; body: string; sender_hash: string | null; read_at: string | null; created_at: string };
        Insert: { portfolio_id: string; user_id: string; sender_name: string; sender_email: string; body: string; sender_hash?: string | null };
        Update: { read_at?: string | null };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      portfolio_is_published: { Args: { pid: string }; Returns: boolean };
      get_public_portfolio: { Args: { site: string }; Returns: Json };
      send_portfolio_message: { Args: { p_portfolio: string; p_name: string; p_email: string; p_message: string; p_hash: string }; Returns: string };
      portfolio_stats: { Args: { p_days: number; p_tz: string }; Returns: Json };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Portfolio = Database["public"]["Tables"]["portfolios"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];

/** Shape returned by get_public_portfolio(). */
export type PublicPortfolio = {
  id: string;
  slug: string;
  theme: Theme;
  show_badge: boolean;
  name: string;
  headline: string;
  bio: string;
  location: string | null;
  email: string | null;
  skills: string[];
  links: PortfolioLink[];
  education: Education[];
  avatar_url: string | null;
  theme_options: StoredThemeOptions;
  /** The contact form is switched on. */
  contact: boolean;
  /** Public copy of the latest resume, when the owner turned downloads on. */
  resume_url: string | null;
  projects: Array<{
    id: string;
    title: string;
    organization: string | null;
    period: string | null;
    summary: string;
    story: string;
    image_url: string | null;
    link_url: string | null;
    stars: number | null;
    language: string | null;
  }>;
};
