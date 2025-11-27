import { useState, useEffect } from 'react';
import { supabase, MenuItem } from '../lib/supabase';
import { MealSession, DailyMenu } from '../lib/types';
import { MenuCard } from './MenuCard';
import { Clock, AlertCircle } from 'lucide-react';
import { isSessionOrderingActive, getTimeUntilCutoff, formatTimeRemaining } from '../utils/sessionUtils';

type MealSessionMenuProps = {
  session: MealSession;
  cart: Map<string, number>;
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (itemId: string) => void;
};

export const MealSessionMenu = ({
  session,
  cart,
  onAddToCart,
  onRemoveFromCart,
}: MealSessionMenuProps) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    fetchSessionMenu();
    const interval = setInterval(() => {
      setIsActive(isSessionOrderingActive(session));
      setTimeRemaining(getTimeUntilCutoff(session));
    }, 60000);

    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    setIsActive(isSessionOrderingActive(session));
    setTimeRemaining(getTimeUntilCutoff(session));
  }, [session]);

  const fetchSessionMenu = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    const { data: dailyMenuData, error: dailyMenuError } = await supabase
      .from('daily_menu')
      .select('menu_item_id, available')
      .eq('menu_date', today)
      .eq('session_id', session.id);

    if (dailyMenuError) {
      console.error('Error fetching daily menu:', dailyMenuError);
      setLoading(false);
      return;
    }

    if (!dailyMenuData || dailyMenuData.length === 0) {
      setMenuItems([]);
      setLoading(false);
      return;
    }

    const availableMenuItemIds = dailyMenuData
      .filter(dm => dm.available)
      .map(dm => dm.menu_item_id);

    if (availableMenuItemIds.length === 0) {
      setMenuItems([]);
      setLoading(false);
      return;
    }

    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select('*')
      .in('id', availableMenuItemIds)
      .eq('available', true);

    if (itemsError) {
      console.error('Error fetching menu items:', itemsError);
    } else {
      setMenuItems(items || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{session.name}</h2>
          <p className="text-gray-600 text-sm">
            {session.start_time} - {session.end_time}
          </p>
        </div>
        {!isActive && (
          <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-600">Ordering closed</span>
          </div>
        )}
        {isActive && (
          <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
            <Clock className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-600">
              {formatTimeRemaining(timeRemaining)}
            </span>
          </div>
        )}
      </div>

      {menuItems.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <p className="text-gray-500">No items available for this session today</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {menuItems.map((item) => (
            <MenuCard
              key={item.id}
              item={item}
              quantity={cart.get(item.id) || 0}
              onAdd={() => isActive && onAddToCart(item)}
              onRemove={() => onRemoveFromCart(item.id)}
              disabled={!isActive}
            />
          ))}
        </div>
      )}
    </div>
  );
};
