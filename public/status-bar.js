// Match the status bar to the saved palette before anything else loads
// (iOS only reads it at launch). Kept in sync by applyTheme() in src/shared/lib/theme.ts.
try {
  var c = localStorage.getItem('bill-splitter-status-bar')
  if (c) document.querySelector('meta[name="theme-color"]').content = c
} catch (e) {}
