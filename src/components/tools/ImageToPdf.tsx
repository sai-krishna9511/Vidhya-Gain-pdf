import React, { useState, useEffect } from 'react';
import { PDFDocument, PageSizes } from 'pdf-lib';
import { Upload, FileImage, Trash2, ArrowRight, Download, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface ImageToPdfProps {
  onSuccess: (fileName: string, fileSize: string, toolOverride?: any, outputBlob?: Blob) => void;
  onError: (msg: string) => void;
  usageLimitReached: boolean;
  initialFile?: File | null;
  initialFiles?: File[] | null;
}

interface ImageFile {
  file: File;
  previewUrl: string;
}

export default function ImageToPdf({ onSuccess, onError, usageLimitReached, initialFile, initialFiles }: ImageToPdfProps) {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState<'A4' | 'LETTER'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margin, setMargin] = useState<'none' | 'small' | 'large'>('small');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState('images_converted.pdf');

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      const filesArray = initialFiles.filter(f => allowedTypes.includes(f.type) || f.type.startsWith('image/jpeg') || f.type.startsWith('image/png') || f.type.startsWith('image/jpg'));
      if (filesArray.length === 0) {
        onError('Please select valid PNG or JPG images.');
        return;
      }
      const newImages = filesArray.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setImages(newImages);
      setDownloadUrl(null);
    } else if (initialFile) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      const isAllowed = allowedTypes.includes(initialFile.type) || initialFile.type.startsWith('image/jpeg') || initialFile.type.startsWith('image/png') || initialFile.type.startsWith('image/jpg');
      if (!isAllowed) {
        onError('Please select valid PNG or JPG images.');
        return;
      }
      const newImg: ImageFile = {
        file: initialFile,
        previewUrl: URL.createObjectURL(initialFile),
      };
      setImages([newImg]);
      setDownloadUrl(null);
    }
  }, [initialFile, initialFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      const filesArray = (Array.from(e.target.files) as File[]).filter(f => allowedTypes.includes(f.type));
      if (filesArray.length === 0) {
        onError('Please select valid PNG or JPG images.');
        return;
      }

      const newImages: ImageFile[] = filesArray.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setImages(prev => [...prev, ...newImages]);
      setDownloadUrl(null);
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(images[index].previewUrl);
    setImages(prev => prev.filter((_, i) => i !== index));
    setDownloadUrl(null);
  };

  const handleConvert = async () => {
    if (images.length === 0) {
      onError('Please add at least 1 image.');
      return;
    }
    if (usageLimitReached) {
      onError('Daily free limit reached. Please upgrade to Pro.');
      return;
    }

    setLoading(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const dims = pageSize === 'A4' ? PageSizes.A4 : PageSizes.Letter;
      const width = orientation === 'portrait' ? dims[0] : dims[1];
      const height = orientation === 'portrait' ? dims[1] : dims[0];

      let marginSize = 0;
      if (margin === 'small') marginSize = 20;
      if (margin === 'large') marginSize = 40;

      for (const imgItem of images) {
        const fileBytes = await imgItem.file.arrayBuffer();
        let pdfImage;
        if (imgItem.file.type === 'image/png') {
          pdfImage = await pdfDoc.embedPng(fileBytes);
        } else {
          pdfImage = await pdfDoc.embedJpg(fileBytes);
        }

        const page = pdfDoc.addPage([width, height]);
        const availWidth = width - marginSize * 2;
        const availHeight = height - marginSize * 2;

        // Maintain aspect ratio
        const imgDims = pdfImage.scale(1);
        const imgRatio = imgDims.width / imgDims.height;
        const availRatio = availWidth / availHeight;

        let drawWidth = availWidth;
        let drawHeight = availHeight;

        if (imgRatio > availRatio) {
          drawWidth = availWidth;
          drawHeight = availWidth / imgRatio;
        } else {
          drawHeight = availHeight;
          drawWidth = availHeight * imgRatio;
        }

        const x = marginSize + (availWidth - drawWidth) / 2;
        const y = marginSize + (availHeight - drawHeight) / 2;

        page.drawImage(pdfImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      onSuccess(pdfName, formatSize(blob.size), undefined, blob);
    } catch (err) {
      console.error(err);
      onError('Failed to convert images to PDF. Please try again.');
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
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setDownloadUrl(null);
  };

  return (
    <div id="img-to-pdf-tool" className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-slate-800">Image to PDF</h3>
          <p className="text-sm text-slate-500">Convert JPG and PNG images into a clean PDF document.</p>
        </div>
        {images.length > 0 && (
          <button
            onClick={reset}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center space-x-1"
          >
            <RefreshCw size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          {/* File Upload Zone */}
          <div className="relative group cursor-pointer border-2 border-dashed border-slate-200 hover:border-violet-400 rounded-xl p-8 text-center transition-all bg-slate-50 hover:bg-violet-50/20">
            <input
              type="file"
              multiple
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="p-3 bg-violet-100 rounded-lg text-violet-600 group-hover:scale-110 transition-transform">
                <Upload size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Drag & drop your images, or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG, JPEG formats</p>
              </div>
            </div>
          </div>

          {/* Grid of added images with thumbnail previews */}
          {images.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                Uploaded Images ({images.length})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-150 group">
                    <img src={img.previewUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 p-1.5 flex items-center justify-between text-white text-[10px]">
                      <span className="truncate max-w-[70%]">{img.file.name}</span>
                      <button
                        onClick={() => removeImage(idx)}
                        className="text-red-300 hover:text-red-500 transition-colors p-0.5"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Configurations column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-150">
              Page Layout Settings
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Page Size</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPageSize('A4')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${pageSize === 'A4' ? 'border-violet-600 bg-violet-100/30 text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    A4 (210 x 297 mm)
                  </button>
                  <button
                    onClick={() => setPageSize('LETTER')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${pageSize === 'LETTER' ? 'border-violet-600 bg-violet-100/30 text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    US Letter
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Orientation</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOrientation('portrait')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${orientation === 'portrait' ? 'border-violet-600 bg-violet-100/30 text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    Portrait
                  </button>
                  <button
                    onClick={() => setOrientation('landscape')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${orientation === 'landscape' ? 'border-violet-600 bg-violet-100/30 text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Margins</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['none', 'small', 'large'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMargin(m)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-colors capitalize ${margin === m ? 'border-violet-600 bg-violet-100/30 text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Output PDF Name</label>
                <input
                  type="text"
                  value={pdfName}
                  onChange={(e) => setPdfName(e.target.value.endsWith('.pdf') ? e.target.value : e.target.value + '.pdf')}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-violet-500 text-slate-700 font-medium"
                />
              </div>
            </div>

            {usageLimitReached && (
              <div className="p-3 bg-amber-50 text-amber-800 text-[10px] rounded-lg flex items-start space-x-1.5">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-amber-600" />
                <span>Limit reached. Please upgrade to Pro.</span>
              </div>
            )}

            <button
              disabled={loading || images.length === 0 || usageLimitReached}
              onClick={handleConvert}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-100"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Building PDF...</span>
                </>
              ) : (
                <>
                  <span>Generate PDF</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Download Block */}
      {downloadUrl && (
        <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded">
              <Check size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">PDF Ready!</p>
              <p className="text-xs text-emerald-600">Your images have been compiled successfully.</p>
            </div>
          </div>
          <a
            href={downloadUrl}
            download={pdfName}
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
