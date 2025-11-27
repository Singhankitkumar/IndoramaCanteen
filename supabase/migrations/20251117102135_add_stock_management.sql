/*
  # Add Stock Management System

  1. New Tables
    - `stock_adjustments` - Track all inventory changes (add/subtract)
    - `stock_history` - Audit log of all stock transactions

  2. Modifications
    - Update `ingredients` table with low_stock_threshold

  3. Security
    - Enable RLS on new tables
    - Only admins can adjust stock
    - Track who made changes and when
*/

ALTER TABLE ingredients
ADD COLUMN IF NOT EXISTS low_stock_threshold numeric(10, 2) DEFAULT 5,
ADD COLUMN IF NOT EXISTS last_restocked_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  adjustment_quantity numeric(10, 2) NOT NULL,
  adjustment_type text NOT NULL,
  reason text NOT NULL,
  previous_stock numeric(10, 2) NOT NULL,
  new_stock numeric(10, 2) NOT NULL,
  adjusted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  quantity numeric(10, 2),
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_ingredient ON stock_adjustments(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_created ON stock_adjustments(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_adjusted_by ON stock_adjustments(adjusted_by);
CREATE INDEX IF NOT EXISTS idx_stock_history_ingredient ON stock_history(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_created ON stock_history(created_at);

ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stock adjustments visible to admins"
  ON stock_adjustments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can create stock adjustments"
  ON stock_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Stock history visible to admins"
  ON stock_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can create stock history"
  ON stock_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

UPDATE ingredients
SET 
  low_stock_threshold = CASE
    WHEN name IN ('Basmati Rice', 'Wheat Flour', 'Oil') THEN 10
    WHEN name IN ('Chicken Breast', 'Paneer', 'Vegetables Mix') THEN 5
    WHEN name IN ('Garlic', 'Ginger', 'Cumin Seeds', 'Coriander') THEN 1
    ELSE 3
  END,
  current_stock = CASE
    WHEN name = 'Basmati Rice' THEN 45
    WHEN name = 'Wheat Flour' THEN 28
    WHEN name = 'Chicken Breast' THEN 18
    WHEN name = 'Paneer' THEN 12
    WHEN name = 'Tomato' THEN 22
    WHEN name = 'Onion' THEN 35
    WHEN name = 'Garlic' THEN 4.5
    WHEN name = 'Ginger' THEN 2.8
    WHEN name = 'Milk' THEN 95
    WHEN name = 'Ghee' THEN 9
    WHEN name = 'Oil' THEN 48
    WHEN name = 'Turmeric Powder' THEN 1.8
    WHEN name = 'Chili Powder' THEN 1.9
    WHEN name = 'Cumin Seeds' THEN 0.9
    WHEN name = 'Coriander' THEN 0.8
    WHEN name = 'Salt' THEN 18
    WHEN name = 'Butter' THEN 7
    WHEN name = 'Eggs' THEN 25
    WHEN name = 'Vegetables Mix' THEN 32
    WHEN name = 'Lentils' THEN 18
    ELSE current_stock
  END
WHERE name IN (
  'Basmati Rice', 'Wheat Flour', 'Chicken Breast', 'Paneer', 'Tomato', 'Onion',
  'Garlic', 'Ginger', 'Milk', 'Ghee', 'Oil', 'Turmeric Powder', 'Chili Powder',
  'Cumin Seeds', 'Coriander', 'Salt', 'Butter', 'Eggs', 'Vegetables Mix', 'Lentils'
);

INSERT INTO stock_history (ingredient_id, action, quantity, notes, created_by)
SELECT 
  id,
  'Initial Stock',
  current_stock,
  'System initialization - dummy stock data',
  NULL
FROM ingredients
WHERE name IN (
  'Basmati Rice', 'Wheat Flour', 'Chicken Breast', 'Paneer', 'Tomato', 'Onion',
  'Garlic', 'Ginger', 'Milk', 'Ghee', 'Oil', 'Turmeric Powder', 'Chili Powder',
  'Cumin Seeds', 'Coriander', 'Salt', 'Butter', 'Eggs', 'Vegetables Mix', 'Lentils'
);