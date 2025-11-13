'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  X, Type, Smile, Music, Image as ImageIcon, Video, 
  Palette, Sparkles, Users, Send, ChevronDown, Download,
  Trash2, RotateCcw, ZoomIn, AlignLeft, AlignCenter, AlignRight,
  Move, Minus, Plus
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
  rotation: number;
}

interface StickerElement {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

const FONTS = [
  { name: 'Classic', value: 'Arial, sans-serif' },
  { name: 'Modern', value: '"Helvetica Neue", sans-serif' },
  { name: 'Neon', value: '"Courier New", monospace' },
  { name: 'Typewriter', value: '"Courier", monospace' },
  { name: 'Strong', value: '"Impact", sans-serif' },
  { name: 'Elegant', value: '"Georgia", serif' },
  { name: 'Fun', value: '"Comic Sans MS", cursive' },
];

const COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#FF69B4', '#00CED1', '#FFD700', '#32CD32', '#FF1493',
];

const BACKGROUND_COLORS = [
  '#FFFFFF', '#000000', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F39C12', '#E74C3C', '#9B59B6', '#3498DB', '#1ABC9C',
];

const EMOJIS = [
  '😀', '😂', '🥰', '😍', '🤩', '😎', '🔥', '❤️', '👍', '🎉',
  '✨', '⭐', '💯', '🎵', '🎨', '📸', '🌈', '☀️', '🌙', '⚡',
  '🙏', '✝️', '🕊️', '💫', '🌟', '💖', '🌺', '🦋', '🌸', '🌻',
];

