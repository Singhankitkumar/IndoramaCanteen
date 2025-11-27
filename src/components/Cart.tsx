import { ShoppingCart, X, Trash2 } from 'lucide-react';
import { MenuItem } from '../lib/supabase';

type CartItem = {
  item: MenuItem;
  quantity: number;
};

type CartProps = {
  items: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveItem: (itemId: string) => void;
  onPlaceOrder: () => void;
};

export const Cart = ({ items, isOpen, onClose, onRemoveItem, onPlaceOrder }: CartProps) => {
  const total = items.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-end">
      <div className="bg-white w-full sm:w-96 h-[80vh] sm:h-auto sm:max-h-[80vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-800">Your Cart</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map(({ item, quantity }) => (
                <div key={item.id} className="flex gap-4 bg-gray-50 rounded-lg p-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-2xl">🍽️</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-600">Qty: {quantity}</p>
                    <p className="text-orange-600 font-bold mt-1">
                      ₹{(item.price * quantity).toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-red-50 text-red-500 rounded-full transition-colors self-start"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600 font-medium">Total</span>
              <span className="text-2xl font-bold text-gray-800">
                ₹{total.toFixed(2)}
              </span>
            </div>
            <button
              onClick={onPlaceOrder}
              className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
            >
              Place Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
