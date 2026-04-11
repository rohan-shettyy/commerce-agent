import React, { useRef } from 'react';

interface ImageUploadProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  previewUrl: string | null;
  onClear: () => void;
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onFileSelect, 
  isUploading, 
  previewUrl, 
  onClear,
  disabled 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
    // reset native value so same file can trigger sequence again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="relative group shrink-0 flex items-center justify-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={isUploading || disabled}
        className="hidden"
      />
      
      {previewUrl ? (
        <div className="relative w-10 h-10 rounded-lg border border-gray-200 shadow-sm bg-gray-50 flex items-center justify-center">
          {isUploading ? (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 backdrop-blur-[1px] rounded-lg">
              <svg className="animate-spin w-5 h-5 text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            <button
              onClick={onClear}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 hover:scale-110 transition-transform z-20 text-[10px] shadow-sm leading-none pb-[1px]"
              aria-label="Remove image"
            >
              ×
            </button>
          )}
          <img src={previewUrl} alt="Upload preview" className={`object-cover w-full h-full rounded-lg ${isUploading ? 'opacity-50' : ''}`} />
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          aria-label="Upload product image"
          className="shrink-0 p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
          </svg>
        </button>
      )}
    </div>
  );
};
