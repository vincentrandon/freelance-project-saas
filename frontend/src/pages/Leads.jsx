import React, { useState } from 'react';
import { useLeadKanban, useUpdateLeadStatus, useLeadStats } from '../api/hooks';
import Header from '../partials/Header';
import Sidebar from '../partials/Sidebar';

const STATUS_COLORS = {
  new: 'bg-blue-500',
  contacted: 'bg-yellow-500',
  qualified: 'bg-green-500',
  proposal: 'bg-purple-500',
  negotiation: 'bg-red-500',
  won: 'bg-emerald-500',
  lost: 'bg-gray-500',
};

function LeadCard({ lead, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      className="bg-gray-700 p-4 rounded-lg cursor-move hover:bg-gray-600 transition mb-3"
    >
      <h4 className="font-medium text-gray-100">{lead.name}</h4>
      <p className="text-sm text-gray-400">{lead.company}</p>
      {lead.value && (
        <p className="text-sm font-semibold text-violet-400 mt-2">${lead.value.toLocaleString()}</p>
      )}
      {lead.probability && (
        <p className="text-xs text-gray-500 mt-1">{lead.probability}% probability</p>
      )}
    </div>
  );
}

function LeadColumn({ status, label, leads, onDragOver, onDrop }) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
      className="bg-gray-800 rounded-lg p-4 flex-1 min-h-96"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[status]}`}></div>
        <h3 className="font-semibold text-gray-100">{label}</h3>
        <span className="text-sm text-gray-500 ml-auto">{leads.length}</span>
      </div>
      <div className="space-y-2">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onDragStart={(e) => {}} />
        ))}
      </div>
    </div>
  );
}

function Leads() {
  const { data: kanbanData = {}, isLoading } = useLeadKanban();
  const { data: stats } = useLeadStats();
  const updateStatusMutation = useUpdateLeadStatus();
  const [draggedLead, setDraggedLead] = useState(null);

  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (draggedLead && draggedLead.status !== newStatus) {
      try {
        await updateStatusMutation.mutateAsync({ id: draggedLead.id, status: newStatus });
      } catch (err) {
        console.error('Error updating lead status:', err);
      }
    }
    setDraggedLead(null);
  };

  const STATUS_ORDER = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  const STATUS_LABELS = {
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Qualified',
    proposal: 'Proposal',
    negotiation: 'Negotiation',
    won: 'Won',
    lost: 'Lost',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl text-gray-100 font-bold mb-6">Lead Pipeline</h1>

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-400 text-sm">Total Leads</p>
                    <p className="text-3xl font-bold text-gray-100">{stats.total_leads}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-400 text-sm">Pipeline Value</p>
                    <p className="text-3xl font-bold text-gray-100">${(stats.total_value / 1000).toFixed(0)}K</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-400 text-sm">Conversion Rate</p>
                    <p className="text-3xl font-bold text-gray-100">{stats.conversion_rate.toFixed(1)}%</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <p className="text-gray-400 text-sm">Win Rate</p>
                    <p className="text-3xl font-bold text-gray-100">
                      {stats.status_breakdown.won ? 
                        ((stats.status_breakdown.won.count / stats.total_leads) * 100).toFixed(0) : 0}%
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Kanban Board */}
            {isLoading ? (
              <div className="text-center text-gray-400">Loading kanban board...</div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {STATUS_ORDER.map((status) => (
                  <LeadColumn
                    key={status}
                    status={status}
                    label={STATUS_LABELS[status]}
                    leads={kanbanData[status]?.leads || []}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Leads;
