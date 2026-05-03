// gemini/gemini-api.js
// Gemini API connection and request logic
// Extracted from background.js so quiz/flashcard features can share it

const GEMINI_API_KEY = 'AIzaSyCDAv9tBkSyho7pkMsr3A_aKPkcOm5NY';
const GEMINI_MODEL = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Send a prompt to Gemini and return the response text.
 * @param {string} prompt - the text prompt to send
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 */
export async function queryGemini(prompt) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error.message };
    }

    const text = data.candidates[0].content.parts[0].text.trim();
    return { success: true, text };
  } catch (error) {
    return { success: false, error: 'Network error: ' + error.message };
  }
}

/**
 * Test the Gemini connection with a simple ping.
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function testConnection() {
  const result = await queryGemini(
    "Respond with the word 'Connected' and nothing else."
  );
  if (result.success) {
    return { success: true, message: result.text };
  }
  return result;
}
