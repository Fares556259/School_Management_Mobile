export const formatLocalizedDate = (dateString: string, t: any, isRTL: boolean) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = date.getDate();
    const monthIndex = date.getMonth();
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthKey = months[monthIndex];
    
    // Get the localized month name, fallback to English short names
    const monthName = t[monthKey] || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex];
    
    if (isRTL) {
      return `${day} ${monthName}`;
    }
    return `${monthName} ${day}`;
  } catch (e) {
    return dateString;
  }
};

/** Serialize the date shown by the device without shifting it through UTC. */
export const formatLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
