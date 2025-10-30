'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Type, Smile, Palette, Send, Trash2 } from 'lucide-react';
import Image from 'next/image';

interface StoryCreatorProps {
  onClose: () => void;
  onPublish: (file: File, text: string, textColor: string, textBgColor: string) => void;
}

export default function StoryCreator({ onClose, onPublish }: StoryCreatorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textBgColor, setTextBgColor] = useState('rgba(0, 0, 0, 0.5)');
  const [showTextInput, setShowTextInput] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const colors = [
    '#FFFFFF', // White
    '#000000', // Black
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFA500', // Orange
    '#800080', // Purple
  ];

  const bgColors = [
    'transparent',
    'rgba(0, 0, 0, 0.5)',
    'rgba(255, 255, 255, 0.5)',
    'rgba(255, 0, 0, 0.5)',
    'rgba(0, 255, 0, 0.5)',
    'rgba(0, 0, 255, 0.5)',
  ];

  useEffect(() => {
    // Open file picker automatically
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      onClose();
      return;
    }

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Please select an image or video file');
      onClose();
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      onClose();
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handlePublish = async () => {
    if (!selectedFile) return;

    try {
      onPublish(selectedFile, text, textColor, textBgColor);
      onClose();
    } catch (error) {
      console.error('Error publishing story:', error);
      alert('Failed to publish story');
    }
  };

  if (!previewUrl) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="text-white text-center">
            <p>Selecting media...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black bg-opacity-50">
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-white font-semibold text-lg">Create Story</h2>
          <button
            onClick={handlePublish}
            disabled={!selectedFile}
            className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-2 rounded-full font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            Share
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {selectedFile?.type.startsWith('image/') ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={previewUrl}
                alt="Story preview"
                fill
                className="object-contain"
                unoptimized
              />
              {text && (
                <div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-lg text-center max-w-md"
                  style={{
                    color: textColor,
                    backgroundColor: textBgColor,
                    fontSize: '24px',
                    fontWeight: 'bold',
                  }}
                >
                  {text}
                </div>
              )}
            </div>
          ) : (
            <video
              src={previewUrl}
              controls
              className="max-w-full max-h-full"
            />
          )}
        </div>

        {/* Tools */}
        <div className="bg-black bg-opacity-50 p-4 space-y-4">
          {/* Text Input */}
          {showTextInput && (
            <div className="space-y-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add text to your story..."
                className="w-full px-4 py-3 bg-white bg-opacity-20 text-white placeholder-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                maxLength={100}
              />
              
              {/* Color Pickers */}
              {showColorPicker && (
                <div className="space-y-2">
                  <div>
                    <p className="text-white text-sm mb-2">Text Color:</p>
                    <div className="flex gap-2 flex-wrap">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setTextColor(color)}
                          className={`w-8 h-8 rounded-full border-2 ${
                            textColor === color ? 'border-white' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-white text-sm mb-2">Background:</p>
                    <div className="flex gap-2 flex-wrap">
                      {bgColors.map((color, idx) => (
                        <button
                          key={idx}
                          onClick={() => setTextBgColor(color)}
                          className={`w-8 h-8 rounded-full border-2 ${
                            textBgColor === color ? 'border-white' : 'border-gray-500'
                          }`}
                          style={{
                            backgroundColor: color === 'transparent' ? 'transparent' : color,
                            backgroundImage: color === 'transparent' 
                              ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)'
                              : 'none',
                            backgroundSize: '8px 8px',
                            backgroundPosition: '0 0, 4px 4px',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tool Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => {
                setShowTextInput(!showTextInput);
                if (!showTextInput) setShowColorPicker(false);
              }}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition ${
                showTextInput ? 'bg-purple-600' : 'bg-white bg-opacity-20'
              } hover:bg-opacity-30`}
            >
              <Type className="w-6 h-6 text-white" />
              <span className="text-white text-xs">Text</span>
            </button>

            {showTextInput && (
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition ${
                  showColorPicker ? 'bg-purple-600' : 'bg-white bg-opacity-20'
                } hover:bg-opacity-30`}
              >
                <Palette className="w-6 h-6 text-white" />
                <span className="text-white text-xs">Colors</span>
              </button>
            )}

            {text && (
              <button
                onClick={() => {
                  setText('');
                  setShowTextInput(false);
                  setShowColorPicker(false);
                }}
                className="flex flex-col items-center gap-1 p-3 rounded-lg bg-red-600 hover:bg-red-700 transition"
              >
                <Trash2 className="w-6 h-6 text-white" />
                <span className="text-white text-xs">Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
