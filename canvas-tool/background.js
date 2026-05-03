// background.js
// Service worker — handles messages from content scripts
// Gemini logic lives in gemini/gemini-api.js but service workers
// can't use ES modules, so we importScripts or inline the call.
// For now, keeping the fetch inline but routing through a clean handler.

import { testConnection } from './gemini/gemini-api.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TEST_GEMINI') {
    testConnection().then(sendResponse);
    return true; // keep message channel open for async response
  }

  // Future message types:
  // - GENERATE_QUIZ
  // - GENERATE_FLASHCARDS
  // - ANALYZE_CONTENT
});
