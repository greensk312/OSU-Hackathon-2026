// =============================================================================
// level-system/level-box.js — Injects the XP progress box into Canvas
// =============================================================================
//
// WHAT THIS FILE DOES:
//   Creates and injects a "Progress" widget into the right sidebar of the
//   Canvas dashboard, above the "To Do" section. Supports four states:
//     1. Loading — "Fetching your XP data..." while API calls run
//     2. No token — tells the user to set up their API token
//     3. Error — shows a message if the API calls fail
//     4. Success — full level box with progress bar and Earn XP tasks
//
// DEPENDS ON:
//   xp-calculator.js (loaded before this in manifest.json)
//   — provides fetchXPState(), getCachedXPState(), calculateLevel()
//
// CALLED BY:
//   content.js → orchestrates the inject → loading → fetch → render flow
//
// WHY INLINE STYLES?
//   Content scripts inject HTML into a page we don't own (Canvas). If we
//   used CSS class names, they could collide with Canvas's own CSS or get
//   overridden by their stylesheets. Inline styles are isolated from the
//   host page's styles. It's ugly in code, but it's the right approach
//   for Chrome extension content scripts.
// =============================================================================


// ── Shared styles ──
// These are reused across multiple states so they're defined once here.
var LEVEL_BOX_BASE_STYLE = [
  'background: #ffffff;',
  'border: 1px solid #c7cdd1;',
  'border-radius: 4px;',
  'padding: 16px;',
  'margin-bottom: 16px;',
  'font-family: -apple-system, "Segoe UI", Helvetica, sans-serif;'
].join(' ');


/**
 * injectLevelBoxLoading()
 *
 * Shows the level box frame with a loading message while API calls run.
 * Called immediately by content.js before the async fetch starts.
 * Returns false if we're not on the dashboard or sidebar doesn't exist.
 *
 * @returns {boolean} true if the loading box was injected
 */
// eslint-disable-next-line no-unused-vars
function injectLevelBoxLoading() {
  if (!isDashboard()) return false;

  var rightSide = document.getElementById('right-side');
  if (!rightSide) return false;

  // Remove any existing level box (handles re-renders)
  var existing = document.getElementById('level-box');
  if (existing) existing.remove();

  var levelBox = document.createElement('div');
  levelBox.id = 'level-box';
  levelBox.style.cssText = LEVEL_BOX_BASE_STYLE;

  levelBox.innerHTML = [
    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">',
    '  <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #2d3b45;">Progress</h2>',
    '</div>',
    '<p style="margin: 0; font-size: 13px; color: #6b7883;">Fetching your XP data...</p>'
  ].join('\n');

  rightSide.insertBefore(levelBox, rightSide.firstChild);
  return true;
}


/**
 * injectLevelBoxNoToken()
 *
 * Shows the level box with a message telling the user to set up their token.
 */
// eslint-disable-next-line no-unused-vars
function injectLevelBoxNoToken() {
  if (!isDashboard()) return;

  var rightSide = document.getElementById('right-side');
  if (!rightSide) return;

  var existing = document.getElementById('level-box');
  if (existing) existing.remove();

  var levelBox = document.createElement('div');
  levelBox.id = 'level-box';
  levelBox.style.cssText = LEVEL_BOX_BASE_STYLE;

  levelBox.innerHTML = [
    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">',
    '  <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #2d3b45;">Progress</h2>',
    '</div>',
    '<p style="margin: 0; font-size: 13px; color: #6b7883;">',
    '  No API token saved. Click the extension icon to set one up.',
    '</p>'
  ].join('\n');

  rightSide.insertBefore(levelBox, rightSide.firstChild);
}


/**
 * injectLevelBoxError(message)
 *
 * Shows the level box with an error message when API calls fail.
 *
 * @param {string} [message] — optional custom error message
 */
// eslint-disable-next-line no-unused-vars
function injectLevelBoxError(message) {
  if (!isDashboard()) return;

  var rightSide = document.getElementById('right-side');
  if (!rightSide) return;

  var existing = document.getElementById('level-box');
  if (existing) existing.remove();

  var errorText = message || 'Could not load XP data. Check your API token.';

  var levelBox = document.createElement('div');
  levelBox.id = 'level-box';
  levelBox.style.cssText = LEVEL_BOX_BASE_STYLE;

  levelBox.innerHTML = [
    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">',
    '  <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #2d3b45;">Progress</h2>',
    '</div>',
    '<p style="margin: 0; font-size: 13px; color: #ef4444;">' + errorText + '</p>'
  ].join('\n');

  rightSide.insertBefore(levelBox, rightSide.firstChild);
}


/**
 * injectLevelBox(state)
 *
 * Renders the full level box with real XP data. Replaces whatever is
 * currently in the #level-box element (loading message, error, etc.).
 *
 * @param {Object} state — from fetchXPState() or getCachedXPState():
 *   { level, currentXP, xpForNextLevel, totalXP, tasks, earnedAssignments }
 */
