import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Filter, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

type OrderType = 'general' | 'massage' | 'beverage' | 'party' | 'estate';

export const AdminOrderManagement = () => {
  const [activeTab, setActiveTab] = useState<OrderType>('general');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchOrders();
  }, [activeTab, startDate, endDate, userFilter]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, employee_id')
      .order('full_name');
    setUsers(data || []);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query: any;

      switch (activeTab) {
        case 'general':
          query = supabase
            .from('orders')
            .select(`
              *,
              profiles (full_name, employee_id),
              order_items (
                quantity,
                price,
                menu_items (name)
              )
            `);
          break;

        case 'massage':
          query = supabase
            .from('massage_bookings')
            .select(`
              *,
              profiles (full_name, employee_id),
              massage_services (name, duration_minutes)
            `);
          break;

        case 'beverage':
          query = supabase
            .from('beverage_orders')
            .select(`
              *,
              profiles (full_name, employee_id),
              beverage_items (name)
            `);
          break;

        case 'party':
          query = supabase
            .from('party_orders')
            .select(`
              *,
              profiles (full_name, employee_id),
              party_order_items (
                quantity,
                menu_items (name)
              )
            `);
          break;

        case 'estate':
          query = supabase
            .from('estate_requests')
            .select(`
              *,
              profiles (full_name, employee_id),
              estate_items (name, category)
            `);
          break;
      }

      if (userFilter) {
        query = query.eq('user_id', userFilter);
      }

      if (startDate) {
        const dateField = activeTab === 'massage' ? 'booking_date' :
                         activeTab === 'beverage' ? 'order_date' :
                         activeTab === 'estate' ? 'request_date' :
                         activeTab === 'party' ? 'party_date' : 'created_at';
        query = query.gte(dateField, startDate);
      }

      if (endDate) {
        const dateField = activeTab === 'massage' ? 'booking_date' :
                         activeTab === 'beverage' ? 'order_date' :
                         activeTab === 'estate' ? 'request_date' :
                         activeTab === 'party' ? 'party_date' : 'created_at';
        query = query.lte(dateField, endDate);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    let table = '';
    switch (activeTab) {
      case 'general':
        table = 'orders';
        break;
      case 'massage':
        table = 'massage_bookings';
        break;
      case 'beverage':
        table = 'beverage_orders';
        break;
      case 'party':
        table = 'party_orders';
        break;
      case 'estate':
        table = 'estate_requests';
        break;
    }

    const { error } = await supabase
      .from(table)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating status:', error);
      return;
    }

    if (status === 'completed' && activeTab === 'beverage') {
      const order = orders.find(o => o.id === id);
      if (order) {
        await supabase.from('employee_deductions').insert({
          user_id: order.user_id,
          beverage_order_id: id,
          amount: order.total_amount,
          deduction_date: new Date().toISOString().split('T')[0],
          deduction_month: new Date().toISOString().slice(0, 7) + '-01',
          description: `Beverage order - Auto deduction`,
        });
      }
    }

    if (status === 'completed' && activeTab === 'massage') {
      const booking = orders.find(o => o.id === id);
      if (booking) {
        await supabase.from('employee_deductions').insert({
          user_id: booking.user_id,
          massage_booking_id: id,
          amount: booking.price,
          deduction_date: new Date().toISOString().split('T')[0],
          deduction_month: new Date().toISOString().slice(0, 7) + '-01',
          description: `Massage booking - Auto deduction`,
        });
      }
    }

    fetchOrders();
  };

  const exportToExcel = () => {
    const exportData = orders.map(order => {
      const baseData = {
        'Employee Name': order.profiles?.full_name || '',
        'Employee ID': order.profiles?.employee_id || '',
        'Status': order.status || '',
        'Date': new Date(order.created_at).toLocaleDateString(),
      };

      switch (activeTab) {
        case 'general':
          return {
            ...baseData,
            'Order Number': order.order_number || '',
            'Total Amount': order.total_amount || 0,
            'Items': order.order_items?.map((item: any) => `${item.menu_items?.name} (${item.quantity})`).join(', ') || '',
          };
        case 'massage':
          return {
            ...baseData,
            'Service': order.massage_services?.name || '',
            'Booking Date': order.booking_date || '',
            'Booking Time': order.booking_time || '',
            'Price': order.price || 0,
          };
        case 'beverage':
          return {
            ...baseData,
            'Item': order.beverage_items?.name || '',
            'Quantity': order.quantity || 0,
            'Total Amount': order.total_amount || 0,
          };
        case 'party':
          return {
            ...baseData,
            'Order Number': order.order_number || '',
            'Department': order.department || '',
            'Party Date': order.party_date || '',
            'Headcount': order.estimated_headcount || 0,
            'Total Cost': order.total_cost || 0,
          };
        case 'estate':
          return {
            ...baseData,
            'Item': order.estate_items?.name || '',
            'Category': order.estate_items?.category || '',
            'Quantity': order.quantity || 0,
            'Room/Flat': order.room_flat || '',
          };
        default:
          return baseData;
      }
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    XLSX.writeFile(wb, `${activeTab}_orders_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      approved: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      ready: 'bg-cyan-100 text-cyan-800',
      completed: 'bg-green-100 text-green-800',
      issued: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800',
      requested: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const tabs: { key: OrderType; label: string }[] = [
    { key: 'general', label: 'General Orders' },
    { key: 'massage', label: 'Massage Appointments' },
    { key: 'beverage', label: 'Beverage Orders' },
    { key: 'party', label: 'Party Orders' },
    { key: 'estate', label: 'Estate Requests' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Order Management</h1>

      <div className="bg-white rounded-xl shadow-md mb-6">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-b-2 border-orange-600 text-orange-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Filter by User
              </label>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.employee_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={exportToExcel}
                disabled={orders.length === 0}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-center py-8 text-gray-500">Loading...</p>
          ) : orders.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No orders found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{order.profiles?.full_name}</div>
                        <div className="text-xs text-gray-500">{order.profiles?.employee_id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {activeTab === 'general' && (
                          <>
                            <div className="font-medium">{order.order_number}</div>
                            <div className="text-gray-600">₹{order.total_amount}</div>
                          </>
                        )}
                        {activeTab === 'massage' && (
                          <>
                            <div className="font-medium">{order.massage_services?.name}</div>
                            <div className="text-gray-600">{order.booking_time}</div>
                          </>
                        )}
                        {activeTab === 'beverage' && (
                          <>
                            <div className="font-medium">{order.beverage_items?.name}</div>
                            <div className="text-gray-600">Qty: {order.quantity} - ₹{order.total_amount}</div>
                          </>
                        )}
                        {activeTab === 'party' && (
                          <>
                            <div className="font-medium">{order.order_number}</div>
                            <div className="text-gray-600">{order.department} - {order.estimated_headcount} people</div>
                          </>
                        )}
                        {activeTab === 'estate' && (
                          <>
                            <div className="font-medium">{order.estate_items?.name}</div>
                            <div className="text-gray-600">Qty: {order.quantity} - {order.room_flat}</div>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(order.booking_date || order.party_date || order.order_date || order.request_date || order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-orange-500"
                        >
                          {activeTab === 'general' && (
                            <>
                              <option value="pending">Pending</option>
                              <option value="preparing">Preparing</option>
                              <option value="ready">Ready</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </>
                          )}
                          {activeTab === 'massage' && (
                            <>
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </>
                          )}
                          {activeTab === 'beverage' && (
                            <>
                              <option value="pending">Pending</option>
                              <option value="preparing">Preparing</option>
                              <option value="ready">Ready</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </>
                          )}
                          {activeTab === 'party' && (
                            <>
                              <option value="pending">Pending</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                              <option value="completed">Completed</option>
                            </>
                          )}
                          {activeTab === 'estate' && (
                            <>
                              <option value="requested">Requested</option>
                              <option value="approved">Approved</option>
                              <option value="issued">Issued</option>
                              <option value="rejected">Rejected</option>
                            </>
                          )}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
