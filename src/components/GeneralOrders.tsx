import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Calendar } from 'lucide-react';

type GeneralOrder = {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  charge_account: string;
  notes: string;
  order_date: string;
  created_at: string;
  ordered_for_employee_id: string;
  order_items: Array<{
    quantity: number;
    price: number;
    menu_items: {
      name: string;
    };
  }>;
};

export const GeneralOrders = () => {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<GeneralOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [user, startDate, endDate]);

  const fetchOrders = async () => {
    if (!user) return;

    setLoading(true);

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          price,
          menu_items (name)
        )
      `)
      .eq('user_id', user.id)
      .eq('order_type', 'general')
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('order_date', startDate);
    }

    if (endDate) {
      query = query.lte('order_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching general orders:', error);
    } else {
      setOrders(data as any || []);
    }

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FileText className="w-8 h-8 text-orange-600" />
          General Orders (View Only)
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No general orders found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Charge Account</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {order.order_number || order.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                      {order.ordered_for_employee_id || profile?.employee_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {order.order_items?.map((item, idx) => (
                        <div key={idx}>
                          {item.menu_items?.name} x {item.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-orange-600">
                      {order.charge_account || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      ₹{order.total_amount}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(order.order_date || order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {order.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> General orders are view-only and do not affect your salary deductions.
          These orders are charged to the specified charge account.
        </p>
      </div>
    </div>
  );
};
