import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EstateItem, EstateRequest } from '../lib/types';
import { Home, CheckCircle, XCircle, Clock } from 'lucide-react';

export const EstateRequests = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<EstateItem[]>([]);
  const [requests, setRequests] = useState<EstateRequest[]>([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [roomFlat, setRoomFlat] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchItems();
    fetchRequests();
  }, [user]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('estate_items')
      .select('*')
      .eq('available', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching items:', error);
      return;
    }

    setItems(data || []);
  };

  const fetchRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('estate_requests')
      .select(`
        *,
        estate_items (name, category)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      return;
    }

    setRequests(data || []);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!selectedItem) {
        throw new Error('Please select an item');
      }

      const { error } = await supabase.from('estate_requests').insert({
        user_id: user?.id,
        estate_item_id: selectedItem,
        quantity,
        room_flat: roomFlat,
        notes,
        status: 'requested',
      });

      if (error) throw error;

      setSuccess('Request submitted successfully!');
      setSelectedItem('');
      setQuantity(1);
      setRoomFlat('');
      setNotes('');
      fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'issued':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-blue-600 bg-blue-50';
      case 'issued':
        return 'text-green-600 bg-green-50';
      case 'rejected':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, EstateItem[]>);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
        <Home className="w-8 h-8 text-orange-600" />
        Estate / Household Requests
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">New Request</h2>

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

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Item
                </label>
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Choose an item...</option>
                  {Object.entries(groupedItems).map(([category, categoryItems]) => (
                    <optgroup key={category} label={category}>
                      {categoryItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {selectedItem && (
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    {items.find(i => i.id === selectedItem)?.description}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room / Flat Number
                </label>
                <input
                  type="text"
                  value={roomFlat}
                  onChange={(e) => setRoomFlat(e.target.value)}
                  placeholder="e.g., Room 301, Flat A-204"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Any special requirements..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Items</h2>
            <div className="space-y-4">
              {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category}>
                  <h3 className="font-semibold text-gray-700 mb-2">{category}</h3>
                  <div className="space-y-2 ml-4">
                    {categoryItems.map((item) => (
                      <div key={item.id} className="text-sm text-gray-600">
                        • {item.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">My Requests</h2>
            {requests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No requests yet</p>
            ) : (
              <div className="space-y-3">
                {requests.map((request: any) => (
                  <div key={request.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {request.estate_items?.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Category: {request.estate_items?.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Quantity: {request.quantity}</p>
                      <p>Room/Flat: {request.room_flat}</p>
                      <p className="text-xs text-gray-500">
                        Requested: {new Date(request.created_at).toLocaleDateString()}
                      </p>
                      {request.notes && (
                        <p className="text-xs text-gray-500 mt-2 italic">{request.notes}</p>
                      )}
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
