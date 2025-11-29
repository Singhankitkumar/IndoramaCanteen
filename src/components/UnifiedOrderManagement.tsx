import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Search, Download, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

type OrderType = 'all' | 'regular' | 'party' | 'general' | 'massage' | 'beverage' | 'home_meal' | 'estate';

export const UnifiedOrderManagement = () => {
  const [orderType, setOrderType] = useState<OrderType>('all');
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [orderType, startDate, endDate, selectedUser, statusFilter]);

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
      let allOrders: any[] = [];

      if (orderType === 'all' || orderType === 'regular' || orderType === 'party' || orderType === 'general') {
        let query = supabase
          .from('orders')
          .select(`
            *,
            profiles!orders_user_id_fkey (full_name, employee_id),
            order_items (
              quantity,
              price,
              menu_items (name)
            )
          `)
          .order('created_at', { ascending: false });

        if (orderType !== 'all') {
          query = query.eq('order_type', orderType);
        }

        if (startDate) query = query.gte('order_date', startDate);
        if (endDate) query = query.lte('order_date', endDate);
        if (selectedUser) query = query.eq('user_id', selectedUser);
        if (statusFilter !== 'all') query = query.eq('status', statusFilter);

        const { data } = await query;
        if (data) {
          allOrders = [...allOrders, ...data.map(o => ({ ...o, type: 'order', subtype: o.order_type }))];
        }
      }

      if (orderType === 'all' || orderType === 'massage') {
        let query = supabase
          .from('massage_bookings')
          .select(`
            *,
            profiles (full_name, employee_id),
            massage_services (name, duration_minutes)
          `)
          .order('created_at', { ascending: false });

        if (startDate) query = query.gte('booking_date', startDate);
        if (endDate) query = query.lte('booking_date', endDate);
        if (selectedUser) query = query.eq('user_id', selectedUser);
        if (statusFilter !== 'all') query = query.eq('status', statusFilter);

        const { data } = await query;
        if (data) {
          allOrders = [...allOrders, ...data.map(o => ({ ...o, type: 'massage' }))];
        }
      }

      if (orderType === 'all' || orderType === 'beverage') {
        let query = supabase
          .from('beverage_orders')
          .select(`
            *,
            profiles (full_name, employee_id),
            beverage_items (name, price)
          `)
          .order('created_at', { ascending: false });

        if (startDate) query = query.gte('order_date', startDate);
        if (endDate) query = query.lte('order_date', endDate);
        if (selectedUser) query = query.eq('user_id', selectedUser);
        if (statusFilter !== 'all') query = query.eq('status', statusFilter);

        const { data } = await query;
        if (data) {
          allOrders = [...allOrders, ...data.map(o => ({ ...o, type: 'beverage' }))];
        }
      }

      if (orderType === 'all' || orderType === 'home_meal') {
        let query = supabase
          .from('home_meal_orders')
          .select(`
            *,
            profiles (full_name, employee_id),
            home_meal_order_items (
              quantity,
              price,
              menu_items (name)
            )
          `)
          .order('created_at', { ascending: false });

        if (startDate) query = query.gte('order_time', startDate);
        if (endDate) query = query.lte('order_time', endDate);
        if (selectedUser) query = query.eq('user_id', selectedUser);
        if (statusFilter !== 'all') query = query.eq('status', statusFilter);

        const { data } = await query;
        if (data) {
          allOrders = [...allOrders, ...data.map(o => ({ ...o, type: 'home_meal' }))];
        }
      }

      if (orderType === 'all' || orderType === 'estate') {
        let query = supabase
          .from('estate_requests')
          .select(`
            *,
            profiles (full_name, employee_id),
            estate_items (name, category)
          `)
          .order('created_at', { ascending: false });

        if (startDate) query = query.gte('request_date', startDate);
        if (endDate) query = query.lte('request_date', endDate);
        if (selectedUser) query = query.eq('user_id', selectedUser);
        if (statusFilter !== 'all') query = query.eq('status', statusFilter);

        const { data } = await query;
        if (data) {
          allOrders = [...allOrders, ...data.map(o => ({ ...o, type: 'estate' }))];
        }
      }

      allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrders(allOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (order: any, newStatus: string) => {
    const previousStatus = order.status;

    let tableName = '';
    let amountField = '';
    let deductionIdField = '';

    switch (order.type) {
      case 'order':
        tableName = 'orders';
        amountField = 'total_amount';
        deductionIdField = 'order_id';
        break;
      case 'massage':
        tableName = 'massage_bookings';
        amountField = 'price';
        deductionIdField = 'massage_booking_id';
        break;
      case 'beverage':
        tableName = 'beverage_orders';
        amountField = 'total_amount';
        deductionIdField = 'beverage_order_id';
        break;
      case 'home_meal':
        tableName = 'home_meal_orders';
        amountField = 'total_amount';
        deductionIdField = 'home_meal_order_id';
        break;
      case 'estate':
        tableName = 'estate_requests';
        break;
    }

    const { error } = await supabase
      .from(tableName)
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', order.id);

    if (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
      return;
    }

    if (newStatus === 'completed' && previousStatus !== 'completed' && order.type !== 'estate' && order.type !== 'order') {
      const deductionData: any = {
        user_id: order.user_id,
        amount: order[amountField],
        deduction_date: new Date().toISOString().split('T')[0],
        deduction_month: new Date(order.created_at).toISOString().slice(0, 7) + '-01',
        description: `${order.type} - ${order.id.slice(0, 8)}`,
      };

      deductionData[deductionIdField] = order.id;

      const { error: deductionError } = await supabase
        .from('employee_deductions')
        .insert(deductionData);

      if (deductionError) {
        console.error('Error creating deduction:', deductionError);
      }
    }

    if (newStatus === 'completed' && previousStatus !== 'completed' && order.type === 'order') {
      const deductionData: any = {
        user_id: order.user_id,
        amount: order.total_amount,
        deduction_date: new Date().toISOString().split('T')[0],
        deduction_month: new Date(order.created_at).toISOString().slice(0, 7) + '-01',
        description: `Order - ${order.order_number || order.id.slice(0, 8)}`,
        order_id: order.id,
      };

      const { error: deductionError } = await supabase
        .from('employee_deductions')
        .insert(deductionData);

      if (deductionError) {
        console.error('Error creating deduction:', deductionError);
      }
    }

    fetchOrders();
  };

  const exportToExcel = () => {
    const exportData = orders.map(order => {
      const baseData = {
        'Type': getOrderTypeLabel(order.type, order.subtype),
        'User': order.profiles?.full_name || 'N/A',
        'Employee ID': order.profiles?.employee_id || order.ordered_for_employee_id || 'N/A',
        'Status': order.status,
        'Date': new Date(order.created_at).toLocaleDateString(),
      };

      switch (order.type) {
        case 'order':
          return {
            ...baseData,
            'Order Number': order.order_number || order.id.slice(0, 8),
            'Amount': order.total_amount,
            'Charge Account': order.charge_account || 'N/A',
          };
        case 'massage':
          return {
            ...baseData,
            'Service': order.massage_services?.name,
            'Booking Time': order.booking_time,
            'Amount': order.price,
          };
        case 'beverage':
          return {
            ...baseData,
            'Item': order.beverage_items?.name,
            'Quantity': order.quantity,
            'Amount': order.total_amount,
          };
        case 'home_meal':
          return {
            ...baseData,
            'Address': `${order.building}, ${order.flat_no}`,
            'Amount': order.total_amount,
            'Delivery Charge': order.delivery_charge,
          };
        case 'estate':
          return {
            ...baseData,
            'Item': order.estate_items?.name,
            'Quantity': order.quantity,
            'Room/Flat': order.room_flat,
          };
        default:
          return baseData;
      }
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    XLSX.writeFile(wb, `all_orders_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getOrderTypeLabel = (type: string, subtype?: string) => {
    if (type === 'order') {
      switch (subtype) {
        case 'regular': return 'Regular Order';
        case 'party': return 'Party Order';
        case 'general': return 'General Order';
        default: return 'Order';
      }
    }
    switch (type) {
      case 'massage': return 'Massage';
      case 'beverage': return 'Beverage';
      case 'home_meal': return 'Home Meal';
      case 'estate': return 'Estate Request';
      default: return type;
    }
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
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800',
      requested: 'bg-yellow-100 text-yellow-800',
      out_for_delivery: 'bg-indigo-100 text-indigo-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getOrderDetails = (order: any) => {
    switch (order.type) {
      case 'order':
        return (
          <>
            <div className="font-medium">{order.order_number || order.id.slice(0, 8)}</div>
            <div className="text-xs text-blue-600 font-semibold">
              Emp: {order.ordered_for_employee_id || order.profiles?.employee_id}
            </div>
            {order.charge_account && (
              <div className="text-xs text-orange-600">Charge: {order.charge_account}</div>
            )}
            <div className="text-gray-600">₹{order.total_amount}</div>
          </>
        );
      case 'massage':
        return (
          <>
            <div className="font-medium">{order.massage_services?.name}</div>
            <div className="text-xs text-blue-600 font-semibold">
              Emp: {order.profiles?.employee_id}
            </div>
            <div className="text-gray-600">{order.booking_time} | ₹{order.price}</div>
          </>
        );
      case 'beverage':
        return (
          <>
            <div className="font-medium">{order.beverage_items?.name}</div>
            <div className="text-xs text-blue-600 font-semibold">
              Emp: {order.profiles?.employee_id}
            </div>
            <div className="text-gray-600">Qty: {order.quantity} | ₹{order.total_amount}</div>
          </>
        );
      case 'home_meal':
        return (
          <>
            <div className="font-medium">Home Delivery</div>
            <div className="text-xs text-blue-600 font-semibold">
              Emp: {order.profiles?.employee_id}
            </div>
            <div className="text-gray-600">{order.building}, {order.flat_no}</div>
            <div className="text-gray-600">₹{order.total_amount} (incl. ₹{order.delivery_charge} delivery)</div>
          </>
        );
      case 'estate':
        return (
          <>
            <div className="font-medium">{order.estate_items?.name}</div>
            <div className="text-xs text-blue-600 font-semibold">
              Emp: {order.profiles?.employee_id}
            </div>
            <div className="text-gray-600">Qty: {order.quantity} | {order.room_flat}</div>
          </>
        );
      default:
        return null;
    }
  };

  const getStatusOptions = (type: string) => {
    switch (type) {
      case 'massage':
        return ['pending', 'confirmed', 'completed', 'cancelled'];
      case 'estate':
        return ['requested', 'approved', 'issued', 'rejected'];
      case 'home_meal':
        return ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
      default:
        return ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">All Orders Management</h1>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Download className="w-5 h-5" />
          Export to Excel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Order Type
            </label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as OrderType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Orders</option>
              <option value="regular">Regular Orders</option>
              <option value="party">Party Orders</option>
              <option value="general">General Orders</option>
              <option value="massage">Massage Bookings</option>
              <option value="beverage">Beverage Orders</option>
              <option value="home_meal">Home Meal Orders</option>
              <option value="estate">Estate Requests</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              User
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.employee_id})
                </option>
              ))}
            </select>
          </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <strong>Total Orders:</strong> {orders.length}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={`${order.type}-${order.id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-medium">
                        {getOrderTypeLabel(order.type, order.subtype)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {order.profiles?.full_name || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.profiles?.employee_id || order.ordered_for_employee_id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {getOrderDetails(order)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(
                        order.booking_date ||
                        order.order_date ||
                        order.request_date ||
                        order.order_time ||
                        order.created_at
                      ).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-orange-500"
                      >
                        {getStatusOptions(order.type).map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
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
  );
};
