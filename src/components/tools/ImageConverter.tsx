import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileImage, Download, Check, AlertCircle, RefreshCw, Sliders } from 'lucide-react';

interface ImageConverterProps {
  onSuccess: (fileName: string, fileSize: string, toolOverride?: any, outputBlob?: Blob) => void;
  onError: (msg: string) => void;
  usageLimitReached: boolean;
  initialFile?: File | null;
}

export default function ImageConverter({ onSuccess, onError, usageLimitReached, initialFile }: ImageConverterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [targetFormat, setTargetFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState<number>(90);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [convertedSize, setConvertedSize] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (initialFile) {
      if (!initialFile.type.startsWith('image/')) {
        onError('Please select a valid image file.');
        return;
      }
      setFile(initialFile);
      setPreviewUrl(URL.createObjectURL(initialFile));
      setDownloadUrl(null);
    }
  }, [initialFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.type.startsWith('image/')) {
        onError('Please select a valid image file.');
        return;
      }
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setDownloadUrl(null);
    }
  };

  const handleConvert = () => {
    if (!file || !previewUrl) return;
    if (usageLimitReached) {
      onError('Daily free limit reached. Please upgrade to Pro.');
      return;
    }

    setLoading(true);
    
    // Create an image object to load the uploaded file
    const img = new Image();
    img.src = previewUrl;
    img.onload = () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) {
          onError('Conversion error: Canvas context lost.');
          setLoading(false);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          onError('Conversion error: Context creation failed.');
          setLoading(false);
          return;
        }

        // Set dimensions identical to source image
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Render image onto canvas
        ctx.fillStyle = '#ffffff'; // Keep white background for format translations
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        // Export format based on choices
        const mimeType = targetFormat === 'png' ? 'image/png' : targetFormat === 'webp' ? 'image/webp' : 'image/jpeg';
        const qVal = quality / 100;
        
        const dataUrl = canvas.toDataURL(mimeType, qVal);
        setDownloadUrl(dataUrl);

        // Calculate size from base64
        const stringLength = dataUrl.length - `data:${mimeType};base64,`.length;
        const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896; // base64 ratio correction
        const sizeStr = formatSize(sizeInBytes);
        setConvertedSize(sizeStr);

        const outName = `${file.name.substring(0, file.name.lastIndexOf('.'))}_converted.${targetFormat}`;
        
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            onSuccess(outName, sizeStr, undefined, blob);
          })
          .catch(err => {
            console.error('Failed to generate image blob:', err);
            onSuccess(outName, sizeStr);
          });
      } catch (err) {
        console.error(err);
        onError('Format conversion failed. Make sure your image isn\'t blocked by safety permissions.');
      } finally {
        setLoading(false);
      }
    };
    img.onerror = () => {
      onError('Failed to parse uploaded image.');
      setLoading(false);
    };
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setDownloadUrl(null);
  };

  return (
    <div id="image-converter-tool" className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <canvas ref={canvasRef} className="hidden" />

      <div className="mb-6 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-slate-800">Image Converter</h3>
          <p className="text-sm text-slate-500">Convert PNG, JPG, WebP, SVG, and GIF images instantly between formats.</p>
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
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-violet-100 rounded-lg text-violet-600 group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Drag & drop your image file, or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG, JPEG, WEBP, SVG, GIF formats</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-6 space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3 truncate">
                <div className="p-2 bg-indigo-50 text-indigo-500 rounded">
                  <FileImage size={20} />
                </div>
                <div className="truncate">
                  <p className="text-sm text-slate-700 font-semibold truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                </div>
              </div>
            </div>

            {/* Live image preview block */}
            {previewUrl && (
              <div className="relative border border-slate-150 rounded-xl overflow-hidden aspect-[4/3] bg-slate-100 flex items-center justify-center p-2 group shadow-inner">
                <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                <div className="absolute inset-x-0 top-0 bg-slate-900/40 p-2 text-white text-xs font-semibold backdrop-blur-xs">
                  Source Image Preview
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-6 space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-150">
                Conversion Configurations
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Target Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setTargetFormat(fmt)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-colors uppercase ${targetFormat === fmt ? 'border-violet-600 bg-violet-100/30 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      {fmt === 'jpeg' ? 'JPG' : fmt}
                    </button>
                  ))}
                </div>
              </div>

              {targetFormat !== 'png' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold uppercase flex items-center space-x-1">
                      <Sliders size={12} className="text-slate-400" />
                      <span>Compression Quality</span>
                    </span>
                    <span className="font-bold text-violet-600">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value))}
                    className="w-full accent-violet-600 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>Small size</span>
                    <span>High quality</span>
                  </div>
                </div>
              )}

              {usageLimitReached && (
                <div className="p-3 bg-amber-50 text-amber-800 text-[10px] rounded-lg flex items-start space-x-1.5">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-amber-600" />
                  <span>Limit reached. Please upgrade to Pro.</span>
                </div>
              )}

              <button
                disabled={loading || usageLimitReached}
                onClick={handleConvert}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-100"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Converting Image...</span>
                  </>
                ) : (
                  <span>Convert Format</span>
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
              <p className="text-sm font-semibold text-emerald-800">Conversion Successful!</p>
              <p className="text-xs text-emerald-600">Export size: {convertedSize}</p>
            </div>
          </div>
          <a
            href={downloadUrl}
            download={`${file?.name.substring(0, file?.name.lastIndexOf('.'))}_converted.${targetFormat}`}
            className="flex items-center space-x-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors shadow-sm"
          >
            <Download size={14} />
            <span>Download Converted Image</span>
          </a>
        </div>
      )}
    </div>
  );
}
