import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ConsumptionLog, Ingredient } from '../lib/types';
import { BarChart3 } from 'lucide-react';

type ConsumptionReport = {
  ingredient: Ingredient;
  totalQuantity: number;
  totalCost: number;
};

export const ConsumptionReports = () => {
  const [reports, setReports] = useState<ConsumptionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchConsumptionReport();
  }, [selectedMonth]);

  const fetchConsumptionReport = async () => {
    setLoading(true);

    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0)
      .toISOString()
      .split('T')[0];

    const { data: logs, error: logsError } = await supabase
      .from('consumption_logs')
      .select('*')
      .gte('consumption_date', startDate)
      .lte('consumption_date', endDate);

    if (logsError) {
      console.error('Error fetching consumption logs:', logsError);
      setLoading(false);
      return;
    }

    const { data: ingredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .select('*');

    if (ingredientsError) {
      console.error('Error fetching ingredients:', ingredientsError);
      setLoading(false);
      return;
    }

    const ingredientMap = new Map(ingredients?.map((i) => [i.id, i]) || []);
    const consumptionByIngredient = new Map<string, number>();

    (logs || []).forEach((log) => {
      const current = consumptionByIngredient.get(log.ingredient_id) || 0;
      consumptionByIngredient.set(log.ingredient_id, current + log.quantity_consumed);
    });

    const reportData: ConsumptionReport[] = Array.from(consumptionByIngredient.entries())
      .map(([ingredientId, quantity]) => {
        const ingredient = ingredientMap.get(ingredientId);
        return {
          ingredient: ingredient || {
            id: ingredientId,
            name: 'Unknown',
            unit: '',
            cost_per_unit: 0,
            current_stock: 0,
            created_at: '',
            updated_at: '',
          },
          totalQuantity: quantity,
          totalCost: quantity * (ingredient?.cost_per_unit || 0),
        };
      })
      .sort((a, b) => b.totalCost - a.totalCost);

    setReports(reportData);
    setLoading(false);
  };

  const totalCost = reports.reduce((sum, r) => sum + r.totalCost, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-orange-600" />
            Ingredient Consumption Report
          </h2>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No consumption data for this month</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto mb-6">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Ingredient
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                      Quantity Consumed
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                      Unit Cost
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                      Total Cost
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                      % of Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.ingredient.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-800 font-medium">
                        {report.ingredient.name}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {report.totalQuantity.toFixed(2)} {report.ingredient.unit}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        ₹{report.ingredient.cost_per_unit.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-800">
                        ₹{report.totalCost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {((report.totalCost / totalCost) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-medium">Total Items Consumed</p>
                <p className="text-2xl font-bold text-blue-800 mt-1">
                  {reports.reduce((sum, r) => sum + Math.round(r.totalQuantity), 0)}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium">Average Cost Per Item</p>
                <p className="text-2xl font-bold text-green-800 mt-1">
                  ₹
                  {(
                    totalCost /
                    reports.reduce((sum, r) => sum + Math.round(r.totalQuantity), 0)
                  ).toFixed(2)}
                </p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm text-orange-600 font-medium">Total Cost</p>
                <p className="text-2xl font-bold text-orange-800 mt-1">
                  ₹{totalCost.toFixed(2)}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
