import { format, isValid } from 'date-fns';

/**
 * Safely format a date string or object.
 * Returns the formatted string if valid, otherwise returns a fallback string.
 * This prevents RangeErrors when users type into date inputs (intermediate states like '2026-0-').
 */
export function safeFormat(
  date: string | number | Date | null | undefined,
  formatString: string,
  fallback = '...'
): string {
  if (!date) return fallback;
  
  // Try to create a date object
  let dateObj: Date;
  if (typeof date === 'string') {
    // For ISO-like dates (YYYY-MM-DD), browsers might return intermediate states
    // Add time component to avoid timezone shifts if it's just a date string
    const isoDate = date.includes('T') ? date : `${date}T00:00:00`;
    dateObj = new Date(isoDate);
  } else {
    dateObj = new Date(date);
  }

  if (!isValid(dateObj)) {
    return fallback;
  }

  try {
    return format(dateObj, formatString);
  } catch (error) {
    console.error('safeFormat error:', error);
    return fallback;
  }
}
