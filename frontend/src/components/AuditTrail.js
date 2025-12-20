import React, { useState } from 'react';

/**
 * AuditTrail Component - Visual timeline for tracking major status changes
 * Only visible to officers and HoP roles
 */
const AuditTrail = ({ auditTrail = [], entityType = 'item', userRole }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Only show for officers and HoP
  const canViewAudit = ['procurement_officer', 'procurement_manager', 'admin', 'hop'].includes(userRole);
  
  if (!canViewAudit) return null;
  
  // Action icons mapping
  const getActionIcon = (action) => {
    const icons = {
      // Creation & Submission
      created: '📝',
      submitted: '📤',
      drafted: '📋',
      
      // Review & Evaluation
      reviewed: '👀',
      evaluated: '📊',
      verified: '🔍',
      
      // Approval Flow
      approved: '✅',
      rejected: '❌',
      pending_approval: '⏳',
      forwarded: '➡️',
      
      // Status Changes
      active: '🟢',
      completed: '🎉',
      cancelled: '🚫',
      expired: '⏰',
      suspended: '⏸️',
      
      // Vendor Specific
      blacklisted: '🚫',
      dd_started: '🔎',
      dd_completed: '✔️',
      risk_assessed: '⚠️',
      
      // Contract Specific
      signed: '✍️',
      renewed: '🔄',
      amended: '📝',
      terminated: '🔚',
      
      // PO Specific
      received: '📦',
      delivered: '🚚',
      invoiced: '💰',
      paid: '💵',
      
      // Default
      updated: '✏️',
      status_changed: '🔄',
      comment_added: '💬',
      document_uploaded: '📎',
      assigned: '👤'
    };
    return icons[action?.toLowerCase()] || '•';
  };

  // Action colors
  const getActionColor = (action) => {
    const lowerAction = action?.toLowerCase() || '';
    
    if (['approved', 'completed', 'active', 'dd_completed', 'signed', 'paid', 'delivered'].includes(lowerAction)) {
      return { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-700' };
    }
    if (['rejected', 'cancelled', 'blacklisted', 'terminated', 'expired'].includes(lowerAction)) {
      return { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-700' };
    }
    if (['pending_approval', 'submitted', 'forwarded', 'evaluated'].includes(lowerAction)) {
      return { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700' };
    }
    if (['reviewed', 'verified', 'dd_started', 'risk_assessed'].includes(lowerAction)) {
      return { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-700' };
    }
    if (['updated', 'amended', 'renewed', 'status_changed'].includes(lowerAction)) {
      return { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-700' };
    }
    if (['created', 'drafted'].includes(lowerAction)) {
      return { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-700' };
    }
    
    return { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-600' };
  };

  // Format action label
  const formatAction = (action) => {
    if (!action) return 'Unknown';
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Format timestamp
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Sort by timestamp descending (newest first)
  const sortedTrail = [...auditTrail].sort((a, b) => {
    const dateA = new Date(a.timestamp || a.created_at || a.at || 0);
    const dateB = new Date(b.timestamp || b.created_at || b.at || 0);
    return dateB - dateA;
  });

  if (sortedTrail.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>📜</span> Audit Trail
          </h2>
        </div>
        <p className="text-gray-500 text-center py-4">No audit history available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* Header with Toggle */}
      <div 
        className="flex items-center justify-between mb-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>📜</span> Audit Trail
          <span className="text-sm font-normal text-gray-500">
            ({sortedTrail.length} {sortedTrail.length === 1 ? 'entry' : 'entries'})
          </span>
        </h2>
        <button className="p-1 hover:bg-gray-100 rounded transition-colors">
          <svg 
            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Timeline */}
      {isExpanded && (
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gray-200" />
          
          {/* Timeline Items */}
          <div className="space-y-4">
            {sortedTrail.map((entry, index) => {
              const colors = getActionColor(entry.action);
              const isFirst = index === 0;
              
              return (
                <div key={entry.id || index} className="relative flex items-start gap-4 pl-12">
                  {/* Icon Circle */}
                  <div 
                    className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center
                      ${colors.bg} border-2 ${colors.border} shadow-sm
                      ${isFirst ? 'ring-2 ring-offset-2 ring-blue-300' : ''}`}
                  >
                    <span className="text-lg">{getActionIcon(entry.action)}</span>
                  </div>
                  
                  {/* Content Card */}
                  <div className={`flex-1 rounded-lg p-4 ${isFirst ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Action Label */}
                        <p className={`font-semibold ${colors.text}`}>
                          {formatAction(entry.action)}
                        </p>
                        
                        {/* User Info */}
                        <p className="text-sm text-gray-600 mt-1">
                          by <span className="font-medium">{entry.user_name || entry.by_name || 'System'}</span>
                          {entry.user_role && (
                            <span className="text-xs text-gray-400 ml-1">({entry.user_role})</span>
                          )}
                        </p>
                      </div>
                      
                      {/* Timestamp */}
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {formatDate(entry.timestamp || entry.created_at || entry.at)}
                        </p>
                        {isFirst && (
                          <span className="inline-block text-xs bg-blue-500 text-white px-2 py-0.5 rounded mt-1">
                            Latest
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Notes/Comments */}
                    {(entry.notes || entry.comment || entry.details) && (
                      <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                        <p className="text-sm text-gray-700 italic">
                          "{entry.notes || entry.comment || entry.details}"
                        </p>
                      </div>
                    )}

                    {/* Previous/New Status if available */}
                    {entry.old_status && entry.new_status && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded line-through">
                          {formatAction(entry.old_status)}
                        </span>
                        <span>→</span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                          {formatAction(entry.new_status)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrail;
