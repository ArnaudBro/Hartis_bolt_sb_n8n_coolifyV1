import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Loader2 } from 'lucide-react';
import { Report, ReportsEngine } from '../lib/reportsEngine';
import RichTextEditor from '../components/RichTextEditor';

const ReportEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadReport();
  }, [id]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadReport = async () => {
    if (!id) {
      navigate('/reports');
      return;
    }

    try {
      setLoading(true);
      const report = await ReportsEngine.getReport(id);
      setReport(report);
      // Initialize with AI content if user content is not available
      setTitle(report.user_title || report.ai_title || '');
      setContent(report.user_report || report.ai_report || '');
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
      navigate('/reports');
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasUnsavedChanges(true);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  const formatContentForWord = (content: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    // Clean up and standardize HTML
    const cleanupContent = (element: Element) => {
      // Convert divs to paragraphs
      const divs = Array.from(element.getElementsByTagName('div'));
      divs.forEach(div => {
        const p = document.createElement('p');
        p.innerHTML = div.innerHTML;
        div.parentNode?.replaceChild(p, div);
      });

      // Ensure proper spacing between paragraphs
      const paragraphs = Array.from(element.getElementsByTagName('p'));
      paragraphs.forEach(p => {
        if (p.innerHTML.trim() === '') {
          p.innerHTML = '&nbsp;';
        }
      });

      // Clean up any remaining elements
      const allElements = Array.from(element.getElementsByTagName('*'));
      allElements.forEach(el => {
        // Remove all styles but keep basic formatting
        el.removeAttribute('style');
        el.removeAttribute('class');
        
        // Keep only essential formatting tags
        const validTags = ['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U'];
        if (!validTags.includes(el.tagName)) {
          const span = document.createElement('span');
          span.innerHTML = el.innerHTML;
          el.parentNode?.replaceChild(span, el);
        }
      });
    };

    cleanupContent(tempDiv);

    // Add Word-compatible wrapper
    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:w="urn:schemas-microsoft-com:office:word" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
      </head>
      <body>
        <h1>${title}</h1>
        ${tempDiv.innerHTML}
      </body>
      </html>
    `;
  };

  const saveAndCopyReport = async () => {
    if (!report || !id) return;

    try {
      setSaving(true);
      setError(null);

      const updates = {
        user_title: title,
        user_report: content
      };

      await ReportsEngine.updateReport(id, updates);

      // Format content for Word compatibility
      const wordContent = formatContentForWord(content);

      // Copy to clipboard with both HTML and plain text formats
      const blob = new Blob([wordContent], { type: 'text/html' });
      const plainText = content.replace(/<[^>]+>/g, '');

      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blob,
            'text/plain': new Blob([plainText], { type: 'text/plain' })
          })
        ]);
        
        setSuccess('Changes saved and content copied to clipboard');
        setHasUnsavedChanges(false);
        setTimeout(() => navigate('/reports'), 1500);
      } catch (clipboardError) {
        // Fallback for browsers that don't support the Clipboard API
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = plainText;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextArea);
        
        setSuccess('Changes saved and content copied to clipboard (plain text only)');
        setHasUnsavedChanges(false);
        setTimeout(() => navigate('/reports'), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Edit Report</h1>
          <button
            onClick={saveAndCopyReport}
            disabled={saving || !hasUnsavedChanges}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>Save & Copy</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded">
            {success}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter report title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <RichTextEditor
              value={content}
              onChange={handleContentChange}
              placeholder="Enter report content"
            />
          </div>

          {hasUnsavedChanges && (
            <div className="text-sm text-amber-600">
              You have unsaved changes
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportEditor;