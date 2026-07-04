export type ToolType =
  | 'merge'
  | 'split'
  | 'compress'
  | 'pdf-to-img'
  | 'img-to-pdf'
  | 'pdf-to-word'
  | 'word-to-pdf'
  | 'img-convert'
  | 'esign'
  | 'protect';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  subscriptionStatus: 'active' | 'inactive';
  subscriptionTier: 'free' | 'pro';
  createdAt: string;
}

export interface ConversionLog {
  id: string;
  userId: string | null;
  ipAddress: string;
  tool: ToolType;
  fileName: string;
  fileSize: string;
  status: 'success' | 'failed';
  createdAt: string;
}

export interface UsageState {
  count: number;
  limit: number;
  remaining: number;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  interval: string;
  features: string[];
  popular: boolean;
}

export interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'paid' | 'pending';
  plan: string;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userEmail: string;
  upiTxnId: string;
  payerName: string;
  payerPhone: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
}

