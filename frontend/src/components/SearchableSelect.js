import React from 'react';
import Select from 'react-select';

const SearchableSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select...",
  isDisabled = false,
  required = false,
  isClearable = true,
  className = ""
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
      padding: '8px 12px',
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
    singleValue: (provided) => ({
      ...provided,
      color: '#111827'
    }),
    input: (provided) => ({
      ...provided,
      color: '#111827'
    })
  };

  // Find the selected option
  const selectedOption = options.find(opt => opt.value === value) || null;

  return (
    <div className={className}>
      <Select
        options={options}
        value={selectedOption}
        onChange={(selected) => onChange(selected ? selected.value : '')}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isClearable={isClearable}
        isSearchable={true}
        styles={customStyles}
        required={required}
        noOptionsMessage={() => "No options found"}
        filterOption={(option, searchText) => {
          // Custom filter to search in label
          return option.label.toLowerCase().includes(searchText.toLowerCase());
        }}
      />
    </div>
  );
};

export default SearchableSelect;
