import { useState, useEffect } from 'react';
import { supabase, MenuItem, Order } from '../lib/supabase';
import { StockManagement } from './StockManagement';
import { Plus, Edit2, Trash2, Package, Boxes } from 'lucide-react';

export const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'stock'>('menu');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenuItems();
    fetchOrders();
  }, []);

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching menu items:', error);
    } else {
      setMenuItems(data || []);
    }
    setLoading(false);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const previousStatus = orders.find(o => o.id === orderId)?.status;

    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order:', error);
      return;
    }

    if (status === 'completed' && previousStatus !== 'completed') {
      const { data: orderData } = await supabase
        .from('orders')
        .select('user_id, total_amount, created_at')
        .eq('id', orderId)
        .single();

      if (orderData) {
        const { error: deductionError } = await supabase
          .from('employee_deductions')
          .insert({
            user_id: orderData.user_id,
            order_id: orderId,
            amount: orderData.total_amount,
            deduction_date: new Date().toISOString().split('T')[0],
            deduction_month: new Date(orderData.created_at).toISOString().slice(0, 7) + '-01',
            description: `Order #${orderId.slice(0, 8)} - Meal deduction`,
          });

        if (deductionError) {
          console.error('Error creating deduction:', deductionError);
        }
      }
    }

    fetchOrders();
  };

  const deleteMenuItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const { error } = await supabase.from('menu_items').delete().eq('id', id);

    if (error) {
      console.error('Error deleting item:', error);
    } else {
      fetchMenuItems();
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm mb-6">
        <div className="flex border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'menu'
                ? 'border-b-2 border-orange-600 text-orange-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Package className="w-5 h-5" />
            Menu Management
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-b-2 border-orange-600 text-orange-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Package className="w-5 h-5" />
            Order Management
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'stock'
                ? 'border-b-2 border-orange-600 text-orange-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Boxes className="w-5 h-5" />
            Stock Management
          </button>
        </div>
      </div>

      {activeTab === 'menu' ? (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Menu Items</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Available
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-800">{item.name}</td>
                    <td className="px-6 py-4 text-gray-600 capitalize">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 text-gray-800">₹{item.price}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.available
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.available ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="text-blue-600 hover:text-blue-700 mr-3"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteMenuItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'stock' ? (
        <StockManagement />
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Order Management</h2>
            <div className="flex gap-2 text-sm">
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                {orders.filter(o => o.status === 'pending').length} Pending
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                {orders.filter(o => o.status === 'preparing').length} Preparing
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                {orders.filter(o => o.status === 'ready').length} Ready
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {orders.map((order) => {
              const statusColors = {
                pending: 'bg-yellow-50 border-yellow-200',
                preparing: 'bg-blue-50 border-blue-200',
                ready: 'bg-green-50 border-green-200',
                completed: 'bg-gray-50 border-gray-200',
                cancelled: 'bg-red-50 border-red-200',
              };

              const statusBadgeColors = {
                pending: 'bg-yellow-100 text-yellow-800',
                preparing: 'bg-blue-100 text-blue-800',
                ready: 'bg-green-100 text-green-800',
                completed: 'bg-gray-100 text-gray-800',
                cancelled: 'bg-red-100 text-red-800',
              };

              return (
                <div
                  key={order.id}
                  className={`rounded-xl shadow-sm p-5 border-2 transition-all hover:shadow-md ${statusColors[order.status as keyof typeof statusColors]}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900 text-lg">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(order.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusBadgeColors[order.status as keyof typeof statusBadgeColors]}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="mb-4 pb-4 border-b">
                    <p className="text-2xl font-bold text-gray-900">
                      ₹{order.total_amount.toFixed(2)}
                    </p>
                    {order.pickup_time && (
                      <p className="text-xs text-gray-600 mt-1">
                        Pickup: {new Date(order.pickup_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>

                  {order.notes && (
                    <div className="mb-4 p-2 bg-white rounded-lg">
                      <p className="text-xs text-gray-500 font-medium mb-1">Notes:</p>
                      <p className="text-sm text-gray-700">{order.notes}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 block">
                      Update Status
                    </label>
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                    >
                      <option value="pending">🕐 Pending</option>
                      <option value="preparing">👨‍🍳 Preparing</option>
                      <option value="ready">✅ Ready for Pickup</option>
                      <option value="completed">✔️ Completed</option>
                      <option value="cancelled">❌ Cancelled</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {orders.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No orders yet</p>
            </div>
          )}
        </div>
      )}

      {(showAddModal || editingItem) && (
        <MenuItemModal
          item={editingItem}
          onClose={() => {
            setShowAddModal(false);
            setEditingItem(null);
          }}
          onSave={() => {
            setShowAddModal(false);
            setEditingItem(null);
            fetchMenuItems();
          }}
        />
      )}
    </div>
  );
};

type MenuItemModalProps = {
  item: MenuItem | null;
  onClose: () => void;
  onSave: () => void;
};

const MenuItemModal = ({ item, onClose, onSave }: MenuItemModalProps) => {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    category: item?.category || 'lunch',
    price: item?.price || 0,
    image_url: item?.image_url || '',
    available: item?.available ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (item) {
      const { error } = await supabase
        .from('menu_items')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (error) {
        console.error('Error updating item:', error);
        return;
      }
    } else {
      const { error } = await supabase.from('menu_items').insert(formData);

      if (error) {
        console.error('Error creating item:', error);
        return;
      }
    }

    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {item ? 'Edit Menu Item' : 'Add Menu Item'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snacks">Snacks</option>
              <option value="beverages">Beverages</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (₹)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: parseFloat(e.target.value) })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) =>
                setFormData({ ...formData, image_url: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="available"
              checked={formData.available}
              onChange={(e) =>
                setFormData({ ...formData, available: e.target.checked })
              }
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <label
              htmlFor="available"
              className="ml-2 text-sm font-medium text-gray-700"
            >
              Available
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
            >
              {item ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
