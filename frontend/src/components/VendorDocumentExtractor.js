import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VendorDocumentExtractor = ({ formData, setFormData }) => {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractionStatus, setExtractionStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF and Word documents are allowed');
      return;
    }

    setUploadedFile(file);
    setError(null);
    setExtractionStatus(null);
  };

  const handleExtractAndFill = async () => {
    if (!uploadedFile) {
      setError('Please select a file first');
      return;
    }

    setExtracting(true);
    setError(null);
    setExtractionStatus({ stage: 'uploading', message: 'Uploading document...' });

    try {
      // Upload file and extract data
      const formDataUpload = new FormData();
      formDataUpload.append('file', uploadedFile);

      setExtractionStatus({ stage: 'extracting', message: 'AI is analyzing the document...' });

      const response = await axios.post(
        `${API}/vendor-dd/extract-from-document`,
        formDataUpload,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      const extractedData = response.data;
      setExtractionStatus({ stage: 'complete', message: 'Extraction complete!' });

      // Map extracted fields to form data
      const fieldMapping = {
        vendor_name_arabic: 'name_arabic',
        vendor_name_english: 'name_english',
        commercial_name: 'commercial_name',
        entity_type: 'entity_type',
        vat_number: 'vat_number',
        unified_number: 'unified_number',
        cr_number: 'cr_number',
        cr_expiry_date: 'cr_expiry_date',
        cr_country_city: 'cr_country_city',
        license_number: 'license_number',
        license_expiry_date: 'license_expiry_date',
        activity_description: 'activity_description',
        employees_total: 'number_of_employees',
        employees_saudi: 'number_of_employees_saudi',
        address_street: 'street',
        address_building: 'building_no',
        address_city: 'city',
        address_district: 'district',
        address_country: 'country',
        contact_mobile: 'mobile',
        contact_landline: 'landline',
        contact_fax: 'fax',
        contact_email: 'email',
        rep_name: 'representative_name',
        rep_designation: 'representative_designation',
        rep_id_type: 'representative_id_type',
        rep_id_number: 'representative_id_number',
        rep_nationality: 'representative_nationality',
        rep_mobile: 'representative_mobile',
        rep_email: 'representative_email',
        bank_account_name: 'bank_account_name',
        bank_name: 'bank_name',
        bank_branch: 'bank_branch',
        bank_country: 'bank_country',
        iban: 'iban',
        currency: 'currency',
        swift_code: 'swift_code',
        years_in_business: 'years_of_business',
        number_of_customers: 'number_of_customers',
        number_of_branches: 'number_of_branches',
      };

      // Update form data with extracted values
      const updatedFormData = { ...formData };
      const extractedFields = extractedData.extracted_fields || {};
      
      Object.entries(fieldMapping).forEach(([sourceKey, targetKey]) => {
        const extracted = extractedFields[sourceKey];
        if (extracted && extracted.value) {
          updatedFormData[targetKey] = extracted.value;
          // Store extraction status for UI display
          if (!updatedFormData._extraction_status) {
            updatedFormData._extraction_status = {};
          }
          updatedFormData._extraction_status[targetKey] = extracted.status || 'Extracted';
        }
      });

      // Store the uploaded document info
      updatedFormData._uploaded_document = {
        filename: uploadedFile.name,
        file_id: extractedData.file_id
      };

      setFormData(updatedFormData);

      // Show summary
      const filledCount = Object.keys(extractedFields).filter(k => extractedFields[k]?.value).length;
      setExtractionStatus({ 
        stage: 'complete', 
        message: `Successfully extracted ${filledCount} fields from document!`,
        details: extractedData
      });

    } catch (err) {
      console.error('Extraction error:', err);
      setError(err.response?.data?.detail || 'Failed to extract data from document. Please fill the form manually.');
      setExtractionStatus(null);
    } finally {
      setExtracting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Extracted': return '✅';
      case 'Inferred': return '🔍';
      case 'Not Provided': return '❓';
      default: return '📝';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Extracted': return 'text-green-600';
      case 'Inferred': return 'text-yellow-600';
      case 'Not Provided': return 'text-gray-400';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-200 shadow-lg mb-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="text-4xl">📄</div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900">
            AI Document Extractor
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload a vendor registration form (PDF/Word) and AI will automatically fill the fields for you
          </p>
        </div>
      </div>

      {/* File Upload Area */}
      <div className="mb-4">
        <div className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          uploadedFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
        }`}>
          <input
            type="file"
            accept=".pdf,.docx,.doc"
            onChange={handleFileUpload}
            disabled={extracting}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          {uploadedFile ? (
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl">📎</span>
              <div className="text-left">
                <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadedFile(null);
                  setExtractionStatus(null);
                }}
                className="ml-4 text-red-500 hover:text-red-700"
              >
                ✕ Remove
              </button>
            </div>
          ) : (
            <div>
              <span className="text-4xl mb-2 block">📤</span>
              <p className="text-gray-600">
                <span className="font-semibold text-purple-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-gray-500 mt-1">PDF or Word document</p>
            </div>
          )}
        </div>
      </div>

      {/* Extract Button */}
      {uploadedFile && !extractionStatus?.stage === 'complete' && (
        <button
          type="button"
          onClick={handleExtractAndFill}
          disabled={extracting}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
            extracting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg'
          }`}
        >
          {extracting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {extractionStatus?.message || 'Processing...'}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              🤖 Extract & Fill Form with AI
            </span>
          )}
        </button>
      )}

      {/* Extraction Status */}
      {extractionStatus && extractionStatus.stage === 'complete' && (
        <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">✅</span>
            <span className="font-semibold text-green-800">{extractionStatus.message}</span>
          </div>
          <p className="text-sm text-green-700">
            Review the filled fields below. Fields marked with 🔍 were inferred and may need verification.
          </p>
          
          {/* Re-extract button */}
          <button
            type="button"
            onClick={handleExtractAndFill}
            disabled={extracting}
            className="mt-3 px-4 py-2 bg-white border border-green-300 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50"
          >
            🔄 Re-extract from Document
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          <p className="text-sm text-red-700 flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            {error}
          </p>
        </div>
      )}

      {/* Extraction Legend */}
      {formData._extraction_status && Object.keys(formData._extraction_status).length > 0 && (
        <div className="mt-4 p-3 bg-white/70 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600 font-medium mb-2">Field Status Legend:</p>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className={getStatusColor('Extracted')}>{getStatusIcon('Extracted')}</span>
              Extracted
            </span>
            <span className="flex items-center gap-1">
              <span className={getStatusColor('Inferred')}>{getStatusIcon('Inferred')}</span>
              Inferred
            </span>
            <span className="flex items-center gap-1">
              <span className={getStatusColor('Not Provided')}>{getStatusIcon('Not Provided')}</span>
              Not Provided
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDocumentExtractor;
