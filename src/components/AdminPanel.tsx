import React, { useState, useEffect } from 'react';
import { Users, CreditCard, RefreshCw, Trash2, ShieldAlert, TrendingUp, BarChart3, Clock, Check, X, Search, UserCheck } from 'lucide-react';
import { User, ConversionLog, PaymentRequest } from '../types';

interface AdminPanelProps {
  token: string;
  onClose?: () => void;
  onError: (msg: string) => void;
}

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalConversions: number;
  monthlyRevenue: number;
  conversionsByTool: Record<string, number>;
  conversionsByDay: { date: string; count: number }[];
  recentLogs: ConversionLog[];
}

export default function AdminPanel({ token, onClose, onError }: AdminPanelProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'requests' | 'logs'>('overview');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const statsRes = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersRes = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const paymentsRes = await fetch('/api/admin/payments', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!statsRes.ok || !usersRes.ok) {
        throw new Error('Unauthorized or failed to load admin dashboards.');
      }

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      let paymentsData = { paymentRequests: [] };
      if (paymentsRes.ok) {
        paymentsData = await paymentsRes.json();
      }

      setStats(statsData);
      setUsers(usersData.users);
      setPaymentRequests(paymentsData.paymentRequests || []);
    } catch (err: any) {
      console.error(err);
      onError(err.message || 'Failed to fetch admin statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('Failed to update user.');
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } as User : u));
      fetchAdminData(); // Refresh stats too
    } catch (err: any) {
      onError(err.message || 'Error updating user.');
    }
  };

  const handlePaymentAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/admin/payments/${requestId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process payment request.');
      }

      // Refresh data
      await fetchAdminData();
    } catch (err: any) {
      onError(err.message || 'Error processing payment request.');
    }
  };

  const handleResetLimits = async (email: string) => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}/reset-limits`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to reset daily limit.');
      
      alert(`Daily usage limit successfully reset for ${email}!`);
    } catch (err: any) {
      onError(err.message || 'Error resetting usage limit.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action is irreversible.')) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to delete user.');

      setUsers(prev => prev.filter(u => u.id !== userId));
      fetchAdminData(); // Refresh stats
    } catch (err: any) {
      onError(err.message || 'Error deleting user.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.subscriptionTier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getToolNameFormatted = (tool: string) => {
    const mapping: Record<string, string> = {
      'merge': 'Merge PDF',
      'split': 'Split PDF',
      'compress': 'Compress PDF',
      'pdf-to-img': 'PDF to Image',
      'img-to-pdf': 'Image to PDF',
      'pdf-to-word': 'PDF to Word',
      'word-to-pdf': 'Word to PDF',
      'img-convert': 'Image Converter',
    };
    return mapping[tool] || tool;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-semibold text-slate-500">Retrieving system-wide analytics...</span>
      </div>
    );
  }

  const pendingRequests = paymentRequests.filter(pr => pr.status === 'pending');

  return (
    <div id="admin-panel-container" className="space-y-6">
      {/* Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">Total Users</p>
            <p className="text-2xl font-extrabold text-slate-800">{stats?.totalUsers}</p>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">Pro Subscribers</p>
            <p className="text-2xl font-extrabold text-slate-800">{stats?.activeSubscriptions}</p>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">Conversions</p>
            <p className="text-2xl font-extrabold text-slate-800">{stats?.totalConversions}</p>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <BarChart3 size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">Monthly Revenue</p>
            <p className="text-2xl font-extrabold text-slate-800">₹{stats?.monthlyRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-1.5">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2 px-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-750' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Analytics & Usage
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2 px-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'users' ? 'border-indigo-600 text-indigo-750' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          User Management
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-2 px-3 text-sm font-bold transition-all border-b-2 relative ${activeTab === 'requests' ? 'border-indigo-600 text-indigo-750' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <span>Subscription Requests</span>
          {pendingRequests.length > 0 && (
            <span className="ml-1.5 bg-rose-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-2 px-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'logs' ? 'border-indigo-600 text-indigo-750' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          System Event Logs
        </button>
      </div>

      {/* Tab Contents: Overview */}
      {activeTab === 'overview' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* SVG Custom Premium Chart */}
          <div className="md:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-base font-bold text-slate-800">Conversions Over Time (Last 7 Days)</h4>
            
            {/* Elegant SVG Chart */}
            <div className="relative w-full h-48 bg-slate-50 rounded-xl p-4 flex flex-col justify-between">
              <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
                <div className="border-b border-slate-200/50 w-full h-0" />
                <div className="border-b border-slate-200/50 w-full h-0" />
                <div className="border-b border-slate-200/50 w-full h-0" />
              </div>

              <div className="h-32 flex items-end justify-between px-6 z-10">
                {stats.conversionsByDay.map((d, idx) => {
                  const maxCount = Math.max(...stats.conversionsByDay.map(day => day.count), 5);
                  const barHeight = (d.count / maxCount) * 100;
                  return (
                    <div key={idx} className="flex flex-col items-center space-y-2 group relative w-1/8">
                      {/* Tooltip */}
                      <div className="absolute -top-10 scale-0 group-hover:scale-100 bg-slate-800 text-white text-[10px] py-1 px-2 rounded font-bold transition-all shadow-md">
                        {d.count} files
                      </div>
                      <div 
                        style={{ height: `${Math.max(10, barHeight)}%` }}
                        className="w-8 bg-gradient-to-t from-indigo-500 to-indigo-600 rounded-md transition-all hover:to-indigo-500 group-hover:shadow-lg shadow-indigo-100 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">
                        {d.date.substring(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Conversions by Tool List */}
          <div className="md:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-base font-bold text-slate-800">Conversions by Tool</h4>
            <div className="space-y-3">
              {Object.keys(stats.conversionsByTool).length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No system operations logged yet.</p>
              ) : (
                Object.entries(stats.conversionsByTool).map(([tool, count]) => {
                  const total = stats.totalConversions || 1;
                  const percent = Math.round(((count as number) / total) * 100);
                  return (
                    <div key={tool} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600 font-semibold">
                        <span>{getToolNameFormatted(tool)}</span>
                        <span>{count} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Contents: Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users by email, tier, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-slate-700 font-medium placeholder-slate-400"
              />
            </div>
            <button
              onClick={fetchAdminData}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Refresh List</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-3">User Email / ID</th>
                  <th className="p-3">Subscription Tier</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Created At</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-700">{u.email}</div>
                      <div className="text-[10px] text-slate-400 font-medium">ID: {u.id}</div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${u.subscriptionTier === 'pro' ? 'bg-indigo-50 text-indigo-750' : 'bg-slate-100 text-slate-600'}`}>
                        {u.subscriptionTier}
                      </span>
                      {u.subscriptionTier === 'pro' && (
                        <span className="ml-1.5 text-[10px] text-emerald-600 font-bold">Active</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] capitalize ${u.role === 'admin' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 font-medium">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleUpdateUser(u.id, {
                          subscriptionTier: u.subscriptionTier === 'pro' ? 'free' : 'pro',
                          subscriptionStatus: u.subscriptionTier === 'pro' ? 'inactive' : 'active'
                        })}
                        className="py-1 px-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-755 border border-slate-200 rounded-lg transition-colors font-semibold text-[10px] cursor-pointer"
                      >
                        {u.subscriptionTier === 'pro' ? 'Downgrade' : 'Set Pro'}
                      </button>

                      <button
                        onClick={() => handleResetLimits(u.email)}
                        className="py-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors font-semibold text-[10px] cursor-pointer"
                        title="Reset daily free conversion counts to zero"
                      >
                        Reset Limit
                      </button>

                      {u.id !== 'admin-1' && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors inline-flex cursor-pointer"
                          title="Delete user account"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Contents: Subscription Requests */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-150">
            <div>
              <h4 className="text-base font-bold text-slate-800">PhonePe Payment & Subscriptions Queue</h4>
              <p className="text-xs text-slate-400 font-medium">Verify UPI transaction details, and approve to instantly activate Pro tier subscription.</p>
            </div>
            <button
              onClick={fetchAdminData}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Refresh Queue</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            {paymentRequests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-2">
                <p>No PhonePe subscription requests received yet.</p>
                <p className="opacity-75">When users scan the QR and submit transaction details, they will appear here.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="p-3">User Email</th>
                    <th className="p-3">Payer Details</th>
                    <th className="p-3">UPI Txn ID (UTN)</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Submitted At</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paymentRequests.map((pr) => (
                    <tr key={pr.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-700">{pr.userEmail}</div>
                        <div className="text-[10px] text-slate-400 font-medium">User ID: {pr.userId}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-700">{pr.payerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Ph: {pr.payerPhone}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-1 rounded">
                          {pr.upiTxnId}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-700">
                        ₹{pr.amount}
                      </td>
                      <td className="p-3 text-slate-500 font-medium">
                        {new Date(pr.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          pr.status === 'approved' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : pr.status === 'rejected' 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {pr.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {pr.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handlePaymentAction(pr.id, 'approve')}
                              className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-bold text-[10px] shadow-sm shadow-emerald-100 cursor-pointer"
                            >
                              Approve / Accept
                            </button>
                            <button
                              onClick={() => handlePaymentAction(pr.id, 'reject')}
                              className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors font-bold text-[10px] cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold italic">
                            Verified & Reviewed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab Contents: Logs */}
      {activeTab === 'logs' && stats && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
          <h4 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <Clock size={16} className="text-slate-400" />
            <span>Recent System Transactions ({stats.recentLogs.length})</span>
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-3">Log Event</th>
                  <th className="p-3">Operator (ID/IP)</th>
                  <th className="p-3">File Specs</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {stats.recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-semibold text-slate-700">
                      Executed <span className="text-indigo-600 font-bold uppercase">{log.tool}</span>
                    </td>
                    <td className="p-3">
                      <div className="text-slate-600 font-medium">{log.userId ? `User: ${log.userId}` : 'Anonymous'}</div>
                      <div className="text-[10px] text-slate-400">IP: {log.ipAddress}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-slate-700 truncate max-w-[150px]" title={log.fileName}>{log.fileName}</div>
                      <div className="text-[10px] text-slate-400">{log.fileSize}</div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${log.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 font-medium">
                      {new Date(log.createdAt).toLocaleString()}
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
}
