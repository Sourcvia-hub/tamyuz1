import React, { useState, useEffect } from 'react';

const DueDiligenceQuestionnaire = ({ vendor, formData: externalFormData, setFormData: externalSetFormData, onClose, onSubmit }) => {
  const [internalFormData, setInternalFormData] = useState({});
  const [activeSection, setActiveSection] = useState(0);

  // Use external formData if provided (vendor creation), otherwise use internal state (vendor detail)
  const isCreationMode = !!externalFormData && !!externalSetFormData;
  const formData = isCreationMode ? externalFormData : internalFormData;
  const setFormData = isCreationMode ? externalSetFormData : setInternalFormData;

  useEffect(() => {
    // Initialize form data with vendor's existing DD data (only in detail mode)
    if (!isCreationMode && vendor) {
      const initialData = {};
      Object.keys(vendor).forEach(key => {
        if (key.startsWith('dd_')) {
          initialData[key] = vendor[key];
        }
      });
      setInternalFormData(initialData);
    }
  }, [vendor, isCreationMode]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const sections = [
    { id: 'ownership', title: 'Ownership Structure / General', icon: '🏢' },
    { id: 'business_continuity', title: 'Business Continuity', icon: '🔄' },
    { id: 'anti_fraud', title: 'Anti-Fraud', icon: '🛡️' },
    { id: 'operational', title: 'Operational Risks', icon: '⚙️' },
    { id: 'cyber', title: 'Cyber Security', icon: '🔒' },
    { id: 'safety', title: 'Safety and Security', icon: '🚨' },
    { id: 'hr', title: 'Human Resources', icon: '👥' },
    { id: 'legal', title: 'Judicial / Legal', icon: '⚖️' },
    { id: 'regulatory', title: 'Regulatory Authorities', icon: '📜' },
    { id: 'coi', title: 'Conflict of Interest', icon: '⚠️' },
    { id: 'data', title: 'Data Management', icon: '💾' },
    { id: 'fcp', title: 'Financial Consumer Protection', icon: '💰' },
    { id: 'additional', title: 'Additional Details', icon: '📝' },
    { id: 'checklist', title: 'Final Checklist', icon: '✅' }
  ];

  const YesNoQuestion = ({ label, field, required = false }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <div className="flex gap-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            checked={formData[field] === true}
            onChange={() => handleChange(field, true)}
            className="mr-2 w-4 h-4"
          />
          <span className="text-sm">Yes</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            checked={formData[field] === false}
            onChange={() => handleChange(field, false)}
            className="mr-2 w-4 h-4"
          />
          <span className="text-sm">No</span>
        </label>
      </div>
    </div>
  );

  const TextQuestion = ({ label, field, rows = 1 }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      {rows > 1 ? (
        <textarea
          value={formData[field] || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          rows={rows}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      ) : (
        <input
          type="text"
          value={formData[field] || ''}
          onChange={(e) => handleChange(field, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      )}
    </div>
  );

  const renderSection = () => {
    switch(activeSection) {
      case 0: // Ownership Structure
        return (
          <div className="space-y-4">
            <YesNoQuestion 
              label="1. In the last 12 months, has there been any change in ownership or control of your organization?"
              field="dd_ownership_change_last_year"
            />
            <YesNoQuestion 
              label="2. Has your organization's location moved or closed within the last 12 months?"
              field="dd_location_moved_or_closed"
            />
            <YesNoQuestion 
              label="3. Has your organization opened any new branches within the last 12 months?"
              field="dd_new_branches_opened"
            />
            <YesNoQuestion 
              label="4. Does your organization have any default on its financial obligations?"
              field="dd_financial_obligations_default"
            />
            <YesNoQuestion 
              label="5. Does your organization or any of its stakeholders hold shareholding in the Bank?"
              field="dd_shareholding_in_bank"
            />
          </div>
        );

      case 1: // Business Continuity
        return (
          <div className="space-y-4">
            <YesNoQuestion 
              label="1. Does your organization rely on any third parties (outsourcing) for the provision of the services to the bank?"
              field="dd_bc_rely_on_third_parties"
            />
            <YesNoQuestion 
              label="2. Does your organization intend to further outsource its operations or relevant aspects of the service to be provided to the Bank?"
              field="dd_bc_intend_to_outsource"
            />
            <YesNoQuestion 
              label="3. Has your organization's business operations been stopped or disrupted for over a week within the past three years?"
              field="dd_bc_business_stopped_over_week"
            />
            <YesNoQuestion 
              label="4. Does your organization have alternative locations it can operate from if your site cannot operate?"
              field="dd_bc_alternative_locations"
            />
            <TextQuestion 
              label="5. How frequently does your organization conduct site readiness tests? Please specify"
              field="dd_bc_site_readiness_test_frequency"
            />
            <YesNoQuestion 
              label="6. Is your organization certified with BCM (Business Continuity Management) standard?"
              field="dd_bc_certified_standard"
            />
            <YesNoQuestion 
              label="7. Does your organization have assigned staff with responsibility for business continuity?"
              field="dd_bc_staff_assigned"
            />
            <YesNoQuestion 
              label="8. Has your organization assessed what it considers to be risks to the normal functioning of your organization?"
              field="dd_bc_risks_assessed"
            />
            <YesNoQuestion 
              label="9. Has your organization identified and documented realistic threats which have the potential to impact your organization?"
              field="dd_bc_threats_identified"
            />
            <YesNoQuestion 
              label="10. Has your organization identified the business critical activities essential to meeting your legal and contractual obligations?"
              field="dd_bc_essential_activities_identified"
            />
            <YesNoQuestion 
              label="11. Does your organization have a business continuity strategy, and plans for its management?"
              field="dd_bc_strategy_exists"
            />
            <YesNoQuestion 
              label="12. Has your organization engaged with the local emergency responders to inform them of your needs?"
              field="dd_bc_emergency_responders_engaged"
            />
            <YesNoQuestion 
              label="13. Are your business continuity arrangements regularly updated and validated through continuous testing and maintenance?"
              field="dd_bc_arrangements_updated"
            />
            <YesNoQuestion 
              label="14. Has your organization created a documented strategy which sets out how you will implement business continuity?"
              field="dd_bc_documented_strategy"
            />
            <YesNoQuestion 
              label="15. Can your organization provide information about the type of exercises undertaken and their frequency?"
              field="dd_bc_can_provide_exercise_info"
            />
            <YesNoQuestion 
              label="16. Are the results of business continuity exercises used to enhance your strategy?"
              field="dd_bc_exercise_results_used"
            />
            <YesNoQuestion 
              label="17. Has your management team been trained in business continuity?"
              field="dd_bc_management_trained"
            />
            <YesNoQuestion 
              label="18. Are staff aware of their role to play and the actions they need to take when business continuity incidents arise?"
              field="dd_bc_staff_aware"
            />
            <YesNoQuestion 
              label="19. Does your organization have a business continuity plan that covers your IT systems?"
              field="dd_bc_it_continuity_plan"
            />
            <YesNoQuestion 
              label="20. Is critical data backed up and stored in one or more separate locations?"
              field="dd_bc_critical_data_backed_up"
            />
            <YesNoQuestion 
              label="21. Are copies of vital records and documents routinely stored in secure off-site facilities?"
              field="dd_bc_vital_documents_offsite"
            />
            <YesNoQuestion 
              label="22. Has your organization identified your critical suppliers and key contacts?"
              field="dd_bc_critical_suppliers_identified"
            />
            <YesNoQuestion 
              label="23. Have your critical suppliers been consulted regarding their business continuity arrangements?"
              field="dd_bc_suppliers_consulted"
            />
            <YesNoQuestion 
              label="24. Does your organization have a formal method for communicating with staff, stakeholders and the media during a business continuity incident?"
              field="dd_bc_communication_method"
            />
            <YesNoQuestion 
              label="25. Does your organization have the capability to manage public relations in the event of a serious incident?"
              field="dd_bc_public_relations_capability"
            />
          </div>
        );

      case 2: // Anti-Fraud
        return (
          <div className="space-y-4">
            <YesNoQuestion 
              label="1. Does your organization have a whistle blowing mechanism to report fraud or any unethical activity?"
              field="dd_fraud_whistle_blowing_mechanism"
            />
            <YesNoQuestion 
              label="2. Does your organization have the prevention and detection procedures for different types of fraud?"
              field="dd_fraud_prevention_procedures"
            />
            <YesNoQuestion 
              label="3. Has there been a reported internal fraud incident within the last 12 months?"
              field="dd_fraud_internal_last_year"
            />
            <YesNoQuestion 
              label="4. Has your organization suffered from a burglary or theft within the last 12 months?"
              field="dd_fraud_burglary_theft_last_year"
            />
          </div>
        );

      case 3: // Operational Risks
        return (
          <div className="space-y-4">
            <YesNoQuestion 
              label="1. Has your organization been involved in any criminal cases within the last 3 years?"
              field="dd_op_criminal_cases_last_3years"
            />
            <YesNoQuestion 
              label="2. Has your organization encountered any bankruptcy, financial rescue or equivalent issues within the last 3 years?"
              field="dd_op_financial_issues_last_3years"
            />
            <YesNoQuestion 
              label="3. Does your organization have documented procedures for operations relating to the bank?"
              field="dd_op_documented_procedures"
            />
            <YesNoQuestion 
              label="4. Does your organization have an internal audit function or engage an external function for this purpose?"
              field="dd_op_internal_audit"
            />
            <YesNoQuestion 
              label="5. Does your organization require a specific license for the provision of the services to the bank?"
              field="dd_op_specific_license_required"
            />
            <YesNoQuestion 
              label="6. Will your organization provide the services/activity related to the Bank in a location outside the KSA?"
              field="dd_op_services_outside_ksa"
            />
            <YesNoQuestion 
              label="7. Does your organization have conflict of interest policy covering all aspects of your business?"
              field="dd_op_conflict_of_interest_policy"
            />
            <YesNoQuestion 
              label="8. Does your organization have procedures to ensure the right handling of customer complaints?"
              field="dd_op_complaint_handling_procedures"
            />
            <YesNoQuestion 
              label="9. Has your organization received any customer complaints within the last 12 months?"
              field="dd_op_customer_complaints_last_year"
            />
            <YesNoQuestion 
              label="10. Does your organization maintain insurance contracts (which may mitigate operational, professional liability or other risks)?"
              field="dd_op_insurance_contracts"
            />
          </div>
        );

      case 4: // Cyber Security
        return (
          <div className="space-y-4">
            <YesNoQuestion 
              label="1. Does your organization use cloud services?"
              field="dd_cyber_cloud_services"
            />
            <YesNoQuestion 
              label="2. Does your organization have any data stored outside the KSA?"
              field="dd_cyber_data_outside_ksa"
            />
            <YesNoQuestion 
              label="3. Does your organization allow remote access to your organization's network from outside the KSA?"
              field="dd_cyber_remote_access_outside_ksa"
            />
            <YesNoQuestion 
              label="4. Does your organization use digital channels (Mobile app, website, or others)?"
              field="dd_cyber_digital_channels"
            />
            <YesNoQuestion 
              label="5. Does your organization accept card payments?"
              field="dd_cyber_card_payments"
            />
            <YesNoQuestion 
              label="6. Do third parties have access to your organization's information and systems?"
              field="dd_cyber_third_party_access"
            />
          </div>
        );

      case 5: // Safety and Security
        return (
          <div className="space-y-4">
            <YesNoQuestion 
              label="1. Does your organization have procedures for handling incidents/accidents?"
              field="dd_safety_procedures_exist"
            />
            <YesNoQuestion 
              label="2. Does your organization have a 24/7 security?"
              field="dd_safety_security_24_7"
            />
            <YesNoQuestion 
              label="3. Does your organization have security equipment (such as CCTV, sensors, etc.)?"
              field="dd_safety_security_equipment"
            />
            <YesNoQuestion 
              label="4. Does your organization have safety equipment (such as fire extinguishers, first aid kits, etc.)?"
              field="dd_safety_equipment"
            />
          </div>
        );

      case 6: // Human Resources
        return (
          <div className="space-y-4">
            <YesNoQuestion 
              label="1. Does your organization have a Saudization (localization) policy?"
              field="dd_hr_localization_policy"
            />
            <YesNoQuestion 
              label="2. Does your organization have clear hiring standards (both for technical and behavioral capabilities)?"
              field="dd_hr_hiring_standards"
            />
            <YesNoQuestion 
              label="3. Does your organization conduct background investigation on all your employees?"
              field="dd_hr_background_investigation"
            />
            <YesNoQuestion 
              label="4. Does your organization verify the academic degrees of your employees?"
              field="dd_hr_academic_verification"
            />
          </div>
        );

      case 7: // Judicial / Legal
        return (
          <div className="space-y-4">
            <YesNoQuestion 
              label="1. Does your organization have formal representation with court or regulatory authorities?"
              field="dd_legal_formal_representation"
            />
          </div>
        );

      case 8: // Regulatory Authorities
        return (
          <div className="space-y-4">
            <YesNoQuestion 
              label="1. Is your organization regulated by an authority?"
              field="dd_reg_regulated_by_authority"
            />
            <YesNoQuestion 
              label="2. Has your organization been audited by an independent audit firm?"
              field="dd_reg_audited_by_independent"
            />
          </div>
        );

      case 9: // Conflict of Interest
        return (
          <div className="space-y-4">
            <YesNoQuestion 
              label="1. Does your organization or any of its senior management have any relationship with the Bank's employees or senior management?"
              field="dd_coi_relationship_with_bank"
            />
          </div>
        );

      case 10: // Data Management
        return (
          <div className="space-y-4">
            <YesNoQuestion 
              label="1. Does your organization have a customer data management and privacy policy?"
              field="dd_data_customer_data_policy"
            />
          </div>
        );

      case 11: // Financial Consumer Protection
        return (
          <div className="space-y-4">
            <YesNoQuestion 
              label="1. Have you read and understood the 'Protection of Financial Consumer Regulation' issued by SAMA?"
              field="dd_fcp_read_and_understood"
            />
            <YesNoQuestion 
              label="2. Will your organization comply with the 'Protection of Financial Consumer Regulation'?"
              field="dd_fcp_will_comply"
            />
          </div>
        );

      case 12: // Additional Details
        return (
          <div className="space-y-4">
            <TextQuestion 
              label="Please provide any additional information that you believe is relevant to this assessment"
              field="dd_additional_details"
              rows={6}
            />
          </div>
        );

      case 13: // Final Checklist - Removed (now part of vendor creation)
        return (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-300">
              <h3 className="text-lg font-bold text-blue-900 mb-4">✅ Due Diligence Complete</h3>
              <p className="text-sm text-gray-700 mb-4">
                The verification checklist items (Supporting Documents, Related Party Check, and Sanction Screening) 
                were completed during vendor registration. Please review all responses and submit the questionnaire.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const progress = ((activeSection + 1) / sections.length) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Due Diligence Questionnaire</h2>
              {vendor && (
                <p className="text-sm text-gray-600 mt-1">Vendor: {vendor.name_english || vendor.commercial_name}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Section {activeSection + 1} of {sections.length}</span>
              <span>{progress.toFixed(0)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sections.map((section, idx) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeSection === idx
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="text-3xl">{sections[activeSection].icon}</span>
            {sections[activeSection].title}
          </h3>
          {renderSection()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between">
            <button
              onClick={() => setActiveSection(prev => Math.max(0, prev - 1))}
              disabled={activeSection === 0}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex gap-3">
              {activeSection === sections.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  className="px-8 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                >
                  Submit Questionnaire
                </button>
              ) : (
                <button
                  onClick={() => setActiveSection(prev => Math.min(sections.length - 1, prev + 1))}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DueDiligenceQuestionnaire;
