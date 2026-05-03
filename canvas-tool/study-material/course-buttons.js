// =============================================================================
// study-material/course-buttons.js — Quiz & Flashcard buttons on course cards
// =============================================================================
//
// WHAT THIS FILE DOES:
//   Adds "Quizzes" and "Flashcards" buttons to each course card on the
//   Canvas dashboard. Clicking them opens the respective study tool page
//   in a NEW browser tab (so we don't navigate away from Canvas).
//
// BUGS FIXED IN THIS VERSION:
//   1. Buttons now open in a new tab (target="_blank") instead of navigating
//      away from Canvas in the same tab.
//   2. The MutationObserver no longer disconnects permanently. Previously,
//      when the user hit the browser back button, Canvas would re-render
//      the course cards, but the observer had already stopped watching —
//      so the buttons were never re-injected. Now the observer stays active
//      and re-injects buttons whenever Canvas re-renders the cards.
//
// HOW CANVAS COURSE CARDS WORK:
//   Canvas loads dashboard content dynamically via JavaScript (it's partially
//   a single-page app). The course cards with class ".ic-DashboardCard__action-container"
//   don't exist in the initial HTML — they get injected by Canvas's own JS
//   after the page loads. That's why we use a MutationObserver: it watches
//   the DOM for new elements and fires our callback when they appear.
// =============================================================================


/**
 * addCourseButtons(containers)
 *
 * Takes a NodeList/array of Canvas course card action containers and
 * appends our Quiz and Flashcard buttons to each one.
 *
 * @param {NodeList} containers - the ".ic-DashboardCard__action-container" elements
 */
function addCourseButtons(containers) {
  containers.forEach(function (container) {
    // Skip containers that already have our buttons (prevents duplicates
    // when the observer fires multiple times on the same cards)
    if (container.querySelector('.cst-study-btn')) return;

    // Canvas sets a fixed height on these containers — override it so
    // our extra buttons don't get clipped/hidden
    container.style.height = 'auto';
    container.style.overflow = 'visible';

    // Make a new container to store the buttons
    var buttonBar = document.createElement('div')
    buttonBar.style.display = "flex"
    buttonBar.style.gap = "8px"
    buttonBar.style.padding = "4px 8px"

    // -- Quiz button --
    var quizButton = document.createElement('a');
    quizButton.textContent = 'Quizzes';
    quizButton.className = 'cst-study-btn';  // marker class to detect duplicates
    quizButton.target = '_blank';             // <<< FIX: open in new tab
    quizButton.rel = 'noopener';              // security best practice with _blank

    // chrome.runtime.getURL() converts a relative path within the extension
    // into a full chrome-extension://... URL that the browser can navigate to
    quizButton.href = chrome.runtime.getURL('study-material/quiz.html');

    quizButton.style.cssText = [
      'display: block;',
      'padding: 4px 8px;',
      'background: #0770A3;',
      'color: white;',
      'border-radius: 4px;',
      'text-decoration: none;',
      'font-size: 12px;',
      'margin-top: 4px;'
    ].join(' ');

    // -- Flashcard button --
    var flashCardButton = document.createElement('a');
    flashCardButton.textContent = 'Flashcards';
    flashCardButton.className = 'cst-study-btn';
    flashCardButton.target = '_blank';        // <<< FIX: open in new tab
    flashCardButton.rel = 'noopener';
    flashCardButton.href = chrome.runtime.getURL('study-material/flashcards.html');
    flashCardButton.style.cssText = [
      'display: block;',
      'padding: 4px 8px;',
      'background: #0770A3;',
      'color: white;',
      'border-radius: 4px;',
      'text-decoration: none;',
      'font-size: 12px;',
      'margin-top: 4px;'
    ].join(' ');

    // Append both buttons to the course card
    buttonBar.appendChild(quizButton);
    buttonBar.appendChild(flashCardButton);

    // Append the new container below the action container
    container.insertAdjacentElement('afterend', buttonBar)
  });
}


/**
 * observeCourseCards()
 *
 * Sets up a MutationObserver that watches the entire <body> for DOM changes.
 * Whenever Canvas adds or re-renders course cards, we inject our buttons.
 *
 * Called from content.js (the orchestrator / "main").
 *
 * KEY DIFFERENCE FROM BEFORE:
 *   The old version called observer.disconnect() after the first injection,
 *   which meant if Canvas re-rendered the cards (e.g. after back-navigation),
 *   the buttons would never come back. Now we keep the observer running
 *   permanently and use the .cst-study-btn class check inside
 *   addCourseButtons() to avoid duplicating buttons.
 */
// eslint-disable-next-line no-unused-vars
function observeCourseCards() {
  var observer = new MutationObserver(function () {
    var containers = document.querySelectorAll(
      '.ic-DashboardCard__action-container'
    );

    if (containers.length > 0) {
      // Don't disconnect! Keep watching so buttons come back on re-renders.
      // addCourseButtons() handles deduplication internally.
      addCourseButtons(containers);
      observer.disconnect()
    }
  });

  // Watch the entire body for any child element additions/removals,
  // including deeply nested ones (subtree: true).
  observer.observe(document.body, { childList: true, subtree: true });

  // Also try immediately in case the cards are already in the DOM
  var existingContainers = document.querySelectorAll(
    '.ic-DashboardCard__action-container'
  );
  if (existingContainers.length > 0) {
    addCourseButtons(existingContainers);
  }
}
