import React from 'react';

const WorkflowHistory = ({ workflow }) => {
  const history = workflow?.history || [];
  const approvals = workflow?.approvals || [];
  const rejections = workflow?.rejections || [];
  const assignedApprovers = workflow?.assigned_approver_names || [];

  const getActionIcon = (action) => {
    const icons = {
      created: '📝',
      submitted: '📤',
      reviewed: '👀',
      approved: '✅',
      rejected: '❌',
      returned: '↩️',
      final_approved: '🎉',
      reopened: '🔄'
    };
    return icons[action] || '•';
  };

  const getActionColor = (action) => {
    const colors = {
      created: 'text-gray-600',
      submitted: 'text-blue-600',
      reviewed: 'text-purple-600',
      approved: 'text-green-600',
      rejected: 'text-red-600',
      returned: 'text-orange-600',
      final_approved: 'text-green-700',
      reopened: 'text-indigo-600'
    };
    return colors[action] || 'text-gray-600';
  };

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

  const getApprovalStatus = () => {
    if (assignedApprovers.length === 0) return null;

    const approvedCount = approvals.filter(a => a.approved).length;
    const totalApprovers = assignedApprovers.length;

    return {
      approved: approvedCount,
      total: totalApprovers,
      pending: totalApprovers - approvedCount
    };
  };

  const approvalStatus = getApprovalStatus();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Workflow History</h3>

      {/* Approval Status Summary */}
      {approvalStatus && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Approval Progress</h4>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(approvalStatus.approved / approvalStatus.total) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-sm font-medium text-blue-900">
              {approvalStatus.approved}/{approvalStatus.total} Approved
            </div>
          </div>

          {/* Assigned Approvers */}
          <div className="mt-3">
            <p className="text-sm text-blue-800 font-medium mb-1">Assigned Approvers:</p>
            <div className="flex flex-wrap gap-2">
              {assignedApprovers.map((name, index) => {
                const hasApproved = approvals.some(a => a.approver_name === name);
                return (
                  <span
                    key={index}
                    className={`text-xs px-2 py-1 rounded ${
                      hasApproved
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {name} {hasApproved && '✓'}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Individual Approvals */}
      {approvals.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-2">Approvals</h4>
          <div className="space-y-2">
            {approvals.map((approval, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded">
                <span className="text-xl">✅</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">{approval.approver_name}</p>
                  {approval.comment && (
                    <p className="text-sm text-green-700 mt-1">{approval.comment}</p>
                  )}
                  <p className="text-xs text-green-600 mt-1">
                    {formatDate(approval.approved_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejections */}
      {rejections.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-2">Rejections</h4>
          <div className="space-y-2">
            {rejections.map((rejection, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded">
                <span className="text-xl">❌</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">{rejection.rejected_by_name}</p>
                  <p className="text-sm text-red-700 mt-1">{rejection.reason}</p>
                  <p className="text-xs text-red-600 mt-1">
                    {formatDate(rejection.rejected_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        <div className="space-y-4">
          {history.map((entry, index) => (
            <div key={index} className="relative flex items-start gap-4 pl-10">
              <div className={`absolute left-0 w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center ${getActionColor(entry.action)}`}>
                <span>{getActionIcon(entry.action)}</span>
              </div>
              
              <div className="flex-1 bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`font-medium ${getActionColor(entry.action)}`}>
                      {entry.action.charAt(0).toUpperCase() + entry.action.slice(1).replace('_', ' ')}
                    </p>
                    <p className="text-sm text-gray-600">{entry.by_name}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDate(entry.at)}
                  </p>
                </div>
                {entry.comment && (
                  <p className="text-sm text-gray-700 mt-2">{entry.comment}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {history.length === 0 && (
        <p className="text-gray-500 text-center py-8">No workflow history available</p>
      )}
    </div>
  );
};

export default WorkflowHistory;
