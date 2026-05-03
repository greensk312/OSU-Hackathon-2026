// background.js
// Service worker — handles messages from content scripts
// Gemini logic lives in gemini/gemini-api.js but service workers
// can't use ES modules, so we importScripts or inline the call.
// For now, keeping the fetch inline but routing through a clean handler.


  // Future message types:
  // - GENERATE_QUIZ
  // - GENERATE_FLASHCARDS
  // - ANALYZE_CONTENT
