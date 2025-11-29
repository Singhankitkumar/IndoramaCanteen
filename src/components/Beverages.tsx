import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BeverageItem, BeverageOrder } from '../lib/types';
import { Coffee, Plus, Minus, ShoppingCart, CheckCircle, XCircle } from 'lucide-react';

export const Beverages = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<BeverageItem[]>([]);
  const [orders, setOrders] = useState<BeverageOrder[]>([]);
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchItems();
    fetchOrders();
  }, [user]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('beverage_items')
      .select('*')
      .eq('available', true)
      .order('name');

    if (error) {
      console.error('Error fetching items:', error);
      return;
    }

    setItems(data || []);
  };

  const fetchOrders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('beverage_orders')
      .select(`
        *,
        beverage_items (name, price)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }

    setOrders(data || []);
  };

  const updateCart = (itemId: string, change: number) => {
    const newCart = new Map(cart);
    const current = newCart.get(itemId) || 0;
    const newQty = Math.max(0, current + change);

    if (newQty === 0) {
      newCart.delete(itemId);
    } else {
      newCart.set(itemId, newQty);
    }

    setCart(newCart);
  };

  const calculateTotal = () => {
    let total = 0;
    cart.forEach((qty, itemId) => {
      const item = items.find(i => i.id === itemId);
      if (item) {
        total += item.price * qty;
      }
    });
    return total;
  };

  const handlePlaceOrder = async () => {
    if (cart.size === 0) {
      setError('Please add items to cart');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const orderPromises = Array.from(cart.entries()).map(([itemId, qty]) => {
        const item = items.find(i => i.id === itemId);
        if (!item) throw new Error('Item not found');

        return supabase.from('beverage_orders').insert({
          user_id: user?.id,
          beverage_item_id: itemId,
          quantity: qty,
          total_amount: item.price * qty,
          status: 'pending',
        });
      });

      const results = await Promise.all(orderPromises);
      const failed = results.find(r => r.error);

      if (failed?.error) throw failed.error;

      setSuccess('Order placed successfully!');
      setCart(new Map());
      fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'text-blue-600 bg-blue-50';
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      case 'preparing':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Beverages Menu</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Coffee className="w-6 h-6 text-orange-600" />
              Available Beverages
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {success}
              </div>
            )}

            <div className="space-y-3">
              {items.map((item) => {
                const qty = cart.get(item.id) || 0;
                return (
                  <div key={item.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-gray-600">{item.description}</p>
                        )}
                      </div>
                      <span className="text-orange-600 font-bold">₹{item.price}</span>
                    </div>

                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => updateCart(item.id, -1)}
                        disabled={qty === 0}
                        className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-50"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{qty}</span>
                      <button
                        onClick={() => updateCart(item.id, 1)}
                        className="w-8 h-8 flex items-center justify-center bg-orange-100 rounded-full hover:bg-orange-200"
                      >
                        <Plus className="w-4 h-4 text-orange-600" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {cart.size > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-orange-600" />
                Cart Summary
              </h2>

              <div className="space-y-2 mb-4">
                {Array.from(cart.entries()).map(([itemId, qty]) => {
                  const item = items.find(i => i.id === itemId);
                  if (!item) return null;
                  return (
                    <div key={itemId} className="flex justify-between text-sm">
                      <span>{item.name} x {qty}</span>
                      <span className="font-semibold">₹{item.price * qty}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t pt-3 mb-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-orange-600">₹{calculateTotal()}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">My Orders</h2>
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order: any) => (
                  <div key={order.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {order.beverage_items?.name}
                        </h3>
                        <p className="text-sm text-gray-600">Quantity: {order.quantity}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                      <span className="font-semibold text-orange-600">₹{order.total_amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
