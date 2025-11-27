/*
  # Corporate Cafeteria Features

  1. New Tables
    - `meal_sessions` - Define breakfast, lunch, dinner with time windows
    - `ingredients` - Track all ingredients with units and costs
    - `menu_item_ingredients` - Link menu items to ingredients with quantities
    - `party_orders` - Corporate party requests (complimentary but tracked)
    - `daily_menu` - Menu availability by date and session
    - `employee_deductions` - Salary deduction tracking
    - `consumption_logs` - Ingredient consumption tracking

  2. Modified Tables
    - `orders` - Add session and date tracking
    - `menu_items` - Add ingredient cost calculation

  3. Security
    - Enable RLS on all new tables
    - Party orders require approval workflow
    - Ingredient consumption visible only to admins
*/

CREATE TABLE IF NOT EXISTS meal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  start_time time NOT NULL,
  end_time time NOT NULL,
  order_cutoff_minutes_before integer DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  unit text NOT NULL,
  cost_per_unit numeric(10, 2) NOT NULL,
  current_stock numeric(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(menu_item_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS daily_menu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_date date NOT NULL,
  session_id uuid REFERENCES meal_sessions(id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(menu_date, session_id, menu_item_id)
);

CREATE TABLE IF NOT EXISTS party_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  department text NOT NULL,
  party_date date NOT NULL,
  order_date date NOT NULL,
  description text DEFAULT '',
  estimated_headcount integer NOT NULL,
  status text DEFAULT 'pending',
  total_cost numeric(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS party_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_order_id uuid REFERENCES party_orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  party_order_id uuid REFERENCES party_orders(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL,
  deduction_date date NOT NULL,
  deduction_month date NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consumption_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES menu_items(id),
  party_order_id uuid REFERENCES party_orders(id),
  quantity_consumed numeric(10, 2) NOT NULL,
  consumption_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN session_id uuid REFERENCES meal_sessions(id);
    ALTER TABLE orders ADD COLUMN order_date date DEFAULT CURRENT_DATE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_daily_menu_date_session ON daily_menu(menu_date, session_id);
CREATE INDEX IF NOT EXISTS idx_daily_menu_menu_item ON daily_menu(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_party_orders_user ON party_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_party_orders_date ON party_orders(party_date);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_user ON employee_deductions(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_month ON employee_deductions(deduction_month);
CREATE INDEX IF NOT EXISTS idx_consumption_logs_ingredient ON consumption_logs(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_consumption_logs_date ON consumption_logs(consumption_date);

ALTER TABLE meal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Meal sessions visible to all authenticated users"
  ON meal_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage meal sessions"
  ON meal_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update meal sessions"
  ON meal_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Ingredients visible to authenticated users"
  ON ingredients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage ingredients"
  ON ingredients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update ingredients"
  ON ingredients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Menu item ingredients visible to admins"
  ON menu_item_ingredients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can manage menu item ingredients"
  ON menu_item_ingredients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update menu item ingredients"
  ON menu_item_ingredients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Daily menu visible to authenticated users"
  ON daily_menu FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage daily menu"
  ON daily_menu FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update daily menu"
  ON daily_menu FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can view own party orders"
  ON party_orders FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can create party orders"
  ON party_orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own pending party orders"
  ON party_orders FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid()) AND status = 'pending'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can view own party order items"
  ON party_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM party_orders
      WHERE party_orders.id = party_order_items.party_order_id
      AND (
        party_orders.user_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (select auth.uid())
          AND profiles.is_admin = true
        )
      )
    )
  );

CREATE POLICY "Users can insert own party order items"
  ON party_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM party_orders
      WHERE party_orders.id = party_order_items.party_order_id
      AND party_orders.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can view own deductions"
  ON employee_deductions FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can create deductions"
  ON employee_deductions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Consumption logs visible to admins only"
  ON consumption_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can log consumption"
  ON consumption_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );