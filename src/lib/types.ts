export type MealSession = {
  id: string;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  order_cutoff_minutes_before: number;
  created_at: string;
  updated_at: string;
};

export type Ingredient = {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  current_stock: number;
  created_at: string;
  updated_at: string;
};

export type MenuItemIngredient = {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity: number;
  created_at: string;
};

export type DailyMenu = {
  id: string;
  menu_date: string;
  session_id: string;
  menu_item_id: string;
  available: boolean;
  created_at: string;
};

export type PartyOrder = {
  id: string;
  user_id: string;
  department: string;
  party_date: string;
  order_date: string;
  description: string;
  estimated_headcount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  total_cost: number;
  created_at: string;
  updated_at: string;
};

export type PartyOrderItem = {
  id: string;
  party_order_id: string;
  menu_item_id: string;
  quantity: number;
  created_at: string;
};

export type EmployeeDeduction = {
  id: string;
  user_id: string;
  order_id: string | null;
  party_order_id: string | null;
  amount: number;
  deduction_date: string;
  deduction_month: string;
  description: string;
  created_at: string;
};

export type ConsumptionLog = {
  id: string;
  ingredient_id: string;
  menu_item_id: string | null;
  party_order_id: string | null;
  quantity_consumed: number;
  consumption_date: string;
  created_at: string;
};
