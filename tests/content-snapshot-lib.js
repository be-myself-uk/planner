function extractContentMap() {
  function leafContent(node) {
    const parts = [];
    if (typeof node.title === 'string') parts.push(node.title);
    if (typeof node.titleFn === 'function') parts.push(node.titleFn.toString());
    if (typeof node.summary === 'string') parts.push(node.summary);
    if (typeof node.summaryFn === 'function') parts.push(node.summaryFn.toString());
    if (typeof node.detail === 'string') parts.push(node.detail);
    if (typeof node.detailFn === 'function') parts.push(node.detailFn.toString());
    return parts.join('\n');
  }
  function walk(node, path, out) {
    out[path] = leafContent(node);
    if (node.variants) {
      Object.keys(node.variants).forEach((key) => walk(node.variants[key], `${path}.variants.${key}`, out));
    }
    if (node.regions) {
      Object.keys(node.regions).forEach((key) => walk(node.regions[key], `${path}.regions.${key}`, out));
    }
  }
  const out = {};
  Object.keys(window.PLAN_ITEMS).forEach((key) => walk(window.PLAN_ITEMS[key], key, out));
  window.SERVICES.forEach((svc) => { out[`SERVICES.${svc.key}`] = leafContent(svc); });
  return out;
}

module.exports = { extractContentMap };
