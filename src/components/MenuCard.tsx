import { Plus, Minus } from 'lucide-react';
import { MenuItem } from '../lib/supabase';

type MenuCardProps = {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  disabled?: boolean;
};

export const MenuCard = ({ item, quantity, onAdd, onRemove, disabled = false }: MenuCardProps) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all ${
      disabled ? 'opacity-60' : 'hover:shadow-md'
    }`}>
      <div className="h-48 bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-5xl">🍽️</span>
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-800 text-lg">{item.name}</h3>
          <span className="text-orange-600 font-bold">₹{item.price}</span>
        </div>
        {item.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded">
            {item.category}
          </span>
          {item.available ? (
            <div className="flex items-center gap-2">
              {quantity > 0 ? (
                <>
                  <button
                    onClick={onRemove}
                    disabled={disabled}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                      disabled
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-gray-800 w-6 text-center">
                    {quantity}
                  </span>
                </>
              ) : null}
              <button
                onClick={onAdd}
                disabled={disabled}
                className={`w-8 h-8 flex items-center justify-center text-white rounded-full transition-colors ${
                  disabled
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <span className="text-red-500 text-sm font-medium">Unavailable</span>
          )}
        </div>
      </div>
    </div>
  );
};
