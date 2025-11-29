import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MenuItem } from '../lib/supabase';
import { Search, Plus, Minus, ShoppingCart, CheckCircle, XCircle } from 'lucide-react';

type Profile = {
  id: string;
  full_name: string;
  employee_id: string;
  email: string;
};

export const AdminPlaceOrder = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchMenuItems();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, employee_id, email')
      .order('full_name');

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    setUsers(data || []);
  };

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
      const item = menuItems.find(i => i.id === itemId);
      if (item) {
        total += item.price * qty;
      }
    });
    return total;
  };

  const handlePlaceOrder = async () => {
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    if (cart.size === 0) {
      setError('Please add items to cart');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const total = calculateTotal();

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: selectedUser.id,
          ordered_by_admin_id: user?.id,
          ordered_for_employee_id: selectedUser.employee_id,
          total_amount: total,
          status: 'pending',
          notes,
          order_type: 'regular',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = Array.from(cart.entries()).map(([itemId, qty]) => {
        const item = menuItems.find(i => i.id === itemId);
        return {
          order_id: order.id,
          menu_item_id: itemId,
          quantity: qty,
          price: item?.price || 0,
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setSuccess(`Order placed successfully for ${selectedUser.full_name} (${selectedUser.employee_id}). Order will be charged when completed.`);
      setCart(new Map());
      setNotes('');
      setSelectedUser(null);
      setSearchTerm('');
    } catch (err) {
      console.error('Error placing order:', err);
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const total = calculateTotal();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Place Order on Behalf of User</h1>

      {success && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <XCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Select User</h2>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, employee ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {selectedUser ? (
              <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{selectedUser.full_name}</p>
                    <p className="text-sm text-gray-600">ID: {selectedUser.employee_id}</p>
                    <p className="text-xs text-gray-500">{selectedUser.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setSearchTerm('');
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition"
                  >
                    <p className="font-medium text-gray-800">{u.full_name}</p>
                    <p className="text-sm text-gray-600">ID: {u.employee_id}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Menu Items</h2>
            {!selectedUser ? (
              <p className="text-gray-500 text-center py-8">Please select a user first</p>
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
        </div>

        <div className="space-y-6">
          {cart.size > 0 && (
            <>
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6 text-orange-600" />
                  Order Summary
                </h2>

                {selectedUser && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Ordering for:</strong> {selectedUser.full_name}
                    </p>
                    <p className="text-xs text-gray-600">
                      Employee ID: {selectedUser.employee_id}
                    </p>
                  </div>
                )}

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

                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-orange-600">₹{total}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Notes</h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Add any special instructions or notes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> The amount will be deducted from {selectedUser?.full_name}'s account only when the order status is changed to "Completed".
                  </p>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={loading || !selectedUser || cart.size === 0}
                  className="w-full mt-4 bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition disabled:bg-gray-400"
                >
                  {loading ? 'Placing Order...' : 'Place Order on Behalf'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
