import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Calendar, SortAsc, SortDesc, X, Save, Loader2 } from 'lucide-react';
import { Report, ReportFilters, ReportsEngine } from '../lib/reportsEngine';
import RichTextEditor from '../components/RichTextEditor';

const ITEMS_PER_PAGE = 10;

const Reports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    page: 0,
    perPage: ITEMS_PER_PAGE,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadReports();
  }, [filters]);

  useEffect(() => {
    if (selectedReport) {
      setEditedTitle(selectedReport.user_title || selectedReport.ai_title || '');
      setEditedContent(selectedReport.user_report || selectedReport.ai_report || selectedReport.transcripts || '');
      setHasUnsavedChanges(false);
    }
  }, [selectedReport]);

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

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, count } = await ReportsEngine.listReports(filters);
      setReports(data);
      setTotalCount(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    setEditedTitle(newTitle);
    setHasUnsavedChanges(true);
  };

  const handleContentChange = (newContent: string) => {
    setEditedContent(newContent);
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
        <title>${editedTitle}</title>
      </head>
      <body>
        <h1>${editedTitle}</h1>
        ${tempDiv.innerHTML}
      </body>
      </html>
    `;
  };

  const saveAndCopyReport = async () => {
    if (!selectedReport) return;

    try {
      setSaving(true);
      setError(null);
      
      const updates = {
        user_title: editedTitle,
        user_report: editedContent
      };

      const updatedReport = await ReportsEngine.updateReport(selectedReport.id, updates);
      
      // Update the reports list with the new data
      setReports(reports.map(report => 
        report.id === updatedReport.id ? updatedReport : report
      ));
      
      setSelectedReport(updatedReport);
      setHasUnsavedChanges(false);

      // Format content for Word compatibility
      const wordContent = formatContentForWord(editedContent);

      // Copy to clipboard with both HTML and plain text formats
      const blob = new Blob([wordContent], { type: 'text/html' });
      const plainText = editedContent.replace(/<[^>]+>/g, '');

      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blob,
            'text/plain': new Blob([plainText], { type: 'text/plain' })
          })
        ]);
        
        setSuccess('Changes saved and content copied to clipboard');
      } catch (clipboardError) {
        // Fallback for browsers that don't support the Clipboard API
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = plainText;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextArea);
        
        setSuccess('Changes saved and content copied to clipboard (plain text only)');
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({
      ...filters,
      search: searchTerm,
      startDate,
      endDate,
      page: 0
    });
  };

  const handleSort = (sortBy: ReportFilters['sortBy']) => {
    setFilters({
      ...filters,
      sortBy,
      sortOrder: filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc',
      page: 0
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters({
      ...filters,
      page: newPage
    });
  };

  const truncateText = (text: string | null, maxLength: number = 150): string => {
    if (!text) return '';
    
    // Create a temporary div to parse HTML content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    
    // Get text content without HTML tags
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    return plainText.length > maxLength ? `${plainText.substring(0, maxLength)}...` : plainText;
  };

  const renderFormattedContent = (content: string | null): JSX.Element => {
    if (!content) return <span className="text-gray-400">No content</span>;

    return (
      <div 
        className="prose prose-sm max-w-none line-clamp-2"
        dangerouslySetInnerHTML={{ 
          __html: content
            .replace(/<script.*?<\/script>/gs, '') // Remove any script tags
            .replace(/<style.*?<\/style>/gs, '')   // Remove any style tags
            .replace(/<[^>]*>/g, ' ')              // Replace HTML tags with spaces
            .replace(/\s+/g, ' ')                  // Normalize whitespace
            .trim()
        }}
      />
    );
  };

  const handleReportClick = (report: Report) => {
    if (hasUnsavedChanges) {
      const confirmSwitch = window.confirm('You have unsaved changes. Do you want to continue without saving?');
      if (!confirmSwitch) {
        return;
      }
    }
    setSelectedReport(report);
  };

  const closeEditor = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Do you want to continue without saving?');
      if (!confirmClose) {
        return;
      }
    }
    setSelectedReport(null);
    setEditedTitle('');
    setEditedContent('');
    setHasUnsavedChanges(false);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Medical Reports</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow-md rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <form onSubmit={handleSearch} className="space-y-4 md:space-y-0 md:flex md:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                </div>
              </div>
              
              <div className="flex gap-4">
                <div>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                    />
                    <Calendar className="absolute left-3 top-2.5 text-gray-400" size={20} />
                  </div>
                </div>
                
                <div>
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                    />
                    <Calendar className="absolute left-3 top-2.5 text-gray-400" size={20} />
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-red-600">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('user_title')}
                      className="flex items-center space-x-1"
                    >
                      <span>Title</span>
                      {filters.sortBy === 'user_title' && (
                        filters.sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Content
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('created_at')}
                      className="flex items-center space-x-1"
                    >
                      <span>Date</span>
                      {filters.sortBy === 'created_at' && (
                        filters.sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                      No reports found
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr
                      key={report.id}
                      onClick={() => handleReportClick(report)}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        selectedReport?.id === report.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {report.user_title || report.ai_title || 'Untitled Report'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {renderFormattedContent(report.user_report || report.ai_report || report.transcripts)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(report.created_at).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(filters.page! - 1)}
                  disabled={filters.page === 0}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(filters.page! + 1)}
                  disabled={filters.page === totalPages - 1}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">
                      {filters.page! * ITEMS_PER_PAGE + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min((filters.page! + 1) * ITEMS_PER_PAGE, totalCount)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{totalCount}</span>{' '}
                    results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(filters.page! - 1)}
                      disabled={filters.page === 0}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    {[...Array(totalPages)].map((_, index) => (
                      <button
                        key={index}
                        onClick={() => handlePageChange(index)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          filters.page === index
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => handlePageChange(filters.page! + 1)}
                      disabled={filters.page === totalPages - 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedReport && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-semibold">Edit Report</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={saveAndCopyReport}
                  disabled={saving || !hasUnsavedChanges}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save changes and copy to clipboard"
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
                <button
                  onClick={closeEditor}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

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
                  value={editedTitle}
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
                  value={editedContent}
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
        )}
      </div>
    </div>
  );
};

export default Reports;