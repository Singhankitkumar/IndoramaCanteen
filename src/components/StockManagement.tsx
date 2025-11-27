import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Ingredient } from '../lib/types';
import { AlertCircle, Plus, Minus, Package, TrendingDown, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

type StockAdjustment = {
  id: string;
  ingredient_id: string;
  adjustment_quantity: number;
  adjustment_type: 'add' | 'subtract';
  reason: string;
  previous_stock: number;
  new_stock: number;
  created_at: string;
};

export const StockManagement = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [adjustment, setAdjustment] = useState({
    quantity: '',
    type: 'add' as 'add' | 'subtract',
    reason: '',
  });
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchIngredients();
    fetchAdjustments();
  }, []);

  const fetchIngredients = async () => {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching ingredients:', error);
    } else {
      setIngredients(data || []);
    }
    setLoading(false);
  };

  const fetchAdjustments = async () => {
    const { data, error } = await supabase
      .from('stock_adjustments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching adjustments:', error);
    } else {
      setAdjustments(data || []);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient || !adjustment.quantity || !adjustment.reason) {
      setMessage('Please fill all fields');
      return;
    }

    const quantity = parseFloat(adjustment.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      setMessage('Quantity must be a positive number');
      return;
    }

    const previousStock = selectedIngredient.current_stock;
    const newStock =
      adjustment.type === 'add'
        ? previousStock + quantity
        : previousStock - quantity;

    if (newStock < 0) {
      setMessage(`Cannot subtract ${quantity}. Only ${previousStock} available.`);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data: currentUser } = await supabase.auth.getUser();

      const { error: adjustmentError } = await supabase
        .from('stock_adjustments')
        .insert({
          ingredient_id: selectedIngredient.id,
          adjustment_quantity: quantity,
          adjustment_type: adjustment.type,
          reason: adjustment.reason,
          previous_stock: previousStock,
          new_stock: newStock,
          adjusted_by: currentUser?.user?.id,
        });

      if (adjustmentError) throw adjustmentError;

      const { error: updateError } = await supabase
        .from('ingredients')
        .update({
          current_stock: newStock,
          last_restocked_at: new Date().toISOString(),
        })
        .eq('id', selectedIngredient.id);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('stock_history')
        .insert({
          ingredient_id: selectedIngredient.id,
          action: adjustment.type === 'add' ? 'Stock Added' : 'Stock Subtracted',
          quantity: quantity,
          notes: adjustment.reason,
          created_by: currentUser?.user?.id,
        });

      if (historyError) throw historyError;

      setMessage(`Successfully ${adjustment.type === 'add' ? 'added' : 'removed'} ${quantity} units!`);
      setAdjustment({ quantity: '', type: 'add', reason: '' });
      setShowAdjustmentForm(false);
      setSelectedIngredient(null);

      await fetchIngredients();
      await fetchAdjustments();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      setMessage('Failed to adjust stock. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['Ingredient Name', 'New Stock Quantity', 'Unit', 'Reason for Update'],
      ['Basmati Rice', '50', 'kg', 'Stock replenishment'],
      ['Chicken Breast', '25', 'kg', 'Weekly delivery'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Template');
    XLSX.writeFile(wb, 'stock_update_template.xlsx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadMessage('Processing file...');
    setLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        setUploadMessage('No data found in file');
        setLoading(false);
        return;
      }

      const { data: currentUser } = await supabase.auth.getUser();
      let successCount = 0;
      let errorCount = 0;

      for (const row of jsonData) {
        const ingredientName = row['Ingredient Name'] || row['ingredient_name'];
        const newStock = parseFloat(row['New Stock Quantity'] || row['new_stock_quantity'] || row['quantity']);
        const reason = row['Reason for Update'] || row['reason'] || 'Bulk upload';

        if (!ingredientName || isNaN(newStock)) {
          errorCount++;
          continue;
        }

        const ingredient = ingredients.find(
          (i) => i.name.toLowerCase() === ingredientName.toLowerCase()
        );

        if (!ingredient) {
          errorCount++;
          continue;
        }

        const previousStock = ingredient.current_stock;

        const { error: adjustmentError } = await supabase
          .from('stock_adjustments')
          .insert({
            ingredient_id: ingredient.id,
            adjustment_quantity: Math.abs(newStock - previousStock),
            adjustment_type: newStock > previousStock ? 'add' : 'subtract',
            reason: reason,
            previous_stock: previousStock,
            new_stock: newStock,
            adjusted_by: currentUser?.user?.id,
          });

        if (adjustmentError) {
          errorCount++;
          continue;
        }

        const { error: updateError } = await supabase
          .from('ingredients')
          .update({
            current_stock: newStock,
            last_restocked_at: new Date().toISOString(),
          })
          .eq('id', ingredient.id);

        if (updateError) {
          errorCount++;
          continue;
        }

        await supabase.from('stock_history').insert({
          ingredient_id: ingredient.id,
          action: 'Bulk Upload',
          quantity: newStock,
          notes: reason,
          created_by: currentUser?.user?.id,
        });

        successCount++;
      }

      setUploadMessage(
        `Upload complete! ${successCount} updated, ${errorCount} failed.`
      );
      await fetchIngredients();
      await fetchAdjustments();
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadMessage('Failed to process file. Please check format.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const exportCurrentStock = () => {
    const exportData = ingredients.map((ing) => ({
      'Ingredient Name': ing.name,
      'Current Stock': ing.current_stock,
      'Unit': ing.unit,
      'Low Stock Threshold': ing.low_stock_threshold,
      'Cost per Unit': ing.cost_per_unit,
      'Status': ing.current_stock <= ing.low_stock_threshold ? 'LOW STOCK' : 'OK',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Current Stock');
    XLSX.writeFile(wb, `stock_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredIngredients = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = filteredIngredients.filter(
    (ing) => ing.current_stock <= ing.low_stock_threshold
  );

  const normalStockItems = filteredIngredients.filter(
    (ing) => ing.current_stock > ing.low_stock_threshold
  );

  if (loading && ingredients.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-6">
      {/* Search and Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-600" />
            Stock Management
          </h2>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Items</p>
            <p className="text-2xl font-bold text-gray-800">{filteredIngredients.length}</p>
          </div>
        </div>

        <input
          type="text"
          placeholder="Search ingredients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4"
        />

        <div className="flex flex-wrap gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="stock-upload"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            Upload Excel
          </button>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
          <button
            onClick={exportCurrentStock}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Current Stock
          </button>
        </div>

        {uploadMessage && (
          <div
            className={`mt-4 px-4 py-2 rounded-lg text-sm ${
              uploadMessage.includes('complete') || uploadMessage.includes('Successfully')
                ? 'bg-green-50 text-green-700'
                : uploadMessage.includes('Failed') || uploadMessage.includes('error')
                ? 'bg-red-50 text-red-700'
                : 'bg-blue-50 text-blue-700'
            }`}
          >
            {uploadMessage}
          </div>
        )}
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-2">Low Stock Alert</h3>
              <div className="space-y-1">
                {lowStockItems.map((ing) => (
                  <p key={ing.id} className="text-sm text-red-700">
                    <span className="font-medium">{ing.name}:</span> {ing.current_stock}{ing.unit} (Threshold: {ing.low_stock_threshold}{ing.unit})
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Form Modal */}
      {showAdjustmentForm && selectedIngredient && (
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Adjust Stock: {selectedIngredient.name}
          </h3>

          {message && (
            <div
              className={`mb-4 px-4 py-2 rounded-lg text-sm ${
                message.includes('Successfully')
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleAdjustStock} className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Current Stock</p>
              <p className="text-2xl font-bold text-gray-800">
                {selectedIngredient.current_stock} {selectedIngredient.unit}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adjustment Type
                </label>
                <select
                  value={adjustment.type}
                  onChange={(e) =>
                    setAdjustment({
                      ...adjustment,
                      type: e.target.value as 'add' | 'subtract',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="add">Add to Stock</option>
                  <option value="subtract">Remove from Stock</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity ({selectedIngredient.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={adjustment.quantity}
                  onChange={(e) =>
                    setAdjustment({ ...adjustment, quantity: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Adjustment
              </label>
              <textarea
                value={adjustment.reason}
                onChange={(e) =>
                  setAdjustment({ ...adjustment, reason: e.target.value })
                }
                placeholder="e.g., Stock received, damaged items, consumption"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-600">
                <span className="font-medium">New Stock:</span>{' '}
                {adjustment.type === 'add'
                  ? (selectedIngredient.current_stock + parseFloat(adjustment.quantity || 0)).toFixed(2)
                  : (selectedIngredient.current_stock - parseFloat(adjustment.quantity || 0)).toFixed(2)}{' '}
                {selectedIngredient.unit}
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowAdjustmentForm(false);
                  setSelectedIngredient(null);
                  setAdjustment({ quantity: '', type: 'add', reason: '' });
                  setMessage('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Adjusting...' : 'Confirm Adjustment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inventory Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Normal Stock Items */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-green-50 px-6 py-4 border-b flex items-center gap-2">
            <Package className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-900">Normal Stock ({normalStockItems.length})</h3>
          </div>
          <div className="divide-y">
            {normalStockItems.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                All items are low on stock
              </div>
            ) : (
              normalStockItems.map((ing) => (
                <div key={ing.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-800">{ing.name}</h4>
                      <p className="text-sm text-gray-500">
                        Cost: ₹{ing.cost_per_unit.toFixed(2)}/{ing.unit}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-green-600">
                      {ing.current_stock}
                      <span className="text-sm text-gray-500 ml-1">{ing.unit}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedIngredient(ing);
                      setShowAdjustmentForm(true);
                    }}
                    className="w-full mt-2 px-3 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-sm font-medium transition-colors"
                  >
                    Adjust Stock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-red-50 px-6 py-4 border-b flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-900">Low Stock Alert ({lowStockItems.length})</h3>
          </div>
          <div className="divide-y">
            {lowStockItems.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                All items have sufficient stock
              </div>
            ) : (
              lowStockItems.map((ing) => (
                <div key={ing.id} className="px-6 py-4 bg-red-50 hover:bg-red-100 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-800">{ing.name}</h4>
                      <p className="text-sm text-red-600">
                        Threshold: {ing.low_stock_threshold}{ing.unit}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-red-600">
                      {ing.current_stock}
                      <span className="text-sm text-gray-500 ml-1">{ing.unit}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedIngredient(ing);
                      setAdjustment({ ...adjustment, type: 'add' });
                      setShowAdjustmentForm(true);
                    }}
                    className="w-full mt-2 px-3 py-1 bg-green-600 text-white hover:bg-green-700 rounded text-sm font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Stock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Adjustments */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Adjustments</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Ingredient</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700">Quantity</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Type</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Reason</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    No stock adjustments yet
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => {
                  const ingredient = ingredients.find((i) => i.id === adj.ingredient_id);
                  return (
                    <tr key={adj.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {ingredient?.name}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {adj.previous_stock} → {adj.new_stock}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            adj.adjustment_type === 'add'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {adj.adjustment_type === 'add' ? 'Added' : 'Removed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{adj.reason}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {new Date(adj.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
