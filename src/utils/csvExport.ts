/**
 * CSV Export Utility Functions
 * Handles proper CSV formatting with UTF-8 BOM for Excel compatibility
 */

/**
 * Converts a value to a CSV-safe string
 * @param value - The value to convert
 * @returns CSV-safe string
 */
export const toCSVValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, newline, or quotes, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
};

/**
 * Formats currency for CSV export (numeric value only for better compatibility)
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export const formatCurrencyForCSV = (amount: number): string => {
  return amount.toFixed(2);
};

/**
 * Creates a CSV blob with proper UTF-8 BOM for Excel compatibility
 * @param csvContent - The CSV content as a string
 * @returns Blob with proper encoding
 */
export const createCSVBlob = (csvContent: string): Blob => {
  // Add UTF-8 BOM to ensure proper encoding in Excel
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;
  
  return new Blob([csvWithBOM], { 
    type: 'text/csv;charset=utf-8' 
  });
};

/**
 * Downloads a CSV file
 * @param content - The CSV content (array of arrays or string)
 * @param filename - The filename for the download
 */
export const downloadCSV = (content: string[][] | string, filename: string): void => {
  try {
    let csvContent: string;
    
    if (Array.isArray(content)) {
      // Convert array of arrays to CSV string
      csvContent = content
        .map(row => row.map(toCSVValue).join(','))
        .join('\n');
    } else {
      csvContent = content;
    }
    
    const blob = createCSVBlob(csvContent);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('CSV download failed:', error);
    throw new Error('Failed to download CSV file');
  }
};

/**
 * Formats a date for CSV export
 * @param date - The date to format
 * @returns Formatted date string
 */
export const formatDateForCSV = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(',', '');
};