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
// LEVEL SYSTEM (demo: levels 1–5):
//   - Progress bar color evolves from steel gray → amber → orange → black/orange
//   - Center icon evolves: seed → sprout → sapling → young tree → full tree
//   - Level 5 is MAX LEVEL for the demo
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

// ── Max level for demo ──
var MAX_LEVEL = 5;

// ── Level color themes ──
// Each level has a gradient for the progress bar and an accent color for text
var LEVEL_THEMES = {
  1: {
    barGradient: 'linear-gradient(90deg, #8e9aaf, #a8b5c7)',
    barBg: '#e2e5e9',
    accentColor: '#8e9aaf',
    glowColor: 'none'
  },
  2: {
    barGradient: 'linear-gradient(90deg, #b8860b, #daa520)',
    barBg: '#eee8d5',
    accentColor: '#b8860b',
    glowColor: 'none'
  },
  3: {
    barGradient: 'linear-gradient(90deg, #d2691e, #e88a2e)',
    barBg: '#f0e0d0',
    accentColor: '#d2691e',
    glowColor: 'none'
  },
  4: {
    barGradient: 'linear-gradient(90deg, #1a1a1a, #d35400, #e67e22)',
    barBg: '#ede0d4',
    accentColor: '#d35400',
    glowColor: 'rgba(211, 84, 0, 0.15)'
  },
  5: {
    barGradient: 'linear-gradient(90deg, #0d0d0d, #1a1a1a, #d35400, #f39c12)',
    barBg: '#e8ddd0',
    accentColor: '#f39c12',
    glowColor: 'rgba(243, 156, 18, 0.25)'
  }
};

// ── Level icons (inline SVG) ──
// Each returns an SVG string. Designed at 36x36, centered on the bar.
// The icons evolve: seed → sprout → sapling → young tree → full tree