// eslint-disable-next-line no-unused-vars
function injectLevelBox(state) {
  if (!isDashboard()) return;

  var rightSide = document.getElementById('right-side');
  if (!rightSide) return;

  // Remove any existing level box
  var existing = document.getElementById('level-box');
  if (existing) existing.remove();

  var level = state.level;
  var currentXP = state.currentXP;
  var xpForNextLevel = state.xpForNextLevel;
  var totalXP = state.totalXP;
  var tasks = state.tasks;
  var progressPercent = xpForNextLevel > 0
    ? Math.round((currentXP / xpForNextLevel) * 100)
    : 0;

  // ── Build the container ──
  var levelBox = document.createElement('div');
  levelBox.id = 'level-box';
  levelBox.style.cssText = LEVEL_BOX_BASE_STYLE;

  // ── Build task rows (Earn XP section) ──
  var taskRowsHTML;
  if (tasks.length === 0) {
    taskRowsHTML = [
      '<div style="padding: 8px; font-size: 13px; color: #4CAF50; text-align: center;">',
      '  All caught up!',
      '</div>'
    ].join('');
  } else {
    taskRowsHTML = tasks
      .map(function (t) {
        var dueBadge = getDueDateBadge(t.dueAt);
        return [
          '<div style="',
          '  display: flex; justify-content: space-between; align-items: center;',
          '  padding: 6px 8px; background: #f5f6f7; border-radius: 4px; font-size: 12px;',
          '">',
          '  <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1;">',
          '    <span style="color: #2d3b45; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + t.name + '</span>',
          dueBadge ? '    <span style="font-size: 10px; color: ' + dueBadge.color + ';">' + dueBadge.text + '</span>' : '',
          '  </div>',
          '  <span style="color: #4CAF50; font-weight: 600; font-size: 11px; margin-left: 8px; white-space: nowrap;">+' + t.xp + ' XP</span>',
          '</div>'
        ].join('');
      })
      .join('');
  }

  // ── Assemble the full box HTML ──
  levelBox.innerHTML = [
    // Header row: "Progress" on the left, "Level N · XXXX XP" on the right
    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">',
    '  <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #2d3b45;">Progress</h2>',
    '  <span style="font-size: 12px; color: #6b7883;">Level ' + level + ' &middot; ' + totalXP + ' XP</span>',
    '</div>',

    // XP progress bar
    '<div style="background: #e8eaed; border-radius: 10px; height: 18px; overflow: hidden; margin-bottom: 6px;">',
    '  <div style="',
    '    background: linear-gradient(90deg, #2196F3, #4CAF50);',
    '    height: 100%; width: ' + progressPercent + '%; border-radius: 10px; transition: width 0.6s ease;',
    '  "></div>',
    '</div>',

    // XP text: "X / Y XP to Level Z" on the left, percentage on the right
    '<div style="display: flex; justify-content: space-between; font-size: 11px; color: #6b7883; margin-bottom: 14px;">',
    '  <span>' + currentXP + ' / ' + xpForNextLevel + ' XP to Level ' + (level + 1) + '</span>',
    '  <span>' + progressPercent + '%</span>',
    '</div>',

    // Divider
    '<hr style="border: none; border-top: 1px solid #e8eaed; margin: 0 0 12px 0;">',

    // Earn XP section
    '<div>',
    '  <h3 style="',
    '    margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #2d3b45;',
    '    text-transform: uppercase; letter-spacing: 0.5px;',
    '  ">Earn XP</h3>',
    '  <div style="display: flex; flex-direction: column; gap: 6px;">',
    '    ' + taskRowsHTML,
    '  </div>',
    '</div>'
  ].join('\n');

  // ── Insert into the sidebar ──
  rightSide.insertBefore(levelBox, rightSide.firstChild);
}


/**
 * getDueDateBadge(dueAt)
 *
 * Converts an ISO date string into a human-readable due date context badge.
 * Returns an object with { text, color } or null if no due date.
 *
 * Possible outputs:
 *   - "Overdue" (red)
 *   - "Due today" (orange)
 *   - "Due tomorrow" (blue)
 *   - "Due in Xd" (gray)
 *   - null if dueAt is falsy
 *
 * @param {string|null} dueAt — ISO date string from Canvas API
 * @returns {Object|null} { text: string, color: string } or null
 */
function getDueDateBadge(dueAt) {
  if (!dueAt) return null;

  var now = new Date();
  var due = new Date(dueAt);

  // Strip time components for day comparison
  var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  var diffMs = dueDay - todayStart;
  var diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: 'Overdue', color: '#ef4444' };
  } else if (diffDays === 0) {
    return { text: 'Due today', color: '#f59e0b' };
  } else if (diffDays === 1) {
    return { text: 'Due tomorrow', color: '#2196F3' };
  } else {
    return { text: 'Due in ' + diffDays + 'd', color: '#6b7883' };
  }
}


/**
 * isDashboard()
 *
 * Returns true if the current page is the Canvas dashboard.
 * Canvas URLs: "/" is the dashboard, some instances use "/dashboard".
 *
 * @returns {boolean}
 */
function isDashboard() {
  return (
    window.location.pathname === '/' ||
    window.location.pathname.indexOf('dashboard') !== -1
  );
}