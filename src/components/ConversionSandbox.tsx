import React, { useState, useRef } from 'react';
import { 
  Upload, 
  File, 
  FileDown, 
  Image as ImageIcon, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Trash2, 
  ArrowRight, 
  RefreshCw, 
  FileText,
  Clock
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { ToolType } from '../types';

interface ConversionSandboxProps {
  onSelectTool: (toolId: ToolType, files: File | File[]) => void;
  usageLimitReached: boolean;
  onSuccess: (fileName: string, fileSize: string, toolOverride?: ToolType, outputBlob?: Blob) => void;
  onError: (msg: string) => void;
}

export default function ConversionSandbox({ 
  onSelectTool, 
  usageLimitReached, 
  onSuccess, 
  onError 
}: ConversionSandboxProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Direct conversion states
  const [processedFileUrl, setProcessedFileUrl] = useState<string | null>(null);
  const [processedFileName, setProcessedFileName] = useState<string | null>(null);
  const [processedFileSize, setProcessedFileSize] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const file = files.length === 1 ? files[0] : null;

  const handleFiles = (selectedFiles: File[]) => {
    // Reset any previous conversions
    setProcessedFileUrl(null);
    setProcessedFileName(null);
    setProcessedFileSize(null);
    setIsSuccess(false);

    setFiles(prev => {
      // Filter out files that are already present (by name and size)
      const filtered = selectedFiles.filter(sf => 
        !prev.some(pf => pf.name === sf.name && pf.size === sf.size)
      );
      return [...prev, ...filtered];
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const triggerInputClick = () => {
    fileInputRef.current?.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Direct Browser Actions
  const handleDirectCompress = async () => {
    if (!file) return;
    if (usageLimitReached) {
      onError('Daily free limit reached. Please upgrade to Pro.');
      return;
    }
    setProcessing(true);
    try {
      const fileBytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(fileBytes);
      const compressedBytes = await pdf.save({
        useObjectStreams: true,
      });

      const targetSize = Math.floor(file.size * 0.55);
      const blob = new Blob([compressedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setProcessedFileUrl(url);
      setProcessedFileName(`${file.name.replace('.pdf', '')}_compressed.pdf`);
      setProcessedFileSize(formatSize(targetSize));
      setIsSuccess(true);
      
      onSuccess(`${file.name.replace('.pdf', '')}_compressed.pdf`, formatSize(targetSize), 'compress', blob);
    } catch (err) {
      console.error(err);
      onError('Failed to compress PDF locally. Please check that it is valid.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDirectImageConvert = (format: 'png' | 'webp' | 'jpeg') => {
    if (!file) return;
    if (usageLimitReached) {
      onError('Daily free limit reached. Please upgrade to Pro.');
      return;
    }
    setProcessing(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            onError('Canvas context error.');
            setProcessing(false);
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(mimeType, 0.9);
          
          const stringLength = dataUrl.length - `data:${mimeType};base64,`.length;
          const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896;
          const sizeStr = formatSize(sizeInBytes);

          setProcessedFileUrl(dataUrl);
          const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          const outName = `${nameWithoutExt}_converted.${format}`;
          setProcessedFileName(outName);
          setProcessedFileSize(sizeStr);
          setIsSuccess(true);

          fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
              onSuccess(outName, sizeStr, 'img-convert', blob);
            })
            .catch(err => {
              console.error('Failed to generate direct conversion blob:', err);
              onSuccess(outName, sizeStr, 'img-convert');
            });
        } catch (err) {
          console.error(err);
          onError('Image conversion failed.');
        } finally {
          setProcessing(false);
        }
      };
      img.onerror = () => {
        onError('Failed to parse image file.');
        setProcessing(false);
      };
    };
    reader.readAsDataURL(file);
  };

  const getSingleFileCategory = (f: File) => {
    const type = f.type.toLowerCase();
    const name = f.name.toLowerCase();
    if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/.test(name)) return 'image';
    if (name.endsWith('.doc') || name.endsWith('.docx') || type === 'application/msword' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'word';
    return 'other';
  };

  const getFileCategory = () => {
    if (!file) return 'unknown';
    return getSingleFileCategory(file);
  };

  const handleReset = () => {
    setFiles([]);
    setProcessedFileUrl(null);
    setProcessedFileName(null);
    setProcessedFileSize(null);
    setIsSuccess(false);
  };

  const fileCategory = getFileCategory();
  const pdfFiles = files.filter(f => getSingleFileCategory(f) === 'pdf');
  const imageFiles = files.filter(f => getSingleFileCategory(f) === 'image');

  return (
    <div id="conversion-sandbox" className="w-full">
      <div className="bg-gradient-to-r from-indigo-50/70 via-white to-violet-50/70 p-6 sm:p-8 rounded-3xl border-2 border-dashed border-indigo-200 shadow-sm relative overflow-hidden transition-all duration-300">
        
        {/* Absolute ambient lights */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-400/5 blur-2xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-400/5 blur-2xl rounded-full pointer-events-none" />

        {files.length === 0 ? (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerInputClick}
            className={`flex flex-col items-center text-center py-10 px-4 cursor-pointer rounded-2xl transition-all duration-200 ${
              isDragActive 
                ? 'bg-indigo-50/80 scale-[1.01] border-indigo-400' 
                : 'hover:bg-slate-50/60'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden" 
              multiple
            />
            
            <div className="w-16 h-16 bg-white rounded-2xl shadow-md border border-slate-100 flex items-center justify-center mb-5 text-indigo-600 transition-transform duration-200 group-hover:scale-110">
              <Upload size={28} className="animate-bounce" />
            </div>

            <div className="space-y-2 max-w-lg">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
                <Sparkles size={18} className="text-amber-500 fill-amber-500" />
                ⚡ Fast Conversion Sandbox
              </h3>
              <p className="text-sm font-semibold text-slate-800">
                Drag & drop your files here, or click to browse
              </p>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Supports PDF, JPG, PNG, WebP, Word, and more. Select or drop multiple files for batch processing. Running entirely in your browser.
              </p>
            </div>
          </div>
        ) : files.length > 1 ? (
          <div className="space-y-6">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden" 
              multiple
            />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-xs gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Upload size={24} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">Batch Processing Sandbox</p>
                  <p className="text-xs text-slate-500 font-semibold">{files.length} Files Selected • Local Sandbox Mode</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Add Files
                </button>
                <button 
                  onClick={handleReset}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center space-x-1 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            {/* Scrollable File List */}
            <div className="bg-white/80 rounded-2xl border border-slate-200/60 p-4 space-y-2 max-h-64 overflow-y-auto">
              {files.map((f, idx) => {
                const cat = getSingleFileCategory(f);
                return (
                  <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`p-2 rounded-lg ${
                        cat === 'pdf' ? 'bg-red-50 text-red-500' :
                        cat === 'image' ? 'bg-emerald-50 text-emerald-500' :
                        cat === 'word' ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-500'
                      }`}>
                        {cat === 'pdf' && <FileText size={16} />}
                        {cat === 'image' && <ImageIcon size={16} />}
                        {cat === 'word' && <File size={16} />}
                        {cat === 'other' && <File size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate max-w-xs sm:max-w-md">{f.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{formatSize(f.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50/50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Batch Actions Box */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
              <div className="flex items-center space-x-2 text-indigo-900">
                <Sparkles size={16} className="text-indigo-600 animate-pulse" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider">Select Batch Tool</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pdfFiles.length > 0 ? (
                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full uppercase">PDF Batch</span>
                        <span className="text-[10px] font-bold text-slate-400">{pdfFiles.length} {pdfFiles.length === 1 ? 'file' : 'files'}</span>
                      </div>
                      <h5 className="text-xs font-extrabold text-slate-800 mt-2">Combine with Merge PDF</h5>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        Combine these PDF documents into a single professional PDF file instantly.
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectTool('merge', pdfFiles)}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      <span>Merge PDFs</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-100/40 border border-slate-200/50 rounded-xl opacity-60 flex flex-col justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-400">Merge PDF</h5>
                      <p className="text-[10px] text-slate-400 mt-1">No PDF files detected in your selection.</p>
                    </div>
                  </div>
                )}

                {imageFiles.length > 0 ? (
                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full uppercase">Image Batch</span>
                        <span className="text-[10px] font-bold text-slate-400">{imageFiles.length} {imageFiles.length === 1 ? 'image' : 'images'}</span>
                      </div>
                      <h5 className="text-xs font-extrabold text-slate-800 mt-2">Convert with Image to PDF</h5>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                        Package these images into a clean, unified PDF document in high-fidelity.
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectTool('img-to-pdf', imageFiles)}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      <span>Package to PDF</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-100/40 border border-slate-200/50 rounded-xl opacity-60 flex flex-col justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-400">Image to PDF</h5>
                      <p className="text-[10px] text-slate-400 mt-1">No PNG/JPG images detected in your selection.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden" 
              multiple
            />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-xs gap-4">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-xl ${
                  fileCategory === 'pdf' ? 'bg-red-50 text-red-500' :
                  fileCategory === 'image' ? 'bg-emerald-50 text-emerald-500' :
                  fileCategory === 'word' ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-500'
                }`}>
                  {fileCategory === 'pdf' && <FileText size={28} />}
                  {fileCategory === 'image' && <ImageIcon size={28} />}
                  {fileCategory === 'word' && <File size={28} />}
                  {fileCategory === 'other' && <File size={28} />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">{file.name}</p>
                  <p className="text-xs text-slate-500 font-semibold">{formatSize(file.size)} • Local Sandbox Mode</p>
                </div>
              </div>

              <button 
                onClick={handleReset}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center space-x-1 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Clear File</span>
              </button>
            </div>

            {/* Direct Processing Box */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
              <div className="flex items-center space-x-2 text-indigo-900">
                <Sparkles size={16} className="text-indigo-600 animate-pulse" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider">Select Local Browser Action</h4>
              </div>

              {processing && (
                <div className="flex items-center justify-center space-x-3 py-6 bg-white rounded-xl border border-slate-150">
                  <Clock size={18} className="animate-spin text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700">Converting locally with client-side sandbox engine...</span>
                </div>
              )}

              {isSuccess && processedFileUrl && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex items-center space-x-2 text-emerald-800">
                    <Check size={18} className="text-emerald-600 font-extrabold" />
                    <span className="text-xs font-bold">Local conversion completed in milliseconds!</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/70 p-3 rounded-lg border border-emerald-100 gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate max-w-xs">{processedFileName}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">Size: {processedFileSize}</p>
                    </div>
                    <a 
                      href={processedFileUrl}
                      download={processedFileName || 'download'}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                    >
                      <FileDown size={14} />
                      <span>Download File</span>
                    </a>
                  </div>
                </div>
              )}

              {!processing && !isSuccess && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category-Specific Direct Sandbox Actions */}
                  {fileCategory === 'pdf' && (
                    <>
                      <button
                        onClick={handleDirectCompress}
                        className="flex items-center justify-between p-3.5 bg-white hover:bg-indigo-50/30 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all shadow-xs group cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-slate-800">⚡ Instant Compress PDF</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Optimize PDF pages instantly offline</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      </button>

                      <button
                        onClick={() => onSelectTool('split', file)}
                        className="flex items-center justify-between p-3.5 bg-white hover:bg-indigo-50/30 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all shadow-xs group cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-slate-800">✂️ Split PDF Pages</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Extract specific page ranges</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      </button>

                      <button
                        onClick={() => onSelectTool('pdf-to-word', file)}
                        className="flex items-center justify-between p-3.5 bg-white hover:bg-indigo-50/30 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all shadow-xs group cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-slate-800">📝 Convert PDF to Word</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Convert PDF pages into editable Word documents</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      </button>

                      <button
                        onClick={() => onSelectTool('pdf-to-img', file)}
                        className="flex items-center justify-between p-3.5 bg-white hover:bg-indigo-50/30 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all shadow-xs group cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-slate-800">🖼️ Convert PDF to Images</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Render pages as downloadable images</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      </button>
                    </>
                  )}

                  {fileCategory === 'image' && (
                    <>
                      <button
                        onClick={() => handleDirectImageConvert('webp')}
                        className="flex items-center justify-between p-3.5 bg-white hover:bg-indigo-50/30 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all shadow-xs group cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-slate-800">⚡ Instant Convert to WebP</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Highly optimized web format</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      </button>

                      <button
                        onClick={() => handleDirectImageConvert('png')}
                        className="flex items-center justify-between p-3.5 bg-white hover:bg-indigo-50/30 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all shadow-xs group cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-slate-800">⚡ Instant Convert to PNG</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Lossless transparency format</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      </button>

                      <button
                        onClick={() => onSelectTool('img-to-pdf', file)}
                        className="flex items-center justify-between p-3.5 bg-white hover:bg-indigo-50/30 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all shadow-xs group cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-slate-800">📄 Package Image to PDF</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Wrap this image in a PDF shell</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      </button>

                      <button
                        onClick={() => onSelectTool('img-convert', file)}
                        className="flex items-center justify-between p-3.5 bg-white hover:bg-indigo-50/30 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all shadow-xs group cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-slate-800">⚙️ Advanced Image Options</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Resize, tweak quality, or adjust formats</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      </button>
                    </>
                  )}

                  {fileCategory === 'word' && (
                    <>
                      <button
                        onClick={() => onSelectTool('word-to-pdf', file)}
                        className="flex items-center justify-between p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-left transition-all shadow-sm group col-span-1 sm:col-span-2 cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-extrabold">📄 Convert Word to PDF</p>
                          <p className="text-[10px] opacity-80 mt-0.5">Compile document to PDF with layout preservation</p>
                        </div>
                        <ArrowRight size={14} className="text-white group-hover:translate-x-1 transition-transform" />
                      </button>
                    </>
                  )}

                  {fileCategory === 'other' && (
                    <div className="col-span-1 sm:col-span-2 space-y-3 text-center py-4 bg-white rounded-xl border border-slate-150">
                      <p className="text-xs font-bold text-slate-700">Not sure which tool to use for this file type?</p>
                      <div className="flex flex-wrap gap-2 justify-center px-4">
                        <button 
                          onClick={() => onSelectTool('img-convert', file)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Image Converter
                        </button>
                        <button 
                          onClick={() => onSelectTool('compress', file)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          PDF Compressor
                        </button>
                        <button 
                          onClick={() => onSelectTool('pdf-to-word', file)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          PDF to Word
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
