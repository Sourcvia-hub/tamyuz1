import React, { useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../App';
import { useToast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BulkImport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeEntity, setActiveEntity] = useState('vendors');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [template, setTemplate] = useState(null);

  const entityTypes = [
    { id: 'vendors', label: 'Vendors', icon: '🏢', description: 'Import vendor master data' },
    { id: 'purchase_orders', label: 'Purchase Orders', icon: '📦', description: 'Import POs with items' },
    { id: 'invoices', label: 'Invoices', icon: '🧾', description: 'Import vendor invoices' },
    { id: 'contracts', label: 'Contracts', icon: '📄', description: 'Import contracts' },
  ];

  const fetchTemplate = async (entityType) => {
    try {
      const res = await axios.get(`${API}/bulk-import/templates/${entityType}`, { withCredentials: true });
      setTemplate(res.data);
    } catch (error) {
      console.error('Error fetching template:', error);
    }
  };

  const handleEntityChange = (entityType) => {
    setActiveEntity(entityType);
    setFile(null);
    setImportResult(null);
    setValidationResult(null);
    fetchTemplate(entityType);
  };

  React.useEffect(() => {
    fetchTemplate(activeEntity);
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({ title: '⚠️ Invalid File', description: 'Please select a CSV file', variant: 'warning' });
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
      setValidationResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(`${API}/bulk-import/templates/${activeEntity}/csv`, {
        withCredentials: true,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeEntity}_import_template.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ title: '✅ Downloaded', description: 'Template downloaded successfully' });
    } catch (error) {
      toast({ title: '❌ Error', description: 'Failed to download template', variant: 'destructive' });
    }
  };

  const handleValidate = async () => {
    if (!file) {
      toast({ title: '⚠️ No File', description: 'Please select a file first', variant: 'warning' });
      return;
    }

    setValidating(true);
    setValidationResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${API}/bulk-import/validate/${activeEntity}`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setValidationResult(res.data);
      
      if (res.data.invalid === 0) {
        toast({ title: '✅ Validation Passed', description: `All ${res.data.total_rows} rows are valid` });
      } else {
        toast({ title: '⚠️ Validation Issues', description: `${res.data.invalid} rows have errors`, variant: 'warning' });
      }
    } catch (error) {
      toast({ title: '❌ Error', description: error.response?.data?.detail || 'Validation failed', variant: 'destructive' });
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({ title: '⚠️ No File', description: 'Please select a file first', variant: 'warning' });
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = activeEntity === 'purchase_orders' ? 'purchase-orders' : activeEntity;
      const res = await axios.post(`${API}/bulk-import/${endpoint}`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setImportResult(res.data);
      
      if (res.data.successful > 0 || res.data.pos_created > 0) {
        toast({ 
          title: '✅ Import Complete', 
          description: `Successfully imported ${res.data.successful || res.data.pos_created} records` 
        });
      }
      if (res.data.failed > 0) {
        toast({ 
          title: '⚠️ Partial Import', 
          description: `${res.data.failed} records failed`, 
          variant: 'warning' 
        });
      }
    } catch (error) {
      toast({ title: '❌ Error', description: error.response?.data?.detail || 'Import failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Bulk Import</h1>
          <p className="text-gray-600">Import data from CSV files into the system</p>
        </div>

        {/* Entity Type Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {entityTypes.map(entity => (
            <button
              key={entity.id}
              onClick={() => handleEntityChange(entity.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                activeEntity === entity.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="text-2xl mb-2">{entity.icon}</div>
              <div className="font-semibold">{entity.label}</div>
              <div className="text-xs text-gray-500">{entity.description}</div>
            </button>
          ))}
        </div>

        {/* Template Info */}
        {template && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg">📋 Template Information</h3>
                <p className="text-gray-600 text-sm">Required fields are marked with *</p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                📥 Download Template
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {template.columns?.map(col => (
                <div key={col} className={`px-3 py-2 rounded-lg text-sm ${
                  template.required?.includes(col) 
                    ? 'bg-red-50 text-red-700 font-medium' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {col}{template.required?.includes(col) ? ' *' : ''}
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Sample Row:</p>
              <div className="text-xs font-mono overflow-x-auto">
                {Object.entries(template.sample_row || {}).map(([key, value], i) => (
                  <span key={key} className="inline-block mr-2">
                    <span className="text-gray-500">{key}:</span> {value}{i < Object.keys(template.sample_row).length - 1 ? ',' : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* File Upload */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4">📁 Upload File</h3>
          
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer"
            >
              <div className="text-4xl mb-4">📄</div>
              {file ? (
                <div>
                  <p className="font-semibold text-green-600">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Drop your CSV file here or click to browse</p>
                  <p className="text-sm text-gray-500">Only .csv files are supported</p>
                </div>
              )}
            </label>
          </div>

          {file && (
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleValidate}
                disabled={validating}
                className="flex-1 px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-300 font-medium"
              >
                {validating ? '⏳ Validating...' : '🔍 Validate First'}
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium"
              >
                {loading ? '⏳ Importing...' : '📤 Import Now'}
              </button>
            </div>
          )}
        </div>

        {/* Validation Results */}
        {validationResult && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="font-semibold text-lg mb-4">🔍 Validation Results</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600">Total Rows</p>
                <p className="text-2xl font-bold text-blue-700">{validationResult.total_rows}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600">Valid</p>
                <p className="text-2xl font-bold text-green-700">{validationResult.valid}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-sm text-red-600">Invalid</p>
                <p className="text-2xl font-bold text-red-700">{validationResult.invalid}</p>
              </div>
            </div>

            {validationResult.errors?.length > 0 && (
              <div className="border border-red-200 rounded-lg p-4">
                <p className="font-medium text-red-700 mb-2">Errors:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {validationResult.errors.map((err, i) => (
                    <div key={i} className="text-sm bg-red-50 p-2 rounded">
                      <span className="font-medium">Row {err.row}:</span> {err.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {validationResult.warnings?.length > 0 && (
              <div className="border border-yellow-200 rounded-lg p-4 mt-4">
                <p className="font-medium text-yellow-700 mb-2">Warnings:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {validationResult.warnings.map((warn, i) => (
                    <div key={i} className="text-sm bg-yellow-50 p-2 rounded">
                      <span className="font-medium">Row {warn.row}:</span> {warn.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Import Results */}
        {importResult && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-lg mb-4">📊 Import Results</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600">Total Rows</p>
                <p className="text-2xl font-bold text-blue-700">{importResult.total_rows || importResult.vendors_processed || 0}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600">Successful</p>
                <p className="text-2xl font-bold text-green-700">{importResult.successful || importResult.pos_created || 0}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-sm text-red-600">Failed</p>
                <p className="text-2xl font-bold text-red-700">{importResult.failed || 0}</p>
              </div>
            </div>

            {importResult.created_ids?.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <p className="font-medium text-green-700">✅ Created {importResult.created_ids.length} records</p>
              </div>
            )}

            {importResult.created_pos?.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <p className="font-medium text-green-700 mb-2">✅ Created Purchase Orders:</p>
                <div className="space-y-1">
                  {importResult.created_pos.map(po => (
                    <p key={po.po_id} className="text-sm">• {po.po_number}</p>
                  ))}
                </div>
              </div>
            )}

            {importResult.errors?.length > 0 && (
              <div className="border border-red-200 rounded-lg p-4">
                <p className="font-medium text-red-700 mb-2">Errors ({importResult.errors.length}):</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="text-sm bg-red-50 p-2 rounded">
                      <span className="font-medium">Row {err.row}:</span> {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BulkImport;
