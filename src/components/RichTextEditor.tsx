import React, { useEffect, useRef, KeyboardEvent } from 'react';
import { Bold, Italic, Underline } from 'lucide-react';
import { sanitizeHtml } from '../lib/sanitize';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      const selection = window.getSelection();
      let savedRange: Range | null = null;
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          savedRange = range.cloneRange();
        }
      }
      
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = sanitizeHtml(value || '');
        
        if (savedRange && selection) {
          try {
            selection.removeAllRanges();
            selection.addRange(savedRange);
          } catch (e) {
            console.warn('Failed to restore selection:', e);
          }
        }
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      const newContent = sanitizeHtml(editorRef.current.innerHTML);
      onChange(newContent);
    }
  };

  const execCommand = (command: string) => {
    document.execCommand(command, false);
    if (editorRef.current) {
      isInternalChange.current = true;
      const newContent = sanitizeHtml(editorRef.current.innerHTML);
      onChange(newContent);
      editorRef.current.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    
    if (text) {
      document.execCommand('insertText', false, text);
      handleInput();
    }
  };

  const handleCopy = (e: React.ClipboardEvent) => {
    e.preventDefault();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const content = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(content);

    const sanitizedContent = sanitizeHtml(tempDiv.innerHTML);
    const plainText = sanitizedContent.replace(/<[^>]+>/g, '');

    e.clipboardData.setData('text/html', sanitizedContent);
    e.clipboardData.setData('text/plain', plainText);
  };

  const handleFocus = () => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      const range = document.createRange();
      const selection = window.getSelection();
      range.setStart(editorRef.current, 0);
      range.collapse(true);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex space-x-2">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="p-1 rounded hover:bg-gray-200 transition-colors"
          title="Bold (Ctrl+B)"
        >
          <Bold size={20} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="p-1 rounded hover:bg-gray-200 transition-colors"
          title="Italic (Ctrl+I)"
        >
          <Italic size={20} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className="p-1 rounded hover:bg-gray-200 transition-colors"
          title="Underline (Ctrl+U)"
        >
          <Underline size={20} />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="p-3 min-h-[200px] focus:outline-none"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onCopy={handleCopy}
        onFocus={handleFocus}
        placeholder={placeholder}
        data-placeholder={placeholder}
        style={{
          '&:empty:before': {
            content: 'attr(data-placeholder)',
            color: '#9CA3AF',
          },
        }}
      />
    </div>
  );
};

export default RichTextEditor;