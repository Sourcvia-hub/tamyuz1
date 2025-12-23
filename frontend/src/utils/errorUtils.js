/**
 * Utility functions for error handling
 */

/**
 * Extract a displayable error message from an API error response
 * Handles Pydantic validation errors which return an array of objects
 * 
 * @param {Error} error - The caught error object
 * @param {string} defaultMsg - Default message if extraction fails
 * @returns {string} - A displayable error message
 */
export const getErrorMessage = (error, defaultMsg = "An error occurred") => {
  const detail = error?.response?.data?.detail;
  
  // If detail is a string, return it directly
  if (typeof detail === 'string') {
    return detail;
  }
  
  // If detail is an array (Pydantic validation errors), extract messages
  if (Array.isArray(detail)) {
    const messages = detail.map(e => {
      if (typeof e === 'string') return e;
      if (e && typeof e === 'object' && e.msg) return e.msg;
      return String(e);
    });
    return messages.join(', ');
  }
  
  // If detail is an object with a message property
  if (detail && typeof detail === 'object') {
    if (detail.message) return detail.message;
    if (detail.msg) return detail.msg;
  }
  
  // Check for error.message
  if (error?.message) {
    return error.message;
  }
  
  return defaultMsg;
};

/**
 * Safely stringify an error for logging
 * @param {Error} error - The caught error object
 * @returns {string} - JSON string representation
 */
export const stringifyError = (error) => {
  try {
    return JSON.stringify({
      message: error?.message,
      status: error?.response?.status,
      detail: error?.response?.data?.detail
    }, null, 2);
  } catch {
    return String(error);
  }
};
