// React 19 compat shim for AntD 4.x.
//
// AntD 4.16's `es/modal/confirm` and `es/typography/util` import
// `render` / `unmountComponentAtNode` from `react-dom`. React 19 removed
// both, so the AntD-using app shell (components/app -> session-guard)
// fails to render and the backoffice shows a blank page (UAT: SX-19/20,
// TC-I01..03 blocked).
//
// This module is aliased in place of `react-dom` (exact match only) for
// the office package's webpack build. It re-exports the real React 19
// react-dom surface and re-implements the two removed legacy APIs on top
// of `react-dom/client`'s createRoot. The real module is pulled in via
// the `__real_react_dom` alias so the `react-dom$` exact alias does not
// loop back into this shim.
const Real = require("__real_react_dom");
const { createRoot } = require("react-dom/client");

const roots = new WeakMap();

function render(element, container, callback) {
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(element);
  if (typeof callback === "function") {
    // Legacy render's callback fired sync-ish; createRoot is async, so
    // defer a microtask. AntD only uses it for focus/afterClose timing.
    Promise.resolve().then(callback);
  }
  return null;
}

function unmountComponentAtNode(container) {
  const root = roots.get(container);
  if (!root) return false;
  root.unmount();
  roots.delete(container);
  return true;
}

module.exports = {
  ...Real,
  render,
  unmountComponentAtNode,
};
module.exports.default = module.exports;
