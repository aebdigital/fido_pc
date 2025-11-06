import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const Invoices = () => {
  const [selectedTime, setSelectedTime] = useState('Any Time');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const timeFilters = ['Any Time'];
  const statusFilters = ['All', 'Paid', 'Unpaid', 'After M'];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Invoices</h1>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="text-lg font-medium text-gray-900 dark:text-white">vhh</span>
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </div>
      </div>

      <div className="flex gap-4 mb-8 flex-wrap">
        <div className="flex gap-2">
          {timeFilters.map(filter => (
            <button
              key={filter}
              className={`px-4 py-2 border-2 rounded-full text-sm font-medium transition-all ${
                selectedTime === filter 
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onClick={() => setSelectedTime(filter)}
            >
              {filter} ◇
            </button>
          ))}
        </div>
        
        <div className="flex gap-2">
          {statusFilters.map(filter => (
            <button
              key={filter}
              className={`px-4 py-2 border-2 rounded-full text-sm font-medium transition-all ${
                selectedStatus === filter 
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onClick={() => setSelectedStatus(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center min-h-96 text-center">
        <div>
          <h2 className="text-lg font-medium text-gray-600 dark:text-gray-400">There is no Invoice for selected Contractor.</h2>
        </div>
      </div>
    </div>
  );
};

export default Invoices;