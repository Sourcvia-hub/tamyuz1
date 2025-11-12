import React from 'react';

const OutsourcingQuestionnaire = ({ formData, setFormData }) => {
  const handleCheckboxChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
        <h3 className="text-lg font-semibold text-purple-900 mb-2">📋 Outsourcing Assessment Questionnaire</h3>
        <p className="text-sm text-purple-700">All contracts must complete this assessment</p>
      </div>

      {/* Section A: Outsourcing Determination */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-4">Section A: Outsourcing Determination</h4>
        
        <div className="space-y-4">
          {/* A1 */}
          <div className="bg-white p-3 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              A1. Is the business function or activity to be performed by the third-party required on a continuing basis?
            </label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="a1_continuing"
                  checked={formData.a1_continuing_basis === true}
                  onChange={() => handleCheckboxChange('a1_continuing_basis', true)}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="a1_continuing"
                  checked={formData.a1_continuing_basis === false}
                  onChange={() => handleCheckboxChange('a1_continuing_basis', false)}
                  className="mr-2"
                />
                No
              </label>
            </div>
            {formData.a1_continuing_basis === true && (
              <input
                type="text"
                placeholder="Please specify the period"
                value={formData.a1_period || ''}
                onChange={(e) => setFormData({ ...formData, a1_period: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            )}
          </div>

          {/* A2 */}
          <div className="bg-white p-3 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              A2. Is the business function or activity to be performed by the third-party currently undertaken or could it be undertaken by the bank itself?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="a2"
                  checked={formData.a2_could_be_undertaken_by_bank === true}
                  onChange={() => handleCheckboxChange('a2_could_be_undertaken_by_bank', true)}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="a2"
                  checked={formData.a2_could_be_undertaken_by_bank === false}
                  onChange={() => handleCheckboxChange('a2_could_be_undertaken_by_bank', false)}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>

          {/* A3 */}
          <div className="bg-white p-3 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              A3. Can you conclude that the contract with the third-party will be considered as insourcing contract?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="a3"
                  checked={formData.a3_is_insourcing_contract === true}
                  onChange={() => handleCheckboxChange('a3_is_insourcing_contract', true)}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="a3"
                  checked={formData.a3_is_insourcing_contract === false}
                  onChange={() => handleCheckboxChange('a3_is_insourcing_contract', false)}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>

          {/* A4 */}
          <div className="bg-white p-3 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              A4. Can you conclude that the business functions or activities to be performed by the third-party fall under any of the services or activities mentioned below:
            </label>
            <div className="space-y-2 ml-4">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.a4_market_data_providers || false}
                  onChange={(e) => handleCheckboxChange('a4_market_data_providers', e.target.checked)}
                  className="mr-2 mt-1"
                />
                <span className="text-sm">Contractual arrangement with market information data providers (e.g., Bloomberg, Moody's, Standard & Poor's, Fitch)</span>
              </label>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.a4_clearing_settlement || false}
                  onChange={(e) => handleCheckboxChange('a4_clearing_settlement', e.target.checked)}
                  className="mr-2 mt-1"
                />
                <span className="text-sm">Clearing and settlement arrangements between clearing houses, central counterparties and settlement institutions</span>
              </label>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.a4_correspondent_banking || false}
                  onChange={(e) => handleCheckboxChange('a4_correspondent_banking', e.target.checked)}
                  className="mr-2 mt-1"
                />
                <span className="text-sm">Correspondent banking relationship arrangements</span>
              </label>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.a4_utilities || false}
                  onChange={(e) => handleCheckboxChange('a4_utilities', e.target.checked)}
                  className="mr-2 mt-1"
                />
                <span className="text-sm">Utilities services (e.g., electricity, gas, water, telephone line, rentals)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Section B: Materiality Determination */}
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h4 className="font-semibold text-green-900 mb-4">Section B: Materiality Determination</h4>
        
        <div className="space-y-4">
          {/* B1 */}
          <div className="bg-white p-3 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              B1. Does outsourcing the business function or activity have the potential, if disrupted, to have a material impact on the bank's business operations, risk management, or regulatory compliance?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="b1"
                  checked={formData.b1_material_impact_if_disrupted === true}
                  onChange={() => handleCheckboxChange('b1_material_impact_if_disrupted', true)}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="b1"
                  checked={formData.b1_material_impact_if_disrupted === false}
                  onChange={() => handleCheckboxChange('b1_material_impact_if_disrupted', false)}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>

          {/* B2 */}
          <div className="bg-white p-3 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              B2. Does outsourcing the business function or activity have a financial impact on the Bank?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="b2"
                  checked={formData.b2_financial_impact === true}
                  onChange={() => handleCheckboxChange('b2_financial_impact', true)}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="b2"
                  checked={formData.b2_financial_impact === false}
                  onChange={() => handleCheckboxChange('b2_financial_impact', false)}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>

          {/* B3 */}
          <div className="bg-white p-3 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              B3. Does outsourcing the business function or activity have a reputational impact on the Bank? (such as advertising, social media management)
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="b3"
                  checked={formData.b3_reputational_impact === true}
                  onChange={() => handleCheckboxChange('b3_reputational_impact', true)}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="b3"
                  checked={formData.b3_reputational_impact === false}
                  onChange={() => handleCheckboxChange('b3_reputational_impact', false)}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>

          {/* B4 */}
          <div className="bg-white p-3 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              B4. Is the third party service provider located in or operating from outside of KSA?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="b4"
                  checked={formData.b4_outside_ksa === true}
                  onChange={() => handleCheckboxChange('b4_outside_ksa', true)}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="b4"
                  checked={formData.b4_outside_ksa === false}
                  onChange={() => handleCheckboxChange('b4_outside_ksa', false)}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>

          {/* B5 */}
          <div className="bg-white p-3 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              B5. Will it be difficult, including the time taken, in finding an alternative third party service provider, or bringing the business function or activity in house, in case the outsourced party fails?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="b5"
                  checked={formData.b5_difficult_alternative === true}
                  onChange={() => handleCheckboxChange('b5_difficult_alternative', true)}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="b5"
                  checked={formData.b5_difficult_alternative === false}
                  onChange={() => handleCheckboxChange('b5_difficult_alternative', false)}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>

          {/* B6 */}
          <div className="bg-white p-3 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              B6. Will it require the bank to transfer to the third party data relating to an individual, employee, customer, supplier or data that is deemed restricted, highly restricted or material non-public information?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="b6"
                  checked={formData.b6_data_transfer === true}
                  onChange={() => handleCheckboxChange('b6_data_transfer', true)}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="b6"
                  checked={formData.b6_data_transfer === false}
                  onChange={() => handleCheckboxChange('b6_data_transfer', false)}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>

          {/* B7 */}
          <div className="bg-white p-3 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              B7. Does the third-party service provider have affiliation or other relationship with the bank?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="b7"
                  checked={formData.b7_affiliation_relationship === true}
                  onChange={() => handleCheckboxChange('b7_affiliation_relationship', true)}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="b7"
                  checked={formData.b7_affiliation_relationship === false}
                  onChange={() => handleCheckboxChange('b7_affiliation_relationship', false)}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>

          {/* B8 */}
          <div className="bg-white p-3 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              B8. Does the outsourcing require the third-party service provider to perform a regulated activity?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="b8"
                  checked={formData.b8_regulated_activity === true}
                  onChange={() => handleCheckboxChange('b8_regulated_activity', true)}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="b8"
                  checked={formData.b8_regulated_activity === false}
                  onChange={() => handleCheckboxChange('b8_regulated_activity', false)}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutsourcingQuestionnaire;
