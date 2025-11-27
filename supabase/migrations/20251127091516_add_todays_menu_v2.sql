/*
  # Add Today's Daily Menu

  Populates the daily menu for today with available items for Breakfast, Lunch, and Dinner
*/

DO $$
DECLARE
  breakfast_session_id uuid;
  lunch_session_id uuid;
  dinner_session_id uuid;
  menu_count int := 0;
BEGIN
  SELECT id INTO breakfast_session_id FROM meal_sessions WHERE name = 'Breakfast' LIMIT 1;
  SELECT id INTO lunch_session_id FROM meal_sessions WHERE name = 'Lunch' LIMIT 1;
  SELECT id INTO dinner_session_id FROM meal_sessions WHERE name = 'Dinner' LIMIT 1;
  
  IF breakfast_session_id IS NULL OR lunch_session_id IS NULL OR dinner_session_id IS NULL THEN
    RAISE EXCEPTION 'Required meal sessions not found';
  END IF;
  
  DELETE FROM daily_menu WHERE menu_date = CURRENT_DATE;
  
  INSERT INTO daily_menu (menu_date, session_id, menu_item_id, available)
  SELECT 
    CURRENT_DATE,
    breakfast_session_id,
    id,
    true
  FROM menu_items
  WHERE category = 'breakfast' OR name IN ('Chai', 'Coffee', 'Lassi', 'Fresh Juice');
  
  GET DIAGNOSTICS menu_count = ROW_COUNT;
  RAISE NOTICE 'Added % items to Breakfast', menu_count;
  
  INSERT INTO daily_menu (menu_date, session_id, menu_item_id, available)
  SELECT 
    CURRENT_DATE,
    lunch_session_id,
    id,
    true
  FROM menu_items
  WHERE category = 'lunch' OR name IN ('Chapati', 'Chai', 'Lassi');
  
  GET DIAGNOSTICS menu_count = ROW_COUNT;
  RAISE NOTICE 'Added % items to Lunch', menu_count;
  
  INSERT INTO daily_menu (menu_date, session_id, menu_item_id, available)
  SELECT 
    CURRENT_DATE,
    dinner_session_id,
    id,
    true
  FROM menu_items
  WHERE category = 'dinner' OR name IN ('Chapati', 'Chai', 'Samosa', 'Pakora');
  
  GET DIAGNOSTICS menu_count = ROW_COUNT;
  RAISE NOTICE 'Added % items to Dinner', menu_count;
  
  RAISE NOTICE '=== Daily Menu for % Created Successfully ===', CURRENT_DATE;

END $$;