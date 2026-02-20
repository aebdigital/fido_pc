import { supabase } from '../lib/supabase';

export async function analyzeReceipt(imageBase64) {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-receipt', {
      body: { imageBase64 }
    });

    if (error) {
      console.error('Supabase Function Error:', error);
      throw new Error(`Receipt analysis failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('No response from receipt analysis service');
    }

    // Return in the format expected by the app
    return {
      total_amount: data.amount,
      vendor_name: data.merchantName,
      date: data.date,
      receipt_number: data.receiptNumber,
      category: data.category,
      items: data.items,
      raw_text: data.extractedText
    };
  } catch (error) {
    console.error('Receipt analysis failed:', error);
    throw error;
  }
}

