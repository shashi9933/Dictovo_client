import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { 
  BookOpen, 
  Plus, 
  TrendingUp, 
  Target, 
  Star, 
  Clock,
  BarChart3,
  ArrowRight,
  FileText,
  Upload,
  Mic,
  Play
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface VocabularyStats {
  totalWords: number;
  tagStats: Array<{ _id: string; count: number }>;
  statusStats: Array<{ _id: string; count: number }>;
}

interface VocabularyEntry {
  _id: string;
  word: string;
  meaning: string;
  tags: string[];
  status: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Fetch vocabulary statistics
  const { data: stats, isLoading: statsLoading } = useQuery<VocabularyStats>(
    'vocabularyStats',
    async () => {
      const response = await axios.get('/vocabulary/stats/overview');
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

  // Fetch recent vocabulary entries
  const { data: recentWords, isLoading: wordsLoading } = useQuery<{
    vocabulary: VocabularyEntry[];
    total: number;
  }>(
    'recentWords',
    async () => {
      const response = await axios.get('/vocabulary?limit=5&sortBy=created_at&sortOrder=desc');
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

  const quickActions = [
    {
      title: 'Add Word Manually',
      description: 'Create a new vocabulary entry',
      icon: Plus,
      href: '/add-word',
      color: 'bg-blue-500',
    },
    {
      title: 'Take Quiz',
      description: 'Test your vocabulary knowledge',
      icon: Play,
      href: '/quiz',
      color: 'bg-indigo-500',
    },
    {
      title: 'Upload PDF',
      description: 'Extract words from PDF documents',
      icon: FileText,
      href: '/add-word?method=pdf',
      color: 'bg-green-500',
    },
    {
      title: 'Upload Image',
      description: 'Extract text using OCR',
      icon: Upload,
      href: '/add-word?method=image',
      color: 'bg-purple-500',
    },
    {
      title: 'Voice Input',
      description: 'Convert speech to text',
      icon: Mic,
      href: '/add-word?method=voice',
      color: 'bg-orange-500',
    },
  ];

  if (statsLoading || wordsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-primary-100">
          Continue building your vocabulary and track your progress.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BookOpen className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Words</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalWords || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Mastered</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.statusStats?.find(s => s._id === 'mastered')?.count || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Learning</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.statusStats?.find(s => s._id === 'learning')?.count || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Star className="h-8 w-8 text-pink-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Favorites</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.tagStats?.find(s => s._id === 'favorite')?.count || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.href}
                className="group block p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-2 rounded-lg ${action.color}`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900 group-hover:text-primary-600">
                      {action.title}
                    </h4>
                    <p className="text-xs text-gray-500">{action.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Words */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Recent Words</h3>
            <Link
              to="/vocabulary"
              className="text-sm text-primary-600 hover:text-primary-500 flex items-center"
            >
              View all
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="card-body">
          {recentWords?.vocabulary && recentWords.vocabulary.length > 0 ? (
            <div className="space-y-4">
              {recentWords.vocabulary.map((word) => (
                <div
                  key={word._id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{word.word}</h4>
                    <p className="text-sm text-gray-500 mt-1">{word.meaning}</p>
                    <div className="flex items-center mt-2 space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(word.status)}`}>
                        {word.status}
                      </span>
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
                  <div className="text-xs text-gray-400">
                    {new Date(word.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No words yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start building your vocabulary by adding your first word.
              </p>
              <div className="mt-6">
                <Link
                  to="/add-word"
                  className="btn-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first word
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Learning Progress</h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {stats?.statusStats?.map((status) => (
              <div key={status._id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status._id)}`}>
                    {status._id}
                  </span>
                  <span className="ml-2 text-sm text-gray-600">
                    {status.count} words
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${stats.totalWords > 0 ? (status.count / stats.totalWords) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {stats.totalWords > 0 ? Math.round((status.count / stats.totalWords) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;