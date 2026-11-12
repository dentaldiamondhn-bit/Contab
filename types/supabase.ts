/**
 * Tipos para Supabase - compatibilidad con código existente
 */

export interface SupabaseClient {
  from(table: string): SupabaseQueryBuilder;
  storage: SupabaseStorage;
  rpc(fn: string, params: any): Promise<{ data: any; error: any }>;
  auth: SupabaseAuth;
}

export interface SupabaseQueryBuilder {
  select(columns?: string): SupabaseQueryBuilder;
  insert(values: any): SupabaseQueryBuilder;
  update(values: any): SupabaseQueryBuilder;
  delete(): SupabaseQueryBuilder;
  eq(column: string, value: any): SupabaseQueryBuilder;
  in(column: string, values: any[]): SupabaseQueryBuilder;
  gte(column: string, value: any): SupabaseQueryBuilder;
  lte(column: string, value: any): SupabaseQueryBuilder;
  gt(column: string, value: any): SupabaseQueryBuilder;
  lt(column: string, value: any): SupabaseQueryBuilder;
  neq(column: string, value: any): SupabaseQueryBuilder;
  like(column: string, pattern: string): SupabaseQueryBuilder;
  ilike(column: string, pattern: string): SupabaseQueryBuilder;
  is(column: string, value: null): SupabaseQueryBuilder;
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder;
  limit(count: number): SupabaseQueryBuilder;
  range(from: number, to: number): SupabaseQueryBuilder;
  single(): Promise<{ data: any; error: any }>;
  maybeSingle(): Promise<{ data: any; error: any }>;
  then(onfulfilled?: (value: { data: any; error: any }) => any): Promise<any>;
  catch(onrejected?: (reason: any) => any): Promise<any>;
}

export interface SupabaseStorage {
  from(bucket: string): SupabaseStorageBucket;
}

export interface SupabaseStorageBucket {
  upload(path: string, file: any, options?: any): Promise<{ data: { path: string; id: string; fullPath: string } | null; error: any }>;
  download(path: string): Promise<{ data: Blob | null; error: any }>;
  remove(paths: string[]): Promise<{ data: any; error: any }>;
  list(path?: string, options?: any): Promise<{ data: any[] | null; error: any }>;
  getPublicUrl(path: string): { data: { publicUrl: string }; error: null };
  createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: any }>;
}

export interface SupabaseAuth {
  getSession(): Promise<{ data: { session: any }; error: any }>;
  getUser(): Promise<{ data: { user: any }; error: any }>;
  signInWithPassword(credentials: { email: string; password: string }): Promise<{ data: any; error: any }>;
  signUp(credentials: { email: string; password: string }): Promise<{ data: any; error: any }>;
  signOut(): Promise<{ error: any }>;
}

// Database type for Supabase - generic for code that doesn't use generated types
export type Database = {
  public: {
    Tables: Record<string, {
      Row: Record<string, any>;
      Insert: Record<string, any>;
      Update: Record<string, any>;
    }>;
    Views: Record<string, any>;
    Functions: Record<string, any>;
    Enums: Record<string, any>;
  };
};