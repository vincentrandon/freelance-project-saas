import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers, useDeleteCustomer } from '../api/hooks';
import Header from '../partials/Header';
import Sidebar from '../partials/Sidebar';
import CustomerDetailPanel from '../components/CustomerDetailPanel';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';

function Customers() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: customersData, isLoading, error } = useCustomers();
  const customers = customersData?.results || [];
  const deleteMutation = useDeleteCustomer();

  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenDetails = (customerId) => {
    setSelectedCustomerId(customerId);
    setDetailPanelOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailPanelOpen(false);
    // Keep selectedCustomerId for a moment to allow smooth closing animation
    setTimeout(() => setSelectedCustomerId(null), 300);
  };

  const handleEditFromPanel = (customer) => {
    handleCloseDetails();
    setTimeout(() => navigate(`/customers/edit/${customer.id}`), 300);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        console.error('Error deleting customer:', err);
      }
    }
  };

  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl md:text-3xl text-gray-100 font-bold">Customers</h1>
                <button
                  onClick={() => navigate('/customers/create')}
                  className="btn bg-violet-500 hover:bg-violet-600 text-white"
                >
                  <svg className="fill-current shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
                    <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
                  </svg>
                  <span>Add Customer</span>
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers by name, email, or company..."
                className="w-full max-w-md px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm text-gray-100 placeholder-gray-500 transition-all duration-200"
              />
            </div>

            {/* Customers Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-gray-800 rounded-xl border border-gray-700 p-6 animate-pulse">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gray-700"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-700 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-700 rounded"></div>
                      <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-400">Error loading customers</div>
            ) : filteredCustomers.length === 0 ? (
              searchQuery ? (
                <EmptyState.SearchResults />
              ) : (
                <EmptyState.Customers onAction={() => navigate('/customers/create')} />
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleOpenDetails(customer.id)}
                    className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-violet-500 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                  >
                    {/* Customer Header */}
                    <div className="flex items-start gap-4 mb-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                        {customer.name?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-100 mb-1 truncate group-hover:text-violet-400 transition-colors">
                          {customer.name}
                        </h3>
                        {customer.company && (
                          <p className="text-sm text-gray-400 truncate">{customer.company}</p>
                        )}
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{customer.email}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{customer.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer Stats */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {customer.attachments_count || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/edit/${customer.id}`);
                          }}
                          className="p-1.5 text-gray-400 hover:text-violet-400 hover:bg-gray-700 rounded transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(customer.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Customer Detail Slide-Over Panel */}
      <CustomerDetailPanel
        customerId={selectedCustomerId}
        isOpen={detailPanelOpen}
        onClose={handleCloseDetails}
        onEdit={handleEditFromPanel}
      />
    </div>
  );
}

export default Customers;
