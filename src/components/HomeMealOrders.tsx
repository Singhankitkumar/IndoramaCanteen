import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MenuItem } from '../lib/supabase';
import { HomeMealOrder } from '../lib/types';
import { Home, Plus, Minus, ShoppingCart, MapPin, X } from 'lucide-react';

const DELIVERY_CHARGE = 50;
const ORDER_CUTOFF_TIME = 18;

export const HomeMealOrders = () => {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<HomeMealOrder[]>([]);
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [deliveryInfo, setDeliveryInfo] = useState({
    building: '',
    flat_no: '',
    landmark: '',
    pin_code: '',
    notes: '',
  });

  useEffect(() => {
    fetchMenuItems();
    fetchOrders();
  }, [user]);

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('available', true)
      .order('category');

    if (error) {
      console.error('Error fetching menu items:', error);
      return;
    }

    setMenuItems(data || []);
  };

  const fetchOrders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('home_meal_orders')
      .select(`
        *,
        home_meal_order_items (
          quantity,
          price,
          menu_items (name)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }

    setOrders(data as any || []);
  };

  const isOrderingAllowed = () => {
    const currentHour = new Date().getHours();
    return currentHour < ORDER_CUTOFF_TIME;
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

  const calculateSubtotal = () => {
    let total = 0;
    cart.forEach((qty, itemId) => {
      const item = menuItems.find(i => i.id === itemId);
      if (item) {
        total += item.price * qty;
      }
    });
    return total;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.size === 0) {
      alert('Please add items to cart');
      return;
    }

    if (!isOrderingAllowed()) {
      alert(`Home meal ordering is only allowed before ${ORDER_CUTOFF_TIME}:00 (6 PM)`);
      return;
    }

    setLoading(true);

    try {
      const subtotal = calculateSubtotal();
      const total = subtotal + DELIVERY_CHARGE;

      const { data: order, error: orderError } = await supabase
        .from('home_meal_orders')
        .insert({
          user_id: user?.id,
          total_amount: total,
          delivery_charge: DELIVERY_CHARGE,
          building: deliveryInfo.building,
          flat_no: deliveryInfo.flat_no,
          landmark: deliveryInfo.landmark,
          pin_code: deliveryInfo.pin_code,
          notes: deliveryInfo.notes,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = Array.from(cart.entries()).map(([itemId, qty]) => {
        const item = menuItems.find(i => i.id === itemId);
        return {
          home_meal_order_id: order.id,
          menu_item_id: itemId,
          quantity: qty,
          price: item?.price || 0,
        };
      });

      const { error: itemsError } = await supabase
        .from('home_meal_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      alert('Home meal order placed successfully!');
      setCart(new Map());
      setShowOrderForm(false);
      setDeliveryInfo({
        building: '',
        flat_no: '',
        landmark: '',
        pin_code: '',
        notes: '',
      });
      fetchOrders();
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = calculateSubtotal();
  const total = subtotal + DELIVERY_CHARGE;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Home className="w-8 h-8 text-orange-600" />
            Home Meal Orders
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Order cutoff time: {ORDER_CUTOFF_TIME}:00 (6 PM) | Delivery Charge: ₹{DELIVERY_CHARGE}
          </p>
          {!isOrderingAllowed() && (
            <p className="text-sm text-red-600 mt-1">
              Home meal ordering is closed for today. Please order before 6 PM.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Menu Items</h2>

            {!isOrderingAllowed() ? (
              <p className="text-center text-gray-500 py-8">
                Ordering is closed for today. Please come back before 6 PM tomorrow.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {menuItems.map((item) => {
                  const qty = cart.get(item.id) || 0;
                  return (
                    <div key={item.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{item.name}</h3>
                          <p className="text-xs text-gray-600">{item.category}</p>
                        </div>
                        <span className="text-orange-600 font-bold">₹{item.price}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateCart(item.id, -1)}
                          disabled={qty === 0}
                          className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 disabled:opacity-50"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-semibold">{qty}</span>
                        <button
                          onClick={() => updateCart(item.id, 1)}
                          className="w-7 h-7 flex items-center justify-center bg-orange-100 rounded-full hover:bg-orange-200"
                        >
                          <Plus className="w-4 h-4 text-orange-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {cart.size > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Cart Summary</h2>
              <div className="space-y-2 mb-4">
                {Array.from(cart.entries()).map(([itemId, qty]) => {
                  const item = menuItems.find(i => i.id === itemId);
                  if (!item) return null;
                  return (
                    <div key={itemId} className="flex justify-between text-sm">
                      <span>{item.name} x {qty}</span>
                      <span className="font-semibold">₹{item.price * qty}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span className="font-semibold">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delivery Charge</span>
                  <span className="font-semibold">₹{DELIVERY_CHARGE}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span className="text-orange-600">₹{total}</span>
                </div>
              </div>
              <button
                onClick={() => setShowOrderForm(true)}
                disabled={!isOrderingAllowed()}
                className="w-full mt-4 bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition disabled:bg-gray-400"
              >
                Proceed to Delivery Details
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">My Home Orders</h2>
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No orders yet</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {orders.map((order: any) => (
                  <div key={order.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs text-gray-500">
                          {new Date(order.order_time).toLocaleString()}
                        </p>
                        <p className="text-sm font-medium text-gray-800 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {order.building}, {order.flat_no}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded font-medium">
                        {order.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {order.home_meal_order_items?.map((item: any, idx: number) => (
                        <p key={idx}>• {item.menu_items?.name} x {item.quantity}</p>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t flex justify-between">
                      <span className="text-sm text-gray-600">Total (incl. delivery)</span>
                      <span className="font-semibold text-orange-600">₹{order.total_amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showOrderForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Delivery Details</h2>
              <button onClick={() => setShowOrderForm(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Building/Society Name *</label>
                <input
                  type="text"
                  value={deliveryInfo.building}
                  onChange={(e) => setDeliveryInfo({ ...deliveryInfo, building: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flat/House Number *</label>
                <input
                  type="text"
                  value={deliveryInfo.flat_no}
                  onChange={(e) => setDeliveryInfo({ ...deliveryInfo, flat_no: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
                <input
                  type="text"
                  value={deliveryInfo.landmark}
                  onChange={(e) => setDeliveryInfo({ ...deliveryInfo, landmark: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIN Code *</label>
                <input
                  type="text"
                  value={deliveryInfo.pin_code}
                  onChange={(e) => setDeliveryInfo({ ...deliveryInfo, pin_code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                  pattern="[0-9]{6}"
                  placeholder="6-digit PIN"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                <textarea
                  value={deliveryInfo.notes}
                  onChange={(e) => setDeliveryInfo({ ...deliveryInfo, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span>Food Total:</span>
                  <span className="font-semibold">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Delivery Charge:</span>
                  <span className="font-semibold">₹{DELIVERY_CHARGE}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-orange-200 pt-2 mt-2">
                  <span>Total to Pay:</span>
                  <span className="text-orange-600">₹{total}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Placing Order...' : 'Confirm Order'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
