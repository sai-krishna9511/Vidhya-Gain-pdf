import React, { useState, useEffect } from 'react';
import { CreditCard, History, Clock, FileText, Check, AlertCircle, RefreshCw, X, HelpCircle, CheckCircle, Hourglass, Download } from 'lucide-react';
import { User, ConversionLog, Invoice, PaymentRequest } from '../types';
import { getAllRecentDownloads, deleteRecentDownload, clearAllRecentDownloads, RecentDownload } from '../lib/recentDownloadsDB';

interface UserDashboardProps {
  user: User;
  token: string;
  onRefreshUser: () => void;
  onError: (msg: string) => void;
  onOpenAdminPanel?: () => void;
}

export default function UserDashboard({ user, token, onRefreshUser, onError, onOpenAdminPanel }: UserDashboardProps) {
  const [logs, setLogs] = useState<ConversionLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [usage, setUsage] = useState<{ count: number; limit: number; remaining: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [recentDownloads, setRecentDownloads] = useState<RecentDownload[]>([]);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'conversion' | 'downloads'>('conversion');

  const loadRecentDownloads = async () => {
    try {
      const items = await getAllRecentDownloads();
      setRecentDownloads(items);
    } catch (err) {
      console.error('Failed to load recent downloads', err);
    }
  };

  const fetchLogsAndInvoices = async () => {
    setLoading(true);
    try {
      const logsRes = await fetch('/api/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs);
      }

      const paymentsRes = await fetch('/api/payments/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (paymentsRes.ok) {
        const pData = await paymentsRes.json();
        setPayments(pData.paymentRequests || []);
      }

      const usageRes = await fetch('/api/usage', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (usageRes.ok) {
        const uData = await usageRes.json();
        setUsage({ count: uData.count, limit: uData.limit, remaining: uData.remaining });
      }

      // Generate invoice list based on tier
      const invoiceList: Invoice[] = [];
      if (user.subscriptionTier === 'pro') {
        invoiceList.push({
          id: 'INV-' + Math.floor(100000 + Math.random() * 900000),
          date: new Date().toLocaleDateString(),
          amount: '₹49.00',
          status: 'paid',
          plan: 'Premium Pro - PhonePe (Monthly)',
        });
      }
      setInvoices(invoiceList);
    } catch (err) {
      console.error(err);
      onError('Failed to retrieve account history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsAndInvoices();
    loadRecentDownloads();
  }, [user, token]);

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your Pro Subscription? You will lose unlimited access.')) return;
    
    setCancelling(true);
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error('Unsubscription request failed.');

      alert('Subscription cancelled successfully. Your account is now back on the Free tier.');
      onRefreshUser();
    } catch (err: any) {
      onError(err.message || 'Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

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
        <span className="text-sm font-semibold text-slate-500">Retrieving account status...</span>
      </div>
    );
  }

  const latestPending = payments.find(p => p.status === 'pending');
  const latestApproved = payments.find(p => p.status === 'approved');

  return (
    <div id="user-dashboard-wrapper" className="space-y-6">
      
      {/* Dynamic Status Notice Banners based on subscription request */}
      {latestPending && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-amber-900 animate-pulse">
          <Hourglass size={20} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h5 className="text-xs font-bold uppercase tracking-wider">Payment Under Verification Review</h5>
            <p className="text-xs text-amber-800 leading-relaxed">
              Your PhonePe payment details (Txn Ref: <span className="font-mono font-bold bg-amber-100/50 px-1 rounded">{latestPending.upiTxnId}</span>) have been sent to our administrator for verification. Your Pro access will be activated immediately once accepted!
            </p>
          </div>
        </div>
      )}

      {latestApproved && user.subscriptionTier === 'pro' && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3 text-emerald-900">
          <CheckCircle size={20} className="text-emerald-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h5 className="text-xs font-bold uppercase tracking-wider">Your subscription is OK!</h5>
            <p className="text-xs text-emerald-800 leading-relaxed font-semibold">
              Thank you! Your PhonePe payment (Txn Ref: <span className="font-mono bg-emerald-100/50 px-1 rounded">{latestApproved.upiTxnId}</span>) of ₹49 was successfully accepted and approved by the system administrator.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Subscription Status Column */}
        <div className="md:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h4 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <CreditCard size={18} className="text-slate-400" />
            <span>Membership Plan</span>
          </h4>

          {user.subscriptionTier === 'pro' ? (
            <div className="p-4 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-xl space-y-3 relative overflow-hidden shadow-md shadow-indigo-100">
              <div className="absolute right-0 bottom-0 opacity-10 translate-y-1/4 translate-x-1/4">
                <CreditCard size={120} />
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">Pro Member</span>
                  <h5 className="text-lg font-bold mt-1">Unlimited Pro Access</h5>
                </div>
                <span className="text-sm font-bold">₹49 / Month</span>
              </div>
              <p className="text-xs text-white/80">Active with unrestricted high-fidelity conversion pipelines. No limits, ad-free, with priority processing speed.</p>
              
              <div className="pt-2">
                <button
                  disabled={cancelling}
                  onClick={handleCancelSubscription}
                  className="w-full py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  {cancelling ? 'Cancelling Plan...' : 'Cancel Pro Access'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl space-y-3.5 border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">Free Trial</span>
                  <h5 className="text-sm font-bold text-slate-800 mt-1">Free Trial Account</h5>
                </div>
                <span className="text-sm font-bold text-slate-700">₹0/mo</span>
              </div>
              
              {/* Daily Free Trial Limits Description */}
              <div className="space-y-2 border-t border-b border-slate-200/60 py-3">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>Daily Task Allotment:</span>
                  <span className="text-indigo-600">3 tasks per day</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>Conversions used today:</span>
                  <span className="text-slate-800">{usage?.count || 0} used</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>Remaining trial tasks today:</span>
                  <span className="text-emerald-650">{usage?.remaining !== undefined ? usage.remaining : 3} left</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((usage?.count || 0) / (usage?.limit || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-400">Upgrading to Pro removes the 1 task per day restriction and unlocks limitless downloads with priority rendering.</p>
            </div>
          )}

          {user.role === 'admin' && onOpenAdminPanel && (
            <div className="p-4 bg-indigo-50 rounded-xl space-y-3 border border-indigo-100">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">System Administrator</span>
                  <h5 className="text-sm font-bold text-slate-800 mt-1">SaaS System Control</h5>
                </div>
              </div>
              <p className="text-xs text-slate-600">You have system administrator access. Open the Admin Control Panel to manage accounts, reset limits, and audit logs.</p>
              <button
                onClick={onOpenAdminPanel}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 cursor-pointer"
              >
                Open Admin Control Panel
              </button>
            </div>
          )}

          {/* Billings / Invoices */}
          <div className="space-y-2 pt-2">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Billing History</h5>
            {invoices.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 italic">No past billing operations recorded.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                {invoices.map((inv) => (
                  <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs font-medium">
                    <div>
                      <p className="text-slate-700 font-semibold">{inv.plan}</p>
                      <p className="text-[10px] text-slate-400 font-normal">{inv.date} • {inv.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-700 font-bold">{inv.amount}</p>
                      <span className="text-[9px] font-bold text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded-full">
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity Logs Column with Recent Downloads Support */}
        <div className="md:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => setActiveHistoryTab('conversion')}
                className={`text-sm font-bold pb-2 border-b-2 transition-all ${activeHistoryTab === 'conversion' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Conversion History
              </button>
              <button
                type="button"
                onClick={() => setActiveHistoryTab('downloads')}
                className={`text-sm font-bold pb-2 border-b-2 transition-all flex items-center space-x-1.5 ${activeHistoryTab === 'downloads' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <span>Recent Downloads</span>
                {recentDownloads.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {recentDownloads.length}
                  </span>
                )}
              </button>
            </div>
            
            <div className="flex items-center space-x-2 self-end sm:self-auto">
              {activeHistoryTab === 'downloads' && recentDownloads.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Clear all locally cached downloads?')) {
                      await clearAllRecentDownloads();
                      loadRecentDownloads();
                    }
                  }}
                  className="text-xs text-red-500 hover:text-red-600 font-bold cursor-pointer mr-1"
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  fetchLogsAndInvoices();
                  loadRecentDownloads();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {activeHistoryTab === 'conversion' ? (
            logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                <div className="p-3 bg-slate-50 text-slate-400 rounded-full">
                  <FileText size={20} />
                </div>
                <div className="text-xs text-slate-500">
                  <p className="font-bold">No conversions logged</p>
                  <p className="font-medium opacity-80 mt-0.5">Your conversion history will be logged here.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between group">
                    <div className="flex items-start space-x-3 truncate">
                      <div className={`p-2 rounded mt-0.5 ${log.status === 'success' ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-500'}`}>
                        <FileText size={16} />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-700 truncate max-w-sm" title={log.fileName}>
                          {log.fileName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {getToolNameFormatted(log.tool)} • {log.fileSize}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end space-y-1">
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${log.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {log.status}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            recentDownloads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                <div className="p-3 bg-slate-50 text-slate-400 rounded-full">
                  <Clock size={20} />
                </div>
                <div className="text-xs text-slate-500">
                  <p className="font-bold">No recent downloads found</p>
                  <p className="font-medium opacity-80 mt-0.5">Files processed in your current browser will appear here for easy re-download.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                {recentDownloads.map((dl) => (
                  <div key={dl.id} className="py-3 flex items-center justify-between group">
                    <div className="flex items-start space-x-3 truncate">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded mt-0.5">
                        <FileText size={16} />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-700 truncate max-w-sm" title={dl.fileName}>
                          {dl.fileName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {getToolNameFormatted(dl.tool)} • {dl.fileSize}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const url = URL.createObjectURL(dl.blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = dl.fileName;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="p-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
                        title="Re-download file"
                      >
                        <Download size={14} />
                        <span className="text-[10px] font-bold px-0.5 hidden sm:inline">Re-download</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteRecentDownload(dl.id);
                          loadRecentDownloads();
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        title="Delete cached file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
