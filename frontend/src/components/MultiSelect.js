import React from 'react';
import Select, { components } from 'react-select';

// Custom Option component with checkbox - defined outside to avoid re-renders
const CustomOption = (props) => {
  const { label, isSelected, innerProps } = props;
  return (
    <div 
      {...innerProps} 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '10px 12px', 
        cursor: 'pointer', 
        backgroundColor: isSelected ? '#DBEAFE' : 'white',
        transition: 'background-color 0.15s ease'
      }}
      onMouseEnter={(e) => { if (!isSelected) e.target.style.backgroundColor = '#F3F4F6'; }}
      onMouseLeave={(e) => { e.target.style.backgroundColor = isSelected ? '#DBEAFE' : 'white'; }}
    >
      <input
        type="checkbox"
        checked={isSelected}
        readOnly
        style={{ marginRight: '10px', width: '16px', height: '16px', accentColor: '#3B82F6' }}
      />
      <span style={{ color: '#111827' }}>{label}</span>
    </div>
  );
};

const MultiSelect = ({ 
  options, 
  value = [], 
  onChange, 
  placeholder = "Select...",
  isDisabled = false,
  className = "",
  maxSelections = null
}) => {
  // Custom styles to match our existing design
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '42px',
      borderRadius: '0.5rem',
      borderColor: state.isFocused ? '#3B82F6' : '#D1D5DB',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
      '&:hover': {
        borderColor: '#9CA3AF'
      },
      backgroundColor: isDisabled ? '#F3F4F6' : 'white',
      cursor: isDisabled ? 'not-allowed' : 'default'
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? '#3B82F6' 
        : state.isFocused 
        ? '#DBEAFE' 
        : 'white',
      color: state.isSelected ? 'white' : '#111827',
      cursor: 'pointer',
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      '&:active': {
        backgroundColor: '#3B82F6'
      }
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '0.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      marginTop: '4px',
      zIndex: 9999
    }),
    menuList: (provided) => ({
      ...provided,
      padding: '4px',
      maxHeight: '300px'
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#9CA3AF'
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: '#DBEAFE',
      borderRadius: '4px',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: '#1E40AF',
      fontWeight: 500,
      padding: '2px 6px',
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: '#1E40AF',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: '#BFDBFE',
        color: '#1E3A8A',
      },
    }),
    input: (provided) => ({
      ...provided,
      color: '#111827'
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: '4px 8px',
      gap: '4px',
      flexWrap: 'wrap'
    })
  };

  // Find the selected options
  const selectedOptions = options.filter(opt => value.includes(opt.value));

  return (
    <div className={className}>
      <Select
        options={options}
        value={selectedOptions}
        onChange={(selected) => {
          const values = selected ? selected.map(s => s.value) : [];
          if (maxSelections && values.length > maxSelections) {
            return; // Don't allow more than max selections
          }
          onChange(values);
        }}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isMulti={true}
        closeMenuOnSelect={false}
        hideSelectedOptions={false}
        isSearchable={true}
        styles={customStyles}
        components={{ Option: CustomOption }}
        noOptionsMessage={() => "No vendors found"}
        filterOption={(option, searchText) => {
          return option.label.toLowerCase().includes(searchText.toLowerCase());
        }}
      />
      {value.length > 0 && (
        <p className="text-xs text-blue-600 mt-1">
          {value.length} vendor{value.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
};

export default MultiSelect;
