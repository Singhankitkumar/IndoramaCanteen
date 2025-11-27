import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  employee_id: string;
  is_admin: boolean;
  created_at: string;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url: string;
  available: boolean;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  pickup_time: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  created_at: string;
};
