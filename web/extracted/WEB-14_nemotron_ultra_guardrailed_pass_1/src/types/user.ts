export interface User {
  id: string;
  email: string;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  is_active: boolean;
}