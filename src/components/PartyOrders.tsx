import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PartyOrder, PartyOrderItem } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { Clock, CheckCircle, XCircle, Package, AlertCircle } from 'lucide-react';

type PartyOrderWithItems = PartyOrder & {
  items: PartyOrderItem[];
};

export const PartyOrders = () => {
  const { user, profile } = useAuth();
  const [partyOrders, setPartyOrders] = useState<PartyOrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPartyOrders();
    }
  }, [user]);

  const fetchPartyOrders = async () => {
    if (!user) return;

    setLoading(true);
    let query = supabase
      .from('party_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!profile?.is_admin) {
      query = query.eq('user_id', user.id);
    }

    const { data: ordersData, error: ordersError } = await query;

    if (ordersError) {
      console.error('Error fetching party orders:', ordersError);
      setLoading(false);
      return;
    }

    const ordersWithItems = await Promise.all(
      (ordersData || []).map(async (order) => {
        const { data: itemsData } = await supabase
          .from('party_order_items')
          .select('*')
          .eq('party_order_id', order.id);

        return {
          ...order,
          items: itemsData || [],
        };
      })
    );

    setPartyOrders(ordersWithItems);
    setLoading(false);
  };

  const updatePartyOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('party_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating party order:', error);
    } else {
      fetchPartyOrders();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'completed':
        return <Package className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (partyOrders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No party orders yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {partyOrders.map((order) => (
        <div key={order.id} className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800 text-lg">
                {order.department} Party
              </h3>
              <p className="text-sm text-gray-600">
                Party Date: {new Date(order.party_date).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                Ordered: {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-800 mb-2">
                ₹{order.total_cost.toFixed(2)}
              </p>
              <div className="flex items-center gap-2 justify-end">
                {getStatusIcon(order.status)}
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Headcount:</span> {order.estimated_headcount}
            </p>
          </div>

          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-gray-700">Items:</h4>
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm text-gray-600">
                <span>Item #{item.menu_item_id.slice(0, 8)}</span>
                <span>Qty: {item.quantity}</span>
              </div>
            ))}
          </div>

          {order.description && (
            <div className="mb-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Description:</span> {order.description}
              </p>
            </div>
          )}

          {profile?.is_admin && order.status === 'pending' && (
            <div className="flex gap-2 pt-4 border-t">
              <button
                onClick={() => updatePartyOrderStatus(order.id, 'approved')}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => updatePartyOrderStatus(order.id, 'rejected')}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
