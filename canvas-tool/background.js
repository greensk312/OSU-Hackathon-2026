const GEMINI_API_KEY = "AIzaSyCDAv9tBkSyho7pkMsr3A_aKPkcncOm5NY"; // set api key to a constant
// Updated URL to use the 2.5 Flash model
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "TEST_GEMINI") {
    testGeminiConnection().then(sendResponse);
    return true;
  }
});

async function testGeminiConnection() { // test connection to GEMINI 
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: "Respond with the word 'Connected' and nothing else." }]
        }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return { success: false, error: data.error.message };
    }

    const text = data.candidates[0].content.parts[0].text.trim();
    return { success: true, message: text };
  } catch (error) {
    return { success: false, error: "Network error: " + error.message };
  }
}