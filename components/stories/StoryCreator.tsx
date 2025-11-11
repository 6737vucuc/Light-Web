'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  X, Type, Smile, Music, Image as ImageIcon, Video, 
  Palette, Sparkles, Users, Send, ChevronDown, Download,
  Trash2, RotateCcw, ZoomIn, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/lib/contexts/ToastContext';

interface StoryCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onPost: (storyData: any) => Promise<void>;
}

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  align: 'left' | 'center' | 'right';
}

interface StickerElement {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
}

const FONTS = [
  { name: 'Classic', value: 'Arial, sans-serif' },
  { name: 'Modern', value: '"Helvetica Neue", sans-serif' },
  { name: 'Neon', value: '"Courier New", monospace' },
  { name: 'Typewriter', value: '"Courier", monospace' },
  { name: 'Strong', value: '"Impact", sans-serif' },
];

const COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
];

const BACKGROUND_COLORS = [
  '#FFFFFF', '#000000', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
];

const EMOJIS = [
  '😀', '😂', '🥰', '😍', '🤩', '😎', '🔥', '❤️', '👍', '🎉',
  '✨', '⭐', '💯', '🎵', '🎨', '📸', '🌈', '☀️', '🌙', '⚡',
];

export default function StoryCreator({ isOpen, onClose, onPost }: StoryCreatorProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [mode, setMode] = useState<'camera' | 'text' | 'edit'>('camera');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  
  // Text mode
  const [backgroundColor, setBackgroundColor] = useState('#4ECDC4');
  const [textContent, setTextContent] = useState('');
  
  // Edit mode
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [stickers, setStickers] = useState<StickerElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showTextTools, setShowTextTools] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Current text settings
  const [currentFont, setCurrentFont] = useState(FONTS[0].value);
  const [currentColor, setCurrentColor] = useState('#FFFFFF');
  const [currentAlign, setCurrentAlign] = useState<'left' | 'center' | 'right'>('center');
  
  // Posting
  const [isPosting, setIsPosting] = useState(false);
  const [isCloseFriends, setIsCloseFriends] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setMode('camera');
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    setBackgroundColor('#4ECDC4');
    setTextContent('');
    setTextElements([]);
    setStickers([]);
    setSelectedElement(null);
    setShowTextTools(false);
    setShowStickerPicker(false);
    setShowColorPicker(false);
    setIsCloseFriends(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast.error('Please select an image or video file');
      return;
    }

    setMediaFile(file);
    setMediaType(isImage ? 'image' : 'video');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
      setMode('edit');
    };
    reader.readAsDataURL(file);
  };

  const handleTextMode = () => {
    setMode('text');
    setMediaPreview(null);
    setMediaFile(null);
  };

  const addTextElement = () => {
    if (!textContent.trim()) return;

    const newElement: TextElement = {
      id: Date.now().toString(),
      text: textContent,
      x: 50,
      y: 50,
      fontSize: 32,
      color: currentColor,
      fontFamily: currentFont,
      align: currentAlign,
    };

    setTextElements([...textElements, newElement]);
    setTextContent('');
    setShowTextTools(false);
  };

  const addSticker = (emoji: string) => {
    const newSticker: StickerElement = {
      id: Date.now().toString(),
      emoji,
      x: 50,
      y: 50,
      size: 80,
    };

    setStickers([...stickers, newSticker]);
    setShowStickerPicker(false);
  };

  const deleteElement = (id: string) => {
    setTextElements(textElements.filter(el => el.id !== id));
    setStickers(stickers.filter(st => st.id !== id));
    setSelectedElement(null);
  };

  const handlePost = async () => {
    try {
      setIsPosting(true);

      let storyData: any = {
        isCloseFriends,
      };

      if (mode === 'text') {
        // Text-only story
        storyData.mediaType = 'text';
        storyData.backgroundColor = backgroundColor;
        storyData.textContent = textContent;
      } else if (mediaFile) {
        // Upload media
        const formData = new FormData();
        formData.append('file', mediaFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload media');
        }

        const { url } = await uploadRes.json();

        storyData.mediaType = mediaType;
        storyData.mediaUrl = url;
      }

      // Add text elements and stickers as metadata
      if (textElements.length > 0) {
        storyData.textElements = textElements;
      }

      if (stickers.length > 0) {
        storyData.stickers = stickers.map(s => ({ emoji: s.emoji, x: s.x, y: s.y, size: s.size }));
      }

      await onPost(storyData);
      toast.success('Story posted successfully!');
      onClose();
    } catch (error) {
      console.error('Error posting story:', error);
      toast.error('Failed to post story');
    } finally {
      setIsPosting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="flex items-center gap-2">
          {mode === 'camera' && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors text-white text-sm font-medium flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                Gallery
              </button>
              <button
                onClick={handleTextMode}
                className="px-4 py-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors text-white text-sm font-medium flex items-center gap-2"
              >
                <Type className="w-4 h-4" />
                Text
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="h-full flex items-center justify-center">
        {mode === 'camera' && (
          <div className="text-center">
            <div className="mb-8">
              <Sparkles className="w-20 h-20 text-white/50 mx-auto mb-4" />
              <h2 className="text-white text-2xl font-bold mb-2">Create Your Story</h2>
              <p className="text-white/70">Choose a photo, video, or create text</p>
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full text-white font-semibold text-lg transition-all transform hover:scale-105"
              >
                Choose from Gallery
              </button>
              
              <button
                onClick={handleTextMode}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-full text-white font-semibold text-lg transition-all backdrop-blur-sm"
              >
                Create Text Story
              </button>
            </div>
          </div>
        )}

        {mode === 'text' && (
          <div 
            className="w-full h-full flex items-center justify-center p-8"
            style={{ backgroundColor }}
          >
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Type something..."
              className="w-full max-w-lg text-center text-white text-4xl font-bold bg-transparent border-none outline-none resize-none placeholder-white/50"
              style={{ fontFamily: currentFont }}
              rows={6}
              autoFocus
            />
          </div>
        )}

        {mode === 'edit' && mediaPreview && (
          <div className="relative w-full h-full" ref={canvasRef}>
            {mediaType === 'image' ? (
              <Image
                src={mediaPreview}
                alt="Story"
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <video
                src={mediaPreview}
                className="w-full h-full object-contain"
                controls
              />
            )}

            {/* Text Elements */}
            {textElements.map((element) => (
              <div
                key={element.id}
                className="absolute cursor-move"
                style={{
                  left: `${element.x}%`,
                  top: `${element.y}%`,
                  fontSize: `${element.fontSize}px`,
                  color: element.color,
                  fontFamily: element.fontFamily,
                  textAlign: element.align,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                }}
                onClick={() => setSelectedElement(element.id)}
              >
                {element.text}
              </div>
            ))}

            {/* Stickers */}
            {stickers.map((sticker) => (
              <div
                key={sticker.id}
                className="absolute cursor-move"
                style={{
                  left: `${sticker.x}%`,
                  top: `${sticker.y}%`,
                  fontSize: `${sticker.size}px`,
                }}
                onClick={() => setSelectedElement(sticker.id)}
              >
                {sticker.emoji}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Tools */}
      {(mode === 'text' || mode === 'edit') && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Tool Buttons */}
          <div className="flex items-center justify-around mb-4">
            <button
              onClick={() => setShowTextTools(!showTextTools)}
              className="flex flex-col items-center gap-1 text-white"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                <Type className="w-6 h-6" />
              </div>
              <span className="text-xs">Text</span>
            </button>

            <button
              onClick={() => setShowStickerPicker(!showStickerPicker)}
              className="flex flex-col items-center gap-1 text-white"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                <Smile className="w-6 h-6" />
              </div>
              <span className="text-xs">Sticker</span>
            </button>

            {mode === 'text' && (
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex flex-col items-center gap-1 text-white"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                  <Palette className="w-6 h-6" />
                </div>
                <span className="text-xs">Color</span>
              </button>
            )}

            {selectedElement && (
              <button
                onClick={() => deleteElement(selectedElement)}
                className="flex flex-col items-center gap-1 text-red-400"
              >
                <div className="w-12 h-12 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-colors">
                  <Trash2 className="w-6 h-6" />
                </div>
                <span className="text-xs">Delete</span>
              </button>
            )}
          </div>

          {/* Text Tools */}
          {showTextTools && (
            <div className="bg-black/60 rounded-2xl p-4 mb-4 backdrop-blur-sm">
              <input
                type="text"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type your text..."
                className="w-full bg-white/10 text-white px-4 py-3 rounded-lg mb-3 outline-none placeholder-white/50"
              />
              
              <div className="flex gap-2 mb-3 overflow-x-auto">
                {FONTS.map((font) => (
                  <button
                    key={font.value}
                    onClick={() => setCurrentFont(font.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                      currentFont === font.value
                        ? 'bg-white text-black'
                        : 'bg-white/20 text-white'
                    }`}
                    style={{ fontFamily: font.value }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mb-3">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCurrentColor(color)}
                    className={`w-10 h-10 rounded-full ${
                      currentColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setCurrentAlign('left')}
                  className={`flex-1 py-2 rounded-lg ${
                    currentAlign === 'left' ? 'bg-white text-black' : 'bg-white/20 text-white'
                  }`}
                >
                  <AlignLeft className="w-5 h-5 mx-auto" />
                </button>
                <button
                  onClick={() => setCurrentAlign('center')}
                  className={`flex-1 py-2 rounded-lg ${
                    currentAlign === 'center' ? 'bg-white text-black' : 'bg-white/20 text-white'
                  }`}
                >
                  <AlignCenter className="w-5 h-5 mx-auto" />
                </button>
                <button
                  onClick={() => setCurrentAlign('right')}
                  className={`flex-1 py-2 rounded-lg ${
                    currentAlign === 'right' ? 'bg-white text-black' : 'bg-white/20 text-white'
                  }`}
                >
                  <AlignRight className="w-5 h-5 mx-auto" />
                </button>
              </div>

              <button
                onClick={addTextElement}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold"
              >
                Add Text
              </button>
            </div>
          )}

          {/* Sticker Picker */}
          {showStickerPicker && (
            <div className="bg-black/60 rounded-2xl p-4 mb-4 backdrop-blur-sm">
              <div className="grid grid-cols-5 gap-3">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => addSticker(emoji)}
                    className="text-4xl hover:scale-110 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Picker */}
          {showColorPicker && mode === 'text' && (
            <div className="bg-black/60 rounded-2xl p-4 mb-4 backdrop-blur-sm">
              <div className="grid grid-cols-5 gap-3">
                {BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBackgroundColor(color)}
                    className={`w-full aspect-square rounded-lg ${
                      backgroundColor === color ? 'ring-2 ring-white' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Post Button */}
          <div className="flex gap-3">
            <button
              onClick={() => setIsCloseFriends(!isCloseFriends)}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                isCloseFriends
                  ? 'bg-green-500 text-white'
                  : 'bg-white/20 text-white'
              }`}
            >
              <Users className="w-5 h-5 inline mr-2" />
              Close Friends
            </button>

            <button
              onClick={handlePost}
              disabled={isPosting || (mode === 'text' && !textContent.trim())}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full font-semibold transition-all flex items-center justify-center gap-2"
            >
              {isPosting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Share to Story
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
