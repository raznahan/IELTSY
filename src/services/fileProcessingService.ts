import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';

export const extractTextFromFile = async (filePath: string): Promise<string | null> => {
  const fileExtension = filePath.split('.').pop();

  try {
    let text = '';
    if (fileExtension === 'pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
    } else if (fileExtension === 'docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    }

    return text || null;
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return null;
  }
};
