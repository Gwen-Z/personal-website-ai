import React, { useState, useRef, useEffect } from 'react';
import apiClient from '../apiClient';

interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  notebookId: string;
  onCreated?: () => void;
}

export default function NewNoteModal({ isOpen, onClose, notebookId, onCreated }: NewNoteModalProps) {
  const [title, setTitle] = useState('');
  const [contentText, setContentText] = useState('');
  const [source, setSource] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [author, setAuthor] = useState('');
  const [uploadTime, setUploadTime] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 初始化上传时间为当天
  useEffect(() => {
    if (isOpen && !uploadTime) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setUploadTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
  }, [isOpen, uploadTime]);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith('image/')) continue;
      const b64 = await fileToDataUrl(f);
      list.push(b64);
    }
    setImages(prev => [...prev, ...list]);
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const onPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imgs: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.type.startsWith('image/')) {
        const file = it.getAsFile();
        if (file) {
          const b64 = await fileToDataUrl(file);
          imgs.push(b64);
        }
      }
    }
    if (imgs.length) setImages(prev => [...prev, ...imgs]);
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!notebookId) return;
    setSubmitting(true);
    try {
      const finalTitle = title.trim() || contentText.trim().split('\n')[0] || '新建笔记';
      const { data } = await apiClient.post('/api/notes', { 
        notebook_id: notebookId, 
        title: finalTitle, 
        content_text: contentText, 
        images, 
        source_url: originalUrl,
        source: source,
        original_url: originalUrl,
        author: author,
        upload_time: uploadTime
      });
      if (data && data.success) {
        if (onCreated) onCreated();
        onClose();
        setTimeout(() => {
          setTitle('');
          setContentText('');
          setSource('');
          setOriginalUrl('');
          setAuthor('');
          setUploadTime('');
          setImages([]);
        }, 0);
      } else {
        console.error('创建笔记失败', data);
      }
    } catch (err) {
      console.error('创建笔记异常', err);
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="text-base font-semibold text-slate-800">新建笔记</div>
          <button className="text-slate-500 hover:text-slate-700" onClick={onClose}>✕</button>
        </div>
        
        <div className="p-5 space-y-4">
          {/* 标题字段 - 放在最前面 */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">标题</label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="输入笔记标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              <label className="block text-sm text-slate-600 mb-1">文本内容</label>
              <textarea
                className="w-full h-44 rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="粘贴或输入你的文本内容，支持粘贴图片到此区域"
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                onPaste={onPaste}
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm text-slate-600 mb-1">图片（可选）</label>
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center">
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                <button className="px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => fileInputRef.current?.click()}>选择图片</button>
                <div className="text-xs text-slate-500 mt-2">支持多张图片上传或直接粘贴</div>
              </div>
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-auto">
                  {images.map((src, idx) => (
                    <div key={idx} className="relative group">
                      <img src={src} className="w-full h-24 object-cover rounded-lg border border-slate-200" alt={`图片 ${idx + 1}`} />
                      <button className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded px-1 opacity-0 group-hover:opacity-100" onClick={() => removeImage(idx)}>删除</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 其他信息字段 - 放在最后 */}
        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">来源</label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="如：长桥app"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">原链接</label>
              <input
                type="url"
                className="w-full rounded-xl border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://example.com"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">作者</label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="作者名称"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">上传时间</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={uploadTime}
                onChange={(e) => setUploadTime(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-3">
          <button className="px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50" onClick={onClose}>取消</button>
          <button disabled={submitting || (!title.trim() && !contentText.trim() && images.length === 0)} className={`px-3 py-2 text-xs rounded-lg text-white ${submitting || (!title.trim() && !contentText.trim() && images.length === 0) ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'}`} onClick={handleSubmit}>{submitting ? '提交中...' : '创建笔记'}</button>
        </div>
      </div>
    </div>
  );
}