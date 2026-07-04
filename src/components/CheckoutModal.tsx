import React, { useState } from 'react';
import { X, ShieldCheck, Check, QrCode, Sparkles } from 'lucide-react';
import QRCode from 'react-qr-code';
import { User } from '../types';

interface CheckoutModalProps {
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
  token: string;
  onError: (msg: string) => void;
}

export default function CheckoutModal({ onClose, onSuccess, token, onError }: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const paymentMethod = 'upi';
  
  // UPI / PhonePe States
  const [upiTxnId, setUpiTxnId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  
  // Success states
  const [successMode, setSuccessMode] = useState<'approved' | 'pending' | null>(null);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // UPI QR Payment
      if (!upiTxnId || !payerName || !payerPhone) {
        throw new Error('Please fill in all transaction verification details.');
      }
      if (upiTxnId.length < 8) {
        throw new Error('Please enter a valid UPI Transaction ID / Ref No.');
      }

      // Submit UPI verification details to backend
      const res = await fetch('/api/payments/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          upiTxnId,
          payerName,
          payerPhone,
          amount: 49, // ₹49 INR for Month
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit payment request.');

      setSuccessMode('pending');
    } catch (err: any) {
      onError(err.message || 'Payment submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="checkout-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 animate-scale-up relative my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors z-10"
        >
          <X size={18} />
        </button>

        {successMode === 'approved' && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto scale-110 animate-bounce">
              <Check size={32} />
            </div>
            <div>
              <h4 className="text-xl font-extrabold text-slate-800">Pro Subscription Activated!</h4>
              <p className="text-sm text-slate-500 mt-1">Unlock complete access to all high-performance tools.</p>
            </div>
            <p className="text-xs text-slate-400">Setting up unlimited converter pipelines...</p>
          </div>
        )}

        {successMode === 'pending' && (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 border border-amber-100 rounded-full flex items-center justify-center mx-auto scale-110 animate-pulse">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">Payment Sent for Review!</h4>
              <p className="text-xs text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
                Your UPI transaction details <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded font-bold">{upiTxnId}</span> have been registered.
              </p>
              <p className="text-xs text-slate-500 mt-3 max-w-sm mx-auto leading-relaxed">
                Our system administrators will cross-verify this with the bank receipt shortly. Keep checking your account status in the dashboard!
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={() => {
                  onClose();
                  // Force full refresh to show the review status banner
                  window.location.reload();
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {!successMode && (
          <div className="p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-600" />
                <span>Activate Premium Access</span>
              </h3>
              <p className="text-xs text-slate-500">Subscribe to Vidhya Gain Pro to unlock unconstrained tool limits and priority OCR engines.</p>
            </div>

            {/* Price tag depending on payment method */}
            <div className="p-3.5 bg-indigo-50 rounded-2xl border border-indigo-100 flex justify-between items-center text-xs">
              <div>
                <span className="font-bold text-indigo-900">Vidhya Gain Pro Premium Subscription</span>
                <span className="block text-[10px] text-indigo-600 font-medium mt-0.5">
                  Scan & Pay via PhonePe
                </span>
              </div>
              <span className="text-base font-extrabold text-indigo-900">
                ₹49 / month
              </span>
            </div>

            {/* UPI QR Payment Block */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-3">
                <p className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                  Scan with PhonePe app to pay ₹49
                </p>
                
                {/* Beautiful Inline PhonePe QR Merchant Sign */}
                <div className="flex justify-center">
                  <div className="w-full max-w-[240px] bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col items-center space-y-3.5 text-slate-800 font-sans relative overflow-hidden">
                    {/* Header: Logo and Brand */}
                    <div className="flex items-center gap-2 select-none">
                      <div className="w-9 h-9 bg-[#5f259f] rounded-full flex items-center justify-center text-white text-base font-black">
                        पे
                      </div>
                      <span className="text-lg font-black text-[#5f259f] tracking-tight">PhonePe</span>
                    </div>

                    {/* Accepted Here Sign */}
                    <div className="text-center select-none">
                      <div className="text-xs font-black text-[#5f259f] tracking-widest uppercase">ACCEPTED HERE</div>
                      <div className="text-[9px] font-bold text-slate-500 mt-0.5">Scan & Pay Using PhonePe App</div>
                    </div>

                    {/* Real-time Dynamic QR Code Box */}
                    <div className="relative p-2.5 bg-white border border-slate-200 rounded-xl shadow-inner flex items-center justify-center">
                      <QRCode 
                        value="upi://pay?pa=99511841@ybl&pn=KONDAMUDI%20SAI%20KRISHNA&cu=INR&am=49&tn=Vidhya%20Gain%20Pro"
                        size={155}
                        level="Q"
                        fgColor="#000000"
                        bgColor="#ffffff"
                      />
                      {/* Central PhonePe Logo Overlay on QR Code */}
                      <div className="absolute inset-0 flex items-center justify-center select-none">
                        <div className="w-8 h-8 bg-[#5f259f] rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-black shadow-md">
                          पे
                        </div>
                      </div>
                    </div>

                    {/* Payee Name */}
                    <div className="text-center w-full select-all">
                      <div className="text-[11px] font-black text-slate-900 tracking-wider uppercase font-sans">
                        KONDAMUDI SAI KRISHNA
                      </div>
                      <div className="text-[9.5px] font-black text-[#5f259f] mt-1 bg-violet-50/70 border border-violet-100 py-0.5 px-2.5 rounded-full inline-block font-mono">
                        UPI ID: 99511841@ybl
                      </div>
                    </div>

                    {/* Footer text */}
                    <div className="w-full border-t border-slate-100 pt-2.5 text-center text-[7.5px] text-slate-400 select-none">
                      <div>© 2026, All rights reserved, PhonePe Ltd</div>
                      <div className="text-[7px] text-slate-300 font-medium mt-0.5">
                        (Formerly known as 'PhonePe Private Ltd')
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-normal font-medium">
                  Please scan the QR code above with any UPI app (PhonePe, GPay, Paytm) and complete the ₹49 payment, then input the transaction receipt details below for verification.
                </p>
              </div>

              <form onSubmit={handleCheckoutSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                    UPI Transaction ID (UTN / Ref No)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 623456789012"
                    required
                    value={upiTxnId}
                    onChange={(e) => setUpiTxnId(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium text-slate-700 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                      Payer / Sender Name
                    </label>
                    <input
                      type="text"
                      placeholder="Your Name"
                      required
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                      Payer Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="Mobile Number"
                      required
                      value={payerPhone}
                      onChange={(e) => setPayerPhone(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 font-medium text-slate-700 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Submitting Details...</span>
                      </>
                    ) : (
                      <span>Submit UPI Verification - ₹49</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-center space-x-1.5 text-[10px] text-slate-400 font-semibold">
              <ShieldCheck size={14} className="text-slate-400" />
              <span>SSL Secured & encrypted bank verification stream</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
