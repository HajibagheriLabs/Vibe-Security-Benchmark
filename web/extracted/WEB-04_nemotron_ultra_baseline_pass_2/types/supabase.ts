import { User } from '@supabase/supabase-js';

export interface AdminUser extends User {
  profile?: {
    role: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface UserListParams {
  page?: number;
  perPage?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}