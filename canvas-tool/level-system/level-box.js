// =============================================================================
// level-system/level-box.js — Injects the XP progress box into Canvas
// =============================================================================
//
// WHAT THIS FILE DOES:
//   Creates and injects a "Progress" widget into the right sidebar of the
//   Canvas dashboard, above the "To Do" section. Shows the user's current
//   level, an XP progress bar, and a list of actions they can do to earn XP.
//
// DEPENDS ON:
//   xp-calculator.js (loaded before this in manifest.json)
//   — provides getXPState() which returns the data this box renders
//
// CALLED BY:
//   content.js → initLevelSystem() calls injectLevelBox()
//
// WHY INLINE STYLES?
//   Content scripts inject HTML into a page we don't own (Canvas). If we
//   used CSS class names, they could collide with Canvas's own CSS or get
//   overridden by their stylesheets. Inline styles are isolated from the
//   host page's styles. It's ugly in code, but it's the right approach
//   for Chrome extension content scripts.
// =============================================================================


/**
 * injectLevelBox()
 *
 * Finds the Canvas dashboard sidebar and prepends the XP progress widget.
 * Does nothing if:
 *   - We're not on the dashboard page
 *   - The sidebar (#right-side) doesn't exist yet
 *   - The box has already been injected (prevents duplicates)
 */
// eslint-disable-next-line no-unused-vars
function injectLevelBox() {

  // ── Guard: Only inject on the dashboard ──
  // Canvas URLs: "/" is the dashboard, some instances use "/dashboard"
  if (
    !window.location.pathname.match(/^\/$/) &&
    !window.location.pathname.includes('dashboard')
  ) {
    return;
  }

  // ── Guard: Sidebar must exist ──
  // Canvas puts the "To Do" section and other widgets in a div with id="right-side"
  var rightSide = document.getElementById('right-side');
  if (!rightSide) return;

  // ── Guard: Don't inject twice ──
  if (document.getElementById('level-box')) return;

  // ── Get XP data ──
  // Pull from xp-calculator.js. The typeof check is a safety net in case
  // the script didn't load (shouldn't happen, but defensive coding).
  var state;
  if (typeof getXPState === 'function') {
    state = getXPState();
  } else {
    state = { level: 1, currentXP: 0, xpForNextLevel: 100, tasks: [] };
  }

  var level = state.level;
  var currentXP = state.currentXP;
  var xpForNextLevel = state.xpForNextLevel;
  var tasks = state.tasks;
  var progressPercent = Math.round((currentXP / xpForNextLevel) * 100);

  // ── Build the container div ──
  var levelBox = document.createElement('div');
  levelBox.id = 'level-box';
  levelBox.style.cssText = [
    'background: #ffffff;',
    'border: 1px solid #c7cdd1;',
    'border-radius: 4px;',
    'padding: 16px;',
    'margin-bottom: 16px;',
    'font-family: -apple-system, "Segoe UI", Helvetica, sans-serif;'
  ].join(' ');

  // ── Build task rows ──
  // Each task is a row showing the task name and how much XP it's worth
  var taskRows = tasks
    .map(function (t) {
      return [
        '<div style="',
        '  display: flex; justify-content: space-between; align-items: center;',
        '  padding: 6px 8px; background: #f5f6f7; border-radius: 4px; font-size: 12px;',
        '">',
        '  <span style="color: #2d3b45;">' + t.name + '</span>',
        '  <span style="color: #4CAF50; font-weight: 600; font-size: 11px;">+' + t.xp + ' XP</span>',
        '</div>'
      ].join('');
    })
    .join('');

  // ── Assemble the full box HTML ──
  levelBox.innerHTML = [
    // Title row: "Progress" on the left, "Level N" on the right
    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">',
    '  <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #2d3b45;">Progress</h2>',
    '  <span style="font-size: 12px; color: #6b7883;">Level ' + level + '</span>',
    '</div>',

    // XP bar: gray track with a colored fill
    '<div style="background: #e8eaed; border-radius: 10px; height: 18px; overflow: hidden; margin-bottom: 6px;">',
    '  <div id="level-xp-fill" style="',
    '    background: linear-gradient(90deg, #2196F3, #4CAF50);',
    '    height: 100%; width: ' + progressPercent + '%; border-radius: 10px; transition: width 0.6s ease;',
    '  "></div>',
    '</div>',

    // XP text: "340 / 500 XP" on the left, "68%" on the right
    '<div style="display: flex; justify-content: space-between; font-size: 11px; color: #6b7883; margin-bottom: 14px;">',
    '  <span>' + currentXP + ' / ' + xpForNextLevel + ' XP</span>',
    '  <span>' + progressPercent + '%</span>',
    '</div>',

    // Divider line
    '<hr style="border: none; border-top: 1px solid #e8eaed; margin: 0 0 12px 0;">',

    // "Earn XP" section with task rows
    '<div>',
    '  <h3 style="',
    '    margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #2d3b45;',
    '    text-transform: uppercase; letter-spacing: 0.5px;',
    '  ">Earn XP</h3>',
    '  <div id="level-tasks" style="display: flex; flex-direction: column; gap: 6px;">',
    '    ' + taskRows,
    '  </div>',
    '</div>'
  ].join('\n');

  // ── Insert into the page ──
  // Prepend above whatever is currently first in the sidebar (usually "To Do")
  rightSide.insertBefore(levelBox, rightSide.firstChild);
}
