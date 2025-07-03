import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">User Information</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={user?.username || ''}
                className="input"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                className="input"
                readOnly
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Statistics</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {user?.stats?.totalWords || 0}
              </div>
              <div className="text-sm text-gray-500">Total Words</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {user?.stats?.masteredWords || 0}
              </div>
              <div className="text-sm text-gray-500">Mastered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {user?.stats?.learningWords || 0}
              </div>
              <div className="text-sm text-gray-500">Learning</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-600">
                {user?.stats?.reviewWords || 0}
              </div>
              <div className="text-sm text-gray-500">Reviewing</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 