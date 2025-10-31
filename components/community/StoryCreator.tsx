'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Type, Smile, Palette, Send, Trash2, Music, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface StoryCreatorProps {
  onClose: () => void;
  onPublish: (file: File, text: string, textColor: string, textBgColor: string, stickers: Sticker[], filter: string, musicUrl: string) => void;
}

interface Sticker {
  emoji: string;
  x: number;
  y: number;
  size: number;
}

export default function StoryCreator({ onClose, onPublish }: StoryCreatorProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textBgColor, setTextBgColor] = useState('rgba(0, 0, 0, 0.5)');
  const [showTextInput, setShowTextInput] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [selectedMusic, setSelectedMusic] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colors = [
    '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  ];

  const bgColors = [
    'transparent',
    'rgba(0, 0, 0, 0.5)',
    'rgba(255, 255, 255, 0.5)',
    'rgba(255, 0, 0, 0.5)',
    'rgba(0, 255, 0, 0.5)',
    'rgba(0, 0, 255, 0.5)',
  ];

  const emojis = [
    '😀', '😂', '😍', '🥰', '😎', '🤩', '😇', '🤗', '🤔', '😏',
    '😢', '😭', '😡', '🤬', '😱', '🥳', '🤪', '😴', '🤤', '😵',
    '❤️', '💕', '💖', '💗', '💙', '💚', '💛', '🧡', '💜', '🖤',
    '🔥', '⭐', '✨', '💫', '🌟', '💥', '💯', '👍', '👎', '👏',
    '🙏', '💪', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '🎮',
  ];

  const filters = [
    { name: 'None', value: 'none', css: 'none' },
    { name: 'Grayscale', value: 'grayscale', css: 'grayscale(100%)' },
    { name: 'Sepia', value: 'sepia', css: 'sepia(100%)' },
    { name: 'Warm', value: 'warm', css: 'sepia(30%) saturate(120%)' },
    { name: 'Cool', value: 'cool', css: 'hue-rotate(180deg) saturate(120%)' },
    { name: 'Vintage', value: 'vintage', css: 'sepia(50%) contrast(120%) brightness(90%)' },
    { name: 'Bright', value: 'bright', css: 'brightness(120%) contrast(110%)' },
    { name: 'Dark', value: 'dark', css: 'brightness(80%) contrast(120%)' },
    { name: 'Vivid', value: 'vivid', css: 'saturate(150%) contrast(110%)' },
    { name: 'Fade', value: 'fade', css: 'contrast(80%) brightness(110%) saturate(80%)' },
  ];

  const musicTracks = [
    { name: 'Happy Vibes', url: '/music/happy.mp3' },
    { name: 'Chill Out', url: '/music/chill.mp3' },
    { name: 'Energetic', url: '/music/energetic.mp3' },
    { name: 'Romantic', url: '/music/romantic.mp3' },
    { name: 'Upbeat', url: '/music/upbeat.mp3' },
  ];

  useEffect(() => {
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

  const handleAddEmoji = (emoji: string) => {
    const newSticker: Sticker = {
      emoji,
      x: 50,
      y: 50,
      size: 48,
    };
    setStickers([...stickers, newSticker]);
    setShowEmojiPicker(false);
  };

  const handlePublish = async () => {
    if (!selectedFile) return;

    try {
      onPublish(selectedFile, text, textColor, textBgColor, stickers, selectedFilter, selectedMusic);
      onClose();
    } catch (error) {
      console.error('Error publishing story:', error);
      alert('Failed to publish story');
    }
  };

  const getFilterStyle = () => {
    const filter = filters.find(f => f.value === selectedFilter);
    return filter ? filter.css : 'none';
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
                style={{ filter: getFilterStyle() }}
              />
              
              {/* Text Overlay */}
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
              
              {/* Stickers */}
              {stickers.map((sticker, index) => (
                <div
                  key={index}
                  className="absolute cursor-move"
                  style={{
                    left: `${sticker.x}%`,
                    top: `${sticker.y}%`,
                    fontSize: `${sticker.size}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  draggable
                  onDragEnd={(e) => {
                    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                    if (rect) {
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const y = ((e.clientY - rect.top) / rect.height) * 100;
                      const newStickers = [...stickers];
                      newStickers[index] = { ...sticker, x, y };
                      setStickers(newStickers);
                    }
                  }}
                >
                  {sticker.emoji}
                </div>
              ))}
            </div>
          ) : (
            <video
              src={previewUrl}
              controls
              className="max-w-full max-h-full"
              style={{ filter: getFilterStyle() }}
            />
          )}
          
          {/* Music Indicator */}
          {selectedMusic && (
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 px-3 py-2 rounded-full flex items-center gap-2">
              <Music className="w-4 h-4 text-white" />
              <span className="text-white text-sm">
                {musicTracks.find(m => m.url === selectedMusic)?.name}
              </span>
            </div>
          )}
        </div>

        {/* Tools */}
        <div className="bg-black bg-opacity-50 p-4 space-y-4 max-h-96 overflow-y-auto">
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
          
          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <p className="text-white text-sm mb-2">Add Stickers & Emojis:</p>
              <div className="grid grid-cols-10 gap-2 max-h-48 overflow-y-auto">
                {emojis.map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAddEmoji(emoji)}
                    className="text-3xl hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Filter Picker */}
          {showFilterPicker && (
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <p className="text-white text-sm mb-2">Choose Filter:</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedFilter(filter.value)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-white text-sm ${
                      selectedFilter === filter.value
                        ? 'bg-purple-600'
                        : 'bg-white bg-opacity-20'
                    }`}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Music Picker */}
          {showMusicPicker && (
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <p className="text-white text-sm mb-2">Add Music:</p>
              <div className="space-y-2">
                {musicTracks.map((track) => (
                  <button
                    key={track.url}
                    onClick={() => {
                      setSelectedMusic(track.url);
                      setShowMusicPicker(false);
                    }}
                    className={`w-full px-4 py-2 rounded-lg text-white text-sm text-left ${
                      selectedMusic === track.url
                        ? 'bg-purple-600'
                        : 'bg-white bg-opacity-20'
                    }`}
                  >
                    <Music className="w-4 h-4 inline mr-2" />
                    {track.name}
                  </button>
                ))}
                {selectedMusic && (
                  <button
                    onClick={() => setSelectedMusic('')}
                    className="w-full px-4 py-2 rounded-lg bg-red-600 text-white text-sm"
                  >
                    Remove Music
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tool Buttons */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setShowTextInput(!showTextInput);
                setShowEmojiPicker(false);
                setShowFilterPicker(false);
                setShowMusicPicker(false);
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
            
            <button
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowTextInput(false);
                setShowFilterPicker(false);
                setShowMusicPicker(false);
                setShowColorPicker(false);
              }}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition ${
                showEmojiPicker ? 'bg-purple-600' : 'bg-white bg-opacity-20'
              } hover:bg-opacity-30`}
            >
              <Smile className="w-6 h-6 text-white" />
              <span className="text-white text-xs">Stickers</span>
            </button>
            
            <button
              onClick={() => {
                setShowFilterPicker(!showFilterPicker);
                setShowTextInput(false);
                setShowEmojiPicker(false);
                setShowMusicPicker(false);
                setShowColorPicker(false);
              }}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition ${
                showFilterPicker ? 'bg-purple-600' : 'bg-white bg-opacity-20'
              } hover:bg-opacity-30`}
            >
              <Sparkles className="w-6 h-6 text-white" />
              <span className="text-white text-xs">Filters</span>
            </button>
            
            <button
              onClick={() => {
                setShowMusicPicker(!showMusicPicker);
                setShowTextInput(false);
                setShowEmojiPicker(false);
                setShowFilterPicker(false);
                setShowColorPicker(false);
              }}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition ${
                showMusicPicker ? 'bg-purple-600' : 'bg-white bg-opacity-20'
              } hover:bg-opacity-30`}
            >
              <Music className="w-6 h-6 text-white" />
              <span className="text-white text-xs">Music</span>
            </button>

            {(text || stickers.length > 0) && (
              <button
                onClick={() => {
                  setText('');
                  setStickers([]);
                  setShowTextInput(false);
                  setShowColorPicker(false);
                  setShowEmojiPicker(false);
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
