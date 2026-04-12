import { GoogleAuth } from 'google-auth-library';

// Interface for extracted invoice data
export interface ExtractedInvoiceData {
  date?: string;
  supplierName?: string;
  supplierRTN?: string;
  totalAmount?: number;
  subtotal?: number;
  taxAmount?: number;
  confidence?: number;
  rawText?: string;
}

// Interface for OCR processing result
export interface OCRResult {
  success: boolean;
  data?: ExtractedInvoiceData;
  error?: string;
}

/**
 * Extracts invoice information using Google Cloud Vision API
 */
export async function extractInvoiceFromImage(imageBase64: string): Promise<OCRResult> {
  try {
    // Check if Google Cloud credentials are available
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.GOOGLE_CLOUD_KEY_JSON) {
      console.warn('Google Cloud credentials not configured, using mock OCR data');
      return getMockOCRResult(imageBase64);
    }

    // Initialize Google Cloud Vision client
    const auth = new GoogleAuth({
      keyFile: process.env.GOOGLE_CLOUD_KEY_JSON,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = auth.getClient();
    
    // Prepare the request for Google Cloud Vision API
    const requestBody = {
      requests: [{
        image: {
          content: imageBase64,
        },
        features: [
          { type: 'TEXT_DETECTION' },
          { type: 'DOCUMENT_TEXT_DETECTION' }
        ],
      }],
    };

    // Call Google Cloud Vision API
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(`Google Cloud Vision API error: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Extract and process the text
    const extractedData = processOCRText(result.responses[0]);
    
    return {
      success: true,
      data: extractedData,
    };

  } catch (error) {
    console.error('OCR processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown OCR error',
    };
  }
}

/**
 * Processes raw OCR text to extract structured invoice data
 */
function processOCRText(visionResponse: any): ExtractedInvoiceData {
  const textAnnotations = visionResponse?.textAnnotations || [];
  const fullText = textAnnotations[0]?.description || '';
  
  if (!fullText) {
    return { confidence: 0 };
  }

  const extractedData: ExtractedInvoiceData = {
    rawText: fullText,
    confidence: 0.8, // Default confidence
  };

  // Extract date (various formats)
  const datePatterns = [
    /(\d{2})\/(\d{2})\/(\d{4})/g, // DD/MM/YYYY
    /(\d{2})-(\d{2})-(\d{4})/g, // DD-MM-YYYY
    /(\d{4})\/(\d{2})\/(\d{2})/g, // YYYY/MM/DD
    /(\d{1,2})\sde\s(\w+)\sde\s(\d{4})/gi, // DD de MMMM de YYYY (Spanish)
  ];

  for (const pattern of datePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      extractedData.date = match[0];
      break;
    }
  }

  // Extract RTN (Honduran format: 8 digits followed by 1 check digit)
  const rtnPattern = /\b(\d{8}-\d{1})\b/g;
  const rtnMatch = fullText.match(rtnPattern);
  if (rtnMatch) {
    extractedData.supplierRTN = rtnMatch[0];
  }

  // Extract amounts (look for currency symbols and amounts)
  const amountPatterns = [
    /L\s*([\d,]+\.?\d*)/gi, // Lempiras
    /\$([\d,]+\.?\d*)/g, // Dollars
    /(\d+\.?\d*)\s*L/gi, // Amount followed by L
    /TOTAL[:\s]*([\d,]+\.?\d*)/gi, // Total line
    /IMPORTE[:\s]*([\d,]+\.?\d*)/gi, // Importe line
  ];

  const amounts: number[] = [];
  
  for (const pattern of amountPatterns) {
    const matches = fullText.match(pattern);
    if (matches) {
      matches.forEach((match: string) => {
        const amount = parseFloat(match.replace(/[^\d.]/g, ''));
        if (!isNaN(amount) && amount > 0) {
          amounts.push(amount);
        }
      });
    }
  }

  if (amounts.length > 0) {
    // Get the largest amount as total
    extractedData.totalAmount = Math.max(...amounts);
    
    // If there are multiple amounts, assume the largest is total and second largest is subtotal
    if (amounts.length >= 2) {
      const sortedAmounts = amounts.sort((a, b) => b - a);
      extractedData.totalAmount = sortedAmounts[0];
      extractedData.subtotal = sortedAmounts[1];
      extractedData.taxAmount = extractedData.totalAmount - extractedData.subtotal;
    }
  }

  // Extract supplier name (usually appears before RTN or at the beginning)
  const lines = fullText.split('\n').filter((line: string) => line.trim());
  if (lines.length > 0) {
    // First line is often the supplier name
    const firstLine = lines[0].trim();
    if (firstLine.length > 3 && !firstLine.match(/\d/)) {
      extractedData.supplierName = firstLine;
    }
  }

  return extractedData;
}

/**
 * Mock OCR result for development/testing when Google Cloud is not configured
 */
async function getMockOCRResult(imageBase64: string): Promise<OCRResult> {
  // Simulate processing delay
  const delay = Math.random() * 1000 + 500; // 500-1500ms
  
  // Mock invoice data
  const mockData: ExtractedInvoiceData = {
    date: new Date().toLocaleDateString('es-HN'),
    supplierName: 'SUPERMERCADO LA COLONIA S.A. DE C.V.',
    supplierRTN: '08019001234567',
    totalAmount: 2500.75,
    subtotal: 2232.50,
    taxAmount: 268.25,
    confidence: 0.92,
    rawText: `SUPERMERCADO LA COLONIA S.A. DE C.V.
RTN: 08019001234567
Fecha: ${new Date().toLocaleDateString('es-HN')}
Factura: 001-001-0001234

Descripción          Cantidad    Precio     Total
Leche                2           25.00      50.00
Pan                  1           15.00      15.00
Arroz                1           45.00      45.00
Frijoles             2           30.00      60.00

Subtotal:                        2232.50
ISV (15%):                       268.25
TOTAL:                          2500.75

Gracias por su compra`,
  };

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: mockData,
      });
    }, delay);
  });
}

/**
 * Validates extracted RTN (Honduran Tax ID)
 */
export function validateRTN(rtn: string): boolean {
  // RTN format: 8 digits followed by 1 check digit (8-1)
  const rtnPattern = /^\d{8}-\d{1}$/;
  if (!rtnPattern.test(rtn)) {
    return false;
  }

  // Basic validation algorithm for Honduran RTN
  const [digits, checkDigit] = rtn.split('-');
  const weights = [3, 7, 13, 17, 19, 23, 29, 37];
  
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += parseInt(digits[i]) * weights[i];
  }
  
  const calculatedCheckDigit = (11 - (sum % 11)) % 11;
  const expectedCheckDigit = calculatedCheckDigit === 10 ? 0 : calculatedCheckDigit;
  
  return parseInt(checkDigit) === expectedCheckDigit;
}

/**
 * Formats currency amount for display
 */
export function formatCurrency(amount: number, currency: string = 'HNL'): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'HNL',
    minimumFractionDigits: 2,
  }).format(amount);
}
