import { useState, useEffect } from 'react';
import { supabase, MenuItem } from '../lib/supabase';
import { PartyOrder } from '../lib/types';
import { X } from 'lucide-react';
import { canOrderParty, getPartyOrderDeadline } from '../utils/sessionUtils';

type PartyOrderFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (order: Partial<PartyOrder>, items: Map<string, number>) => void;
  userId: string;
};

export const PartyOrderForm = ({ isOpen, onClose, onSubmit, userId }: PartyOrderFormProps) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [formData, setFormData] = useState({
    department: '',
    partyDate: '',
    description: '',
    estimatedHeadcount: 1,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMenuItems();
    }
  }, [isOpen]);

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('available', true);

    if (error) {
      console.error('Error fetching menu items:', error);
    } else {
      setMenuItems(data || []);
    }
  };

  const handleAddItem = (itemId: string) => {
    const newItems = new Map(selectedItems);
    newItems.set(itemId, (newItems.get(itemId) || 0) + 1);
    setSelectedItems(newItems);
  };

  const handleRemoveItem = (itemId: string) => {
    const newItems = new Map(selectedItems);
    const current = newItems.get(itemId) || 0;
    if (current > 1) {
      newItems.set(itemId, current - 1);
    } else {
      newItems.delete(itemId);
    }
    setSelectedItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.department) {
      setError('Department is required');
      return;
    }

    if (!formData.partyDate) {
      setError('Party date is required');
      return;
    }

    if (!canOrderParty(formData.partyDate)) {
      setError('Party orders must be placed at least 2 days in advance');
      return;
    }

    if (selectedItems.size === 0) {
      setError('Please select at least one item');
      return;
    }

    setLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      onSubmit(
        {
          department: formData.department,
          party_date: formData.partyDate,
          order_date: today,
          description: formData.description,
          estimated_headcount: formData.estimatedHeadcount,
        },
        selectedItems
      );

      setFormData({
        department: '',
        partyDate: '',
        description: '',
        estimatedHeadcount: 1,
      });
      setSelectedItems(new Map());
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    return tomorrow.toISOString().split('T')[0];
  };

  const totalCost = Array.from(selectedItems.entries()).reduce((sum, [itemId, qty]) => {
    const item = menuItems.find(m => m.id === itemId);
    return sum + (item?.price || 0) * qty;
  }, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Party Order Request</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department *
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                placeholder="e.g., Engineering, HR"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Party Date *
              </label>
              <input
                type="date"
                value={formData.partyDate}
                onChange={(e) =>
                  setFormData({ ...formData, partyDate: e.target.value })
                }
                min={getMinDate()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 2 days from today
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Headcount *
              </label>
              <input
                type="number"
                min="1"
                value={formData.estimatedHeadcount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimatedHeadcount: parseInt(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Total Cost
              </label>
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                <span className="text-lg font-bold text-orange-600">
                  ₹{totalCost.toFixed(2)}
                </span>
              </div>
            </div>
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
              placeholder="Any special requirements or notes..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Select Items *
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {menuItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{item.name}</h4>
                    <p className="text-sm text-gray-600">₹{item.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={!selectedItems.has(item.id)}
                      className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-medium">
                      {selectedItems.get(item.id) || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddItem(item.id)}
                      className="px-2 py-1 text-sm bg-orange-600 text-white hover:bg-orange-700 rounded"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Party Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
