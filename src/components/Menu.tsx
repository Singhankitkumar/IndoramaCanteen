import { useState, useEffect } from 'react';
import { supabase, MenuItem } from '../lib/supabase';
import { MealSession } from '../lib/types';
import { MealSessionMenu } from './MealSessionMenu';
import { Search } from 'lucide-react';

type MenuProps = {
  cart: Map<string, number>;
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (itemId: string) => void;
};

export const Menu = ({ cart, onAddToCart, onRemoveFromCart }: MenuProps) => {
  const [sessions, setSessions] = useState<MealSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('meal_sessions')
      .select('*')
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching meal sessions:', error);
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div>
      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No meal sessions available</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sessions.map((session) => (
            <MealSessionMenu
              key={session.id}
              session={session}
              cart={cart}
              onAddToCart={onAddToCart}
              onRemoveFromCart={onRemoveFromCart}
            />
          ))}
        </div>
      )}
    </div>
  );
};
