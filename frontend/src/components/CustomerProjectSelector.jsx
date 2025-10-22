import React, { useState, useRef, useEffect } from 'react';

/**
 * CustomerProjectSelector - Enhanced searchable dropdown for selecting customers or projects
 * Features:
 * - Search/filter functionality
 * - Visual display with metadata (company, email, etc.)
 * - "Create New" button
 * - Keyboard navigation
 * - Loading states
 */
function CustomerProjectSelector({
  type = 'customer', // 'customer' or 'project'
  items = [],
  value,
  onChange,
  onCreateNew,
  placeholder = 'Select...',
  required = false,
  disabled = false,
  isLoading = false,
  filterByCustomer = null, // For projects: filter by customer ID
  label,
  error,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter items based on search query and customer filter (for projects)
  const filteredItems = items.filter(item => {
    // Filter by customer for projects
    if (type === 'project' && filterByCustomer) {
      if (item.customer.toString() !== filterByCustomer.toString()) {
        return false;
      }
    }

    // Filter by search query
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const name = item.name?.toLowerCase() || '';
    const company = item.company?.toLowerCase() || '';
    const email = item.email?.toLowerCase() || '';
    const customerName = item.customer_name?.toLowerCase() || '';

    return name.includes(query) ||
           company.includes(query) ||
           email.includes(query) ||
           customerName.includes(query);
  });

  // Get selected item
  const selectedItem = items.find(item => item.id === value);

  // Debug logging
  useEffect(() => {
    console.log(`CustomerProjectSelector [${type}]: onCreateNew =`, onCreateNew);
    console.log(`CustomerProjectSelector [${type}]: onCreateNew exists =`, !!onCreateNew);
  }, [onCreateNew, type]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Reset highlighted index when filtered items change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredItems.length ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex === filteredItems.length) {
          // Create new
          handleCreateNew();
        } else if (filteredItems[highlightedIndex]) {
          handleSelect(filteredItems[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
      default:
        break;
    }
  };

  const handleSelect = (item) => {
    onChange(item.id);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCreateNew = () => {
    console.log('CustomerProjectSelector: Create new clicked for type:', type);
    setIsOpen(false);
    setSearchQuery('');
    if (onCreateNew) {
      console.log('CustomerProjectSelector: Calling onCreateNew callback');
      onCreateNew();
    } else {
      console.log('CustomerProjectSelector: No onCreateNew callback provided');
    }
  };

  const renderItemContent = (item) => {
    if (type === 'customer') {
      return (
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
            {item.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {item.name}
            </div>
            {(item.company || item.email) && (
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {item.company && <span>{item.company}</span>}
                {item.company && item.email && <span> • </span>}
                {item.email && <span>{item.email}</span>}
              </div>
            )}
          </div>
        </div>
      );
    } else {
      // Project
      return (
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {item.name}
            </div>
            {item.customer_name && (
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {item.customer_name}
              </div>
            )}
          </div>
          {/* Status badge */}
          {item.status && (
            <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
              item.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
              item.status === 'paused' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
              item.status === 'completed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
              'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
            }`}>
              {item.status}
            </span>
          )}
        </div>
      );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Selected value display / trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`w-full px-4 py-2.5 bg-white dark:bg-gray-800 border rounded-lg text-left transition-all duration-200 ${
          isOpen
            ? 'border-violet-500 ring-2 ring-violet-500/20'
            : error
            ? 'border-red-300 dark:border-red-700'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-violet-600 border-t-transparent"></div>
                <span className="text-sm">Loading...</span>
              </div>
            ) : selectedItem ? (
              <div className="truncate">
                {type === 'customer' ? (
                  <div>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{selectedItem.name}</span>
                    {selectedItem.company && (
                      <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">({selectedItem.company})</span>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{selectedItem.name}</span>
                    {selectedItem.customer_name && (
                      <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">• {selectedItem.customer_name}</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-400 dark:text-gray-500 text-sm">{placeholder}</span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Search ${type === 'customer' ? 'customers' : 'projects'}...`}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Items list */}
          <div className="overflow-y-auto max-h-60">
            {filteredItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No results found' : `No ${type === 'customer' ? 'customers' : 'projects'} available`}
              </div>
            ) : (
              filteredItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    highlightedIndex === index
                      ? 'bg-violet-50 dark:bg-violet-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  } ${value === item.id ? 'bg-violet-100 dark:bg-violet-900/30' : ''}`}
                >
                  {renderItemContent(item)}
                </button>
              ))
            )}
          </div>

          {/* Create new button */}
          {onCreateNew && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleCreateNew}
                onMouseEnter={() => setHighlightedIndex(filteredItems.length)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  highlightedIndex === filteredItems.length
                    ? 'bg-violet-50 dark:bg-violet-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3 text-violet-600 dark:text-violet-400">
                  <div className="flex-shrink-0 w-8 h-8 bg-violet-100 dark:bg-violet-900/40 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">
                    Create new {type === 'customer' ? 'customer' : 'project'}
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

export default CustomerProjectSelector;
