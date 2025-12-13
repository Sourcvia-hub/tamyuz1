import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ApproverSelector = ({ itemId, module, onAssign }) => {
  const [approvers, setApprovers] = useState([]);
  const [selectedApprovers, setSelectedApprovers] = useState([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchApprovers();
  }, []);

  const fetchApprovers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`, {
        withCredentials: true
      });
      
      // Filter only senior_manager role (Approvers)
      const approversList = response.data.filter(user => user.role === 'senior_manager');
      setApprovers(approversList);
    } catch (error) {
      console.error('Failed to fetch approvers:', error);
    }
  };

  const handleAssign = async () => {
    if (selectedApprovers.length === 0) {
      alert('Please select at least one approver');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/${module}/${itemId}/review`,
        {
          assigned_approvers: selectedApprovers,
          comment: comment.trim() || null
        },
        { withCredentials: true }
      );

      setShowModal(false);
      setSelectedApprovers([]);
      setComment('');
      
      if (onAssign) {
        onAssign();
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to assign approvers');
    } finally {
      setLoading(false);
    }
  };

  const toggleApprover = (approverId) => {
    setSelectedApprovers(prev =>
      prev.includes(approverId)
        ? prev.filter(id => id !== approverId)
        : [...prev, approverId]
    );
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        Review & Assign Approvers
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Assign Approvers</h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Select one or more approvers for this request. All selected approvers must approve before proceeding.
              </p>

              {approvers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No approvers available. Please ensure users with "Approver" role exist.
                </p>
              ) : (
                <div className="space-y-2">
                  {approvers.map((approver) => (
                    <div
                      key={approver.id}
                      onClick={() => toggleApprover(approver.id)}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedApprovers.includes(approver.id)
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedApprovers.includes(approver.id)}
                        onChange={() => {}}
                        className="w-4 h-4 text-purple-600"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{approver.name}</p>
                        <p className="text-sm text-gray-600">{approver.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Comment (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add any notes for the approvers..."
                className="w-full border border-gray-300 rounded-lg p-3 h-24"
              />
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>{selectedApprovers.length}</strong> approver(s) selected
              </p>
              {selectedApprovers.length > 0 && (
                <p className="text-xs text-blue-700 mt-1">
                  All selected approvers must approve for the request to proceed to final approval.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedApprovers([]);
                  setComment('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                disabled={loading || selectedApprovers.length === 0}
              >
                {loading ? 'Assigning...' : `Assign ${selectedApprovers.length} Approver(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ApproverSelector;
