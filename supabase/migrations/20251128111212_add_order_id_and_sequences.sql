/*
  # Add Order ID and Sequences

  1. Changes
    - Add order_number column to orders table
    - Add order_number column to party_orders table
    - Create sequences for auto-incrementing order numbers
    - Backfill existing orders with order numbers
    - Create function to generate next order number

  2. Security
    - No changes to RLS policies
*/

DO $$
BEGIN
  -- Create sequence for regular orders if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'orders_number_seq') THEN
    CREATE SEQUENCE orders_number_seq START 1000;
  END IF;

  -- Create sequence for party orders if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'party_orders_number_seq') THEN
    CREATE SEQUENCE party_orders_number_seq START 1000;
  END IF;

  -- Add order_number column to orders if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'order_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_number text UNIQUE;
    
    -- Backfill existing orders with order numbers
    UPDATE orders 
    SET order_number = 'ORD-' || LPAD(nextval('orders_number_seq')::text, 6, '0')
    WHERE order_number IS NULL;
  END IF;

  -- Add order_number column to party_orders if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'party_orders' AND column_name = 'order_number'
  ) THEN
    ALTER TABLE party_orders ADD COLUMN order_number text UNIQUE;
    
    -- Backfill existing party orders with order numbers
    UPDATE party_orders 
    SET order_number = 'PO-' || LPAD(nextval('party_orders_number_seq')::text, 6, '0')
    WHERE order_number IS NULL;
  END IF;
END $$;

-- Create function to generate next order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num text;
BEGIN
  SELECT 'ORD-' || LPAD(nextval('orders_number_seq')::text, 6, '0') INTO next_num;
  RETURN next_num;
END;
$$;

-- Create function to generate next party order number
CREATE OR REPLACE FUNCTION generate_party_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num text;
BEGIN
  SELECT 'PO-' || LPAD(nextval('party_orders_number_seq')::text, 6, '0') INTO next_num;
  RETURN next_num;
END;
$$;

-- Create trigger to auto-generate order numbers for new orders
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_set_order_number ON orders;
CREATE TRIGGER orders_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Create trigger to auto-generate party order numbers for new party orders
CREATE OR REPLACE FUNCTION set_party_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_party_order_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS party_orders_set_order_number ON party_orders;
CREATE TRIGGER party_orders_set_order_number
  BEFORE INSERT ON party_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_party_order_number();