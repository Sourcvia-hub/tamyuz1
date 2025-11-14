import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ResourceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    nationality: '',
    id_number: '',
    education_qualification: '',
    years_of_experience: 0,
    start_date: '',
    end_date: '',
    scope_of_work: '',
    has_relatives: false,
    relatives: [],
    access_development: false,
    access_production: false,
    access_uat: false,
  });

  const [currentRelative, setCurrentRelative] = useState({
    name: '',
    position: '',
    department: '',
    relation: '',
  });

  useEffect(() => {
    fetchResource();
  }, [id]);

  const fetchResource = async () => {
    try {
      const response = await axios.get(`${API}/resources/${id}`, { withCredentials: true });
      setResource(response.data);
      setEditFormData({
        name: response.data.name || '',
        nationality: response.data.nationality || '',
        id_number: response.data.id_number || '',
        education_qualification: response.data.education_qualification || '',
        years_of_experience: response.data.years_of_experience || 0,
        start_date: response.data.start_date ? new Date(response.data.start_date).toISOString().split('T')[0] : '',
        end_date: response.data.end_date ? new Date(response.data.end_date).toISOString().split('T')[0] : '',
        scope_of_work: response.data.scope_of_work || '',
        has_relatives: response.data.has_relatives || false,
        relatives: response.data.relatives || [],
        access_development: response.data.access_development || false,
        access_production: response.data.access_production || false,
        access_uat: response.data.access_uat || false,
      });
    } catch (error) {
      console.error('Error fetching resource:', error);
      alert('Resource not found');
      navigate('/resources');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateResource = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/resources/${id}`, editFormData, { withCredentials: true });
      alert('Resource updated successfully');
      setIsEditing(false);
      fetchResource();
    } catch (error) {
      console.error('Error updating resource:', error);
      alert('Failed to update resource: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleTerminate = async () => {
    if (!window.confirm('Are you sure you want to terminate this resource?')) {
      return;
    }

    try {
      await axios.post(`${API}/resources/${id}/terminate`, {}, { withCredentials: true });
      alert('Resource terminated successfully');
      fetchResource();
    } catch (error) {
      console.error('Error terminating resource:', error);
      alert('Failed to terminate resource');
    }
  };

  const handleAddRelative = () => {
    if (!currentRelative.name || !currentRelative.relation) {
      alert('Please fill in relative name and relation');
      return;
    }

    setEditFormData({
      ...editFormData,
      relatives: [...editFormData.relatives, currentRelative]
    });

    setCurrentRelative({
      name: '',
      position: '',
      department: '',
      relation: '',
    });
  };

  const handleRemoveRelative = (index) => {
    const newRelatives = editFormData.relatives.filter((_, i) => i !== index);
    setEditFormData({ ...editFormData, relatives: newRelatives });
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      terminated: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <button
            onClick={() => navigate('/resources')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Resources
          </button>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Edit Resource
                </button>
                {resource.status === 'active' && (
                  <button
                    onClick={handleTerminate}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Terminate
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Resource</h2>
            <form onSubmit={handleUpdateResource} className="space-y-6">
              {/* Personal Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nationality *</label>
                  <input
                    type="text"
                    value={editFormData.nationality}
                    onChange={(e) => setEditFormData({ ...editFormData, nationality: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ID Number *</label>
                  <input
                    type="text"
                    value={editFormData.id_number}
                    onChange={(e) => setEditFormData({ ...editFormData, id_number: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Education & Qualification *</label>
                  <input
                    type="text"
                    value={editFormData.education_qualification}
                    onChange={(e) => setEditFormData({ ...editFormData, education_qualification: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience *</label>
                  <input
                    type="number"
                    value={editFormData.years_of_experience}
                    onChange={(e) => setEditFormData({ ...editFormData, years_of_experience: parseFloat(e.target.value) })}
                    required
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Scope of Work */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scope of Work *</label>
                <textarea
                  value={editFormData.scope_of_work}
                  onChange={(e) => setEditFormData({ ...editFormData, scope_of_work: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Access Rights */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Requested Access</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={editFormData.access_development}
                      onChange={(e) => setEditFormData({ ...editFormData, access_development: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-gray-700">Development</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={editFormData.access_production}
                      onChange={(e) => setEditFormData({ ...editFormData, access_production: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-gray-700">Production</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={editFormData.access_uat}
                      onChange={(e) => setEditFormData({ ...editFormData, access_uat: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-gray-700">UAT</span>
                  </label>
                </div>
              </div>

              {/* Relatives */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Relatives Declaration</h3>
                <label className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    checked={editFormData.has_relatives}
                    onChange={(e) => setEditFormData({ ...editFormData, has_relatives: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-gray-700">Do any of your relatives work for Tamyuz Group?</span>
                </label>

                {editFormData.has_relatives && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                      <input
                        type="text"
                        placeholder="Name"
                        value={currentRelative.name}
                        onChange={(e) => setCurrentRelative({ ...currentRelative, name: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Position"
                        value={currentRelative.position}
                        onChange={(e) => setCurrentRelative({ ...currentRelative, position: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Department"
                        value={currentRelative.department}
                        onChange={(e) => setCurrentRelative({ ...currentRelative, department: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Relation"
                          value={currentRelative.relation}
                          onChange={(e) => setCurrentRelative({ ...currentRelative, relation: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={handleAddRelative}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {editFormData.relatives.length > 0 && (
                      <div className="space-y-2">
                        {editFormData.relatives.map((relative, index) => (
                          <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                            <div>
                              <p className="font-medium">{relative.name} - {relative.relation}</p>
                              <p className="text-sm text-gray-600">{relative.position} at {relative.department}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveRelative(index)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </form>
          </div>
        )}

        {/* View Mode */}
        {!isEditing && (
          <>
            {/* Main Resource Info */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{resource.name}</h1>
                  <p className="text-gray-600 mt-1">Resource #{resource.resource_number}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusBadgeColor(resource.status)}`}>
                  {resource.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Information</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Nationality</p>
                      <p className="text-gray-900 font-medium">{resource.nationality}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">ID Number</p>
                      <p className="text-gray-900 font-medium">{resource.id_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Education & Qualification</p>
                      <p className="text-gray-900 font-medium">{resource.education_qualification}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Years of Experience</p>
                      <p className="text-gray-900 font-medium">{resource.years_of_experience} years</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Work Type</p>
                      <p className="text-gray-900 font-medium">
                        {resource.work_type === 'offshore' ? '🌍 Offshore' : '🏢 On Premises'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contract & Vendor</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Vendor</p>
                      <p className="text-gray-900 font-medium">{resource.vendor_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Contract</p>
                      <p className="text-gray-900 font-medium">{resource.contract_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Contract Scope</p>
                      <p className="text-gray-900">{resource.scope}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">SLA</p>
                      <p className="text-gray-900">{resource.sla}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Duration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="text-gray-900 font-medium">{new Date(resource.start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">End Date</p>
                  <p className="text-gray-900 font-medium">{new Date(resource.end_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Access & Scope */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Access & Scope</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Requested Access</p>
                  <div className="flex gap-2">
                    {resource.access_development && <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">Development</span>}
                    {resource.access_production && <span className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm">Production</span>}
                    {resource.access_uat && <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm">UAT</span>}
                    {!resource.access_development && !resource.access_production && !resource.access_uat && (
                      <span className="text-gray-500 text-sm">No access requested</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Scope of Work</p>
                  <p className="text-gray-900 mt-1">{resource.scope_of_work}</p>
                </div>
              </div>
            </div>

            {/* Relatives Declaration */}
            {resource.has_relatives && resource.relatives && resource.relatives.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Relatives Declaration</h3>
                <div className="space-y-3">
                  {resource.relatives.map((relative, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                      <p className="font-medium text-gray-900">{relative.name}</p>
                      <p className="text-sm text-gray-600">{relative.position} - {relative.department}</p>
                      <p className="text-sm text-blue-600">Relation: {relative.relation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default ResourceDetail;
