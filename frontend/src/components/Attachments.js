import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Attachments = ({ 
  entityType, // 'vendor', 'contract', 'purchase_order', 'tender', 'deliverable', 'asset', 'resource'
  entityId,
  attachments = [],
  onUploadSuccess,
  canUpload = true,
  title = "Attachments"
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    
    try {
      const response = await axios.post(
        `${API}/upload/${entityType}/${entityId}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true
        }
      );
      
      if (onUploadSuccess) {
        onUploadSuccess(response.data.files);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file(s). Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e) => {
    handleFileUpload(e.target.files);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase() || '';
    const icons = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      xls: '📊',
      xlsx: '📊',
      ppt: '📽️',
      pptx: '📽️',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      zip: '📦',
      rar: '📦',
      txt: '📃',
      csv: '📊',
    };
    return icons[ext] || '📎';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = async (attachment) => {
    try {
      const response = await axios.get(
        `${API}/download/${entityType}/${entityId}/${attachment.stored_filename}`,
        {
          responseType: 'blob',
          withCredentials: true
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          📎 {title}
          {attachments.length > 0 && (
            <span className="bg-blue-100 text-blue-800 text-sm px-2 py-0.5 rounded-full">
              {attachments.length}
            </span>
          )}
        </h3>
      </div>

      {/* Upload Area */}
      {canUpload && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 mb-4 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            onChange={handleInputChange}
            className="hidden"
            id={`file-upload-${entityType}-${entityId}`}
            disabled={uploading}
          />
          <label
            htmlFor={`file-upload-${entityType}-${entityId}`}
            className="cursor-pointer"
          >
            {uploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-gray-600">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-3xl mb-2">📤</span>
                <p className="text-gray-600">
                  <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  PDF, DOC, XLS, Images up to 10MB
                </p>
              </div>
            )}
          </label>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-2 block">📂</span>
          <p>No attachments yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl">{getFileIcon(attachment.filename)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate" title={attachment.filename}>
                    {attachment.filename}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(attachment.size)} • {formatDate(attachment.uploaded_at)}
                    {attachment.file_type && (
                      <span className="ml-2 px-2 py-0.5 bg-gray-200 rounded text-xs">
                        {attachment.file_type.replace(/_/g, ' ')}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDownload(attachment)}
                className="px-3 py-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
              >
                ⬇️ Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Attachments;
