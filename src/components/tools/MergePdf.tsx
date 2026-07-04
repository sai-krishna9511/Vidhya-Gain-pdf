import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Upload, File, Trash2, ArrowRight, Download, Check, AlertCircle } from 'lucide-react';

interface MergePdfProps {
  onSuccess: (fileName: string, fileSize: string, toolOverride?: any, outputBlob?: Blob) => void;
  onError: (msg: string) => void;
  usageLimitReached: boolean;
  initialFiles?: File[] | null;
}

export default function MergePdf({ onSuccess, onError, usageLimitReached, initialFiles }: MergePdfProps) {
  const [files, setFiles] = useState<File[]>(initialFiles || []);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [mergedName, setMergedName] = useState('merged_document.pdf');

  React.useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      setFiles(initialFiles);
      setDownloadUrl(null);
    }
  }, [initialFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = (Array.from(e.target.files) as File[]).filter(f => f.type === 'application/pdf');
      if (newFiles.length === 0) {
        onError('Please select valid PDF files.');
        return;
      }
      setFiles(prev => [...prev, ...newFiles]);
      setDownloadUrl(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const newFiles = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type === 'application/pdf');
      if (newFiles.length === 0) {
        onError('Please select valid PDF files.');
        return;
      }
      setFiles(prev => [...prev, ...newFiles]);
      setDownloadUrl(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setDownloadUrl(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      onError('Please add at least 2 PDF files to merge.');
      return;
    }
    if (usageLimitReached) {
      onError('Daily free limit reached. Please upgrade to Pro.');
      return;
    }

    setLoading(true);
    try {
      // Create a new PDFDocument
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const fileBytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(fileBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      const sizeStr = formatSize(blob.size);
      onSuccess(mergedName, sizeStr, undefined, blob);
    } catch (err: any) {
      console.error(err);
      onError('Failed to merge PDFs. The files may be corrupted or encrypted.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="merge-pdf-tool" className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-slate-800">Merge PDF</h3>
        <p className="text-sm text-slate-500">Combine multiple PDF documents into a single file in seconds.</p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative group cursor-pointer border-2 border-dashed border-slate-200 hover:border-violet-400 rounded-xl p-8 text-center transition-all bg-slate-50 hover:bg-violet-50/20"
      >
        <input
          type="file"
          multiple
          accept=".pdf"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-violet-100 rounded-lg text-violet-600 group-hover:scale-110 transition-transform">
            <Upload size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Drag & drop your PDFs here, or click to browse</p>
            <p className="text-xs text-slate-400 mt-1">Supports PDF files only</p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
            <span>Files to Merge ({files.length})</span>
            <span>File Size</span>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                <div className="flex items-center space-x-3 truncate">
                  <div className="p-2 bg-red-50 text-red-500 rounded">
                    <File size={16} />
                  </div>
                  <span className="text-sm text-slate-700 font-medium truncate">{file.name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-slate-500">{formatSize(file.size)}</span>
                  <button
                    onClick={() => removeFile(idx)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Output File Name</label>
              <input
                type="text"
                value={mergedName}
                onChange={(e) => setMergedName(e.target.value.endsWith('.pdf') ? e.target.value : e.target.value + '.pdf')}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-500 text-slate-700 font-medium"
              />
            </div>

            {usageLimitReached && (
              <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl flex items-start space-x-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
                <span>You have reached your daily limit of 1 tool. Please subscribe to Pro for unlimited usage.</span>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <button
                disabled={loading || files.length < 2 || usageLimitReached}
                onClick={handleMerge}
                className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-100"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Merging PDFs...</span>
                  </>
                ) : (
                  <>
                    <span>Merge PDFs</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Block */}
      {downloadUrl && (
        <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded">
              <Check size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">Successfully Merged!</p>
              <p className="text-xs text-emerald-600">Your new file is ready for download.</p>
            </div>
          </div>
          <a
            href={downloadUrl}
            download={mergedName}
            className="flex items-center space-x-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors shadow-sm"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </a>
        </div>
      )}
    </div>
  );
}
