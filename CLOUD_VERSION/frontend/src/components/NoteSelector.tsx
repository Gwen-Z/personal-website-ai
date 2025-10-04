import React, { useState, useRef, useEffect } from 'react';

interface Note {
  id?: string;
  note_id?: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface NoteSelectorProps {
  notes: Note[];
  selectedNotes: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  disabled?: boolean;
}

export default function NoteSelector({ 
  notes, 
  selectedNotes, 
  onSelectionChange, 
  disabled = false 
}: NoteSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom');
  const [dateFilter, setDateFilter] = useState<{startDate: string, endDate: string}>({
    startDate: '',
    endDate: ''
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 过滤笔记
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // 日期区间筛选
    if (dateFilter.startDate || dateFilter.endDate) {
      const noteDate = new Date(note.created_at).toISOString().split('T')[0];
      
      if (dateFilter.startDate && dateFilter.endDate) {
        // 有开始和结束日期，进行区间筛选
        return matchesSearch && noteDate >= dateFilter.startDate && noteDate <= dateFilter.endDate;
      } else if (dateFilter.startDate) {
        // 只有开始日期，筛选该日期及之后的笔记
        return matchesSearch && noteDate >= dateFilter.startDate;
      } else if (dateFilter.endDate) {
        // 只有结束日期，筛选该日期及之前的笔记
        return matchesSearch && noteDate <= dateFilter.endDate;
      }
    }
    
    return matchesSearch;
  });

  // 计算下拉菜单位置
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      // 如果下方空间不足300px（下拉菜单高度），且上方空间更大，则向上展开
      if (spaceBelow < 300 && spaceAbove > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [isOpen]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNoteToggle = (noteId: string) => {
    if (disabled) return;
    
    const newSelection = selectedNotes.includes(noteId)
      ? selectedNotes.filter(id => id !== noteId)
      : [...selectedNotes, noteId];
    
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    
    const allIds = filteredNotes.map(note => note.id || note.note_id || '');
    const allSelected = allIds.every(id => selectedNotes.includes(id));
    
    if (allSelected) {
      // 取消选择所有过滤后的笔记
      const filteredIds = new Set(allIds);
      onSelectionChange(selectedNotes.filter(id => !filteredIds.has(id)));
    } else {
      // 选择所有过滤后的笔记
      const newSelection = [...new Set([...selectedNotes, ...allIds])];
      onSelectionChange(newSelection);
    }
  };

  const getSelectedNotesCount = () => {
    return selectedNotes.length;
  };

  const getSelectedNotesPreview = () => {
    if (selectedNotes.length === 0) return '选择笔记';
    if (selectedNotes.length === 1) {
      const note = notes.find(n => (n.id || n.note_id) === selectedNotes[0]);
      return note ? note.title : '1篇笔记';
    }
    return `${selectedNotes.length}篇笔记`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 选择器按钮 */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors
          ${disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
          }
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="truncate max-w-32">{getSelectedNotesPreview()}</span>
        {selectedNotes.length > 0 && (
          <span className="bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded-full">
            {getSelectedNotesCount()}
          </span>
        )}
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className={`absolute left-0 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-[70] max-h-80 overflow-hidden ${
          dropdownPosition === 'top' 
            ? 'bottom-full mb-1' 
            : 'top-full mt-1'
        }`}>
          {/* 搜索框 */}
          <div className="p-3 border-b border-gray-100">
            <input
              type="text"
              placeholder="搜索笔记..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 全选和日期选择按钮 */}
          {filteredNotes.length > 0 && (
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handleSelectAll}
                  className="flex-1 text-left px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {filteredNotes.every(note => selectedNotes.includes(note.id || note.note_id || '')) 
                    ? '取消全选' 
                    : '全选'
                  }
                </button>
                
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`px-3 py-2 text-sm rounded-lg flex items-center gap-1 transition-colors ${
                    dateFilter.startDate || dateFilter.endDate
                      ? 'text-purple-600 bg-purple-50' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>按日期</span>
                </button>
              </div>
              
              {/* 日期选择器 */}
              {showDatePicker && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 whitespace-nowrap">开始日期</span>
                      <input
                        type="date"
                        value={dateFilter.startDate}
                        onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 whitespace-nowrap">结束日期</span>
                      <input
                        type="date"
                        value={dateFilter.endDate}
                        onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    {(dateFilter.startDate || dateFilter.endDate) && (
                      <button
                        onClick={() => setDateFilter({ startDate: '', endDate: '' })}
                        className="w-full text-xs text-gray-500 hover:text-gray-700 py-1"
                      >
                        清除日期筛选
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 笔记列表 */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {filteredNotes.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchQuery ? '没有找到匹配的笔记' : '没有笔记'}
              </div>
            ) : (
              filteredNotes.map((note) => {
                const noteId = note.id || note.note_id || '';
                const isSelected = selectedNotes.includes(noteId);
                
                return (
                  <div
                    key={noteId}
                    onClick={() => handleNoteToggle(noteId)}
                    className={`p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 last:pb-4 ${
                      isSelected ? 'bg-purple-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                          isSelected 
                            ? 'bg-purple-500 border-purple-500' 
                            : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {note.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {note.content ? note.content.substring(0, 100) : '无内容'}
                          {note.content && note.content.length > 100 && '...'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(note.created_at).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 底部信息 */}
          {selectedNotes.length > 0 && (
            <div className="p-3 bg-gray-50 border-t border-gray-100">
              <div className="text-xs text-gray-600 text-center">
                已选择 {selectedNotes.length} 篇笔记
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
