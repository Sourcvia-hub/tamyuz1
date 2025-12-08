import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchResources } from './api';

const PfResourcesList = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      const data = await fetchResources();
      setResources(data);
    } catch (err) {
      console.error('Failed to load resources', err);
      setError('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceUpload = async (resourceId, event) => {
    event.stopPropagation(); // Prevent card click
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx?|xls)$/i)) {
      alert('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setUploading(prev => ({ ...prev, [resourceId]: true }));
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(
        `${window.location.origin}/api/procureflix/resources/${resourceId}/attendance-sheets`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include'
        }
      );

      if (response.ok) {
        alert('✅ Attendance sheet uploaded successfully!');
        // Reload resources to update count
        loadResources();
        event.target.value = ''; // Clear input
      } else {
        const error = await response.json();
        alert(`❌ Upload failed: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('❌ Failed to upload file');
    } finally {
      setUploading(prev => ({ ...prev, [resourceId]: false }));
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading resources...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Resources</h2>
          <p className="text-sm text-slate-500 mt-1">
            ProcureFlix resources linked to vendors and contracts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((resource) => (
          <div
            key={resource.id}
            className="rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(`/pf/resources/${resource.id}`)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900">{resource.name}</h3>
                <p className="text-sm text-slate-600">{resource.role}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                resource.status === 'active' 
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {resource.status}
              </span>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm mb-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Project:</span>
                <span className="text-slate-900">{resource.assigned_to_project || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Vendor:</span>
                <span className="text-slate-700 font-mono text-xs">{resource.vendor_id}</span>
              </div>
            </div>

            {/* Duration & Attendance Upload - Only for Active */}
            {resource.status === 'active' && (
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1">Attendance Period</p>
                    <p className="text-sm font-medium text-slate-900">
                      Current Month
                    </p>
                  </div>
                  
                  {/* Upload Button */}
                  <label 
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                      uploading[resource.id]
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {uploading[resource.id] ? (
                      <>
                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload
                      </>
                    )}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => handleAttendanceUpload(resource.id, e)}
                      disabled={uploading[resource.id]}
                      className="hidden"
                    />
                  </label>
                </div>
                
                {/* Attendance Count */}
                {resource.attendance_sheets && resource.attendance_sheets.length > 0 && (
                  <div className="mt-2 text-xs text-slate-500">
                    📄 {resource.attendance_sheets.length} sheet{resource.attendance_sheets.length !== 1 ? 's' : ''} uploaded
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {resources.length === 0 && (
          <div className="col-span-full text-center py-8 text-slate-500">
            No resources found
          </div>
        )}
      </div>
    </div>
  );
};

export default PfResourcesList;
