import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Download,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ChevronRight,
  Volume2,
  Calendar,
  Tag,
  FileText,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface VocabularyEntry {
  id: string;
  word: string;
  meaning: string;
  example: string;
  synonyms: string[];
  antonyms: string[];
  tags: string[];
  status: string;
  source: string;
  source_text?: string;
  notes?: string;
  pronunciation?: string;
  part_of_speech?: string;
  difficulty?: number;
  review_count?: number;
  last_reviewed?: string;
  next_review?: string;
  created_at: string;
  updated_at: string;
}

interface VocabularyResponse {
  vocabulary: VocabularyEntry[];
  totalPages: number;
  currentPage: number;
  total: number;
}

const Vocabulary: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [editingDifficulty, setEditingDifficulty] = useState<string | null>(null);
  const [tempTags, setTempTags] = useState<string[]>([]);
  const [tempDifficulty, setTempDifficulty] = useState<number>(1);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch vocabulary data with automatic refetch
  const { data, isLoading, error, refetch } = useQuery<VocabularyResponse>(
    ['vocabulary', currentPage, searchTerm, selectedTag, selectedStatus, sortBy, sortOrder],
    async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy,
        sortOrder,
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedTag) params.append('tag', selectedTag);
      if (selectedStatus) params.append('status', selectedStatus);

      const response = await axios.get(`/vocabulary?${params}`);
      return response.data;
    },
    {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // Refetch every minute
      refetchIntervalInBackground: false, // Only refetch when tab is active
    }
  );

  // Delete vocabulary entry
  const deleteMutation = useMutation(
    async (id: string) => {
      await axios.delete(`/vocabulary/${id}`);
    },
    {
      onSuccess: () => {
        // Invalidate all related queries to ensure data consistency
        queryClient.invalidateQueries('vocabulary');
        queryClient.invalidateQueries('vocabularyStats');
        queryClient.invalidateQueries('recentWords');
        toast.success('Word deleted successfully');
      },
      onError: () => {
        toast.error('Failed to delete word');
      },
    }
  );

  // Update word status
  const updateStatusMutation = useMutation(
    async ({ id, status }: { id: string; status: string }) => {
      await axios.put(`/vocabulary/${id}`, { status });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('vocabulary');
        queryClient.invalidateQueries('vocabularyStats');
        queryClient.invalidateQueries('recentWords');
        toast.success('Status updated successfully');
      },
      onError: () => {
        toast.error('Failed to update status');
      },
    }
  );

  // Update word tags
  const updateTagsMutation = useMutation(
    async ({ id, tags }: { id: string; tags: string[] }) => {
      await axios.put(`/vocabulary/${id}`, { tags });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('vocabulary');
        queryClient.invalidateQueries('vocabularyStats');
        queryClient.invalidateQueries('recentWords');
        toast.success('Tags updated successfully');
      },
      onError: () => {
        toast.error('Failed to update tags');
      },
    }
  );

  // Update word difficulty
  const updateDifficultyMutation = useMutation(
    async ({ id, difficulty }: { id: string; difficulty: number }) => {
      await axios.put(`/vocabulary/${id}`, { difficulty });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('vocabulary');
        queryClient.invalidateQueries('vocabularyStats');
        queryClient.invalidateQueries('recentWords');
        toast.success('Difficulty updated successfully');
      },
      onError: () => {
        toast.error('Failed to update difficulty');
      },
    }
  );

  const getTagColor = (tag: string) => {
    const colors: { [key: string]: string } = {
      learning: 'bg-blue-100 text-blue-800',
      reviewing: 'bg-yellow-100 text-yellow-800',
      mastered: 'bg-green-100 text-green-800',
      favorite: 'bg-pink-100 text-pink-800',
      difficult: 'bg-red-100 text-red-800',
      important: 'bg-purple-100 text-purple-800',
    };
    return colors[tag] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      learning: 'bg-blue-100 text-blue-800',
      reviewing: 'bg-yellow-100 text-yellow-800',
      mastered: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getDifficultyColor = (difficulty: number) => {
    const colors = {
      1: 'bg-green-100 text-green-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-orange-100 text-orange-800',
      5: 'bg-red-100 text-red-800',
    };
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this word?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const handleTagsChange = (id: string, newTags: string[]) => {
    updateTagsMutation.mutate({ id, tags: newTags });
  };

  const handleDifficultyChange = (id: string, newDifficulty: number) => {
    updateDifficultyMutation.mutate({ id, difficulty: newDifficulty });
  };

  const startEditingTags = (id: string, currentTags: string[]) => {
    setEditingTags(id);
    setTempTags([...currentTags]);
  };

  const startEditingDifficulty = (id: string, currentDifficulty: number) => {
    setEditingDifficulty(id);
    setTempDifficulty(currentDifficulty || 1);
  };

  const saveTags = (id: string) => {
    handleTagsChange(id, tempTags);
    setEditingTags(null);
  };

  const saveDifficulty = (id: string) => {
    handleDifficultyChange(id, tempDifficulty);
    setEditingDifficulty(null);
  };

  const cancelEditing = () => {
    setEditingTags(null);
    setEditingDifficulty(null);
  };

  const toggleTag = (tag: string) => {
    if (tempTags.includes(tag)) {
      setTempTags(tempTags.filter(t => t !== tag));
    } else {
      setTempTags([...tempTags, tag]);
    }
  };

  const toggleRowExpansion = (id: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToPDF = async () => {
    if (!data?.vocabulary || data.vocabulary.length === 0) {
      toast.error('No vocabulary data to export');
      return;
    }

    setIsExporting(true);
    try {
      // Create A3 landscape document
      const doc = new jsPDF('landscape', 'mm', 'a3');
      
      // Add title
      doc.setFontSize(24);
      doc.text('Vocabulary Collection', 20, 25);
      
      // Add subtitle with date
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text(`Exported on ${new Date().toLocaleDateString()}`, 20, 35);
      doc.text(`Total words: ${data.total}`, 20, 42);
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      
      // Add summary statistics
      doc.setFontSize(16);
      doc.text('Summary', 20, 55);
      
      const statusCounts = data.vocabulary.reduce((acc, word) => {
        acc[word.status] = (acc[word.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      let yPos = 65;
      Object.entries(statusCounts).forEach(([status, count]) => {
        doc.setFontSize(12);
        doc.text(`${status}: ${count} words`, 25, yPos);
        yPos += 8;
      });
      
      // Prepare table data with 5 columns
      const tableData = data.vocabulary.map((word, index) => [
        index + 1, // Row number
        word.word, // Word
        word.meaning || 'No meaning provided', // Meaning
        word.antonyms && word.antonyms.length > 0 ? word.antonyms.slice(0, 3).join(', ') : 'No antonyms', // Antonyms
        word.synonyms && word.synonyms.length > 0 ? word.synonyms.slice(0, 3).join(', ') : 'No synonyms', // Synonyms
        word.example || 'No example provided' // Example
      ]);
      
      // Create table using autoTable with A3 landscape layout
      try {
        // @ts-ignore - autoTable is added by the plugin
        doc.autoTable({
          startY: yPos + 10,
          head: [['#', 'Word', 'Meaning', 'Antonyms', 'Synonyms', 'Example']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontSize: 12,
            fontStyle: 'bold'
          },
          bodyStyles: {
            fontSize: 10,
            lineColor: [220, 220, 220],
            lineWidth: 0.1
          },
          columnStyles: {
            0: { cellWidth: 15, halign: 'center' }, // Row number
            1: { cellWidth: 50, halign: 'left' },   // Word
            2: { cellWidth: 80, halign: 'left' },   // Meaning
            3: { cellWidth: 60, halign: 'left' },   // Antonyms
            4: { cellWidth: 60, halign: 'left' },   // Synonyms
            5: { cellWidth: 80, halign: 'left' }    // Example
          },
          styles: {
            overflow: 'linebreak',
            cellPadding: 5,
            rowHeight: 'auto'
          },
          margin: { top: 10, left: 20, right: 20 },
          pageBreak: 'auto',
          alternateRowStyles: {
            fillColor: [248, 249, 250]
          },
          didDrawPage: function (data: any) {
            // Add page number
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
          }
        });
      } catch (autoTableError) {
        console.warn('AutoTable not available, using simple table:', autoTableError);
        // Fallback: create a simple table manually
        yPos += 15;
        doc.setFontSize(10);
        doc.text('#  Word                    Meaning                    Antonyms    Synonyms    Example', 20, yPos);
        yPos += 10;
        
        tableData.forEach((row, index) => {
          if (yPos > 400) { // A3 landscape height
            doc.addPage('landscape');
            yPos = 20;
          }
          doc.text(`${row[0]}   ${row[1]}                    ${row[2]}                    ${row[3]}    ${row[4]}    ${row[5]}`, 20, yPos);
          yPos += 7;
        });
      }
      
      // Add detailed word information on new pages if needed
      if (data.vocabulary.length > 0) {
        doc.addPage('landscape');
        let currentPage = 1;
        const wordsPerPage = 2; // Fewer words per page in landscape
        
        for (let i = 0; i < data.vocabulary.length; i += wordsPerPage) {
          if (i > 0) {
            doc.addPage('landscape');
            currentPage++;
          }
          
          const pageWords = data.vocabulary.slice(i, i + wordsPerPage);
          let pageY = 20;
          
          doc.setFontSize(18);
          doc.text(`Detailed Word Information - Page ${currentPage}`, 20, pageY);
          pageY += 15;
          
          pageWords.forEach((word, wordIndex) => {
            if (pageY > 180) { // A3 landscape height
              doc.addPage('landscape');
              pageY = 20;
            }
            
            // Word header
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(`${i + wordIndex + 1}. ${word.word}`, 20, pageY);
            pageY += 10;
            
            // Pronunciation and part of speech
            if (word.pronunciation || word.part_of_speech) {
              doc.setFontSize(12);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(100, 100, 100);
              let info = '';
              if (word.pronunciation) info += `Pronunciation: ${word.pronunciation}`;
              if (word.part_of_speech) info += info ? ` | Part of speech: ${word.part_of_speech}` : `Part of speech: ${word.part_of_speech}`;
              doc.text(info, 25, pageY);
              pageY += 8;
            }
            
            // Meaning
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Meaning:', 25, pageY);
            pageY += 8;
            doc.setFontSize(12);
            const meaningLines = doc.splitTextToSize(word.meaning, 350); // Wider text area in landscape
            meaningLines.forEach((line: string) => {
              doc.text(line, 30, pageY);
              pageY += 6;
            });
            
            // Example
            if (word.example) {
              pageY += 5;
              doc.setFontSize(14);
              doc.text('Example:', 25, pageY);
              pageY += 8;
              doc.setFontSize(12);
              doc.setFont('helvetica', 'italic');
              const exampleLines = doc.splitTextToSize(`"${word.example}"`, 350);
              exampleLines.forEach((line: string) => {
                doc.text(line, 30, pageY);
                pageY += 6;
              });
              doc.setFont('helvetica', 'normal');
            }
            
            // Synonyms and Antonyms
            if (word.synonyms && word.synonyms.length > 0) {
              pageY += 5;
              doc.setFontSize(14);
              doc.text('Synonyms:', 25, pageY);
              pageY += 8;
              doc.setFontSize(12);
              doc.setTextColor(34, 197, 94);
              const synonymsText = word.synonyms.slice(0, 8).join(', '); // More synonyms in landscape
              const synonymsLines = doc.splitTextToSize(synonymsText, 350);
              synonymsLines.forEach((line: string) => {
                doc.text(line, 30, pageY);
                pageY += 6;
              });
            }
            
            if (word.antonyms && word.antonyms.length > 0) {
              pageY += 5;
              doc.setFontSize(14);
              doc.setTextColor(0, 0, 0);
              doc.text('Antonyms:', 25, pageY);
              pageY += 8;
              doc.setFontSize(12);
              doc.setTextColor(239, 68, 68);
              const antonymsText = word.antonyms.slice(0, 5).join(', '); // More antonyms in landscape
              const antonymsLines = doc.splitTextToSize(antonymsText, 350);
              antonymsLines.forEach((line: string) => {
                doc.text(line, 30, pageY);
                pageY += 6;
              });
            }
            
            // Tags and Status
            pageY += 5;
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Tags:', 25, pageY);
            pageY += 8;
            doc.setFontSize(12);
            const tagsText = word.tags.join(', ');
            const tagsLines = doc.splitTextToSize(tagsText, 350);
            tagsLines.forEach((line: string) => {
              doc.text(line, 30, pageY);
              pageY += 6;
            });
            
            // Notes
            if (word.notes) {
              pageY += 5;
              doc.setFontSize(14);
              doc.text('Notes:', 25, pageY);
              pageY += 8;
              doc.setFontSize(12);
              doc.setTextColor(100, 100, 100);
              const notesLines = doc.splitTextToSize(word.notes, 350);
              notesLines.forEach((line: string) => {
                doc.text(line, 30, pageY);
                pageY += 6;
              });
            }
            
            // Reset text color
            doc.setTextColor(0, 0, 0);
            
            // Add separator
            pageY += 15;
            doc.line(20, pageY, 410, pageY); // A3 landscape width
            pageY += 20;
          });
        }
      }
      
      // Save the PDF
      const fileName = `vocabulary_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success(`PDF exported successfully! (${fileName})`);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading vocabulary</p>
        <button onClick={() => refetch()} className="btn-primary mt-4">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vocabulary</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and review your vocabulary collection ({data?.total || 0} words)
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => refetch()}
            className="btn-secondary"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={exportToPDF}
            disabled={isExporting}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
          <a
            href="/add-word"
            className="btn-primary"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Word
          </a>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search words or meanings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {showFilters ? (
                <ChevronUp className="ml-2 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-2 h-4 w-4" />
              )}
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Tag Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by Tag
                  </label>
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="input"
                  >
                    <option value="">All Tags</option>
                    <option value="learning">Learning</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="mastered">Mastered</option>
                    <option value="favorite">Favorite</option>
                    <option value="difficult">Difficult</option>
                    <option value="important">Important</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="input"
                  >
                    <option value="">All Statuses</option>
                    <option value="learning">Learning</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="mastered">Mastered</option>
                  </select>
                </div>

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By
                  </label>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field);
                      setSortOrder(order);
                    }}
                    className="input"
                  >
                    <option value="created_at-desc">Newest First</option>
                    <option value="created_at-asc">Oldest First</option>
                    <option value="word-asc">Word A-Z</option>
                    <option value="word-desc">Word Z-A</option>
                    <option value="updated_at-desc">Recently Updated</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vocabulary Table */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Words ({data?.total || 0})
            </h3>
            <div className="text-sm text-gray-500">
              Click on a row to expand and see full details
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {data?.vocabulary && data.vocabulary.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Word
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Meaning
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tags
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Difficulty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Added
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.vocabulary.map((word) => (
                    <React.Fragment key={word.id}>
                      {/* Main Row */}
                      <tr 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => toggleRowExpansion(word.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <button className="mr-2">
                              {expandedRows.has(word.id) ? (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                            <div>
                              <div className="text-base font-bold text-gray-900">{word.word}</div>
                              {word.pronunciation && (
                                <div className="text-xs text-gray-500 flex items-center">
                                  <Volume2 className="h-3 w-3 mr-1" />
                                  {word.pronunciation}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {word.meaning}
                          </div>
                          {word.part_of_speech && (
                            <div className="text-xs text-gray-500 italic">
                              {word.part_of_speech}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={word.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleStatusChange(word.id, e.target.value);
                            }}
                            className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${getStatusColor(word.status)}`}
                          >
                            <option value="learning">Learning</option>
                            <option value="reviewing">Reviewing</option>
                            <option value="mastered">Mastered</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingTags === word.id ? (
                            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-wrap gap-1">
                                {['learning', 'reviewing', 'mastered', 'favorite', 'difficult', 'important'].map((tag) => (
                                  <label key={tag} className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={tempTags.includes(tag)}
                                      onChange={() => toggleTag(tag)}
                                      className="mr-1"
                                    />
                                    <span className={`text-xs px-2 py-1 rounded-full ${getTagColor(tag)}`}>
                                      {tag}
                                    </span>
                                  </label>
                                ))}
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => saveTags(word.id)}
                                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              className="flex flex-wrap gap-1 cursor-pointer hover:bg-gray-100 p-1 rounded"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingTags(word.id, word.tags);
                              }}
                            >
                              {word.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTagColor(tag)}`}
                                >
                                  {tag}
                                </span>
                              ))}
                              {word.tags.length > 2 && (
                                <span className="text-xs text-gray-500">
                                  +{word.tags.length - 2}
                                </span>
                              )}
                              <span className="text-xs text-gray-400 ml-1">✏️</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingDifficulty === word.id ? (
                            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={tempDifficulty}
                                onChange={(e) => setTempDifficulty(Number(e.target.value))}
                                className="text-xs border border-gray-300 rounded px-2 py-1"
                              >
                                <option value={1}>Level 1 - Easy</option>
                                <option value={2}>Level 2 - Basic</option>
                                <option value={3}>Level 3 - Intermediate</option>
                                <option value={4}>Level 4 - Advanced</option>
                                <option value={5}>Level 5 - Expert</option>
                              </select>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => saveDifficulty(word.id)}
                                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingDifficulty(word.id, word.difficulty || 1);
                              }}
                            >
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(word.difficulty || 1)}`}>
                                Level {word.difficulty || 1}
                              </span>
                              <span className="text-xs text-gray-400 ml-1">✏️</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(word.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/add-word?edit=${word.id}`;
                              }}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(word.id);
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Row */}
                      {expandedRows.has(word.id) && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {/* Example */}
                              {word.example && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                                    <FileText className="h-4 w-4 mr-1" />
                                    Example
                                  </h4>
                                  <p className="text-sm text-gray-600 italic">"{word.example}"</p>
                                </div>
                              )}

                              {/* Synonyms */}
                              {word.synonyms && word.synonyms.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-2">Synonyms</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {word.synonyms.map((synonym, index) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"
                                      >
                                        {synonym}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Antonyms */}
                              {word.antonyms && word.antonyms.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-2">Antonyms</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {word.antonyms.map((antonym, index) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800"
                                      >
                                        {antonym}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* All Tags */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                                  <Tag className="h-4 w-4 mr-1" />
                                  All Tags
                                </h4>
                                <div className="flex flex-wrap gap-1">
                                  {word.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTagColor(tag)}`}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Difficulty */}
                              {word.difficulty && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-2">Difficulty</h4>
                                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(word.difficulty)}`}>
                                    Level {word.difficulty}
                                  </span>
                                </div>
                              )}

                              {/* Review Info */}
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  Review Info
                                </h4>
                                <div className="text-xs text-gray-600 space-y-1">
                                  <div>Reviews: {word.review_count || 0}</div>
                                  {word.last_reviewed && (
                                    <div>Last: {formatDate(word.last_reviewed)}</div>
                                  )}
                                  {word.next_review && (
                                    <div>Next: {formatDate(word.next_review)}</div>
                                  )}
                                </div>
                              </div>

                              {/* Notes */}
                              {word.notes && (
                                <div className="md:col-span-2 lg:col-span-3">
                                  <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                                  <p className="text-sm text-gray-600">{word.notes}</p>
                                </div>
                              )}

                              {/* Source Info */}
                              <div className="md:col-span-2 lg:col-span-3">
                                <div className="text-xs text-gray-500">
                                  <div>Source: {word.source}</div>
                                  <div>Updated: {formatDate(word.updated_at)}</div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No words found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedTag || selectedStatus 
                  ? 'Try adjusting your filters or search terms.'
                  : 'Start building your vocabulary by adding your first word.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page {data.currentPage} of {data.totalPages} ({data.total} total words)
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(data.totalPages, currentPage + 1))}
              disabled={currentPage === data.totalPages}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vocabulary; 