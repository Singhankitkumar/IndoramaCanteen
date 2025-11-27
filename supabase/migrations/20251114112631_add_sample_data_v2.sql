/*
  # Add Sample Data for Canteen System

  This migration adds sample data for:
  - Meal sessions (Breakfast, Lunch, Dinner)
  - Ingredients (vegetables, proteins, spices, etc.)
  - Menu items (dishes across categories)
  - Daily menu assignments
  - Sample consumption logs
*/

DELETE FROM daily_menu WHERE menu_date = CURRENT_DATE;
DELETE FROM menu_item_ingredients;
DELETE FROM menu_items WHERE category IN ('breakfast', 'lunch', 'dinner', 'snacks', 'beverages');
DELETE FROM ingredients;
DELETE FROM meal_sessions WHERE name IN ('Breakfast', 'Lunch', 'Dinner');

INSERT INTO meal_sessions (name, description, start_time, end_time, order_cutoff_minutes_before)
VALUES
  ('Breakfast', 'Early morning breakfast service', '07:00', '09:30', 45),
  ('Lunch', 'Midday lunch service', '12:00', '14:00', 60),
  ('Dinner', 'Evening dinner service', '18:00', '20:00', 45);

INSERT INTO ingredients (name, unit, cost_per_unit, current_stock)
VALUES
  ('Basmati Rice', 'kg', 75.00, 50),
  ('Wheat Flour', 'kg', 45.00, 30),
  ('Chicken Breast', 'kg', 350.00, 20),
  ('Paneer', 'kg', 450.00, 15),
  ('Tomato', 'kg', 40.00, 25),
  ('Onion', 'kg', 35.00, 40),
  ('Garlic', 'kg', 120.00, 5),
  ('Ginger', 'kg', 100.00, 3),
  ('Milk', 'liter', 60.00, 100),
  ('Ghee', 'liter', 800.00, 10),
  ('Oil', 'liter', 150.00, 50),
  ('Turmeric Powder', 'kg', 250.00, 2),
  ('Chili Powder', 'kg', 300.00, 2),
  ('Cumin Seeds', 'kg', 400.00, 1),
  ('Coriander', 'kg', 350.00, 1),
  ('Salt', 'kg', 20.00, 20),
  ('Butter', 'kg', 500.00, 8),
  ('Eggs', 'dozen', 150.00, 30),
  ('Vegetables Mix', 'kg', 60.00, 35),
  ('Lentils', 'kg', 100.00, 20);

INSERT INTO menu_items (name, description, category, price, image_url, available)
VALUES
  ('Butter Chicken', 'Tender chicken in creamy tomato butter sauce with basmati rice', 'lunch', 250.00, '', true),
  ('Paneer Tikka Masala', 'Cottage cheese in aromatic tomato-based curry served with rice', 'lunch', 220.00, '', true),
  ('Biryani', 'Fragrant basmati rice with tender chicken and aromatic spices', 'lunch', 280.00, '', true),
  ('Dal Makhani', 'Creamy lentils cooked overnight with butter and spices', 'lunch', 180.00, '', true),
  ('Vegetable Curry', 'Mixed seasonal vegetables in light curry sauce', 'lunch', 150.00, '', true),
  ('Tandoori Chicken', 'Grilled chicken marinated in yogurt and spices', 'lunch', 240.00, '', true),
  ('Aloo Gobi', 'Potato and cauliflower curry with Indian spices', 'lunch', 140.00, '', true),
  ('Chole Bhature', 'Fried bread with chickpea curry', 'lunch', 160.00, '', true),
  ('Idli', 'Steamed rice and lentil cake with sambar and chutney', 'breakfast', 80.00, '', true),
  ('Dosa', 'Crispy crepe with potato filling, sambar and chutney', 'breakfast', 100.00, '', true),
  ('Poha', 'Flattened rice with vegetables and peanuts', 'breakfast', 70.00, '', true),
  ('Upma', 'Savory semolina porridge with vegetables', 'breakfast', 75.00, '', true),
  ('Paratha', 'Whole wheat flatbread with butter', 'breakfast', 60.00, '', true),
  ('Omelett', 'Fluffy eggs with choice of vegetables', 'breakfast', 90.00, '', true),
  ('Khichdi', 'Rice and lentil one-pot meal with ghee', 'dinner', 130.00, '', true),
  ('Roti with Sabzi', 'Wheat bread with seasonal vegetable curry', 'dinner', 100.00, '', true),
  ('Pulao', 'Fragrant rice with meat and spices', 'dinner', 200.00, '', true),
  ('Fish Curry', 'Fish in coconut and spice-based curry', 'dinner', 220.00, '', true),
  ('Samosa', 'Deep-fried pastry with spiced potato filling', 'snacks', 40.00, '', true),
  ('Pakora', 'Vegetable fritters fried in gram flour batter', 'snacks', 50.00, '', true),
  ('Chai', 'Indian spiced tea with milk', 'beverages', 30.00, '', true),
  ('Coffee', 'Black or with milk', 'beverages', 35.00, '', true),
  ('Fresh Juice', 'Orange, apple, or mixed fruit juice', 'beverages', 60.00, '', true),
  ('Lassi', 'Yogurt-based drink with choice of flavor', 'beverages', 50.00, '', true);

INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity)
SELECT m.id, i.id, qty
FROM (
  SELECT 'Butter Chicken' as dish, 'Chicken Breast' as ing, 0.3 as qty
  UNION ALL SELECT 'Butter Chicken', 'Tomato', 0.2
  UNION ALL SELECT 'Butter Chicken', 'Butter', 0.05
  UNION ALL SELECT 'Paneer Tikka Masala', 'Paneer', 0.25
  UNION ALL SELECT 'Paneer Tikka Masala', 'Tomato', 0.2
  UNION ALL SELECT 'Biryani', 'Basmati Rice', 0.2
  UNION ALL SELECT 'Biryani', 'Chicken Breast', 0.25
  UNION ALL SELECT 'Biryani', 'Ghee', 0.03
  UNION ALL SELECT 'Dal Makhani', 'Lentils', 0.15
  UNION ALL SELECT 'Dal Makhani', 'Butter', 0.04
  UNION ALL SELECT 'Vegetable Curry', 'Vegetables Mix', 0.3
  UNION ALL SELECT 'Tandoori Chicken', 'Chicken Breast', 0.35
  UNION ALL SELECT 'Aloo Gobi', 'Vegetables Mix', 0.25
  UNION ALL SELECT 'Chole Bhature', 'Wheat Flour', 0.2
  UNION ALL SELECT 'Dosa', 'Basmati Rice', 0.1
  UNION ALL SELECT 'Dosa', 'Lentils', 0.05
  UNION ALL SELECT 'Poha', 'Vegetables Mix', 0.1
  UNION ALL SELECT 'Paratha', 'Wheat Flour', 0.1
  UNION ALL SELECT 'Paratha', 'Butter', 0.02
  UNION ALL SELECT 'Omelett', 'Eggs', 0.17
  UNION ALL SELECT 'Khichdi', 'Basmati Rice', 0.1
  UNION ALL SELECT 'Khichdi', 'Lentils', 0.05
  UNION ALL SELECT 'Pulao', 'Basmati Rice', 0.2
  UNION ALL SELECT 'Pulao', 'Chicken Breast', 0.15
  UNION ALL SELECT 'Samosa', 'Wheat Flour', 0.05
  UNION ALL SELECT 'Pakora', 'Vegetables Mix', 0.1
  UNION ALL SELECT 'Chai', 'Milk', 0.15
  UNION ALL SELECT 'Coffee', 'Milk', 0.1
  UNION ALL SELECT 'Lassi', 'Milk', 0.2
) t
JOIN menu_items m ON m.name = t.dish
JOIN ingredients i ON i.name = t.ing;

INSERT INTO daily_menu (menu_date, session_id, menu_item_id, available)
SELECT 
  CURRENT_DATE,
  s.id,
  m.id,
  true
FROM meal_sessions s
CROSS JOIN menu_items m
WHERE 
  (s.name = 'Breakfast' AND m.category = 'breakfast') OR
  (s.name = 'Lunch' AND m.category IN ('lunch', 'snacks', 'beverages')) OR
  (s.name = 'Dinner' AND m.category IN ('dinner', 'snacks', 'beverages'));