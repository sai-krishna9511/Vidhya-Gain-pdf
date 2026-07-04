import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Upload, File, Download, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface SplitPdfProps {
  onSuccess: (fileName: string, fileSize: string, toolOverride?: any, outputBlob?: Blob) => void;
  onError: (msg: string) => void;
  usageLimitReached: boolean;
  initialFile?: File | null;
}

export default function SplitPdf({ onSuccess, onError, usageLimitReached, initialFile }: SplitPdfProps) {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [splitMode, setSplitMode] = useState<'range' | 'extract'>('range');
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
  const [extractPages, setExtractPages] = useState('');
  const [downloadUrls, setDownloadUrls] = useState<{ name: string; url: string }[]>([]);

  useEffect(() => {
    const loadPdfDetails = async (selected: File) => {
      setLoading(true);
      try {
        const bytes = await selected.arrayBuffer();
        const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
        setTotalPages(pdf.getPageCount());
        setFile(selected);
        setStartPage(1);
        setEndPage(pdf.getPageCount());
        setDownloadUrls([]);
      } catch (err) {
        console.error(err);
        onError('Failed to load PDF. It may be password-protected or corrupted.');
      } finally {
        setLoading(false);
      }
    };

    if (initialFile) {
      if (initialFile.type !== 'application/pdf') {
        onError('Please select a valid PDF file.');
        return;
      }
      loadPdfDetails(initialFile);
    }
  }, [initialFile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== 'application/pdf') {
        onError('Please select a valid PDF file.');
        return;
      }
      setLoading(true);
      try {
        const bytes = await selected.arrayBuffer();
        const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
        setTotalPages(pdf.getPageCount());
        setFile(selected);
        setStartPage(1);
        setEndPage(pdf.getPageCount());
        setDownloadUrls([]);
      } catch (err) {
        console.error(err);
        onError('Failed to load PDF. It may be password-protected or corrupted.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSplit = async () => {
    if (!file) return;
    if (usageLimitReached) {
      onError('Daily free limit reached. Please upgrade to Pro.');
      return;
    }

    setLoading(true);
    try {
      const fileBytes = await file.arrayBuffer();
      const srcPdf = await PDFDocument.load(fileBytes);
      const outputUrls: { name: string; url: string }[] = [];

      if (splitMode === 'range') {
        if (startPage < 1 || endPage > totalPages || startPage > endPage) {
          onError(`Invalid page range. Please choose between 1 and ${totalPages}.`);
          setLoading(false);
          return;
        }

        const newPdf = await PDFDocument.create();
        const indices = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage - 1 + i);
        const copiedPages = await newPdf.copyPages(srcPdf, indices);
        copiedPages.forEach(p => newPdf.addPage(p));

        const bytes = await newPdf.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const outName = `${file.name.replace('.pdf', '')}_pages_${startPage}_to_${endPage}.pdf`;
        outputUrls.push({ name: outName, url });

        onSuccess(outName, formatSize(blob.size), undefined, blob);
      } else {
        // Extract specific pages (comma separated, e.g. 1, 3, 5)
        const parsedPages = extractPages
          .split(',')
          .map(p => parseInt(p.trim(), 10))
          .filter(p => !isNaN(p) && p >= 1 && p <= totalPages);

        if (parsedPages.length === 0) {
          onError('Please enter valid page numbers (e.g. 1, 3, 5).');
          setLoading(false);
          return;
        }

        const newPdf = await PDFDocument.create();
        const indices = parsedPages.map(p => p - 1);
        const copiedPages = await newPdf.copyPages(srcPdf, indices);
        copiedPages.forEach(p => newPdf.addPage(p));

        const bytes = await newPdf.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const outName = `${file.name.replace('.pdf', '')}_extracted.pdf`;
        outputUrls.push({ name: outName, url });

        onSuccess(outName, formatSize(blob.size), undefined, blob);
      }

      setDownloadUrls(outputUrls);
    } catch (err: any) {
      console.error(err);
      onError('Error splitting PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const reset = () => {
    setFile(null);
    setTotalPages(0);
    setDownloadUrls([]);
  };

  return (
    <div id="split-pdf-tool" className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-slate-800">Split PDF</h3>
          <p className="text-sm text-slate-500">Extract specific page ranges or individual pages from a PDF.</p>
        </div>
        {file && (
          <button
            onClick={reset}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center space-x-1"
          >
            <RefreshCw size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {!file ? (
        <div className="relative group cursor-pointer border-2 border-dashed border-slate-200 hover:border-violet-400 rounded-xl p-8 text-center transition-all bg-slate-50 hover:bg-violet-50/20">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-violet-100 rounded-lg text-violet-600 group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Drag & drop your PDF file, or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">Supports PDF files only</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-3 truncate">
              <div className="p-2 bg-red-50 text-red-500 rounded">
                <File size={20} />
              </div>
              <div className="truncate">
                <p className="text-sm text-slate-700 font-semibold truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{formatSize(file.size)} • {totalPages} pages</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex space-x-2 border-b border-slate-100 pb-1">
              <button
                onClick={() => setSplitMode('range')}
                className={`pb-2 text-sm font-semibold transition-colors border-b-2 px-1 ${splitMode === 'range' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Split by Range
              </button>
              <button
                onClick={() => setSplitMode('extract')}
                className={`pb-2 text-sm font-semibold transition-colors border-b-2 px-1 ${splitMode === 'extract' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Extract Pages
              </button>
            </div>

            {splitMode === 'range' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">From Page</label>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={startPage}
                    onChange={(e) => setStartPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-violet-500 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">To Page</label>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={endPage}
                    onChange={(e) => setEndPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-violet-500 text-slate-700"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Enter Page Numbers (e.g. 1, 3, 5)</label>
                <input
                  type="text"
                  placeholder={`e.g. 1, 3, ${totalPages}`}
                  value={extractPages}
                  onChange={(e) => setExtractPages(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-violet-500 text-slate-700 placeholder-slate-400"
                />
              </div>
            )}

            {usageLimitReached && (
              <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl flex items-start space-x-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
                <span>You have reached your daily limit of 1 tool. Please subscribe to Pro for unlimited usage.</span>
              </div>
            )}

            <button
              disabled={loading || usageLimitReached}
              onClick={handleSplit}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-100"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Splitting PDF...</span>
                </>
              ) : (
                <span>Split PDF File</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Download Block */}
      {downloadUrls.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded">
                <Check size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Successfully Split!</p>
                <p className="text-xs text-emerald-600">Your custom file is ready for download.</p>
              </div>
            </div>
          </div>
          {downloadUrls.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              download={item.name}
              className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <span className="text-sm text-slate-700 font-medium truncate pr-4">{item.name}</span>
              <div className="flex items-center space-x-1 text-xs font-semibold text-violet-600 group-hover:text-violet-700">
                <Download size={14} />
                <span>Download</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
