import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from 'react-query';
import { 
  Upload, 
  FileText, 
  Image, 
  Mic, 
  X, 
  Plus, 
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Search,
  CheckSquare,
  Square,
  Filter,
  Star
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface ExtractedWord {
  word: string;
  meaning: string;
  example: string;
  synonyms: string[];
  antonyms: string[];
  partOfSpeech?: string;
  pronunciation?: string;
  difficultyScore?: number;
  difficulty?: string;
  frequency?: number;
  count?: number;
}

const addWordSchema = z.object({
  word: z.string().min(1, 'Word is required'),
  meaning: z.string().min(1, 'Meaning is required'),
  example: z.string().optional(),
  synonyms: z.array(z.string()),
  antonyms: z.array(z.string()),
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
  notes: z.string().optional(),
  pronunciation: z.string().optional(),
  partOfSpeech: z.string().optional(),
});

type AddWordFormData = z.infer<typeof addWordSchema>;

const AddWord: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const method = searchParams.get('method');
  const editId = searchParams.get('edit');

  const [inputMethod, setInputMethod] = useState<'manual' | 'text' | 'pdf' | 'image' | 'voice'>('manual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingWord, setIsFetchingWord] = useState(false);
  const [autoFillSuccess, setAutoFillSuccess] = useState(false);
  const [extractedWords, setExtractedWords] = useState<ExtractedWord[]>([]);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [textInput, setTextInput] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm<AddWordFormData>({
    resolver: zodResolver(addWordSchema),
    defaultValues: {
      example: '',
      synonyms: [],
      antonyms: [],
      tags: ['learning']
    }
  });

  const watchedWord = watch('word');
  const watchedExample = watch('example');

  // Auto-fetch word details when word changes
  useEffect(() => {
    const fetchWordDetails = async () => {
      if (watchedWord && watchedWord.trim().length > 2) {
        setIsFetchingWord(true);
        setAutoFillSuccess(false);
        try {
          const response = await axios.get(`/vocabulary/word/${encodeURIComponent(watchedWord.trim())}`);
          const wordData = response.data.word;
          
          // Auto-fill the form with fetched data
          setValue('meaning', wordData.meaning);
          setValue('example', wordData.example || '');
          setValue('synonyms', wordData.synonyms || []);
          setValue('antonyms', wordData.antonyms || []);
          setValue('pronunciation', wordData.pronunciation || '');
          setValue('partOfSpeech', wordData.partOfSpeech || '');
          
          toast.success(`Found details for "${wordData.word}"`);
          setAutoFillSuccess(true);
        } catch (error: any) {
          console.log('Word not found in dictionary or API error:', error.message);
          // Don't show error toast for word not found - this is expected for many words
        } finally {
          setIsFetchingWord(false);
        }
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(fetchWordDetails, 1000);
    return () => clearTimeout(timeoutId);
  }, [watchedWord, setValue]);

  // Create vocabulary entry
  const createMutation = useMutation(
    async (data: AddWordFormData) => {
      const response = await axios.post('/vocabulary', {
        ...data,
        source: inputMethod
      });
      return response.data;
    },
    {
      onSuccess: () => {
        // Invalidate all related queries to ensure data consistency
        queryClient.invalidateQueries('vocabulary');
        queryClient.invalidateQueries('vocabularyStats');
        queryClient.invalidateQueries('recentWords');
        toast.success('Word added successfully!');
        navigate('/vocabulary');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to add word');
      }
    }
  );

  // Bulk create vocabulary entries
  const bulkCreateMutation = useMutation(
    async (words: ExtractedWord[]) => {
      const response = await axios.post('/vocabulary/bulk', {
        words: words.map(word => ({
          word: word.word,
          meaning: word.meaning,
          example: word.example,
          synonyms: word.synonyms,
          antonyms: word.antonyms,
          pronunciation: word.pronunciation,
          partOfSpeech: word.partOfSpeech,
          tags: getSuggestedTags(word),
          status: 'learning'
        }))
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('vocabulary');
        queryClient.invalidateQueries('vocabularyStats');
        queryClient.invalidateQueries('recentWords');
        toast.success(`${data.entries.length} words added successfully!`);
        setExtractedWords([]);
        setSelectedWords(new Set());
        navigate('/vocabulary');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to add words');
      }
    }
  );

  // Process text input
  const processText = async (text: string) => {
    setIsProcessing(true);
    try {
      const response = await axios.post('/upload/text', { text });
      setExtractedWords(response.data.extractedWords);
      setSelectedWords(new Set()); // Reset selections
      toast.success(`Found ${response.data.extractedWords.length} new words`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to process text');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process PDF upload
  const onPdfDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('pdf', acceptedFiles[0]);

    try {
      const response = await axios.post('/upload/pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExtractedWords(response.data.extractedWords);
      setSelectedWords(new Set()); // Reset selections
      toast.success(`Found ${response.data.extractedWords.length} new words`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to process PDF');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Process image upload
  const onImageDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('image', acceptedFiles[0]);

    try {
      const response = await axios.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExtractedWords(response.data.extractedWords);
      setSelectedWords(new Set()); // Reset selections
      toast.success(`Found ${response.data.extractedWords.length} new words`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const { getRootProps: getPdfRootProps, getInputProps: getPdfInputProps, isDragActive: isPdfDragActive } = useDropzone({
    onDrop: onPdfDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps, isDragActive: isImageDragActive } = useDropzone({
    onDrop: onImageDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif'] },
    multiple: false
  });

  const handleWordSelection = (word: ExtractedWord) => {
    setValue('word', word.word);
    setValue('meaning', word.meaning);
    setValue('example', word.example || '');
    setValue('synonyms', word.synonyms);
    setValue('antonyms', word.antonyms);
    setValue('pronunciation', word.pronunciation || '');
    setValue('partOfSpeech', word.partOfSpeech || '');
  };

  const toggleWordSelection = (word: string) => {
    const newSelected = new Set(selectedWords);
    if (newSelected.has(word)) {
      newSelected.delete(word);
    } else {
      newSelected.add(word);
    }
    setSelectedWords(newSelected);
  };

  const selectAllWords = () => {
    const allWords = extractedWords.map(word => word.word);
    setSelectedWords(new Set(allWords));
  };

  const deselectAllWords = () => {
    setSelectedWords(new Set());
  };

  const addSelectedWords = () => {
    const selectedWordObjects = extractedWords.filter(word => selectedWords.has(word.word));
    if (selectedWordObjects.length === 0) {
      toast.error('Please select at least one word');
      return;
    }
    setIsBulkAdding(true);
    bulkCreateMutation.mutate(selectedWordObjects);
  };

  const addAllWords = () => {
    if (extractedWords.length === 0) {
      toast.error('No words to add');
      return;
    }
    setIsBulkAdding(true);
    bulkCreateMutation.mutate(extractedWords);
  };

  const getSuggestedTags = (word: ExtractedWord): string[] => {
    const tags = ['learning'];
    
    if (word.difficultyScore && word.difficultyScore >= 0.6) {
      tags.push('difficult');
    }
    
    if (word.count === 1) {
      tags.push('important');
    }
    
    if (word.frequency && word.frequency < 0.005) {
      tags.push('rare');
    }
    
    return tags;
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'very_difficult': return 'bg-red-100 text-red-800 border-red-200';
      case 'difficult': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'very_easy': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyLabel = (difficulty?: string) => {
    switch (difficulty) {
      case 'very_difficult': return 'Very Difficult';
      case 'difficult': return 'Difficult';
      case 'moderate': return 'Moderate';
      case 'easy': return 'Easy';
      case 'very_easy': return 'Very Easy';
      default: return 'Unknown';
    }
  };

  const filteredWords = extractedWords.filter(word => {
    if (difficultyFilter === 'all') return true;
    return word.difficulty === difficultyFilter;
  });

  const addExample = () => {
    const currentExamples = watch('example');
    setValue('example', '');
  };

  const removeExample = () => {
    setValue('example', '');
  };

  const addSynonym = () => {
    const currentSynonyms = watch('synonyms');
    setValue('synonyms', [...currentSynonyms, '']);
  };

  const removeSynonym = (index: number) => {
    const currentSynonyms = watch('synonyms');
    setValue('synonyms', currentSynonyms.filter((_, i) => i !== index));
  };

  const addAntonym = () => {
    const currentAntonyms = watch('antonyms');
    setValue('antonyms', [...currentAntonyms, '']);
  };

  const removeAntonym = (index: number) => {
    const currentAntonyms = watch('antonyms');
    setValue('antonyms', currentAntonyms.filter((_, i) => i !== index));
  };

  const onSubmit = (data: AddWordFormData) => {
    createMutation.mutate(data);
  };

  const inputMethods = [
    { id: 'manual', name: 'Manual Entry', icon: Plus, description: 'Add word manually' },
    { id: 'text', name: 'Text Input', icon: FileText, description: 'Paste or type text' },
    { id: 'pdf', name: 'PDF Upload', icon: Upload, description: 'Upload PDF file' },
    { id: 'image', name: 'Image Upload', icon: Image, description: 'Upload image with text' },
    { id: 'voice', name: 'Voice Input', icon: Mic, description: 'Record voice input' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {editId ? 'Edit Word' : 'Add New Word'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose an input method and add words to your vocabulary
        </p>
      </div>

      {/* Input Method Selection */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Choose Input Method</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {inputMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setInputMethod(method.id as any)}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  inputMethod === method.id
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <method.icon className="mx-auto h-8 w-8 mb-2" />
                <h4 className="font-medium text-sm">{method.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{method.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Method Content */}
      {inputMethod === 'text' && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Text Input</h3>
          </div>
          <div className="card-body">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste or type your text here..."
              className="input h-32 resize-none"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => processText(textInput)}
                disabled={!textInput.trim() || isProcessing}
                className="btn-primary"
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Process Text
              </button>
            </div>
          </div>
        </div>
      )}

      {inputMethod === 'pdf' && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">PDF Upload</h3>
          </div>
          <div className="card-body">
            <div
              {...getPdfRootProps()}
              className={`dropzone ${isPdfDragActive ? 'dropzone-active' : ''}`}
            >
              <input {...getPdfInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isPdfDragActive ? 'Drop the PDF here' : 'Drag & drop a PDF file'}
              </p>
              <p className="text-sm text-gray-500">
                or click to select a file (max 10MB)
              </p>
            </div>
            {isProcessing && (
              <div className="mt-4 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary-600 mr-2" />
                <span>Processing PDF...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {inputMethod === 'image' && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Image Upload</h3>
          </div>
          <div className="card-body">
            <div
              {...getImageRootProps()}
              className={`dropzone ${isImageDragActive ? 'dropzone-active' : ''}`}
            >
              <input {...getImageInputProps()} />
              <Image className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isImageDragActive ? 'Drop the image here' : 'Drag & drop an image file'}
              </p>
              <p className="text-sm text-gray-500">
                or click to select a file (max 10MB)
              </p>
            </div>
            {isProcessing && (
              <div className="mt-4 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary-600 mr-2" />
                <span>Processing image...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {inputMethod === 'voice' && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Voice Input</h3>
          </div>
          <div className="card-body">
            <div className="text-center py-8">
              <Mic className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">
                Voice input feature coming soon! For now, please use text input or manual entry.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Words with Selection */}
      {extractedWords.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Extracted Words ({extractedWords.length})
              </h3>
              <div className="flex items-center space-x-2">
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="all">All Difficulties</option>
                  <option value="very_difficult">Very Difficult</option>
                  <option value="difficult">Difficult</option>
                  <option value="moderate">Moderate</option>
                  <option value="easy">Easy</option>
                  <option value="very_easy">Very Easy</option>
                </select>
              </div>
            </div>
          </div>
          <div className="card-body">
            {/* Bulk Actions */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    Selected: {selectedWords.size} of {extractedWords.length}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={selectAllWords}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAllWords}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={addSelectedWords}
                    disabled={selectedWords.size === 0 || isBulkAdding}
                    className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBulkAdding ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Add Selected ({selectedWords.size})
                  </button>
                  <button
                    onClick={addAllWords}
                    disabled={isBulkAdding}
                    className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBulkAdding ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Star className="mr-2 h-4 w-4" />
                    )}
                    Add All Words
                  </button>
                </div>
              </div>
            </div>

            {/* Words Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWords.map((word, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 transition-colors ${
                    selectedWords.has(word.word)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <div className="flex items-start justify-between mb-2">
                    <button
                      onClick={() => toggleWordSelection(word.word)}
                      className="flex items-center space-x-2 hover:bg-gray-100 p-1 rounded"
                    >
                      {selectedWords.has(word.word) ? (
                        <CheckSquare className="h-4 w-4 text-primary-600" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-600">Select</span>
                    </button>
                    {word.difficulty && (
                      <span className={`text-xs px-2 py-1 rounded-full border ${getDifficultyColor(word.difficulty)}`}>
                        {getDifficultyLabel(word.difficulty)}
                      </span>
                    )}
                  </div>

                  {/* Word Info */}
                  <div 
                    className="cursor-pointer"
                    onClick={() => handleWordSelection(word)}
                  >
                    <h4 className="font-medium text-gray-900 mb-1">{word.word}</h4>
                    <p className="text-sm text-gray-600 mb-2 truncate">{word.meaning}</p>
                    {word.example && (
                      <p className="text-xs text-gray-500 italic truncate">
                        "{word.example}"
                      </p>
                    )}
                    
                    {/* Word Stats */}
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>Frequency: {((word.frequency || 0) * 100).toFixed(2)}%</span>
                      <span>Count: {word.count || 0}</span>
                      {word.difficultyScore && (
                        <span>Score: {(word.difficultyScore * 100).toFixed(0)}</span>
                      )}
                    </div>

                    {/* Synonyms and Antonyms Preview */}
                    {(word.synonyms?.length > 0 || word.antonyms?.length > 0) && (
                      <div className="mt-2 space-y-1">
                        {word.synonyms?.slice(0, 2).map((synonym, idx) => (
                          <span key={idx} className="inline-block text-xs bg-green-100 text-green-800 px-1 rounded mr-1">
                            {synonym}
                          </span>
                        ))}
                        {word.antonyms?.slice(0, 1).map((antonym, idx) => (
                          <span key={idx} className="inline-block text-xs bg-red-100 text-red-800 px-1 rounded">
                            {antonym}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* No Words Found Message */}
            {filteredWords.length === 0 && (
              <div className="text-center py-8">
                <Filter className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-gray-500">
                  No words found with the selected difficulty filter.
                </p>
                <button
                  onClick={() => setDifficultyFilter('all')}
                  className="text-sm text-primary-600 hover:text-primary-800 mt-2"
                >
                  Show all words
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Entry Form */}
      {(inputMethod === 'manual' || extractedWords.length > 0) && (
        <form onSubmit={handleSubmit(onSubmit)} className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Word Details</h3>
          </div>
          <div className="card-body space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Word *
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      {...register('word')}
                      className="input pr-10"
                      placeholder="Enter the word (auto-fill enabled)"
                    />
                    {isFetchingWord && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                      </div>
                    )}
                    {!isFetchingWord && watchedWord && watchedWord.trim().length > 2 && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        {autoFillSuccess ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Search className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    )}
                  </div>
                  {watchedWord && watchedWord.trim().length > 2 && (
                    <button
                      type="button"
                      onClick={async () => {
                        setIsFetchingWord(true);
                        setAutoFillSuccess(false);
                        try {
                          const response = await axios.get(`/vocabulary/word/${encodeURIComponent(watchedWord.trim())}`);
                          const wordData = response.data.word;
                          
                          setValue('meaning', wordData.meaning);
                          setValue('example', wordData.example || '');
                          setValue('synonyms', wordData.synonyms || []);
                          setValue('antonyms', wordData.antonyms || []);
                          setValue('pronunciation', wordData.pronunciation || '');
                          setValue('partOfSpeech', wordData.partOfSpeech || '');
                          
                          toast.success(`Updated details for "${wordData.word}"`);
                          setAutoFillSuccess(true);
                        } catch (error: any) {
                          toast.error('Word not found in dictionary');
                        } finally {
                          setIsFetchingWord(false);
                        }
                      }}
                      disabled={isFetchingWord}
                      className="btn-secondary px-3 py-2"
                      title="Refresh word details"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {errors.word && (
                  <p className="mt-1 text-sm text-red-600">{errors.word.message}</p>
                )}
                {watchedWord && watchedWord.trim().length > 2 && (
                  <p className="mt-1 text-xs text-gray-500">
                    {isFetchingWord ? 'Fetching word details...' : 
                     autoFillSuccess ? '✅ Auto-fill completed successfully!' : 
                     'Auto-fill enabled - details will be fetched automatically'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Part of Speech
                </label>
                <input
                  {...register('partOfSpeech')}
                  className="input"
                  placeholder="e.g., noun, verb, adjective"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meaning *
              </label>
              <textarea
                {...register('meaning')}
                className="input h-20 resize-none"
                placeholder="Enter the meaning"
              />
              {errors.meaning && (
                <p className="mt-1 text-sm text-red-600">{errors.meaning.message}</p>
              )}
            </div>

            {/* Pronunciation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pronunciation
              </label>
              <input
                {...register('pronunciation')}
                className="input"
                placeholder="e.g., /pərˈhaps/"
              />
            </div>

            {/* Example */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Example
              </label>
              <textarea
                {...register('example')}
                className="input h-20 resize-none"
                placeholder="Enter the example"
              />
              {errors.example && (
                <p className="mt-1 text-sm text-red-600">{errors.example.message}</p>
              )}
            </div>

            {/* Synonyms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Synonyms
              </label>
              {watch('synonyms').map((_, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <input
                    {...register(`synonyms.${index}`)}
                    className="input flex-1"
                    placeholder="Synonym"
                  />
                  <button
                    type="button"
                    onClick={() => removeSynonym(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSynonym}
                className="btn-secondary text-sm"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Synonym
              </button>
            </div>

            {/* Antonyms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Antonyms
              </label>
              {watch('antonyms').map((_, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <input
                    {...register(`antonyms.${index}`)}
                    className="input flex-1"
                    placeholder="Antonym"
                  />
                  <button
                    type="button"
                    onClick={() => removeAntonym(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addAntonym}
                className="btn-secondary text-sm"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Antonym
              </button>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags *
              </label>
              <div className="flex flex-wrap gap-2">
                {['learning', 'reviewing', 'mastered', 'favorite', 'difficult', 'important'].map((tag) => (
                  <label key={tag} className="flex items-center">
                    <input
                      type="checkbox"
                      value={tag}
                      {...register('tags')}
                      className="mr-2"
                    />
                    <span className="text-sm capitalize">{tag}</span>
                  </label>
                ))}
              </div>
              {errors.tags && (
                <p className="mt-1 text-sm text-red-600">{errors.tags.message}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                {...register('notes')}
                className="input h-20 resize-none"
                placeholder="Additional notes or context"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/vocabulary')}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isLoading}
                className="btn-primary"
              >
                {createMutation.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {editId ? 'Update Word' : 'Add Word'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default AddWord;
                