import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for PDF.js - use specific version to avoid issues
pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/**
 * Convert first page of PDF to image
 * @param pdfFile - PDF File object
 * @returns Promise<File> - Image file (JPEG)
 */
export async function convertPdfFirstPageToImage(pdfFile: File): Promise<File> {
    try {
        // Read PDF file
        const arrayBuffer = await pdfFile.arrayBuffer();

        // Load PDF document
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        // Get first page
        const page = await pdf.getPage(1);

        // Set scale for good quality (2x for high DPI)
        const scale = 2.0;
        const viewport = page.getViewport({ scale });

        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Could not get canvas context');
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page to canvas
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to convert canvas to blob'));
                }
            }, 'image/jpeg', 0.92); // High quality JPEG
        });

        // Create File object from blob
        const fileName = pdfFile.name.replace(/\.pdf$/i, '.jpg');
        const imageFile = new File([blob], fileName, { type: 'image/jpeg' });

        return imageFile;
    } catch (error) {
        console.error('PDF to image conversion error:', error);
        throw new Error('Failed to convert PDF to image');
    }
}

/**
 * Check if file is a PDF
 */
export function isPdf(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}
