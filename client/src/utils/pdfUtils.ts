import jsPDF from 'jspdf';
import { CompanyInfo } from '@/features/company/types';

export const addPdfFooter = (doc: jsPDF) => {
    const pageCount = doc.getNumberOfPages();
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Save current font/color settings to restore if needed (though usually not needed at end)
    // We'll just set what we need
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128); // Gray color
    doc.setFont('helvetica', 'italic');

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text("Generated with Morex Technologies's OMS", width / 2, height - 5, { align: 'center' });
    }
};

export const addPdfHeader = (doc: jsPDF, companyInfo: CompanyInfo | null, title: string, subTitle?: string) => {
    const width = doc.internal.pageSize.getWidth();
    const margin = 14;
    // const logoY = 10;
    // const logoHeight = 25;
    let textY = 15;

    // 1. Company Logo
    /* 
    let logoBottomY = 0;
    if (companyInfo?.logoUrl) {
        try {
            // Check if logoUrl is a data URL (base64) or a remote URL
            // We try to add it if it's a valid image data.
            doc.addImage(companyInfo.logoUrl, 'PNG', margin, logoY, 25, logoHeight);
            logoBottomY = logoY + logoHeight;
        } catch (e) {
            console.error("Could not add logo to PDF", e);
        }
    }
    */

    // 2. Company Name & Details (Centered)
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);

    // Company Name
    const companyName = companyInfo?.companyName || 'DMOR PAINTS';
    doc.text(companyName.toUpperCase(), width / 2, textY, { align: 'center' });

    /*
    // Company Address / Contact
    textY += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    if (companyInfo?.companyId) { // Ensure company info exists
        // 1. Address Handling (Split into max 2 lines)
        if (companyInfo.address) {
            // Split address by newlines first
            const rawLines = companyInfo.address.split('\n');
            let addressLines: string[] = [];

            // If explicit newlines exist, take top 2
            if (rawLines.length > 1) {
                addressLines = rawLines.slice(0, 2);
            } else {
                // Otherwise check length and split if too long (rough char count for 9pt font)
                const addr = rawLines[0];
                if (addr.length > 60) {
                    // Find a space near the middle
                    const midpoint = Math.floor(addr.length / 2);
                    const splitIndex = addr.indexOf(' ', midpoint);
                    if (splitIndex !== -1 && splitIndex < 60) {
                        addressLines = [addr.substring(0, splitIndex), addr.substring(splitIndex + 1)];
                    } else {
                        // Just split at 60
                        addressLines = doc.splitTextToSize(addr, 120); // approx width in mm
                    }
                } else {
                    addressLines = [addr];
                }
            }

            // Print Address Lines
            addressLines.slice(0, 2).forEach(line => {
                doc.text(line.trim(), width / 2, textY, { align: 'center' });
                textY += 5; // spacing between address lines
            });
        }

        // 2. Contact Details (New Row)
        const contactParts: string[] = [];
        if (companyInfo.contactNumber) contactParts.push(`Ph: ${companyInfo.contactNumber}`);
        if (companyInfo.email) contactParts.push(companyInfo.email);

        if (contactParts.length > 0) {
            // Add a bit extra padding before contact info if address was printed
            if (companyInfo.address) textY += 1;
            doc.text(contactParts.join(' | '), width / 2, textY, { align: 'center' });
            textY += 6;
        } else {
            textY += 2;
        }
    } else {
        textY += 2;
    }
    */

    // Simplification: We only have Company Name now.
    textY += 5; // Add a small margin below company name

    // Ensure we start below whichever is taller (Logo or Text)
    // Add some padding (5 units)
    let currentY = textY + 5;

    // Safety check for NaN
    if (isNaN(currentY)) {
        console.error("addPdfHeader calculated NaN for currentY, falling back to 50");
        currentY = 50;
    }

    // Divider Line
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, currentY, width - margin, currentY);

    // 3. Report Title (Below Divider)
    currentY += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(title, margin, currentY);

    // Subtitle (if any)
    if (subTitle) {
        currentY += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(subTitle, margin, currentY);
    }

    console.log(`addPdfHeader finished. Next Y: ${currentY + 5}`);
    // Return the Y position where the next component can start
    return currentY + 5;
};
