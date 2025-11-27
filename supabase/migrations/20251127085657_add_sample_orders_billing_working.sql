/*
  # Add Sample Orders and Billing Data

  This migration adds realistic sample data for:
  1. Regular meal orders with order items
  2. Employee deductions for billing
  3. Sample party orders (approved and pending)
*/

DO $$
DECLARE
  sample_user_id uuid;
  order_id1 uuid;
  order_id2 uuid;
  order_id3 uuid;
  party_order_id1 uuid;
  party_order_id2 uuid;
  butter_chicken_id uuid;
  biryani_id uuid;
  dal_makhani_id uuid;
  dosa_id uuid;
  chai_id uuid;
  paneer_id uuid;
  samosa_id uuid;
BEGIN
  SELECT id INTO sample_user_id FROM profiles ORDER BY created_at LIMIT 1;
  
  IF sample_user_id IS NULL THEN
    RAISE NOTICE 'No users found, skipping sample data insertion';
    RETURN;
  END IF;

  SELECT id INTO butter_chicken_id FROM menu_items WHERE name = 'Butter Chicken' LIMIT 1;
  SELECT id INTO biryani_id FROM menu_items WHERE name = 'Biryani' LIMIT 1;
  SELECT id INTO dal_makhani_id FROM menu_items WHERE name = 'Dal Makhani' LIMIT 1;
  SELECT id INTO dosa_id FROM menu_items WHERE name = 'Dosa' LIMIT 1;
  SELECT id INTO chai_id FROM menu_items WHERE name = 'Chai' LIMIT 1;
  SELECT id INTO paneer_id FROM menu_items WHERE name = 'Paneer Tikka Masala' LIMIT 1;
  SELECT id INTO samosa_id FROM menu_items WHERE name = 'Samosa' LIMIT 1;

  INSERT INTO orders (user_id, total_amount, status, notes, pickup_time, created_at)
  VALUES 
    (sample_user_id, 280.00, 'completed', 'Extra spicy', now() - INTERVAL '5 days' + INTERVAL '13 hours', now() - INTERVAL '5 days' + INTERVAL '10 hours')
  RETURNING id INTO order_id1;
  
  INSERT INTO order_items (order_id, menu_item_id, quantity, price)
  VALUES 
    (order_id1, butter_chicken_id, 1, 250.00),
    (order_id1, chai_id, 1, 30.00);

  INSERT INTO orders (user_id, total_amount, status, notes, pickup_time, created_at)
  VALUES 
    (sample_user_id, 460.00, 'completed', 'No onions please', now() - INTERVAL '3 days' + INTERVAL '12 hours 30 minutes', now() - INTERVAL '3 days' + INTERVAL '9 hours')
  RETURNING id INTO order_id2;
  
  INSERT INTO order_items (order_id, menu_item_id, quantity, price)
  VALUES 
    (order_id2, biryani_id, 1, 280.00),
    (order_id2, dal_makhani_id, 1, 180.00);

  INSERT INTO orders (user_id, total_amount, status, notes, pickup_time, created_at)
  VALUES 
    (sample_user_id, 200.00, 'completed', 'Breakfast combo', now() - INTERVAL '1 day' + INTERVAL '8 hours', now() - INTERVAL '1 day' + INTERVAL '7 hours')
  RETURNING id INTO order_id3;
  
  INSERT INTO order_items (order_id, menu_item_id, quantity, price)
  VALUES 
    (order_id3, dosa_id, 2, 100.00);

  INSERT INTO party_orders (
    user_id, 
    department, 
    party_date, 
    order_date, 
    description, 
    estimated_headcount, 
    total_cost, 
    status,
    created_at
  )
  VALUES 
    (
      sample_user_id,
      'Engineering Department',
      (now() + INTERVAL '5 days')::date,
      (now() - INTERVAL '2 days')::date,
      'Team lunch for project completion celebration - Q4 deliverable success',
      25,
      6750.00,
      'approved',
      now() - INTERVAL '2 days' + INTERVAL '10 hours'
    )
  RETURNING id INTO party_order_id1;
  
  INSERT INTO party_order_items (party_order_id, menu_item_id, quantity)
  VALUES 
    (party_order_id1, butter_chicken_id, 15),
    (party_order_id1, paneer_id, 10),
    (party_order_id1, biryani_id, 10);

  INSERT INTO party_orders (
    user_id, 
    department, 
    party_date, 
    order_date, 
    description, 
    estimated_headcount, 
    total_cost, 
    status,
    created_at
  )
  VALUES 
    (
      sample_user_id,
      'HR Department',
      (now() + INTERVAL '10 days')::date,
      now()::date,
      'New employee onboarding welcome lunch',
      15,
      2850.00,
      'pending',
      now()
    )
  RETURNING id INTO party_order_id2;
  
  INSERT INTO party_order_items (party_order_id, menu_item_id, quantity)
  VALUES 
    (party_order_id2, paneer_id, 10),
    (party_order_id2, dal_makhani_id, 5),
    (party_order_id2, samosa_id, 20);

  INSERT INTO employee_deductions (
    user_id,
    order_id,
    amount,
    deduction_date,
    deduction_month,
    description,
    created_at
  )
  VALUES
    (sample_user_id, order_id1, 280.00, (now() - INTERVAL '5 days')::date, date_trunc('month', now()), 'Lunch: Butter Chicken, Chai', now() - INTERVAL '5 days' + INTERVAL '10 hours'),
    (sample_user_id, order_id2, 460.00, (now() - INTERVAL '3 days')::date, date_trunc('month', now()), 'Lunch: Biryani, Dal Makhani', now() - INTERVAL '3 days' + INTERVAL '9 hours'),
    (sample_user_id, order_id3, 200.00, (now() - INTERVAL '1 day')::date, date_trunc('month', now()), 'Breakfast: 2x Dosa', now() - INTERVAL '1 day' + INTERVAL '7 hours');

  INSERT INTO employee_deductions (
    user_id,
    party_order_id,
    amount,
    deduction_date,
    deduction_month,
    description,
    created_at
  )
  VALUES
    (sample_user_id, party_order_id1, 6750.00, (now() - INTERVAL '2 days')::date, date_trunc('month', now() + INTERVAL '5 days'), 'Engineering Team Party (Approved)', now() - INTERVAL '2 days' + INTERVAL '10 hours');

  RAISE NOTICE '=== Sample Data Inserted Successfully ===';
  RAISE NOTICE 'User ID: %', sample_user_id;
  RAISE NOTICE 'Regular Orders:';
  RAISE NOTICE '  Order 1: ₹280 (Butter Chicken + Chai) - 5 days ago';
  RAISE NOTICE '  Order 2: ₹460 (Biryani + Dal Makhani) - 3 days ago';
  RAISE NOTICE '  Order 3: ₹200 (2x Dosa) - 1 day ago';
  RAISE NOTICE 'Party Orders:';
  RAISE NOTICE '  Party 1: ₹6,750 (Engineering - APPROVED for 25 people)';
  RAISE NOTICE '  Party 2: ₹2,850 (HR - PENDING for 15 people)';
  RAISE NOTICE 'Total Deductions This Month: ₹7,690';
  RAISE NOTICE '  - Regular Meals: ₹940';
  RAISE NOTICE '  - Party Orders: ₹6,750';

END $$;