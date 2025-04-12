import React from 'react';

function App() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Open Repo</h1>
        <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          {/* Placeholder for Settings Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col md:flex-row p-4 gap-4">
        {/* File Browser Placeholder */}
        <div className="flex-1 border border-dashed border-gray-400 dark:border-gray-600 rounded p-4 flex items-center justify-center">
          <span className="text-gray-500 dark:text-gray-400">File Browser Placeholder</span>
        </div>

        {/* Prompt Preview Placeholder */}
        <div className="flex-1 border border-dashed border-gray-400 dark:border-gray-600 rounded p-4 flex items-center justify-center">
          <span className="text-gray-500 dark:text-gray-400">Prompt Preview Placeholder</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-center">
        <button
          disabled
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 cursor-not-allowed"
        >
          Copy to Clipboard
        </button>
      </footer>
    </div>
  );
}

export default App;
