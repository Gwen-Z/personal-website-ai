import React, { useState, useEffect } from 'react';
import { Notebook } from '../apiClient';
import './MoveNoteModal.css';

interface MoveNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetNotebookId: string) => void;
  notebooks: Notebook[];
  currentNotebookId: string;
}

const MoveNoteModal: React.FC<MoveNoteModalProps> = ({
  isOpen,
  onClose,
  onMove,
  notebooks,
  currentNotebookId
}) => {
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedNotebookId('');
    }
  }, [isOpen]);

  const handleMove = () => {
    if (selectedNotebookId && selectedNotebookId !== currentNotebookId) {
      onMove(selectedNotebookId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>移动笔记</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p>选择目标笔记本：</p>
          <div className="notebook-list">
            {notebooks
              .filter(notebook => notebook.id !== currentNotebookId)
              .map(notebook => (
                <div
                  key={notebook.id}
                  className={`notebook-item ${selectedNotebookId === notebook.id ? 'selected' : ''}`}
                  onClick={() => setSelectedNotebookId(notebook.id)}
                >
                  <div className="notebook-name">{notebook.name}</div>
                  <div className="notebook-count">{notebook.note_count} 篇笔记</div>
                </div>
              ))}
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            取消
          </button>
          <button 
            className="move-button" 
            onClick={handleMove}
            disabled={!selectedNotebookId || selectedNotebookId === currentNotebookId}
          >
            移动
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveNoteModal;
