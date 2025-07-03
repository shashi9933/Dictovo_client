import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  ArrowLeft,
  RotateCcw,
  BarChart3,
  Clock,
  BookOpen,
  Target,
  Trophy,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface QuizQuestion {
  wordId: string;
  word: string;
  question: string;
  options: string[];
  correctAnswer: string;
  type: 'meaning' | 'synonyms' | 'antonyms' | 'fill-blank';
}

interface QuizResponse {
  questions: QuizQuestion[];
  totalQuestions: number;
  quizType: string;
}

interface QuizResult {
  wordId: string;
  selectedAnswer: string;
  correct: boolean;
  correctAnswer: string;
  word: string;
  question: string;
}

const Quiz: React.FC = () => {
  const [quizType, setQuizType] = useState<'meaning' | 'synonyms' | 'antonyms' | 'fill-blank' | 'mixed'>('meaning');
  const [questionCount, setQuestionCount] = useState(10);
  const [status, setStatus] = useState<'all' | 'learning' | 'reviewing' | 'mastered'>('all');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string }>({});
  const [showResults, setShowResults] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);

  const queryClient = useQueryClient();

  // Fetch quiz questions
  const { data: quizData, isLoading, error, refetch } = useQuery<QuizResponse>(
    ['quiz', quizType, questionCount, status],
    async () => {
      const response = await axios.get('/vocabulary/quiz', {
        params: {
          type: quizType,
          count: questionCount,
          status: status === 'all' ? undefined : status
        }
      });
      return response.data;
    },
    {
      enabled: false, // Don't fetch automatically
      retry: false
    }
  );

  // Submit quiz results
  const submitResultsMutation = useMutation(
    async (results: QuizResult[]) => {
      const response = await axios.post('/vocabulary/quiz/results', {
        results,
        quizType
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success(data.message);
        queryClient.invalidateQueries('vocabulary');
        queryClient.invalidateQueries('vocabularyStats');
      },
      onError: () => {
        toast.error('Failed to submit quiz results');
      }
    }
  );

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            handleFinishQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const startQuiz = async () => {
    try {
      const result = await refetch();
      if (result.data && result.data.questions && result.data.questions.length > 0) {
        setQuizStarted(true);
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setShowResults(false);
        setTimeLeft(result.data.questions.length * 30); // 30 seconds per question
        setTimerActive(true);
      } else {
        toast.error('No questions available for the selected criteria');
      }
    } catch (error) {
      console.error('Start quiz error:', error);
      const axiosError = error as any;
      const errorMessage = axiosError?.response?.data?.error || 'Failed to start quiz';
      toast.error(errorMessage);
    }
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (quizData?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleFinishQuiz();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleFinishQuiz = () => {
    setTimerActive(false);
    if (!quizData) return;

    const results: QuizResult[] = quizData.questions.map(question => ({
      wordId: question.wordId,
      selectedAnswer: selectedAnswers[question.wordId] || '',
      correct: selectedAnswers[question.wordId] === question.correctAnswer,
      correctAnswer: question.correctAnswer,
      word: question.word,
      question: question.question
    }));

    setQuizResults(results);
    submitResultsMutation.mutate(results);
    setShowResults(true);
  };

  const resetQuiz = () => {
    setQuizStarted(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setTimeLeft(0);
    setTimerActive(false);
    setQuizResults([]);
  };

  const markWordsForReview = async () => {
    const incorrectWords = quizResults
      .filter(result => !result.correct)
      .map(result => result.wordId);

    if (incorrectWords.length === 0) {
      toast.success('No words to mark for review!');
      return;
    }

    try {
      // Mark incorrect words for review by updating their status
      await Promise.all(
        incorrectWords.map(wordId =>
          axios.put(`/vocabulary/${wordId}`, { status: 'reviewing' })
        )
      );

      toast.success(`${incorrectWords.length} words marked for review!`);
      queryClient.invalidateQueries('vocabulary');
      queryClient.invalidateQueries('vocabularyStats');
    } catch (error) {
      toast.error('Failed to mark words for review');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuizTypeIcon = (type: string) => {
    switch (type) {
      case 'meaning': return <BookOpen className="h-5 w-5" />;
      case 'synonyms': return <Target className="h-5 w-5" />;
      case 'antonyms': return <RotateCcw className="h-5 w-5" />;
      case 'fill-blank': return <AlertCircle className="h-5 w-5" />;
      case 'mixed': return <BarChart3 className="h-5 w-5" />;
      default: return <BookOpen className="h-5 w-5" />;
    }
  };

  const getQuizTypeLabel = (type: string) => {
    switch (type) {
      case 'meaning': return 'Word Meanings';
      case 'synonyms': return 'Synonyms';
      case 'antonyms': return 'Antonyms';
      case 'fill-blank': return 'Fill in the Blank';
      case 'mixed': return 'Mixed Questions';
      default: return 'Word Meanings';
    }
  };

  if (error) {
    console.error('Quiz error:', error);
    const axiosError = error as any;
    const errorMessage = axiosError?.response?.data?.error || 'Failed to load quiz';
    const is404Error = axiosError?.response?.status === 404;
    
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <div className="card-header">
            <h2 className="text-2xl font-bold text-gray-900">Quiz</h2>
          </div>
          <div className="card-body text-center py-12">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {is404Error ? 'No words available for quiz' : 'Error loading quiz'}
            </h3>
            <p className="text-gray-600 mb-6">
              {is404Error 
                ? 'You need to add some vocabulary words before you can take a quiz.'
                : errorMessage
              }
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/add-word'}
                className="btn btn-primary"
              >
                Add Words
              </button>
              <button
                onClick={() => window.location.href = '/vocabulary'}
                className="btn btn-outline"
              >
                View Vocabulary
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <div className="card-header">
            <h2 className="text-2xl font-bold text-gray-900">Vocabulary Quiz</h2>
            <p className="text-gray-600">Test your knowledge with interactive quizzes</p>
          </div>
          <div className="card-body">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quiz Settings */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quiz Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['meaning', 'synonyms', 'antonyms', 'fill-blank', 'mixed'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setQuizType(type)}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          quizType === type
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {getQuizTypeIcon(type)}
                          <span className="text-sm font-medium">{getQuizTypeLabel(type)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Questions
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="input w-full"
                  >
                    <option value={5}>5 questions</option>
                    <option value={10}>10 questions</option>
                    <option value={15}>15 questions</option>
                    <option value={20}>20 questions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Word Status Filter
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="input w-full"
                  >
                    <option value="all">All words</option>
                    <option value="learning">Learning</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="mastered">Mastered</option>
                  </select>
                </div>
              </div>

              {/* Quiz Preview */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quiz Preview</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    {getQuizTypeIcon(quizType)}
                    <div>
                      <p className="font-medium text-gray-900">{getQuizTypeLabel(quizType)}</p>
                      <p className="text-sm text-gray-600">{questionCount} questions</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Time Limit</p>
                      <p className="text-sm text-gray-600">{questionCount * 30} seconds</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Target className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Status Filter</p>
                      <p className="text-sm text-gray-600">
                        {status === 'all' ? 'All words' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={startQuiz}
                disabled={isLoading}
                className="btn btn-primary btn-lg flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    <span>Start Quiz</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quizData || !quizData.questions[currentQuestionIndex]) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <div className="card-body text-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quizData.questions.length - 1;
  const hasAnswered = selectedAnswers[currentQuestion.wordId];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Vocabulary Quiz</h2>
              <p className="text-gray-600">
                Question {currentQuestionIndex + 1} of {quizData.questions.length}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{formatTime(timeLeft)}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Trophy className="h-4 w-4" />
                <span>{Object.keys(selectedAnswers).length}/{quizData.questions.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card-body">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(((currentQuestionIndex + 1) / quizData.questions.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / quizData.questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            <div className="bg-primary-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 mb-2">
                {getQuizTypeIcon(currentQuestion.type)}
                <span className="text-sm font-medium text-primary-700 uppercase">
                  {currentQuestion.type.replace('-', ' ')}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">{currentQuestion.question}</h3>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(currentQuestion.wordId, option)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    selectedAnswers[currentQuestion.wordId] === option
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedAnswers[currentQuestion.wordId] === option
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedAnswers[currentQuestion.wordId] === option && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className="font-medium">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="btn btn-outline flex items-center space-x-2 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <div className="flex space-x-3">
              <button
                onClick={resetQuiz}
                className="btn btn-outline"
              >
                Reset Quiz
              </button>
              <button
                onClick={handleFinishQuiz}
                className="btn btn-primary flex items-center space-x-2"
              >
                <span>Finish Quiz</span>
                <Trophy className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={handleNextQuestion}
              disabled={!hasAnswered || isLastQuestion}
              className="btn btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              <span>{isLastQuestion ? 'Finish' : 'Next'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Modal */}
      {showResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Quiz Complete!</h3>
              <p className="text-gray-600 mb-6">
                {submitResultsMutation.data?.message || 'Great job completing the quiz!'}
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {submitResultsMutation.data?.correctAnswers || 0}
                  </div>
                  <div className="text-sm text-green-600">Correct</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">
                    {submitResultsMutation.data?.totalQuestions - (submitResultsMutation.data?.correctAnswers || 0)}
                  </div>
                  <div className="text-sm text-red-600">Incorrect</div>
                </div>
              </div>
            </div>

            {/* Summary */}
            {quizResults.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">Words Mastered</h5>
                    <div className="space-y-2">
                      {quizResults
                        .filter(result => result.correct)
                        .map((result, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-blue-800 font-medium">{result.word}</span>
                          </div>
                        ))}
                      {quizResults.filter(result => result.correct).length === 0 && (
                        <p className="text-sm text-blue-600">No words mastered in this quiz</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <h5 className="font-medium text-red-900 mb-2">Words to Review</h5>
                    <div className="space-y-2">
                      {quizResults
                        .filter(result => !result.correct)
                        .map((result, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm text-red-800 font-medium">{result.word}</span>
                          </div>
                        ))}
                      {quizResults.filter(result => !result.correct).length === 0 && (
                        <p className="text-sm text-red-600">All words answered correctly!</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Results */}
            {quizResults.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Detailed Results</h4>
                <div className="space-y-4">
                  {quizResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 ${
                        result.correct
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {result.correct ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            <span className="font-medium text-gray-900">
                              Question {index + 1}
                            </span>
                            <span className={`text-sm px-2 py-1 rounded-full ${
                              result.correct
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {result.correct ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{result.question}</p>
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">Word:</span>{' '}
                            <span className="text-blue-600 font-semibold">{result.word}</span>
                          </div>
                          {!result.correct && (
                            <div className="mt-2 space-y-1">
                              <div className="text-sm">
                                <span className="font-medium text-red-600">Your answer:</span>{' '}
                                <span className="text-red-700">{result.selectedAnswer || 'No answer'}</span>
                              </div>
                              <div className="text-sm">
                                <span className="font-medium text-green-600">Correct answer:</span>{' '}
                                <span className="text-green-700">{result.correctAnswer}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={resetQuiz}
                className="btn btn-primary w-full"
              >
                Take Another Quiz
              </button>
              {quizResults.some(result => !result.correct) && (
                <button
                  onClick={markWordsForReview}
                  className="btn btn-warning w-full"
                >
                  Mark Incorrect Words for Review
                </button>
              )}
              <button
                onClick={() => window.location.href = '/vocabulary'}
                className="btn btn-outline w-full"
              >
                View Vocabulary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz; 