import { api } from '../../api';
import { convertPdfFirstPageToImage, isPdf } from './pdfToImage';

export interface DatasheetUploadResult {
    key: string;
    extractedSpecs: any;
}

/**
 * Upload datasheet - handles both PDFs (converts to image) and images
 * Automatically extracts technical specifications using AI
 *
 * @param file - PDF or image file
 * @param isPrivate - Whether to store in private bucket
 * @returns Upload result with image key and extracted specs
 */
export async function uploadDatasheetWithExtraction(
    file: File,
    isPrivate: boolean = false
): Promise<DatasheetUploadResult> {
    let fileToUpload = file;

    // If PDF, convert first page to image
    if (isPdf(file)) {
        console.log('Converting PDF to image...');
        try {
            fileToUpload = await convertPdfFirstPageToImage(file);
            console.log('PDF converted successfully');
        } catch (error) {
            console.error('PDF conversion failed:', error);
            throw new Error('Failed to convert PDF. Please ensure it\'s a valid PDF file.');
        }
    }

    // Upload image and extract specs
    console.log('Uploading datasheet and extracting specifications...');
    const result = await api.uploadDatasheet(fileToUpload, isPrivate);

    console.log('Datasheet uploaded. Extracted specs:', result.extractedSpecs);

    return result;
}
