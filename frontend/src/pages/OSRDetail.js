import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../App';
import AuditTrail from '../components/AuditTrail';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OSRDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [osr, setOsr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [auditTrail, setAuditTrail] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    resolution_notes: ''
  });

  useEffect(() => {
    fetchOSR();
    fetchAuditTrail();
  }, [id]);

  const fetchAuditTrail = async () => {
    try {
      const res = await axios.get(`${API}/osr/${id}/audit-trail`, { withCredentials: true });
      setAuditTrail(res.data);
    } catch (error) {
      console.log('Audit trail not available or access denied');
    }
  };

  const fetchOSR = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/osrs/${id}`, { withCredentials: true });
      setOsr(response.data);
      setStatusUpdate({
        status: response.data.status,
        resolution_notes: response.data.resolution_notes || ''
      });
    } catch (error) {
      console.error('Error fetching OSR:', error);
      alert('Error loading service request');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      setUpdating(true);
      await axios.put(`${API}/osrs/${id}`, statusUpdate, { withCredentials: true });
      alert('Status updated successfully!');
      setShowStatusModal(false);
      fetchOSR();
    } catch (error) {
      console.error('Error updating status:', error);
      
      let errorMessage = 'Error updating status';
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = 'Validation errors:\n' + errorData.detail.map(err => 
            `- ${err.loc.join('.')}: ${err.msg}`
          ).join('\n');
        } else if (typeof errorData.detail === 'object') {
          errorMessage = 'Error: ' + JSON.stringify(errorData.detail, null, 2);
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this service request?')) return;
    
    try {
      await axios.delete(`${API}/osrs/${id}`, { withCredentials: true });
      alert('Service request deleted successfully');
      navigate('/osr');
    } catch (error) {
      console.error('Error deleting OSR:', error);
      
      let errorMessage = 'Error deleting service request';
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = 'Validation errors:\n' + errorData.detail.map(err => 
            `- ${err.loc.join('.')}: ${err.msg}`
          ).join('\n');
        } else if (typeof errorData.detail === 'object') {
          errorMessage = 'Error: ' + JSON.stringify(errorData.detail, null, 2);
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      alert(errorMessage);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      assigned: 'bg-blue-100 text-blue-800 border-blue-300',
      in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
      completed: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return styles[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      high: 'bg-red-100 text-red-800 border-red-300',
      normal: 'bg-blue-100 text-blue-800 border-blue-300',
      low: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return styles[priority] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!osr) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Service request not found</p>
          <Link to="/osr" className="text-blue-600 hover:underline mt-4 inline-block">Back to List</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{osr.osr_number}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border-2 ${getStatusBadge(osr.status)}`}>
                {osr.status?.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border-2 ${getPriorityBadge(osr.priority)}`}>
                {osr.priority?.toUpperCase()} PRIORITY
              </span>
            </div>
            <p className="text-gray-600 mt-2">{osr.title}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Update Status
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
            >
              Delete
            </button>
            <Link
              to="/osr"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back to List
            </Link>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="col-span-2 space-y-6">
            {/* Request Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Type</div>
                  <div className="font-medium">{osr.request_type === 'asset_related' ? 'Asset Related' : 'General Request'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Category</div>
                  <div className="font-medium">{osr.category}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Priority</div>
                  <div className="font-medium capitalize">{osr.priority}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Created Date</div>
                  <div className="font-medium">{new Date(osr.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600 mb-2">Description</div>
                <p className="text-gray-900">{osr.description}</p>
              </div>
            </div>

            {/* Location Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Building</div>
                  <div className="font-medium">{osr.building_name || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Floor</div>
                  <div className="font-medium">{osr.floor_name || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Room/Area</div>
                  <div className="font-medium">{osr.room_area || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Asset Information (if applicable) */}
            {osr.request_type === 'asset_related' && osr.asset_id && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Related Asset</h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-600">Asset Name</div>
                    <Link to={`/assets/${osr.asset_id}`} className="font-medium text-blue-600 hover:underline">
                      {osr.asset_name}
                    </Link>
                  </div>
                  {osr.asset_warranty_status && (
                    <div>
                      <div className="text-sm text-gray-600">Warranty Status</div>
                      <div className="font-medium">{osr.asset_warranty_status === 'in_warranty' ? 'Under Warranty' : 'Out of Warranty'}</div>
                    </div>
                  )}
                  {osr.asset_contract_number && (
                    <div>
                      <div className="text-sm text-gray-600">AMC Contract</div>
                      <div className="font-medium">{osr.asset_contract_number}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resolution Notes */}
            {osr.resolution_notes && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Resolution Notes</h2>
                <p className="text-gray-900 whitespace-pre-wrap">{osr.resolution_notes}</p>
              </div>
            )}
          </div>

          {/* Right Column - Assignment & Timeline */}
          <div className="space-y-6">
            {/* Assignment */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment</h2>
              {osr.assigned_to_type ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-600">Assigned To</div>
                    <div className="font-medium capitalize">{osr.assigned_to_type}</div>
                  </div>
                  {osr.assigned_to_type === 'vendor' && osr.assigned_to_vendor_name && (
                    <div>
                      <div className="text-sm text-gray-600">Vendor</div>
                      <div className="font-medium">{osr.assigned_to_vendor_name}</div>
                    </div>
                  )}
                  {osr.assigned_to_type === 'internal' && osr.assigned_to_internal && (
                    <div>
                      <div className="text-sm text-gray-600">Team/Person</div>
                      <div className="font-medium">{osr.assigned_to_internal}</div>
                    </div>
                  )}
                  {osr.assigned_date && (
                    <div>
                      <div className="text-sm text-gray-600">Assigned On</div>
                      <div className="font-medium">{new Date(osr.assigned_date).toLocaleDateString()}</div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Not assigned yet</p>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                  <div>
                    <div className="font-medium text-sm">Created</div>
                    <div className="text-xs text-gray-500">{new Date(osr.created_at).toLocaleString()}</div>
                    <div className="text-xs text-gray-600 mt-1">By: {osr.created_by_name || 'Unknown'}</div>
                  </div>
                </div>
                {osr.assigned_date && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                    <div>
                      <div className="font-medium text-sm">Assigned</div>
                      <div className="text-xs text-gray-500">{new Date(osr.assigned_date).toLocaleString()}</div>
                    </div>
                  </div>
                )}
                {osr.closed_date && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                    <div>
                      <div className="font-medium text-sm">Closed</div>
                      <div className="text-xs text-gray-500">{new Date(osr.closed_date).toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Update Status</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select
                  value={statusUpdate.status}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="open">Open</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
                <textarea
                  value={statusUpdate.resolution_notes}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, resolution_notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  placeholder="Add notes about the resolution or progress..."
                />
              </div>

              {statusUpdate.status === 'completed' && osr.request_type === 'asset_related' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    ℹ️ Completing this request will automatically update the asset's last maintenance date.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default OSRDetail;
