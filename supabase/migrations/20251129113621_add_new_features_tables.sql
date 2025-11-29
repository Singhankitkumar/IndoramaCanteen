/*
  # Add New Feature Tables for Canteen App

  1. New Tables
    - `massage_services` - Ayurvedic massage services catalog
    - `massage_bookings` - User massage appointment bookings
    - `beverage_items` - Beverages menu items
    - `beverage_orders` - Beverage orders with auto-deduction
    - `estate_items` - Estate/Household items catalog (bedsheets, towels, etc.)
    - `estate_requests` - User requests for estate items
    
  2. Security
    - Enable RLS on all tables
    - Users can view and create their own bookings/orders/requests
    - Admins can view and manage all records
    - Proper indexes on foreign keys for performance

  3. Features
    - Massage booking with date/time slots
    - Beverage ordering with auto-deduction
    - Estate requests with approval workflow
    - All linked to existing profiles and deduction system
*/

-- Massage Services Table
CREATE TABLE IF NOT EXISTS massage_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration_minutes integer NOT NULL,
  price numeric(10, 2) NOT NULL,
  description text DEFAULT '',
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Massage Bookings Table
CREATE TABLE IF NOT EXISTS massage_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES massage_services(id) ON DELETE CASCADE NOT NULL,
  booking_date date NOT NULL,
  booking_time time NOT NULL,
  status text DEFAULT 'pending',
  price numeric(10, 2) NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Beverage Items Table (separate from menu_items)
CREATE TABLE IF NOT EXISTS beverage_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10, 2) NOT NULL,
  description text DEFAULT '',
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Beverage Orders Table
CREATE TABLE IF NOT EXISTS beverage_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  beverage_item_id uuid REFERENCES beverage_items(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL,
  total_amount numeric(10, 2) NOT NULL,
  status text DEFAULT 'pending',
  order_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Estate Items Catalog
CREATE TABLE IF NOT EXISTS estate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text DEFAULT '',
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Estate Requests Table
CREATE TABLE IF NOT EXISTS estate_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  estate_item_id uuid REFERENCES estate_items(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL,
  room_flat text NOT NULL,
  status text DEFAULT 'requested',
  request_date date DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_massage_bookings_user_id ON massage_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_massage_bookings_service_id ON massage_bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_massage_bookings_date ON massage_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_massage_bookings_status ON massage_bookings(status);

CREATE INDEX IF NOT EXISTS idx_beverage_orders_user_id ON beverage_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_beverage_orders_beverage_item_id ON beverage_orders(beverage_item_id);
CREATE INDEX IF NOT EXISTS idx_beverage_orders_date ON beverage_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_beverage_orders_status ON beverage_orders(status);

CREATE INDEX IF NOT EXISTS idx_estate_requests_user_id ON estate_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_estate_requests_estate_item_id ON estate_requests(estate_item_id);
CREATE INDEX IF NOT EXISTS idx_estate_requests_date ON estate_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_estate_requests_status ON estate_requests(status);

-- Enable RLS
ALTER TABLE massage_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE massage_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE beverage_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE beverage_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE estate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE estate_requests ENABLE ROW LEVEL SECURITY;

-- Massage Services Policies
CREATE POLICY "Authenticated users can view massage services"
  ON massage_services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert massage services"
  ON massage_services FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update massage services"
  ON massage_services FOR UPDATE
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

CREATE POLICY "Admins can delete massage services"
  ON massage_services FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Massage Bookings Policies
CREATE POLICY "Users can view own massage bookings"
  ON massage_bookings FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can insert own massage bookings"
  ON massage_bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users and admins can update massage bookings"
  ON massage_bookings FOR UPDATE
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

-- Beverage Items Policies
CREATE POLICY "Authenticated users can view beverage items"
  ON beverage_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert beverage items"
  ON beverage_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update beverage items"
  ON beverage_items FOR UPDATE
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

CREATE POLICY "Admins can delete beverage items"
  ON beverage_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Beverage Orders Policies
CREATE POLICY "Users can view own beverage orders"
  ON beverage_orders FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can insert own beverage orders"
  ON beverage_orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users and admins can update beverage orders"
  ON beverage_orders FOR UPDATE
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

-- Estate Items Policies
CREATE POLICY "Authenticated users can view estate items"
  ON estate_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert estate items"
  ON estate_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update estate items"
  ON estate_items FOR UPDATE
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

CREATE POLICY "Admins can delete estate items"
  ON estate_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Estate Requests Policies
CREATE POLICY "Users can view own estate requests"
  ON estate_requests FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can insert own estate requests"
  ON estate_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users and admins can update estate requests"
  ON estate_requests FOR UPDATE
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

-- Add sample data for testing

-- Sample Massage Services
INSERT INTO massage_services (name, duration_minutes, price, description, available)
VALUES
  ('Swedish Massage', 60, 1500.00, 'Full body relaxation massage using gentle pressure', true),
  ('Deep Tissue Massage', 60, 1800.00, 'Targets deep muscle layers to relieve chronic pain', true),
  ('Ayurvedic Head Massage', 30, 800.00, 'Traditional head and scalp massage with herbal oils', true),
  ('Aromatherapy Massage', 90, 2500.00, 'Relaxing massage with essential oils for stress relief', true),
  ('Hot Stone Massage', 75, 2200.00, 'Heated stones to ease muscle tension and improve circulation', true)
ON CONFLICT DO NOTHING;

-- Sample Beverage Items
INSERT INTO beverage_items (name, price, description, available)
VALUES
  ('Coffee (Hot)', 30.00, 'Freshly brewed hot coffee', true),
  ('Tea (Hot)', 20.00, 'Traditional chai tea', true),
  ('Cold Coffee', 50.00, 'Iced coffee with milk', true),
  ('Fresh Lime Soda', 40.00, 'Refreshing lime soda', true),
  ('Mango Juice', 60.00, 'Fresh mango juice', true),
  ('Buttermilk', 30.00, 'Traditional spiced buttermilk', true),
  ('Tender Coconut', 50.00, 'Fresh tender coconut water', true),
  ('Masala Chai', 25.00, 'Spiced Indian tea', true)
ON CONFLICT DO NOTHING;

-- Sample Estate Items
INSERT INTO estate_items (name, category, description, available)
VALUES
  ('Bedsheet (Single)', 'Linen', 'Single bed bedsheet', true),
  ('Bedsheet (Double)', 'Linen', 'Double bed bedsheet', true),
  ('Pillow Cover', 'Linen', 'Standard pillow cover', true),
  ('Bath Towel', 'Towels', 'Large bath towel', true),
  ('Hand Towel', 'Towels', 'Small hand towel', true),
  ('Face Towel', 'Towels', 'Face towel', true),
  ('Blanket', 'Linen', 'Warm blanket', true),
  ('Pillow', 'Linen', 'Standard pillow', true)
ON CONFLICT DO NOTHING;

-- Update employee_deductions to support massage and beverage deductions
ALTER TABLE employee_deductions ADD COLUMN IF NOT EXISTS massage_booking_id uuid REFERENCES massage_bookings(id) ON DELETE CASCADE;
ALTER TABLE employee_deductions ADD COLUMN IF NOT EXISTS beverage_order_id uuid REFERENCES beverage_orders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_employee_deductions_massage_booking_id ON employee_deductions(massage_booking_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_beverage_order_id ON employee_deductions(beverage_order_id);
