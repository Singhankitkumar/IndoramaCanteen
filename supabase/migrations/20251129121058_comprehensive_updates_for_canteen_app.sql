/*
  # Comprehensive Updates for Canteen App

  1. New Tables
    - `admin_role_audit` - Track admin role changes
    - `weekly_menu` - Separate table for weekly menu items
    - `home_meal_orders` - Home delivery orders with address
    
  2. Updated Tables
    - `orders` - Add order_type, charge_account, ordered_by_admin_id, ordered_for_employee_id, delivery_charge, delivery_address fields
    - `profiles` - Already has is_admin field
    
  3. Features
    - Admin can place orders on behalf of users
    - Admin role management with audit log
    - Home meal orders with delivery
    - Party orders using orders table with order_type
    - General orders with charge_account
    - Weekly menu system
    - Employee ID tracking on all orders
    
  4. Security
    - Enable RLS on all new tables
    - Proper audit logging
    - Admin-only access controls
*/

-- Admin Role Audit Log Table
CREATE TABLE IF NOT EXISTS admin_role_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  changed_by_admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  previous_role boolean NOT NULL,
  new_role boolean NOT NULL,
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_role_audit_user_id ON admin_role_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_role_audit_changed_by ON admin_role_audit(changed_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_role_audit_created_at ON admin_role_audit(created_at);

-- Weekly Menu Table
CREATE TABLE IF NOT EXISTS weekly_menu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  description text DEFAULT '',
  price numeric(10, 2) NOT NULL,
  is_veg boolean DEFAULT true,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks')),
  image_url text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_menu_day_meal ON weekly_menu(day_of_week, meal_type);
CREATE INDEX IF NOT EXISTS idx_weekly_menu_active ON weekly_menu(active);

-- Home Meal Orders Table
CREATE TABLE IF NOT EXISTS home_meal_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ordered_by_admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  total_amount numeric(10, 2) NOT NULL,
  delivery_charge numeric(10, 2) DEFAULT 0,
  building text NOT NULL,
  flat_no text NOT NULL,
  landmark text DEFAULT '',
  pin_code text NOT NULL,
  status text DEFAULT 'pending',
  notes text DEFAULT '',
  order_time timestamptz DEFAULT now(),
  delivery_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_home_meal_orders_user_id ON home_meal_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_home_meal_orders_status ON home_meal_orders(status);
CREATE INDEX IF NOT EXISTS idx_home_meal_orders_date ON home_meal_orders(order_time);

-- Home Meal Order Items
CREATE TABLE IF NOT EXISTS home_meal_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_meal_order_id uuid REFERENCES home_meal_orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL,
  price numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_home_meal_order_items_order_id ON home_meal_order_items(home_meal_order_id);

-- Update orders table to add new fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'regular' CHECK (order_type IN ('regular', 'party', 'general'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS charge_account text DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ordered_by_admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ordered_for_employee_id text DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_charge numeric(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address text DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS minimum_quantity integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_ordered_by_admin ON orders(ordered_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_orders_ordered_for_employee ON orders(ordered_for_employee_id);

-- Enable RLS
ALTER TABLE admin_role_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_meal_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_meal_order_items ENABLE ROW LEVEL SECURITY;

-- Admin Role Audit Policies
CREATE POLICY "Admins can view all role audit logs"
  ON admin_role_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert role audit logs"
  ON admin_role_audit FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Weekly Menu Policies
CREATE POLICY "Authenticated users can view weekly menu"
  ON weekly_menu FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert weekly menu"
  ON weekly_menu FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update weekly menu"
  ON weekly_menu FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete weekly menu"
  ON weekly_menu FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Home Meal Orders Policies
CREATE POLICY "Users can view own home meal orders"
  ON home_meal_orders FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users and admins can insert home meal orders"
  ON home_meal_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users and admins can update home meal orders"
  ON home_meal_orders FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Home Meal Order Items Policies
CREATE POLICY "Users can view own home meal order items"
  ON home_meal_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM home_meal_orders
      WHERE home_meal_orders.id = home_meal_order_items.home_meal_order_id
      AND (
        home_meal_orders.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.is_admin = true
        )
      )
    )
  );

CREATE POLICY "Users and admins can insert home meal order items"
  ON home_meal_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM home_meal_orders
      WHERE home_meal_orders.id = home_meal_order_items.home_meal_order_id
      AND (
        home_meal_orders.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.is_admin = true
        )
      )
    )
  );

