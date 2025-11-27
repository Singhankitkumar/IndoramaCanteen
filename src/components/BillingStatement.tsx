import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { EmployeeDeduction } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Download } from 'lucide-react';

type BillingMonth = {
  year: number;
  month: number;
};

export const BillingStatement = () => {
  const { user } = useAuth();
  const [deductions, setDeductions] = useState<EmployeeDeduction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<BillingMonth>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDeductions();
    }
  }, [user, selectedMonth]);

  const fetchDeductions = async () => {
    if (!user) return;

    setLoading(true);

    const startDate = new Date(selectedMonth.year, selectedMonth.month - 1, 1)
      .toISOString()
      .split('T')[0];
    const endDate = new Date(selectedMonth.year, selectedMonth.month, 0)
      .toISOString()
      .split('T')[0];

    const { data, error } = await supabase
      .from('employee_deductions')
      .select('*')
      .eq('user_id', user.id)
      .gte('deduction_date', startDate)
      .lte('deduction_date', endDate)
      .order('deduction_date', { ascending: false });

    if (error) {
      console.error('Error fetching deductions:', error);
    } else {
      setDeductions(data || []);
    }
    setLoading(false);
  };

  const totalDeduction = deductions.reduce((sum, d) => sum + d.amount, 0);

  const handleDownloadPDF = () => {
    const content = `
Salary Deduction Statement
Month: ${selectedMonth.month.toString().padStart(2, '0')}/${selectedMonth.year}

Date       | Description                      | Amount
-----------|----------------------------------|--------
${deductions
  .map(
    (d) =>
      `${d.deduction_date} | ${d.description.padEnd(32)} | ₹${d.amount.toFixed(2)}`
  )
  .join('\n')}

Total Deduction: ₹${totalDeduction.toFixed(2)}
    `;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `billing-${selectedMonth.year}-${selectedMonth.month}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i).toLocaleString('default', { month: 'long' }),
  }));

  const years = Array.from({ length: 3 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year, label: year.toString() };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-600" />
            Salary Deduction Statement
          </h2>
          {deductions.length > 0 && (
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              Download
            </button>
          )}
        </div>

        <div className="flex gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <select
              value={selectedMonth.month}
              onChange={(e) =>
                setSelectedMonth({ ...selectedMonth, month: parseInt(e.target.value) })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              value={selectedMonth.year}
              onChange={(e) =>
                setSelectedMonth({ ...selectedMonth, year: parseInt(e.target.value) })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {years.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {deductions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No deductions for this month</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto mb-6">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deductions.map((deduction) => (
                    <tr key={deduction.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-800">
                        {new Date(deduction.deduction_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{deduction.description}</td>
                      <td className="px-6 py-4 text-right text-gray-800 font-medium">
                        -₹{deduction.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Total Deduction:</span>
              <span className="text-2xl font-bold text-orange-600">
                ₹{totalDeduction.toFixed(2)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
