import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Shield, ShieldOff, History, Search } from 'lucide-react';

type Profile = {
  id: string;
  full_name: string;
  employee_id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
};

type AuditLog = {
  id: string;
  user_id: string;
  changed_by_admin_id: string;
  previous_role: boolean;
  new_role: boolean;
  reason: string;
  created_at: string;
  profiles: {
    full_name: string;
    employee_id: string;
  };
  changed_by: {
    full_name: string;
    employee_id: string;
  };
};

export const AdminRoleManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    setUsers(data || []);
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from('admin_role_audit')
      .select(`
        *,
        profiles!admin_role_audit_user_id_fkey (full_name, employee_id),
        changed_by:profiles!admin_role_audit_changed_by_admin_id_fkey (full_name, employee_id)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return;
    }

    setAuditLogs(data as any || []);
  };

  const toggleAdminRole = async (userId: string, currentRole: boolean, userName: string) => {
    const reason = prompt(`Please provide a reason for ${currentRole ? 'revoking' : 'granting'} admin access to ${userName}:`);

    if (!reason || reason.trim() === '') {
      alert('Reason is required');
      return;
    }

    setLoading(true);

    try {
      const { error: auditError } = await supabase
        .from('admin_role_audit')
        .insert({
          user_id: userId,
          changed_by_admin_id: user?.id,
          previous_role: currentRole,
          new_role: !currentRole,
          reason: reason.trim(),
        });

      if (auditError) throw auditError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_admin: !currentRole })
        .eq('id', userId);

      if (updateError) throw updateError;

      alert(`Admin access ${!currentRole ? 'granted to' : 'revoked from'} ${userName}`);
      fetchUsers();
      fetchAuditLogs();
    } catch (error) {
      console.error('Error updating admin role:', error);
      alert('Failed to update admin role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Admin Role Management</h1>
        <button
          onClick={() => setShowAuditLog(!showAuditLog)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <History className="w-5 h-5" />
          {showAuditLog ? 'Hide' : 'Show'} Audit Log
        </button>
      </div>

      {showAuditLog ? (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Role Change Audit Log</h2>
          {auditLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No audit logs found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Changed By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{log.profiles?.full_name}</div>
                        <div className="text-xs text-gray-500">{log.profiles?.employee_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{log.changed_by?.full_name}</div>
                        <div className="text-xs text-gray-500">{log.changed_by?.employee_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            log.new_role
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.previous_role ? 'Admin' : 'User'} → {log.new_role ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{log.reason}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, employee ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((profile) => (
                  <tr key={profile.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{profile.full_name}</div>
                      <div className="text-xs text-gray-500">{profile.employee_id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{profile.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 w-fit ${
                          profile.is_admin
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {profile.is_admin ? (
                          <>
                            <Shield className="w-3 h-3" />
                            Admin
                          </>
                        ) : (
                          <>
                            <ShieldOff className="w-3 h-3" />
                            User
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {profile.id !== user?.id && (
                        <button
                          onClick={() => toggleAdminRole(profile.id, profile.is_admin, profile.full_name)}
                          disabled={loading}
                          className={`px-3 py-1 rounded text-sm font-medium transition disabled:opacity-50 ${
                            profile.is_admin
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {profile.is_admin ? 'Revoke Admin' : 'Grant Admin'}
                        </button>
                      )}
                      {profile.id === user?.id && (
                        <span className="text-xs text-gray-500 italic">You</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
