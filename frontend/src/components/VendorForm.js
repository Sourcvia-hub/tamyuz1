import React, { useState } from 'react';
import VendorDocumentExtractor from './VendorDocumentExtractor';

const VendorForm = ({ formData, setFormData, onSubmit, onCancel, isEdit = false, vendorId = null }) => {
  const [pendingFiles, setPendingFiles] = useState([]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Helper to show extraction status indicator
  const getFieldStatus = (fieldName) => {
    const status = formData._extraction_status?.[fieldName];
    if (!status) return null;
    
    const icons = {
      'Extracted': { icon: '✅', color: 'text-green-500', title: 'Extracted from document' },
      'Inferred': { icon: '🔍', color: 'text-yellow-500', title: 'Inferred - please verify' },
      'Not Provided': { icon: '❓', color: 'text-gray-400', title: 'Not found in document' },
    };
    
    const statusInfo = icons[status] || icons['Extracted'];
    return (
      <span className={`ml-2 ${statusInfo.color}`} title={statusInfo.title}>
        {statusInfo.icon}
      </span>
    );
  };

  // Handle file selection for pending upload
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setPendingFiles([...pendingFiles, ...files]);
      // Store in formData for submission
      setFormData({ 
        ...formData, 
        _pending_files: [...(formData._pending_files || []), ...files] 
      });
    }
    e.target.value = ''; // Clear input
  };

  const removeFile = (index) => {
    const newFiles = pendingFiles.filter((_, i) => i !== index);
    setPendingFiles(newFiles);
    setFormData({ ...formData, _pending_files: newFiles });
  };

  const entityTypes = ['Company', 'Individual', 'Partnership', 'LLC', 'Branch'];
  const idTypes = ['National ID', 'Iqama', 'Passport', 'GCC ID'];
  const currencies = ['SAR', 'USD', 'EUR', 'GBP', 'AED'];

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-2">
      {/* AI Document Extractor - At the top for easy form filling */}
      {!isEdit && (
        <VendorDocumentExtractor 
          formData={formData} 
          setFormData={setFormData} 
        />
      )}

      {/* Company Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 sticky top-0 bg-white py-2">Company Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Type </label>
            <select name="vendor_type" value={formData.vendor_type || 'local'} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="local">Local</option>
              <option value="international">International</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name in English {getFieldStatus('name_english')}
            </label>
            <input type="text" name="name_english" value={formData.name_english} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commercial Name {getFieldStatus('commercial_name')}
            </label>
            <input type="text" name="commercial_name" value={formData.commercial_name} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Type {getFieldStatus('entity_type')}
            </label>
            <select name="entity_type" value={formData.entity_type} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Choose an item</option>
              {entityTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VAT Registration Number {getFieldStatus('vat_number')}
            </label>
            <input type="text" name="vat_number" value={formData.vat_number} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unified Number (Saudi Entities) {getFieldStatus('unified_number')}
            </label>
            <input type="text" name="unified_number" value={formData.unified_number} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CR Number {getFieldStatus('cr_number')}
            </label>
            <input type="text" name="cr_number" value={formData.cr_number} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CR Expiry Date {getFieldStatus('cr_expiry_date')}
            </label>
            <input type="date" name="cr_expiry_date" value={formData.cr_expiry_date} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CR Country / City {getFieldStatus('cr_country_city')}
            </label>
            <input type="text" name="cr_country_city" value={formData.cr_country_city} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              License Number {getFieldStatus('license_number')}
            </label>
            <input type="text" name="license_number" value={formData.license_number} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              License Expiry Date {getFieldStatus('license_expiry_date')}
            </label>
            <input type="date" name="license_expiry_date" value={formData.license_expiry_date} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Activity Description {getFieldStatus('activity_description')}
            </label>
            <textarea name="activity_description" value={formData.activity_description} onChange={handleChange} rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Employees {getFieldStatus('number_of_employees')}
            </label>
            <input type="number" name="number_of_employees" value={formData.number_of_employees} onChange={handleChange} min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>
      </div>

      {/* Address and Contact Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 sticky top-0 bg-white py-2">Address and Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street {getFieldStatus('street')}
            </label>
            <input type="text" name="street" value={formData.street} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building No. {getFieldStatus('building_no')}
            </label>
            <input type="text" name="building_no" value={formData.building_no} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City {getFieldStatus('city')}
            </label>
            <input type="text" name="city" value={formData.city} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              District {getFieldStatus('district')}
            </label>
            <input type="text" name="district" value={formData.district} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country {getFieldStatus('country')}
            </label>
            <input type="text" name="country" value={formData.country} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mobile {getFieldStatus('mobile')}
            </label>
            <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Landline {getFieldStatus('landline')}
            </label>
            <input type="tel" name="landline" value={formData.landline} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fax {getFieldStatus('fax')}
            </label>
            <input type="text" name="fax" value={formData.fax} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address {getFieldStatus('email')}
            </label>
            <input type="email" name="email" value={formData.email} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>
      </div>

      {/* Representative Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 sticky top-0 bg-white py-2">Representative Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name {getFieldStatus('representative_name')}
            </label>
            <input type="text" name="representative_name" value={formData.representative_name} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Designation {getFieldStatus('representative_designation')}
            </label>
            <input type="text" name="representative_designation" value={formData.representative_designation} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID Document Type {getFieldStatus('representative_id_type')}
            </label>
            <select name="representative_id_type" value={formData.representative_id_type} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Choose an item</option>
              {idTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID Document Number {getFieldStatus('representative_id_number')}
            </label>
            <input type="text" name="representative_id_number" value={formData.representative_id_number} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nationality {getFieldStatus('representative_nationality')}
            </label>
            <input type="text" name="representative_nationality" value={formData.representative_nationality} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mobile Number {getFieldStatus('representative_mobile')}
            </label>
            <input type="tel" name="representative_mobile" value={formData.representative_mobile} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Residence Tel</label>
            <input type="tel" name="representative_residence_tel" value={formData.representative_residence_tel} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Area Code</label>
            <input type="text" name="representative_phone_area_code" value={formData.representative_phone_area_code} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email {getFieldStatus('representative_email')}
            </label>
            <input type="email" name="representative_email" value={formData.representative_email} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>
      </div>

      {/* Bank Account Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 sticky top-0 bg-white py-2">Bank Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Name {getFieldStatus('bank_account_name')}
            </label>
            <input type="text" name="bank_account_name" value={formData.bank_account_name} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bank Name {getFieldStatus('bank_name')}
            </label>
            <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch {getFieldStatus('bank_branch')}
            </label>
            <input type="text" name="bank_branch" value={formData.bank_branch} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country {getFieldStatus('bank_country')}
            </label>
            <input type="text" name="bank_country" value={formData.bank_country} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IBAN No {getFieldStatus('iban')}
            </label>
            <input type="text" name="iban" value={formData.iban} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency {getFieldStatus('currency')}
            </label>
            <select name="currency" value={formData.currency} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Choose a currency</option>
              {currencies.map(curr => <option key={curr} value={curr}>{curr}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SWIFT Code {getFieldStatus('swift_code')}
            </label>
            <input type="text" name="swift_code" value={formData.swift_code} onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>
      </div>

      {/* Supporting Documents */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 sticky top-0 bg-white py-2">Supporting Documents</h3>
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📎 Attach Supporting Documents (PDF, DOCX, XLSX, Images)
            </label>
            
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                <span>📁</span>
                <span>Choose Files</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Show pending files */}
          {pendingFiles.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-xs font-medium text-gray-600">Files to upload:</p>
              {pendingFiles.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-blue-600">📄</span>
                    <span className="text-sm text-gray-700 truncate">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-2">
                Files will be uploaded when you create the vendor.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex space-x-4 pt-4 sticky bottom-0 bg-white border-t pb-2">
        <button type="button" onClick={onCancel}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="submit"
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
          {isEdit ? 'Update Vendor' : 'Create Vendor'}
        </button>
      </div>
    </form>
  );
};

export default VendorForm;
