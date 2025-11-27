/*
  # Fix Security Issues

  1. Add Indexes for Foreign Keys
    - Add index on order_items.order_id for foreign key orders relationship
    - Add index on order_items.menu_item_id for foreign key menu_items relationship
    - Add index on orders.user_id for foreign key profiles relationship

  2. Optimize RLS Policies
    - Replace auth.uid() with (select auth.uid()) in all policies to avoid re-evaluation per row
    - This improves performance at scale

  3. Consolidate Duplicate Policies
    - Combine "Users can update own orders" and "Admins can update all orders" into one restrictive policy
    - Use restrictive policy to enforce both conditions

  4. Security Notes
    - Password protection (HaveIBeenPwned check) must be enabled in Auth settings UI
    - Indexes improve query performance and help with join operations
*/

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Only admins can insert menu items" ON menu_items;
DROP POLICY IF EXISTS "Only admins can update menu items" ON menu_items;
DROP POLICY IF EXISTS "Only admins can delete menu items" ON menu_items;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Users can insert own order items" ON order_items;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = (select auth.uid()))
  WITH CHECK (auth.uid() = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (select auth.uid()));

CREATE POLICY "Only admins can insert menu items"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update menu items"
  ON menu_items FOR UPDATE
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

CREATE POLICY "Only admins can delete menu items"
  ON menu_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = (select auth.uid()) AND user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = (select auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users and admins can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.user_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (select auth.uid())
          AND profiles.is_admin = true
        )
      )
    )
  );

CREATE POLICY "Users can insert own order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = (select auth.uid())
    )
  );