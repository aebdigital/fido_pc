import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { useLanguage } from '../context/LanguageContext';

const ProjectDetail = () => {
  const { id } = useParams();
  const [showRoomSelector, setShowRoomSelector] = useState(false);
  const { t } = useLanguage();
  const { contractors, activeContractorId } = useAppData();
  
  const getCurrentContractor = () => {
    return contractors.find(c => c.id === activeContractorId);
  };

  const roomTypes = [
    'Hallway', 'Toilet', 'Bathroom', 'Kitchen',
    'Living room', 'Kids room', 'Bedroom', 'Guests room',
    'Work room', 'Custom'
  ];


  const rooms = [
    { name: 'Hallway', works: 0, price: '€0,00' },
    { name: 'Toilet', works: 0, price: '€0,00' }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/projects" className="text-gray-600 hover:text-gray-900 text-lg">‹ Back</Link>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{id}</span>
          <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-full">{t('not sent')}</span>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">test Copy</h1>
      <p className="text-gray-500 mb-8">{t('Notes')}</p>

      {/* Client Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">👤</span>
          <h2 className="text-xl font-semibold text-gray-900">Client</h2>
        </div>
        <div className="bg-gray-100 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 transition-colors cursor-pointer">
          <div>
            <div className="font-medium text-gray-900">No client</div>
            <div className="text-sm text-gray-600">Associate project with a client</div>
          </div>
          <span className="text-gray-400">›</span>
        </div>
      </div>

      {/* Project Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h2 className="text-xl font-semibold text-gray-900">Project</h2>
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-gray-600 hover:text-gray-900">🗑️</button>
            <button 
              className="p-2 text-gray-600 hover:text-gray-900"
              onClick={() => setShowRoomSelector(!showRoomSelector)}
            >
              +
            </button>
          </div>
        </div>

        {/* New Room Selector */}
        {showRoomSelector && (
          <div className="bg-gray-100 rounded-2xl p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">New room</h3>
              <button 
                className="text-gray-600 hover:text-gray-900"
                onClick={() => setShowRoomSelector(false)}
              >
                🗑️
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {roomTypes.map(room => (
                <button
                  key={room}
                  className="bg-white rounded-xl p-3 text-gray-900 font-medium hover:bg-gray-50 transition-colors"
                >
                  {room}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing Rooms */}
        <div className="space-y-3">
          {rooms.map((room, index) => (
            <Link
              key={index}
              to={`/projects/${id}/room/${room.name.toLowerCase()}`}
              className="bg-gray-100 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 transition-colors"
            >
              <div>
                <div className="font-medium text-gray-900">{room.name}</div>
                <div className="text-sm text-gray-600">{room.works} works</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">{t('VAT not included')}</div>
                <div className="font-semibold text-gray-900">{room.price}</div>
                <span className="text-gray-400 ml-2">›</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Project Management */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">📊</span>
          <h2 className="text-xl font-semibold text-gray-900">Project management</h2>
        </div>
        <div className="space-y-3">
          <div className="bg-gray-100 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-200 transition-colors cursor-pointer">
            <div>
              <div className="font-medium text-gray-900">Project price list</div>
              <div className="text-sm text-gray-600">last change: 31 Oct 2025</div>
            </div>
            <span className="text-gray-400">›</span>
          </div>
          <div className="bg-gray-100 rounded-2xl p-4">
            <div className="font-medium text-gray-900">
              {getCurrentContractor()?.name || t('No contractor selected')}
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button className="flex-1 bg-white border-2 border-gray-300 text-gray-900 py-3 px-6 rounded-2xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <span>📋</span> Duplicate
          </button>
          <button className="flex-1 bg-gray-900 text-white py-3 px-6 rounded-2xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
            <span>📁</span> Archive
          </button>
        </div>
      </div>

      {/* History */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">History</h2>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-gray-900 rounded-full"></div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">📋 Created</span>
            <span className="text-sm text-gray-600">31/10/2025, 22:08</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;