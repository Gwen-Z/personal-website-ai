import React, { useState } from 'react';
import apiClient from '../apiClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewNotebookModal({ isOpen, onClose }: Props) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const { data } = await apiClient.post('/api/notebooks', { name: trimmed });
      if (data && data.success) {
        // 通知全局刷新并打开新笔记本
        const event = new CustomEvent('notebook:created', { detail: { id: data.notebook?.id } });
        window.dispatchEvent(event);
        onClose();
        setTimeout(() => setName(''), 0);
      }
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="text-base font-semibold text-slate-800">新建笔记本</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>
        <div className="p-6">
          <input
            type="text"
            className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="请输入笔记本名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-center gap-6">
          <button onClick={onClose} className="px-6 h-10 rounded-full border border-slate-300 bg-white text-slate-700 text-sm hover:bg-slate-50">取消</button>
          <button disabled={!name.trim() || submitting} onClick={handleSubmit} className={`px-6 h-10 rounded-full text-white text-sm ${!name.trim() || submitting ? 'bg-indigo-300' : 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600'}`}>{submitting ? '提交中...' : '确定'}</button>
        </div>
      </div>
    </div>
  );
}


