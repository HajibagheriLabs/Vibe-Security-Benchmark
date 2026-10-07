export interface Profile {
  id: string;
  role: 'user' | 'admin' | 'moderator';
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithProfile {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    role?: string;
  };
  profile?: Profile;
}