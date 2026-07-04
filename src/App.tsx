import React, { useState, useEffect } from 'react';
import { 
  FilePlus, 
  Scissors, 
  FileDown, 
  FileImage, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  FileText, 
  RefreshCw, 
  Lock, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  User as UserIcon, 
  LogOut, 
  ChevronRight, 
  Grid, 
  Settings,
  HelpCircle,
  Camera,
  Trash2,
  Search,
  X,
  PenTool,
  Clock
} from 'lucide-react';

import MergePdf from './components/tools/MergePdf';
import SplitPdf from './components/tools/SplitPdf';
import CompressPdf from './components/tools/CompressPdf';
import PdfToImage from './components/tools/PdfToImage';
import ImageToPdf from './components/tools/ImageToPdf';
import PdfToWord from './components/tools/PdfToWord';
import WordToPdf from './components/tools/WordToPdf';
import ImageConverter from './components/tools/ImageConverter';

import AuthModal from './components/AuthModal';
import AdminLoginModal from './components/AdminLoginModal';
import CheckoutModal from './components/CheckoutModal';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';
import ConversionSandbox from './components/ConversionSandbox';
import { trackEvent } from './lib/analytics';

import { User, ToolType, UsageState } from './types';

const PERSONALIZATION_SEGMENTS = {
  legal: {
    id: 'legal',
    badge: '⚖️ Legal Professionals',
    headline: 'Secure, Court-Ready PDF Tools.',
    subheading: 'Redact, merge, and compress confidential documents with 100% HIPAA-grade local browser-safe processing. Files never leave your device.',
    alertText: 'Court security protocols active.'
  },
  student: {
    id: 'student',
    badge: '🎓 Students & Academic',
    headline: 'Instant, Free PDF Tools for Students.',
    subheading: 'Merge assignments, compress research papers, and convert images to PDF. Fully private, browser-safe, and lightning fast.',
    alertText: 'Student campaign active.'
  },
  developer: {
    id: 'developer',
    badge: '💻 Developers & Tech',
    headline: 'Sandboxed PDF & Doc Engines for Developers.',
    subheading: 'Convert, extract, and format JSON, files, and design logs instantly. Fully sandboxed and optimized for extreme performance.',
    alertText: 'Tech playground active.'
  },
  finance: {
    id: 'finance',
    badge: '🏦 Finance & Real Estate',
    headline: 'Bank-Grade Secure Contract & PDF Suite.',
    subheading: 'Process loans, sign contracts, and merge financial statements securely. Local decryption ensures zero exposure to third parties.',
    alertText: 'Finance encryption active.'
  },
  default: {
    id: 'default',
    badge: '⚡ General Audience',
    headline: 'Convert PDFs instantly without uploading them.',
    subheading: 'Fast, secure, and professional document tools running entirely in your browser. Files never touch our servers.',
    alertText: null
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [preloadedFile, setPreloadedFile] = useState<File | null>(null);
  const [preloadedFiles, setPreloadedFiles] = useState<File[] | null>(null);
  const [appTab, setAppTab] = useState<'tools' | 'dashboard' | 'admin'>('tools');
  
  // Ensure dark mode class is completely removed
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  const [trialTimeLeft, setTrialTimeLeft] = useState<number>(0);

  useEffect(() => {
    const TRIAL_DURATION_MINUTES = 15;

    const getTrialRemainingSeconds = (): number => {
      const start = localStorage.getItem('pro_trial_start');
      if (!start) {
        const now = Date.now();
        localStorage.setItem('pro_trial_start', String(now));
        return TRIAL_DURATION_MINUTES * 60;
      }
      const elapsedMs = Date.now() - Number(start);
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const remainingSec = (TRIAL_DURATION_MINUTES * 60) - elapsedSec;
      return remainingSec > 0 ? remainingSec : 0;
    };

    setTrialTimeLeft(getTrialRemainingSeconds());

    const interval = setInterval(() => {
      setTrialTimeLeft(getTrialRemainingSeconds());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Track page views and active tool changes
  useEffect(() => {
    trackEvent('page_view', { tab: appTab, activeTool: activeTool || 'home' });
  }, [appTab, activeTool]);
  
  // Modals state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  
  // Usage tracking
  const [usage, setUsage] = useState<UsageState>({ count: 0, limit: 5, remaining: 5 });
  const [isPro, setIsPro] = useState(false);
  
  // Notification states
  const [alertMsg, setAlertMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Search query for All Tools view
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time landing page personalization (2026 SaaS Optimization)
  const [selectedSegment, setSelectedSegment] = useState<'default' | 'legal' | 'student' | 'developer' | 'finance'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ind = (params.get('industry') || params.get('utm_industry') || params.get('segment') || '').toLowerCase();
      const q = (params.get('q') || params.get('utm_campaign') || '').toLowerCase();
      
      if (ind === 'legal' || q.includes('lawyer') || q.includes('legal')) return 'legal';
      if (ind === 'student' || ind === 'academic' || q.includes('student') || q.includes('college') || q.includes('thesis') || q.includes('school')) return 'student';
      if (ind === 'developer' || ind === 'tech' || ind === 'programmer' || q.includes('developer') || q.includes('tech') || q.includes('code')) return 'developer';
      if (ind === 'finance' || ind === 'realestate' || q.includes('finance') || q.includes('bank') || q.includes('tax') || q.includes('loan')) return 'finance';
    } catch (e) {
      console.warn('Could not parse window search parameters', e);
    }
    return 'default';
  });

  // CEO Custom Profile Photo
  const [ceoPhoto, setCeoPhoto] = useState<string>(() => {
    return localStorage.getItem('ceo_photo') || '';
  });

  const [avatarBg, setAvatarBg] = useState<string>(() => {
    return localStorage.getItem('ceo_avatar_bg') || 'cosmic';
  });

  const [avatarGlasses, setAvatarGlasses] = useState<string>(() => {
    return localStorage.getItem('ceo_avatar_glasses') || 'classic';
  });

  const [avatarBorder, setAvatarBorder] = useState<string>(() => {
    return localStorage.getItem('ceo_avatar_border') || 'neon';
  });

  const [photoZoom, setPhotoZoom] = useState<number>(() => {
    return Number(localStorage.getItem('ceo_photo_zoom')) || 1.0;
  });

  const [photoPosX, setPhotoPosX] = useState<number>(() => {
    return Number(localStorage.getItem('ceo_photo_pos_x')) || 0;
  });

  const [photoPosY, setPhotoPosY] = useState<number>(() => {
    return Number(localStorage.getItem('ceo_photo_pos_y')) || 0;
  });

  const [photoRotate, setPhotoRotate] = useState<number>(() => {
    return Number(localStorage.getItem('ceo_photo_rotate')) || 0;
  });

  const [photoFit, setPhotoFit] = useState<'cover' | 'contain'>(() => {
    return (localStorage.getItem('ceo_photo_fit') as 'cover' | 'contain') || 'cover';
  });

  // Drag states for interactive photo alignment
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (user?.role !== 'admin') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x: photoPosX, y: photoPosY });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Convert dragged pixel distances to percent offset dynamically mapped to frame size
    const newPosX = Math.max(-150, Math.min(150, Math.round(initialPos.x + (deltaX / 3))));
    const newPosY = Math.max(-150, Math.min(150, Math.round(initialPos.y + (deltaY / 3))));
    
    setPhotoPosX(newPosX);
    setPhotoPosY(newPosY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    localStorage.setItem('ceo_photo_pos_x', String(photoPosX));
    localStorage.setItem('ceo_photo_pos_y', String(photoPosY));
    syncCeoConfig(ceoPhoto, avatarBg, avatarGlasses, avatarBorder, photoZoom, photoPosX, photoPosY, photoRotate, photoFit);
  };

  const syncCeoConfig = async (
    updatedPhoto: string, 
    updatedBg: string, 
    updatedGlasses: string, 
    updatedBorder: string,
    zoom?: number,
    posX?: number,
    posY?: number,
    rotate?: number,
    fit?: 'cover' | 'contain'
  ) => {
    try {
      const z = zoom !== undefined ? zoom : photoZoom;
      const x = posX !== undefined ? posX : photoPosX;
      const y = posY !== undefined ? posY : photoPosY;
      const r = rotate !== undefined ? rotate : photoRotate;
      const f = fit !== undefined ? fit : photoFit;

      localStorage.setItem('ceo_photo', updatedPhoto);
      localStorage.setItem('ceo_avatar_bg', updatedBg);
      localStorage.setItem('ceo_avatar_glasses', updatedGlasses);
      localStorage.setItem('ceo_avatar_border', updatedBorder);
      localStorage.setItem('ceo_photo_zoom', String(z));
      localStorage.setItem('ceo_photo_pos_x', String(x));
      localStorage.setItem('ceo_photo_pos_y', String(y));
      localStorage.setItem('ceo_photo_rotate', String(r));
      localStorage.setItem('ceo_photo_fit', f);

      const storedToken = localStorage.getItem('token') || token;
      if (!storedToken) return;
      await fetch('/api/ceo-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storedToken}`
        },
        body: JSON.stringify({
          photo: updatedPhoto,
          avatarBg: updatedBg,
          avatarGlasses: updatedGlasses,
          avatarBorder: updatedBorder,
          photoZoom: z,
          photoPosX: x,
          photoPosY: y,
          photoRotate: r,
          photoFit: f
        })
      });
    } catch (err) {
      console.error('Failed to sync CEO config:', err);
    }
  };

  const handleCeoPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (user?.role !== 'admin') {
      triggerAlert('error', 'Unauthorized: Only logged in Admin accounts can update the profile photo.');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerAlert('error', 'Please upload a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        localStorage.setItem('ceo_photo', base64);
        setCeoPhoto(base64);
        triggerAlert('success', 'Founder photo updated successfully!');
        await syncCeoConfig(base64, avatarBg, avatarGlasses, avatarBorder, photoZoom, photoPosX, photoPosY, photoRotate, photoFit);
      }
    };
    reader.onerror = () => {
      triggerAlert('error', 'Failed to read file.');
    };
    reader.readAsDataURL(file);
  };

  const handleResetCeoPhoto = async () => {
    if (user?.role !== 'admin') {
      triggerAlert('error', 'Unauthorized: Only logged in Admin accounts can reset the profile photo.');
      return;
    }
    localStorage.removeItem('ceo_photo');
    setCeoPhoto('');
    triggerAlert('success', 'Profile photo reset to default vector avatar.');
    await syncCeoConfig('', avatarBg, avatarGlasses, avatarBorder, photoZoom, photoPosX, photoPosY, photoRotate, photoFit);
  };

  const getAvatarBgColors = () => {
    switch (avatarBg) {
      case 'emerald': return { stop1: '#064e3b', stop2: '#022c22', accent: '#34d399' };
      case 'rose': return { stop1: '#4c0519', stop2: '#111827', accent: '#f43f5e' };
      case 'sunset': return { stop1: '#7c2d12', stop2: '#0f172a', accent: '#fb923c' };
      case 'cosmic':
      default: return { stop1: '#1e1b4b', stop2: '#0f172a', accent: '#818cf8' };
    }
  };

  const getGlassesStroke = () => {
    switch (avatarGlasses) {
      case 'gold': return '#fbbf24';
      case 'silver': return '#cbd5e1';
      case 'classic':
      default: return '#1e293b';
    }
  };

  const getBorderClasses = () => {
    switch (avatarBorder) {
      case 'glowing': return 'shadow-[0_0_25px_rgba(168,85,247,0.45)] border-purple-500/60';
      case 'minimal': return 'shadow-xl border-slate-800/40';
      case 'neon':
      default: return 'shadow-[0_0_20px_rgba(99,102,241,0.4)] border-indigo-500/50';
    }
  };

  // Load token and global CEO config on startup
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken);
    } else {
      fetchUsage(null);
    }

    // Fetch the global CEO photo and avatar customization config from the server database
    fetch('/api/ceo-config')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch config');
      })
      .then((data) => {
        if (data.ceo) {
          const photo = typeof data.ceo.photo === 'string' ? data.ceo.photo : '';
          const bg = data.ceo.avatarBg || 'cosmic';
          const glasses = data.ceo.avatarGlasses || 'classic';
          const border = data.ceo.avatarBorder || 'neon';
          const zoom = typeof data.ceo.photoZoom === 'number' ? data.ceo.photoZoom : 1.0;
          const posX = typeof data.ceo.photoPosX === 'number' ? data.ceo.photoPosX : 0;
          const posY = typeof data.ceo.photoPosY === 'number' ? data.ceo.photoPosY : 0;
          const rotate = typeof data.ceo.photoRotate === 'number' ? data.ceo.photoRotate : 0;
          const fit = typeof data.ceo.photoFit === 'string' ? data.ceo.photoFit : 'cover';

          setCeoPhoto(photo);
          setAvatarBg(bg);
          setAvatarGlasses(glasses);
          setAvatarBorder(border);
          setPhotoZoom(zoom);
          setPhotoPosX(posX);
          setPhotoPosY(posY);
          setPhotoRotate(rotate);
          setPhotoFit(fit as 'cover' | 'contain');

          // Update local storage to stay in perfect sync
          localStorage.setItem('ceo_photo', photo);
          localStorage.setItem('ceo_avatar_bg', bg);
          localStorage.setItem('ceo_avatar_glasses', glasses);
          localStorage.setItem('ceo_avatar_border', border);
          localStorage.setItem('ceo_photo_zoom', String(zoom));
          localStorage.setItem('ceo_photo_pos_x', String(posX));
          localStorage.setItem('ceo_photo_pos_y', String(posY));
          localStorage.setItem('ceo_photo_rotate', String(rotate));
          localStorage.setItem('ceo_photo_fit', fit);
        }
      })
      .catch((err) => console.error('Error loading global CEO config:', err));
  }, []);

  // Fetch logged in user
  const fetchUser = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setIsPro(data.user.subscriptionTier === 'pro');
        fetchUsage(authToken);
      } else {
        // Token stale
        localStorage.removeItem('token');
        setToken(null);
        fetchUsage(null);
      }
    } catch (err) {
      console.error(err);
      fetchUsage(null);
    }
  };

  // Fetch usage counts (free daily limits)
  const fetchUsage = async (authToken: string | null) => {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    try {
      const res = await fetch('/api/usage', { headers });
      if (res.ok) {
        const data = await res.json();
        setUsage({
          count: data.count,
          limit: data.limit,
          remaining: data.remaining,
        });
        if (data.isPro) {
          setIsPro(true);
        } else {
          setIsPro(false);
        }
      }
    } catch (err) {
      console.error('Error fetching conversion usage:', err);
    }
  };

  const handleAuthSuccess = (newToken: string, authenticatedUser: User) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(authenticatedUser);
    setIsPro(authenticatedUser.subscriptionTier === 'pro');
    fetchUsage(newToken);
    if (authenticatedUser.role === 'admin') {
      setAppTab('admin');
      setActiveTool(null);
      triggerAlert('success', 'Logged in successfully as Administrator.');
    } else {
      triggerAlert('success', `Logged in successfully as ${authenticatedUser.email}`);
    }
  };

  const handleLogout = async () => {
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsPro(false);
    setActiveTool(null);
    setAppTab('tools');
    fetchUsage(null);
    triggerAlert('success', 'Logged out successfully.');
  };

  const handleCancelSubscriptionDirect = async () => {
    if (!token) return;
    if (!confirm('Are you sure you want to cancel your Pro Subscription? You will lose unlimited access.')) return;

    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Unsubscription request failed.');

      triggerAlert('success', 'Subscription cancelled successfully. Your account is now back on the Free tier.');
      fetchUser(token);
      fetchUsage(token);
    } catch (err: any) {
      triggerAlert('error', err.message || 'Failed to cancel subscription.');
    }
  };

  const triggerAlert = (type: 'error' | 'success', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => {
      setAlertMsg(null);
    }, 5000);
  };

  // Trigger usage increment upon successful file conversion
  const handleToolSuccess = async (fileName: string, fileSize: string, toolOverride?: ToolType, outputBlob?: Blob) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      // Save to client-side IndexedDB for Recent Downloads list (re-download without re-running)
      if (outputBlob) {
        try {
          const { saveRecentDownload } = await import('./lib/recentDownloadsDB');
          await saveRecentDownload({
            fileName,
            fileSize,
            tool: toolOverride || activeTool || 'unknown',
            timestamp: Date.now(),
            blob: outputBlob,
          });
        } catch (dbErr) {
          console.error('Failed to cache download locally:', dbErr);
        }
      }

      const res = await fetch('/api/usage/increment', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tool: toolOverride || activeTool,
          fileName,
          fileSize,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Conversion increment exceeded limit.');
      }

      const data = await res.json();
      setUsage({
        count: data.count,
        limit: data.limit,
        remaining: data.remaining,
      });
      triggerAlert('success', `Successfully processed file: ${fileName}`);
    } catch (err: any) {
      triggerAlert('error', err.message || 'Limit reached.');
      setShowCheckoutModal(true); // Open payment modal on exceeding
    }
  };

  const checkLimitBeforeUsage = () => {
    if (!isPro && usage.remaining <= 0) {
      triggerAlert('error', 'Daily free limit reached. Please subscribe to Pro for unlimited conversions!');
      setShowCheckoutModal(true);
      return true;
    }
    return false;
  };

  // Tools details
  const tools = [
    {
      id: 'merge' as ToolType,
      name: 'Merge PDF',
      description: 'Combine multiple PDF documents into a single file in seconds.',
      icon: FilePlus,
      color: 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white',
    },
    {
      id: 'split' as ToolType,
      name: 'Split PDF',
      description: 'Extract specific page ranges or individual pages from a PDF.',
      icon: Scissors,
      color: 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white',
    },
    {
      id: 'compress' as ToolType,
      name: 'Compress PDF',
      description: 'Reduce file size of your PDF while maintaining maximum quality.',
      icon: FileDown,
      color: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    },
    {
      id: 'pdf-to-img' as ToolType,
      name: 'PDF to Image',
      description: 'Convert each PDF page into high-quality PNG or JPG images.',
      icon: FileImage,
      color: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
    },
    {
      id: 'img-to-pdf' as ToolType,
      name: 'Image to PDF',
      description: 'Convert PNG and JPG images into a clean PDF document.',
      icon: ImageIcon,
      color: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    },
    {
      id: 'pdf-to-word' as ToolType,
      name: 'PDF to Word',
      description: 'Convert PDFs into editable Word documents or rich text files.',
      icon: FileSpreadsheet,
      color: 'bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white',
    },
    {
      id: 'word-to-pdf' as ToolType,
      name: 'Word to PDF',
      description: 'Convert DOCX, DOC, RTF and TXT files to high-fidelity PDFs.',
      icon: FileText,
      color: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
    },
    {
      id: 'img-convert' as ToolType,
      name: 'Image Converter',
      description: 'Convert PNG, JPG, WebP, SVG, and GIF images between formats instantly.',
      icon: RefreshCw,
      color: 'bg-pink-50 text-pink-600 group-hover:bg-pink-600 group-hover:text-white',
    },
    {
      id: 'esign' as ToolType,
      name: 'Add eSignature',
      description: 'Digitally sign your documents with legally binding secure eSignatures.',
      icon: PenTool,
      color: 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white',
      comingSoon: true,
    },
    {
      id: 'protect' as ToolType,
      name: 'Password Protect',
      description: 'Encrypt your PDF documents with passwords to prevent unauthorized access.',
      icon: Lock,
      color: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
      comingSoon: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-950">
      
      {/* Alert Banner */}
      {alertMsg && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center space-x-2 animate-slide-in ${
          alertMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-150 text-emerald-800' 
            : 'bg-red-50 border-red-150 text-red-800'
        }`}>
          <AlertCircle size={16} />
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <nav className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200 z-40">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Branding */}
          <div 
            onClick={() => { setActiveTool(null); setAppTab('tools'); }}
            className="flex items-center space-x-2 cursor-pointer group"
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold tracking-tight text-slate-800">
                Vidhya Gain
              </span>
              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-bold rounded uppercase tracking-wider">
                Pro
              </span>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => { setActiveTool(null); setAppTab('tools'); }}
              className={`hover:text-slate-900 transition-all ${appTab === 'tools' && activeTool === null ? 'text-indigo-600 font-semibold' : ''}`}
            >
              All Tools
            </button>
            {user && (
              <button
                onClick={() => { setActiveTool(null); setAppTab('dashboard'); }}
                className={`hover:text-slate-900 transition-all ${appTab === 'dashboard' ? 'text-indigo-600 font-semibold' : ''}`}
              >
                My Account
              </button>
            )}
            {user && user.role === 'admin' && (
              <button
                onClick={() => { setActiveTool(null); setAppTab('admin'); }}
                className={`hover:text-slate-900 transition-all ${appTab === 'admin' ? 'text-indigo-600 font-semibold' : ''}`}
              >
                Admin Panel
              </button>
            )}
          </div>

          {/* Right Controls: Usage tracker & User Status */}
          <div className="flex items-center space-x-4">

            {/* Free Usage Counter (hidden for Pro) */}
            {!isPro && (
              <div className="hidden sm:flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-2 px-3 shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest leading-none">Daily Free Usage</span>
                  <div className="flex items-center gap-2 mt-1 leading-none">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((idx) => (
                        <div 
                          key={idx} 
                          className={`w-2 h-2 rounded-full ${usage.count < idx ? 'bg-indigo-600' : 'bg-slate-200'}`}
                          title={`Task ${idx}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-700">{usage.count} / 5 Tasks Used</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!user) {
                      setShowAuthModal(true);
                    } else {
                      setShowCheckoutModal(true);
                    }
                  }}
                  className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-slate-800 transition-colors uppercase tracking-wider"
                >
                  Go Unlimited
                </button>
              </div>
            )}

            {isPro && (
              <span className="hidden sm:inline-flex items-center space-x-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full text-[10px] font-bold text-indigo-700 uppercase tracking-wide">
                <Sparkles size={12} className="text-indigo-600 fill-indigo-600" />
                <span>Unlimited Pro</span>
              </span>
            )}

            {/* Pro Trial Countdown Badge (unregistered users only) */}
            {!user && (
              <div 
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-amber-50 to-amber-100/60 hover:from-amber-100 border border-amber-200/80 text-amber-900 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-xs select-none active:scale-95 group/trial shrink-0"
                title="Your Pro Trial countdown! Click to sign up and keep premium features forever!"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <Clock size={13} className="text-amber-600 shrink-0 group-hover/trial:rotate-12 transition-transform" />
                <span className="text-amber-700 hidden xs:inline">Pro Trial:</span>
                <span className="font-mono bg-amber-600 text-white px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-black tracking-tight shadow-xs">
                  {trialTimeLeft > 0 ? (
                    `${Math.floor(trialTimeLeft / 60)}:${String(trialTimeLeft % 60).padStart(2, '0')}`
                  ) : (
                    "Expired"
                  )}
                </span>
                <span className="hidden lg:inline text-[9px] text-amber-600 font-extrabold uppercase tracking-wide ml-0.5 bg-white border border-amber-100 px-1 rounded">
                  Register
                </span>
              </div>
            )}

            {/* Auth Buttons */}
            {user ? (
              <div className="flex items-center space-x-2">
                {/* Avatar dot */}
                <div 
                  onClick={() => setAppTab('dashboard')}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer flex items-center justify-center text-slate-600 font-bold text-xs"
                  title={user.email}
                >
                  <UserIcon size={14} />
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-full font-semibold shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-colors text-xs"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setShowAdminLoginModal(true)}
                  className="px-4 py-2 border border-indigo-200 text-indigo-600 rounded-full font-semibold hover:bg-indigo-50 transition-colors text-xs flex items-center gap-1.5"
                >
                  <Lock size={12} />
                  <span>Admin Login</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Body Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-8 py-8 gap-8 flex flex-col">
        
        {/* Dynamic App Area */}
        {appTab === 'tools' && (
          <div className="space-y-8 animate-fade-in flex flex-col flex-1">
            {activeTool === null ? (
              <>
                {/* Real-Time Personalized Hero Section (SaaS Optimization) */}
                <div className="bg-gradient-to-r from-slate-50 via-indigo-50/10 to-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-xs space-y-6">
                  <div className="space-y-2 max-w-3xl">
                    {PERSONALIZATION_SEGMENTS[selectedSegment].alertText && (
                      <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-700 px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                        <Sparkles size={11} className="text-indigo-600 shrink-0" />
                        <span>{PERSONALIZATION_SEGMENTS[selectedSegment].badge} Persona Loaded</span>
                      </div>
                    )}
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight transition-all duration-300">
                      {PERSONALIZATION_SEGMENTS[selectedSegment].headline}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl transition-all duration-300">
                      {PERSONALIZATION_SEGMENTS[selectedSegment].subheading}
                    </p>
                  </div>

                  {/* Personalization interactive triggers */}
                  <div className="pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2 select-none">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Experience Personalization Live:</span>
                      {[
                        { id: 'default', label: 'General', icon: '⚡' },
                        { id: 'legal', label: 'Legal', icon: '⚖️' },
                        { id: 'student', label: 'Academic', icon: '🎓' },
                        { id: 'developer', label: 'Tech', icon: '💻' },
                        { id: 'finance', label: 'Finance', icon: '🏦' }
                      ].map((seg) => (
                        <button
                          key={seg.id}
                          onClick={() => {
                            setSelectedSegment(seg.id as any);
                            trackEvent('personalization_pill_clicked', { segment: seg.id });
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer flex items-center gap-1 hover:scale-102 active:scale-98 ${
                            selectedSegment === seg.id
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span>{seg.icon}</span>
                          <span>{seg.label}</span>
                        </button>
                      ))}
                    </div>
                    {PERSONALIZATION_SEGMENTS[selectedSegment].alertText && (
                      <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider bg-indigo-50/70 px-2.5 py-1 rounded-lg border border-indigo-100/50">
                        ✨ {PERSONALIZATION_SEGMENTS[selectedSegment].alertText}
                      </span>
                    )}
                  </div>
                </div>

                {/* The Conversion Sandbox */}
                <ConversionSandbox 
                  onSelectTool={(toolId, filesVal) => {
                    if (Array.isArray(filesVal)) {
                      setPreloadedFiles(filesVal);
                      setPreloadedFile(filesVal[0] || null);
                    } else {
                      setPreloadedFile(filesVal);
                      setPreloadedFiles(filesVal ? [filesVal] : null);
                    }
                    setActiveTool(toolId);
                  }}
                  usageLimitReached={!isPro && usage.remaining <= 0}
                  onSuccess={(fileName, fileSize, toolOverride) => handleToolSuccess(fileName, fileSize, toolOverride)}
                  onError={(msg) => triggerAlert('error', msg)}
                />

                {/* Grid of the 8 SaaS tools with Search Filtering */}
                {(() => {
                  const filteredTools = tools.filter((t) => 
                    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.description.toLowerCase().includes(searchQuery.toLowerCase())
                  );

                  if (filteredTools.length === 0) {
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4 shadow-sm animate-fade-in w-full">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center mx-auto border border-slate-100 dark:border-slate-700">
                          <Search size={22} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">No tools found</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            We couldn't find any tools matching "<span className="font-semibold text-indigo-600 dark:text-indigo-400">{searchQuery}</span>".
                          </p>
                        </div>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Clear Search
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {/* Global Privacy Banner */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-center text-center shadow-xs">
                        <p className="text-xs sm:text-sm font-semibold text-emerald-800 flex items-center gap-1.5 flex-wrap justify-center">
                          <span>🔒 Privacy First: Your documents are processed entirely in your browser. Files are never uploaded to our servers.</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {filteredTools.map((t) => {
                          const IconComp = t.icon;
                          const isComingSoon = 'comingSoon' in t && t.comingSoon;
                          return (
                            <div
                              key={t.id}
                              onClick={() => {
                                if (isComingSoon) {
                                  trackEvent('coming_soon_clicked', { toolName: t.name });
                                  triggerAlert('success', `${t.name} is coming soon! Stay tuned.`);
                                  return;
                                }
                                trackEvent('tool_card_clicked', { toolId: t.id, name: t.name });
                                setActiveTool(t.id);
                              }}
                              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center group cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all duration-200 relative"
                            >
                              {isComingSoon && (
                                <span className="absolute top-3 right-3 text-[9px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 select-none">
                                  Coming Soon
                                </span>
                              )}
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-200 ${t.color}`}>
                                <IconComp size={24} />
                              </div>
                              <h3 className="font-bold text-slate-800 transition-colors group-hover:text-indigo-600">
                                {t.name}
                              </h3>
                              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                {t.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Interactive Premium Pricing Grid */}
                <div id="pricing" className="py-10 border-t border-slate-200 space-y-8">
                  <div className="text-center max-w-xl mx-auto space-y-2">
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Simple, Transparent Pricing</h2>
                    <p className="text-sm text-slate-500">Choose the tier that fits your volume. Free accounts can be used forever.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                    {/* Free tier card */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col justify-between space-y-6 shadow-sm">
                      <div className="space-y-4">
                        <div>
                          <span className="text-xxs font-extrabold uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Basic Tier</span>
                          <h4 className="text-lg font-bold text-slate-800 mt-1">Free Plan</h4>
                        </div>
                        <div className="flex items-baseline text-slate-800">
                          <span className="text-3xl font-extrabold">₹0</span>
                          <span className="text-xs text-slate-400 font-bold ml-1">/ month</span>
                        </div>
                        <ul className="space-y-2 text-xs font-medium text-slate-600 text-left">
                          <li className="flex items-center space-x-2">
                            <Check size={14} className="text-emerald-500 shrink-0" />
                            <span>3–5 free conversions per day</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <Check size={14} className="text-emerald-500 shrink-0" />
                            <span>Merge, split, format converter access</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <Check size={14} className="text-emerald-500 shrink-0" />
                            <span>100% browser-safe client processing</span>
                          </li>
                        </ul>
                      </div>
                      <button
                        onClick={() => {
                          trackEvent('free_plan_clicked');
                          if (user) {
                            triggerAlert('success', 'You are already signed in. Enjoy your daily limits!');
                          } else {
                            setShowAuthModal(true);
                          }
                        }}
                        className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        {user ? 'Current Tier' : 'Sign Up Free'}
                      </button>
                    </div>

                    {/* Pro tier card */}
                    <div className="bg-gradient-to-b from-slate-900 to-indigo-950 p-6 rounded-3xl text-white flex flex-col justify-between space-y-6 relative overflow-hidden shadow-xl">
                      <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-600/10 blur-xl rounded-full" />
                      
                      <div className="space-y-4 z-10">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xxs font-extrabold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full">Popular choice</span>
                            <h4 className="text-lg font-bold mt-1">SaaS Pro Access</h4>
                          </div>
                          <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">Save 50%</span>
                        </div>
                        <div className="flex items-baseline">
                          <span className="text-3xl font-extrabold">₹49</span>
                          <span className="text-xs opacity-70 font-bold ml-1">/ month</span>
                        </div>
                        <ul className="space-y-2 text-xs font-medium opacity-90 text-left">
                          <li className="flex items-center space-x-2">
                            <Check size={14} className="text-indigo-400 shrink-0" />
                            <span>Unlimited high-res conversions</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <Check size={14} className="text-indigo-400 shrink-0" />
                            <span>High-fidelity layout OCR & doc processing</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <Check size={14} className="text-indigo-400 shrink-0" />
                            <span>Premium support & priority servers</span>
                          </li>
                        </ul>
                      </div>
                      {isPro ? (
                        <div className="space-y-2">
                          <div className="w-full text-center py-2 bg-indigo-900/40 text-indigo-200 border border-indigo-500/30 text-xs font-bold rounded-xl">
                            Active Pro Member
                          </div>
                          <button
                            onClick={() => {
                              trackEvent('pro_cancel_clicked');
                              handleCancelSubscriptionDirect();
                            }}
                            className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                          >
                            Cancel Pro Subscription
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            trackEvent('pro_upgrade_clicked');
                            if (!user) {
                              triggerAlert('error', 'Please login or register to subscribe.');
                              setShowAuthModal(true);
                            } else {
                              setShowCheckoutModal(true);
                            }
                          }}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-900/30 cursor-pointer"
                        >
                          Upgrade to Pro
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Tool Page Wrapper with Back button */
              <div className="space-y-6">
                <button
                  onClick={() => {
                    setActiveTool(null);
                    setPreloadedFile(null);
                    setPreloadedFiles(null);
                    fetchUsage(token);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center space-x-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs"
                >
                  <Grid size={14} />
                  <span>Back to All Tools</span>
                </button>

                {/* Renders active tool component */}
                {activeTool === 'merge' && (
                  <MergePdf 
                    onSuccess={handleToolSuccess} 
                    onError={(msg) => triggerAlert('error', msg)}
                    usageLimitReached={!isPro && usage.remaining <= 0}
                    initialFiles={preloadedFiles}
                  />
                )}
                {activeTool === 'split' && (
                  <SplitPdf 
                    onSuccess={handleToolSuccess} 
                    onError={(msg) => triggerAlert('error', msg)}
                    usageLimitReached={!isPro && usage.remaining <= 0}
                    initialFile={preloadedFile}
                  />
                )}
                {activeTool === 'compress' && (
                  <CompressPdf 
                    onSuccess={handleToolSuccess} 
                    onError={(msg) => triggerAlert('error', msg)}
                    usageLimitReached={!isPro && usage.remaining <= 0}
                    initialFile={preloadedFile}
                  />
                )}
                {activeTool === 'pdf-to-img' && (
                  <PdfToImage 
                    onSuccess={handleToolSuccess} 
                    onError={(msg) => triggerAlert('error', msg)}
                    usageLimitReached={!isPro && usage.remaining <= 0}
                    initialFile={preloadedFile}
                  />
                )}
                {activeTool === 'img-to-pdf' && (
                  <ImageToPdf 
                    onSuccess={handleToolSuccess} 
                    onError={(msg) => triggerAlert('error', msg)}
                    usageLimitReached={!isPro && usage.remaining <= 0}
                    initialFile={preloadedFile}
                    initialFiles={preloadedFiles}
                  />
                )}
                {activeTool === 'pdf-to-word' && (
                  <PdfToWord 
                    onSuccess={handleToolSuccess} 
                    onError={(msg) => triggerAlert('error', msg)}
                    usageLimitReached={!isPro && usage.remaining <= 0}
                    initialFile={preloadedFile}
                  />
                )}
                {activeTool === 'word-to-pdf' && (
                  <WordToPdf 
                    onSuccess={handleToolSuccess} 
                    onError={(msg) => triggerAlert('error', msg)}
                    usageLimitReached={!isPro && usage.remaining <= 0}
                    initialFile={preloadedFile}
                  />
                )}
                {activeTool === 'img-convert' && (
                  <ImageConverter 
                    onSuccess={handleToolSuccess} 
                    onError={(msg) => triggerAlert('error', msg)}
                    usageLimitReached={!isPro && usage.remaining <= 0}
                    initialFile={preloadedFile}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* User Dashboard Account */}
        {appTab === 'dashboard' && user && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">User Control Center</h2>
                <p className="text-xs text-slate-500">Manage subscriptions, view conversion activity logs, and receipts.</p>
              </div>
              <button
                onClick={() => setAppTab('tools')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Launch Tools
              </button>
            </div>
            <UserDashboard 
              user={user} 
              token={token || ''} 
              onRefreshUser={() => fetchUser(token || '')} 
              onError={(msg) => triggerAlert('error', msg)}
              onOpenAdminPanel={() => { setActiveTool(null); setAppTab('admin'); }}
            />
          </div>
        )}

        {/* Admin Control Panel */}
        {appTab === 'admin' && user?.role === 'admin' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2 tracking-tight">
                  <ShieldCheck size={20} className="text-indigo-600" />
                  <span>SaaS Admin Analytics Dashboard</span>
                </h2>
                <p className="text-xs text-slate-500">Monitor platform conversions, manage billing plans, and review audits.</p>
              </div>
              <button
                onClick={() => setAppTab('tools')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Go back to tools
              </button>
            </div>
            <AdminPanel 
              token={token || ''} 
              onError={(msg) => triggerAlert('error', msg)}
            />
          </div>
        )}

        {/* Community / YouTube Section */}
        <div className="mt-16 border-t border-slate-200 pt-16 pb-6">
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl border border-indigo-500/10 max-w-4xl mx-auto">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col md:flex-row items-center gap-6 justify-between text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="p-4 bg-red-600/15 border border-red-500/30 text-red-500 rounded-2xl shadow-inner shrink-0">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.002 3.002 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">Join the Community</p>
                  <h4 className="text-base sm:text-lg font-bold text-white leading-tight">Subscribe to Sai Dattu YouTube Channel</h4>
                  <p className="text-xs text-slate-300 font-medium">Get the latest insights, technology logs, and tutorials!</p>
                </div>
              </div>
              <a 
                href="https://youtube.com/@saidattu-x7m?si=val8S63a90u7sKl9"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('youtube_subscribe_clicked')}
                className="w-full md:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 group cursor-pointer shrink-0"
              >
                <span>Subscribe</span>
                <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <span className="text-sm font-bold text-slate-800">Vidhya Gain</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Premium document processing, OCR layouters, and file conversion pipelines. Designed for productivity.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Popular Tools</h4>
            <ul className="space-y-1.5 text-xs text-slate-600 font-semibold">
              <li><button onClick={() => { setActiveTool('merge'); setAppTab('tools'); }} className="hover:text-indigo-600 transition-colors">Merge PDF Documents</button></li>
              <li><button onClick={() => { setActiveTool('split'); setAppTab('tools'); }} className="hover:text-indigo-600 transition-colors">Split Pages Extractor</button></li>
              <li><button onClick={() => { setActiveTool('compress'); setAppTab('tools'); }} className="hover:text-indigo-600 transition-colors">Optimize & Compress Size</button></li>
              <li><button onClick={() => { setActiveTool('img-convert'); setAppTab('tools'); }} className="hover:text-indigo-600 transition-colors">Multi Image Format Converter</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Legal & Safe</h4>
            <ul className="space-y-1.5 text-xs text-slate-600 font-medium">
              <li className="flex items-center space-x-1">
                <Check size={12} className="text-indigo-500" />
                <span>Client-Side Local Encryption</span>
              </li>
              <li className="flex items-center space-x-1">
                <Check size={12} className="text-indigo-500" />
                <span>GDPR & CCPA Compliant</span>
              </li>
              <li className="flex items-center space-x-1">
                <Check size={12} className="text-indigo-500" />
                <span>Auto-Purge Document Streams</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">SaaS Security Guarantee</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              We process all file modifications securely in your web browser, ensuring zero persistent document leaks or database storage overhead.
            </p>
          </div>

        </div>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-medium uppercase tracking-wider">
          <span>&copy; 2026 Vidhya Gain Technologies Inc. All rights reserved.</span>
          <div className="flex gap-6 mt-2 sm:mt-0 items-center">
            <a href="#privacy" className="hover:text-slate-600">Privacy Policy</a>
            <a href="#terms" className="hover:text-slate-600">Terms of Service</a>
            <a href="#help" className="hover:text-slate-600">Help Center</a>
            {user && user.role === 'admin' ? (
              <button 
                onClick={() => {
                  setActiveTool(null);
                  setAppTab('admin');
                }} 
                className="hover:text-indigo-600 font-bold text-slate-500 transition-colors cursor-pointer text-xs"
              >
                Admin Panel
              </button>
            ) : (
              <button 
                onClick={() => {
                  setShowAdminLoginModal(true);
                }} 
                className="hover:text-indigo-600 font-bold text-slate-500 transition-colors cursor-pointer text-xs"
              >
                Admin Portal
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Modals Mounting */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onSuccess={handleAuthSuccess} 
          onError={(msg) => triggerAlert('error', msg)}
        />
      )}

      {showAdminLoginModal && (
        <AdminLoginModal 
          onClose={() => setShowAdminLoginModal(false)} 
          onSuccess={(adminToken, adminUser) => {
            handleAuthSuccess(adminToken, adminUser);
            setActiveTool(null);
            setAppTab('admin');
            triggerAlert('success', 'Logged in successfully as Administrator.');
          }} 
          onError={(msg) => triggerAlert('error', msg)}
        />
      )}

      {showCheckoutModal && (
        <CheckoutModal 
          onClose={() => setShowCheckoutModal(false)} 
          onSuccess={(updated) => {
            setUser(updated);
            setIsPro(updated.subscriptionTier === 'pro');
            fetchUsage(token);
            triggerAlert('success', 'Thank you! Premium Pro Subscription activated successfully.');
          }} 
          token={token || ''}
          onError={(msg) => triggerAlert('error', msg)}
        />
      )}

    </div>
  );
}
