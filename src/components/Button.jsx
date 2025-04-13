import React from 'react';

// --- Reusable Button Component ---
const Button = ({ onClick, disabled, children, className = '', variant = 'secondary', title }) => {
  const baseStyles = "px-3 py-1 rounded text-sm transition-colors duration-150 flex items-center justify-center gap-2";
  const disabledStyles = "disabled:bg-gray-400 disabled:text-gray-800 disabled:cursor-not-allowed dark:disabled:bg-gray-600 dark:disabled:text-gray-400";

  let variantStyles = '';
  switch (variant) {
    case 'primary':
      variantStyles = "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700";
      break;
    case 'success':
      variantStyles = "bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700";
      break;
    case 'icon':
      // Specific styling for icon-only buttons (less padding, maybe different hover)
      variantStyles = "p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600";
      // Override base padding for icons
      className = className.replace(/px-\d+|py-\d+/g, '').trim() + ' p-2';
      break;
    case 'secondary': // Default
    default:
      variantStyles = "bg-blue-600 hover:bg-blue-700 text-white";
      break;
  }

  // Icon buttons might not have text, so use title for accessibility/tooltip
  const buttonTitle = typeof children === 'string' ? children : title;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles} ${disabledStyles} ${className}`}
      title={buttonTitle} // Use derived title
    >
      {children}
    </button>
  );
};

export default Button;