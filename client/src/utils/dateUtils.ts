
export const formatDate = (date: string | Date | undefined | null): string => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    // formatted as DD/MM/YY
    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        timeZone: 'Asia/Kolkata',
    }).format(d);
};

export const formatDateTime = (date: string | Date | undefined | null): string => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    // formatted as DD/MM/YY HH:mm
    const dateStr = new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata',
    }).format(d);

    // The format usually comes out as "DD/MM/YY, HH:mm", we can ensure spacing/IST suffix if needed
    // en-IN usually does DD/MM/YYYY or DD/MM/YY depending on config.
    // With the above options, checking output format might be needed. 
    // Custom construction might be safer for strict "DD/MM/YY" requirements if Intl varies by browser.

    // Manual construction for strict control:
    const day = d.toLocaleString('en-IN', { day: '2-digit', timeZone: 'Asia/Kolkata' }).padStart(2, '0');
    const month = d.toLocaleString('en-IN', { month: '2-digit', timeZone: 'Asia/Kolkata' }).padStart(2, '0');
    const year = d.toLocaleString('en-IN', { year: '2-digit', timeZone: 'Asia/Kolkata' }); // 2-digit year

    const time = d.toLocaleString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true, // User might prefer AM/PM or 24h? "ISD" usually implies needing timezone label. 
        // Let's assume 12h format with AM/PM unless specified, or 24h. 
        // "Time should be in ISD" -> likely means IST. 
        timeZone: 'Asia/Kolkata'
    });

    // Re-evaluating based on "ALL DATES ... DD/MM/YY ... TIME IN ISD"
    // Let's stick to a robust implementation.

    // Using Intl again carefully
    const optionsDate: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        timeZone: 'Asia/Kolkata',
    };

    const optionsTime: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
    };

    const datePart = new Intl.DateTimeFormat('en-GB', optionsDate).format(d); // en-GB gives DD/MM/YY
    const timePart = new Intl.DateTimeFormat('en-US', optionsTime).format(d); // en-US for time usually clean

    return `${datePart} ${timePart} IST`;
};

// Also export a simple one for just DD/MM/YY with custom separator if needed, but the above is standard.