function getLevelIcon(level) {
  var clampedLevel = Math.min(Math.max(level, 1), MAX_LEVEL);
  var theme = LEVEL_THEMES[clampedLevel];
  var accent = theme.accentColor;

  switch (clampedLevel) {
    // ── Level 1: Seed ──
    case 1:
      return [
        '<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">',
        '  <ellipse cx="18" cy="26" rx="10" ry="3" fill="#c9b99a" opacity="0.5"/>',
        '  <ellipse cx="18" cy="22" rx="4.5" ry="5.5" fill="' + accent + '"/>',
        '  <ellipse cx="18" cy="21" rx="3" ry="3.5" fill="#a0aab4" opacity="0.3"/>',
        '</svg>'
      ].join('');

    // ── Level 2: Sprout ──
    case 2:
      return [
        '<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">',
        '  <ellipse cx="18" cy="30" rx="10" ry="3" fill="#c9b99a" opacity="0.5"/>',
        '  <line x1="18" y1="28" x2="18" y2="16" stroke="' + accent + '" stroke-width="2" stroke-linecap="round"/>',
        '  <ellipse cx="14" cy="17" rx="4" ry="2.5" fill="#6b8e23" transform="rotate(-30 14 17)"/>',
        '  <ellipse cx="22" cy="17" rx="4" ry="2.5" fill="#7ba428" transform="rotate(30 22 17)"/>',
        '</svg>'
      ].join('');

    // ── Level 3: Sapling ──
    case 3:
      return [
        '<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">',
        '  <ellipse cx="18" cy="32" rx="10" ry="2.5" fill="#c9b99a" opacity="0.4"/>',
        '  <line x1="18" y1="30" x2="18" y2="12" stroke="#8B5E3C" stroke-width="2.5" stroke-linecap="round"/>',
        '  <line x1="18" y1="20" x2="12" y2="15" stroke="#8B5E3C" stroke-width="1.5" stroke-linecap="round"/>',
        '  <line x1="18" y1="17" x2="24" y2="12" stroke="#8B5E3C" stroke-width="1.5" stroke-linecap="round"/>',
        '  <circle cx="12" cy="14" r="4" fill="#5a8c2a"/>',
        '  <circle cx="24" cy="11" r="3.5" fill="#6b9e34"/>',
        '  <circle cx="18" cy="10" r="4.5" fill="' + accent + '"/>',
        '</svg>'
      ].join('');

    // ── Level 4: Young tree ──
    case 4:
      return [
        '<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">',
        '  <ellipse cx="18" cy="33" rx="11" ry="2" fill="#c9b99a" opacity="0.4"/>',
        '  <rect x="16" y="22" width="4" height="10" rx="1" fill="#6B4226"/>',
        '  <line x1="18" y1="26" x2="12" y2="21" stroke="#6B4226" stroke-width="1.5" stroke-linecap="round"/>',
        '  <line x1="18" y1="24" x2="24" y2="20" stroke="#6B4226" stroke-width="1.5" stroke-linecap="round"/>',
        '  <ellipse cx="18" cy="14" rx="10" ry="8" fill="#4a7c1a"/>',
        '  <ellipse cx="14" cy="12" rx="6" ry="5" fill="#5a8c2a" opacity="0.7"/>',
        '  <ellipse cx="22" cy="13" rx="5" ry="4.5" fill="' + accent + '" opacity="0.5"/>',
        '  <ellipse cx="18" cy="10" rx="7" ry="5" fill="#6b9e34" opacity="0.5"/>',
        '</svg>'
      ].join('');

    // ── Level 5: Full tree (final form) ──
    case 5:
      return [
        '<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">',
        // Glow effect
        '  <defs>',
        '    <radialGradient id="treeGlow" cx="50%" cy="40%" r="50%">',
        '      <stop offset="0%" stop-color="' + accent + '" stop-opacity="0.3"/>',
        '      <stop offset="100%" stop-color="' + accent + '" stop-opacity="0"/>',
        '    </radialGradient>',
        '  </defs>',
        '  <circle cx="18" cy="15" r="16" fill="url(#treeGlow)"/>',
        // Ground
        '  <ellipse cx="18" cy="33" rx="12" ry="2" fill="#c9b99a" opacity="0.4"/>',
        // Trunk
        '  <rect x="15.5" y="21" width="5" height="11" rx="1.5" fill="#5C3A1E"/>',
        '  <line x1="18" y1="26" x2="10" y2="19" stroke="#5C3A1E" stroke-width="2" stroke-linecap="round"/>',
        '  <line x1="18" y1="24" x2="26" y2="18" stroke="#5C3A1E" stroke-width="2" stroke-linecap="round"/>',
        '  <line x1="18" y1="28" x2="8" y2="22" stroke="#5C3A1E" stroke-width="1.5" stroke-linecap="round"/>',
        // Canopy (layered for depth)
        '  <ellipse cx="18" cy="13" rx="13" ry="10" fill="#3d6b14"/>',
        '  <ellipse cx="13" cy="11" rx="7" ry="6" fill="#4a7c1a" opacity="0.8"/>',
        '  <ellipse cx="23" cy="12" rx="6" ry="5.5" fill="#5a8c2a" opacity="0.7"/>',
        '  <ellipse cx="18" cy="9" rx="9" ry="6" fill="#6b9e34" opacity="0.6"/>',
        // Accent highlights (orange glow spots for the OSU colors)
        '  <circle cx="12" cy="9" r="1.5" fill="' + accent + '" opacity="0.6"/>',
        '  <circle cx="22" cy="8" r="1.2" fill="' + accent + '" opacity="0.5"/>',
        '  <circle cx="17" cy="6" r="1" fill="' + accent + '" opacity="0.7"/>',
        '  <circle cx="25" cy="12" r="1" fill="' + accent + '" opacity="0.4"/>',
        '</svg>'
      ].join('');

    default:
      return '';
  }
}


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
 * Features:
 *   - Progress bar color evolves per level (gray → amber → orange → black/orange)
 *   - Center icon evolves per level (seed → sprout → sapling → tree → full tree)
 *   - Level 5 is MAX LEVEL for the demo — bar shows "MAX LEVEL" instead of next target
 *   - Optional glow effect on the box at levels 4–5
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

  // Clamp level for display purposes (demo caps at 5)
  var displayLevel = Math.min(level, MAX_LEVEL);
  var isMaxLevel = level >= MAX_LEVEL;

  var progressPercent;
  if (isMaxLevel) {
    progressPercent = 100;
  } else {
    progressPercent = xpForNextLevel > 0
      ? Math.round((currentXP / xpForNextLevel) * 100)
      : 0;
  }

  // Get theme for current level
  var theme = LEVEL_THEMES[displayLevel] || LEVEL_THEMES[1];

  // ── Build the container ──
  var levelBox = document.createElement('div');
  levelBox.id = 'level-box';

  // Add glow effect for levels 4–5
  var boxStyle = LEVEL_BOX_BASE_STYLE;
  if (theme.glowColor !== 'none') {
    boxStyle += ' box-shadow: 0 0 12px ' + theme.glowColor + ', inset 0 0 8px ' + theme.glowColor + ';';
  }
  levelBox.style.cssText = boxStyle;

  // ── Build task rows (Earn XP section) ──
  var taskRowsHTML;
  if (isMaxLevel && tasks.length === 0) {
    taskRowsHTML = [
      '<div style="padding: 8px; font-size: 13px; color: ' + theme.accentColor + '; text-align: center; font-weight: 600;">',
      '  Max level reached!',
      '</div>'
    ].join('');
  } else if (tasks.length === 0) {
    taskRowsHTML = [
      '<div style="padding: 8px; font-size: 13px; color: ' + theme.accentColor + '; text-align: center;">',
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
          '  <span style="color: ' + theme.accentColor + '; font-weight: 600; font-size: 11px; margin-left: 8px; white-space: nowrap;">+' + t.xp + ' XP</span>',
          '</div>'
        ].join('');
      })
      .join('');
  }

  // ── Level label for header ──
  var levelLabel = isMaxLevel
    ? 'MAX LEVEL &middot; ' + totalXP + ' XP'
    : 'Level ' + displayLevel + ' &middot; ' + totalXP + ' XP';

  // ── XP text below bar ──
  var xpLeftText = isMaxLevel
    ? 'Max Level Reached'
    : currentXP + ' / ' + xpForNextLevel + ' XP to Level ' + (displayLevel + 1);
  var xpRightText = isMaxLevel
    ? 'MAX'
    : progressPercent + '%';

  // ── Get the evolving tree icon ──
  var iconSVG = getLevelIcon(displayLevel);

  // ── Assemble the full box HTML ──
  levelBox.innerHTML = [
    // Header row: "Progress" on the left, level info on the right
    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">',
    '  <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #2d3b45;">Progress</h2>',
    '  <span style="font-size: 12px; color: ' + theme.accentColor + '; font-weight: 600;">' + levelLabel + '</span>',
    '</div>',

    // XP progress bar with centered icon
    '<div style="position: relative; margin-bottom: 6px;">',
    // Bar track
    '  <div style="background: ' + theme.barBg + '; border-radius: 10px; height: 18px; overflow: hidden;">',
    '    <div style="',
    '      background: ' + theme.barGradient + ';',
    '      height: 100%; width: ' + progressPercent + '%; border-radius: 10px;',
    '      transition: width 0.6s ease;',
    '    "></div>',
    '  </div>',
    // Centered icon overlay
    '  <div style="',
    '    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);',
    '    width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;',
    '    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));',
    '    pointer-events: none;',
    '  ">',
    '    ' + iconSVG,
    '  </div>',
    '</div>',

    // XP text below bar
    '<div style="display: flex; justify-content: space-between; font-size: 11px; color: #6b7883; margin-bottom: 14px;">',
    '  <span>' + xpLeftText + '</span>',
    '  <span style="font-weight: 600; color: ' + theme.accentColor + ';">' + xpRightText + '</span>',
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