export default function StoryCreator({ isOpen, onClose, onPost }: StoryCreatorProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  
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
  const [showFontPicker, setShowFontPicker] = useState(false);
  
  // Current text settings
  const [currentFont, setCurrentFont] = useState(FONTS[0].value);
  const [currentColor, setCurrentColor] = useState('#FFFFFF');
  const [currentAlign, setCurrentAlign] = useState<'left' | 'center' | 'right'>('center');
  const [currentFontSize, setCurrentFontSize] = useState(32);
  
  // Dragging
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
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
    setShowFontPicker(false);
    setIsCloseFriends(false);
    setCurrentFontSize(32);
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
    setMode('edit');

    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleTextMode = () => {
    setMode('text');
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

  const addTextElement = () => {
    const newText: TextElement = {
      id: `text-${Date.now()}`,
      text: 'Tap to edit',
      x: 50,
      y: 50,
      fontSize: currentFontSize,
      color: currentColor,
      fontFamily: currentFont,
      align: currentAlign,
      rotation: 0,
    };

    setTextElements([...textElements, newText]);
    setSelectedElement(newText.id);
    setShowTextTools(true);
  };

  const updateTextElement = (id: string, updates: Partial<TextElement>) => {
    setTextElements(textElements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  };

  const addSticker = (emoji: string) => {
    const newSticker: StickerElement = {
      id: `sticker-${Date.now()}`,
      emoji,
      x: 50,
      y: 50,
      size: 80,
      rotation: 0,
    };

    setStickers([...stickers, newSticker]);
    setShowStickerPicker(false);
    setSelectedElement(newSticker.id);
  };

  const updateSticker = (id: string, updates: Partial<StickerElement>) => {
    setStickers(stickers.map(st => 
      st.id === id ? { ...st, ...updates } : st
    ));
  };

  const deleteElement = (id: string) => {
    setTextElements(textElements.filter(el => el.id !== id));
    setStickers(stickers.filter(st => st.id !== id));
    setSelectedElement(null);
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setSelectedElement(id);
    setIsDragging(true);
    
    const element = textElements.find(el => el.id === id) || stickers.find(st => st.id === id);
    if (element) {
      setDragOffset({
        x: e.clientX - element.x,
        y: e.clientY - element.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElement) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    const textEl = textElements.find(el => el.id === selectedElement);
    if (textEl) {
      updateTextElement(selectedElement, { x: newX, y: newY });
    }

    const stickerEl = stickers.find(st => st.id === selectedElement);
    if (stickerEl) {
      updateSticker(selectedElement, { x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const changeFontSize = (delta: number) => {
    if (!selectedElement) return;
    
    const textEl = textElements.find(el => el.id === selectedElement);
    if (textEl) {
      const newSize = Math.max(16, Math.min(72, textEl.fontSize + delta));
      updateTextElement(selectedElement, { fontSize: newSize });
    }

    const stickerEl = stickers.find(st => st.id === selectedElement);
    if (stickerEl) {
      const newSize = Math.max(40, Math.min(150, stickerEl.size + delta));
      updateSticker(selectedElement, { size: newSize });
    }
  };

  const handlePost = async () => {
    try {
      setIsPosting(true);

      let storyData: any = {
        isCloseFriends,
      };

      if (mode === 'text') {
        // Text-only story - MUST have textContent
        if (!textContent || textContent.trim() === '') {
          toast.error('Please enter some text for your story');
          setIsPosting(false);
          return;
        }
        
        storyData.mediaType = 'text';
        storyData.backgroundColor = backgroundColor;
        storyData.textContent = textContent.trim();
        storyData.mediaUrl = null; // Explicitly set to null for text stories
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
      } else {
        toast.error('Please add content to your story');
        setIsPosting(false);
        return;
      }

      // Add text elements and stickers as metadata
      if (textElements.length > 0) {
        storyData.stickers = JSON.stringify(textElements);
      }

      if (stickers.length > 0) {
        const existingStickers = storyData.stickers ? JSON.parse(storyData.stickers) : [];
        storyData.stickers = JSON.stringify([...existingStickers, ...stickers]);
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

  const selectedTextElement = textElements.find(el => el.id === selectedElement);
  const selectedSticker = stickers.find(st => st.id === selectedElement);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
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
      <div className="h-full flex items-center justify-center relative">
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
              ref={textInputRef}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Type something..."
              className="w-full max-w-2xl bg-transparent text-white text-center text-4xl font-bold outline-none resize-none"
              style={{ 
                fontFamily: currentFont,
                textAlign: currentAlign,
              }}
              rows={5}
              maxLength={200}
            />
          </div>
        )}

        {mode === 'edit' && mediaPreview && (
          <div className="relative w-full h-full flex items-center justify-center">
            {mediaType === 'image' ? (
              <Image
                src={mediaPreview}
                alt="Story preview"
                fill
                className="object-contain"
              />
            ) : (
              <video
                src={mediaPreview}
                className="max-w-full max-h-full"
                controls
              />
            )}

            {/* Text Elements */}
            {textElements.map((textEl) => (
              <div
                key={textEl.id}
                className={`absolute cursor-move select-none ${
                  selectedElement === textEl.id ? 'ring-2 ring-white' : ''
                }`}
                style={{
                  left: textEl.x,
                  top: textEl.y,
                  fontSize: textEl.fontSize,
                  color: textEl.color,
                  fontFamily: textEl.fontFamily,
                  textAlign: textEl.align,
                  transform: `rotate(${textEl.rotation}deg)`,
                }}
                onMouseDown={(e) => handleMouseDown(e, textEl.id)}
                onClick={() => setSelectedElement(textEl.id)}
              >
                {textEl.text}
              </div>
            ))}

            {/* Stickers */}
            {stickers.map((sticker) => (
              <div
                key={sticker.id}
                className={`absolute cursor-move select-none ${
                  selectedElement === sticker.id ? 'ring-2 ring-white rounded-full' : ''
                }`}
                style={{
                  left: sticker.x,
                  top: sticker.y,
                  fontSize: sticker.size,
                  transform: `rotate(${sticker.rotation}deg)`,
                }}
                onMouseDown={(e) => handleMouseDown(e, sticker.id)}
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
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex items-center justify-center gap-4 mb-4">
            {mode === 'edit' && (
              <>
                <button
                  onClick={addTextElement}
                  className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  title="Add Text"
                >
                  <Type className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={() => setShowStickerPicker(!showStickerPicker)}
                  className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  title="Add Sticker"
                >
                  <Smile className="w-6 h-6 text-white" />
                </button>
              </>
            )}

            {mode === 'text' && (
              <>
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  title="Background Color"
                >
                  <Palette className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={() => setShowFontPicker(!showFontPicker)}
                  className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  title="Font Style"
                >
                  <Type className="w-6 h-6 text-white" />
                </button>
              </>
            )}

            {selectedElement && (
              <>
                <button
                  onClick={() => changeFontSize(-4)}
                  className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  title="Decrease Size"
                >
                  <Minus className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={() => changeFontSize(4)}
                  className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  title="Increase Size"
                >
                  <Plus className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={() => deleteElement(selectedElement)}
                  className="p-3 rounded-full bg-red-500/50 hover:bg-red-500/70 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-6 h-6 text-white" />
                </button>
              </>
            )}
          </div>

          {/* Color Picker */}
          {showColorPicker && (
            <div className="mb-4 p-4 bg-black/50 rounded-lg backdrop-blur-sm">
              <div className="grid grid-cols-10 gap-2">
                {BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setBackgroundColor(color);
                      setShowColorPicker(false);
                    }}
                    className="w-8 h-8 rounded-full border-2 border-white/30 hover:border-white transition-colors"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Font Picker */}
          {showFontPicker && (
            <div className="mb-4 p-4 bg-black/50 rounded-lg backdrop-blur-sm">
              <div className="grid grid-cols-2 gap-2">
                {FONTS.map((font) => (
                  <button
                    key={font.value}
                    onClick={() => {
                      setCurrentFont(font.value);
                      setShowFontPicker(false);
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                    style={{ fontFamily: font.value }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sticker Picker */}
          {showStickerPicker && (
            <div className="mb-4 p-4 bg-black/50 rounded-lg backdrop-blur-sm max-h-48 overflow-y-auto">
              <div className="grid grid-cols-10 gap-2">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => addSticker(emoji)}
                    className="text-3xl hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsCloseFriends(!isCloseFriends)}
              className={`px-4 py-2 rounded-full flex items-center gap-2 transition-colors ${
                isCloseFriends 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Users className="w-4 h-4" />
              Close Friends
            </button>

            <button
              onClick={handlePost}
              disabled={isPosting}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 rounded-full text-white font-semibold flex items-center gap-2 transition-all"
            >
              <Send className="w-5 h-5" />
              {isPosting ? 'Posting...' : 'Share to Story'}
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