-- Add sample weekly menu data
INSERT INTO weekly_menu (item_name, description, price, is_veg, day_of_week, meal_type, active)
VALUES
  -- Monday
  ('Poha', 'Traditional flattened rice breakfast', 40.00, true, 1, 'breakfast', true),
  ('Idli Sambar', 'Steamed rice cakes with lentil soup', 50.00, true, 1, 'breakfast', true),
  ('Dal Tadka with Rice', 'Yellow lentil curry with steamed rice', 80.00, true, 1, 'lunch', true),
  ('Paneer Butter Masala', 'Cottage cheese in rich tomato gravy', 120.00, true, 1, 'lunch', true),
  ('Roti with Sabzi', 'Indian flatbread with mixed vegetables', 70.00, true, 1, 'dinner', true),
  ('Samosa', 'Fried pastry with spiced potato filling', 20.00, true, 1, 'snacks', true),
  
  -- Tuesday
  ('Upma', 'Savory semolina porridge', 40.00, true, 2, 'breakfast', true),
  ('Masala Dosa', 'Crispy rice crepe with potato filling', 60.00, true, 2, 'breakfast', true),
  ('Chole Rice', 'Chickpea curry with rice', 85.00, true, 2, 'lunch', true),
  ('Chicken Curry', 'Spicy chicken in traditional gravy', 140.00, false, 2, 'lunch', true),
  ('Dal Fry with Roti', 'Tempered lentils with flatbread', 75.00, true, 2, 'dinner', true),
  ('Pakora', 'Deep fried fritters', 30.00, true, 2, 'snacks', true),
  
  -- Wednesday
  ('Paratha with Curd', 'Stuffed flatbread with yogurt', 50.00, true, 3, 'breakfast', true),
  ('Vada Sambar', 'Lentil donuts in spicy soup', 55.00, true, 3, 'breakfast', true),
  ('Rajma Rice', 'Kidney bean curry with rice', 85.00, true, 3, 'lunch', true),
  ('Fish Curry', 'Traditional fish in coconut gravy', 150.00, false, 3, 'lunch', true),
  ('Mixed Veg with Roti', 'Assorted vegetables with flatbread', 80.00, true, 3, 'dinner', true),
  ('Bread Pakora', 'Bread slices in gram flour batter', 25.00, true, 3, 'snacks', true),
  
  -- Thursday
  ('Aloo Paratha', 'Potato stuffed flatbread', 50.00, true, 4, 'breakfast', true),
  ('Puri Bhaji', 'Fried bread with potato curry', 60.00, true, 4, 'breakfast', true),
  ('Kadhi Rice', 'Yogurt curry with rice', 80.00, true, 4, 'lunch', true),
  ('Mutton Curry', 'Slow cooked mutton in spices', 160.00, false, 4, 'lunch', true),
  ('Palak Paneer with Roti', 'Spinach cottage cheese with flatbread', 90.00, true, 4, 'dinner', true),
  ('Veg Cutlet', 'Vegetable patties', 30.00, true, 4, 'snacks', true),
  
  -- Friday
  ('Bread Butter Jam', 'Toast with butter and jam', 40.00, true, 5, 'breakfast', true),
  ('Rava Dosa', 'Crispy semolina crepe', 55.00, true, 5, 'breakfast', true),
  ('Biryani', 'Aromatic rice with spices and vegetables', 100.00, true, 5, 'lunch', true),
  ('Chicken Biryani', 'Aromatic rice with chicken', 150.00, false, 5, 'lunch', true),
  ('Jeera Rice with Curry', 'Cumin rice with curry', 85.00, true, 5, 'dinner', true),
  ('Spring Roll', 'Crispy vegetable rolls', 35.00, true, 5, 'snacks', true),
  
  -- Saturday
  ('Pongal', 'South Indian rice and lentil dish', 45.00, true, 6, 'breakfast', true),
  ('Medu Vada', 'Crispy lentil donuts', 50.00, true, 6, 'breakfast', true),
  ('Pulao with Raita', 'Spiced rice with yogurt dip', 90.00, true, 6, 'lunch', true),
  ('Egg Curry', 'Boiled eggs in spicy gravy', 110.00, false, 6, 'lunch', true),
  ('Chapati with Dal', 'Flatbread with lentil curry', 70.00, true, 6, 'dinner', true),
  ('Bhel Puri', 'Puffed rice savory snack', 30.00, true, 6, 'snacks', true),
  
  -- Sunday
  ('Sandwich', 'Vegetable sandwich', 50.00, true, 0, 'breakfast', true),
  ('Uttapam', 'Thick rice pancake with toppings', 60.00, true, 0, 'breakfast', true),
  ('Special Thali', 'Complete meal with multiple dishes', 120.00, true, 0, 'lunch', true),
  ('Prawn Curry', 'Prawns in coconut curry', 180.00, false, 0, 'lunch', true),
  ('Fried Rice', 'Stir fried rice with vegetables', 85.00, true, 0, 'dinner', true),
  ('Chaat', 'Street food snack', 35.00, true, 0, 'snacks', true)
ON CONFLICT DO NOTHING;

-- Update employee_deductions to support home meal orders
ALTER TABLE employee_deductions ADD COLUMN IF NOT EXISTS home_meal_order_id uuid REFERENCES home_meal_orders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_employee_deductions_home_meal_order_id ON employee_deductions(home_meal_order_id);
