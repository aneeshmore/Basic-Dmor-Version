import jsPDF from 'jspdf';

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
