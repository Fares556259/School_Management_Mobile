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
