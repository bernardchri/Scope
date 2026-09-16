// Plugin Figma minimal : tag un composant/frame (type SCOPE) + ses calques
// enfants (zones d'intérêt nommées), exporte une image, et pousse le tout
// vers le pont HTTP local de SCOPE (voir src-tauri/src/figma_bridge.rs).
//
// Pas de re-sync dans cette version : chaque "Envoyer" est un import complet.

figma.showUI(__html__, { width: 340, height: 520 });

function getSelection() {
  const sel = figma.currentPage.selection;
  return sel.length === 1 ? sel[0] : null;
}

function serializeNode(node) {
  if (!node) return null;
  const children = 'children' in node
    ? node.children.map((c) => ({
        id: c.id,
        name: c.name,
        label: c.getPluginData('scopePinLabel') || '',
        included: c.getPluginData('scopePinLabel') !== '',
      }))
    : [];
  return {
    id: node.id,
    name: node.name,
    type: node.getPluginData('scopeType') || 'component',
    children,
  };
}

function postSelection() {
  figma.ui.postMessage({ type: 'selection', node: serializeNode(getSelection()) });
}

figma.on('selectionchange', postSelection);
postSelection();

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'init') {
    const token = (await figma.clientStorage.getAsync('scopeToken')) || '';
    const port = (await figma.clientStorage.getAsync('scopePort')) || '';
    figma.ui.postMessage({ type: 'config', token, port });
    return;
  }

  if (msg.type === 'save-config') {
    await figma.clientStorage.setAsync('scopeToken', msg.token || '');
    await figma.clientStorage.setAsync('scopePort', msg.port || '');
    return;
  }

  if (msg.type === 'tag-type') {
    const node = getSelection();
    if (node) {
      node.setPluginData('scopeType', msg.value);
      postSelection();
    }
    return;
  }

  if (msg.type === 'tag-pin') {
    const node = getSelection();
    if (!node || !('children' in node)) return;
    const child = node.children.find((c) => c.id === msg.childId);
    if (!child) return;
    child.setPluginData('scopePinLabel', msg.label || '');
    postSelection();
    return;
  }

  if (msg.type === 'send') {
    const node = getSelection();
    if (!node) {
      figma.ui.postMessage({ type: 'error', message: "Sélectionne un composant ou une frame." });
      return;
    }
    if (!msg.port || !msg.token) {
      figma.ui.postMessage({ type: 'error', message: 'Port et token requis (voir Paramètres SCOPE).' });
      return;
    }

    try {
      const bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } });
      const image = figma.base64Encode(bytes);

      const pins = ('children' in node ? node.children : [])
        .map((c) => {
          const label = c.getPluginData('scopePinLabel');
          if (!label) return null;
          return {
            figmaLayerId: c.id,
            label,
            x: node.width ? ((c.x + c.width / 2) / node.width) * 100 : 0,
            y: node.height ? ((c.y + c.height / 2) / node.height) * 100 : 0,
          };
        })
        .filter(Boolean);

      const payload = {
        name: msg.name || node.name,
        category: node.getPluginData('scopeType') || 'component',
        fileKey: figma.fileKey || '',
        nodeId: node.id,
        image,
        pins,
      };

      const res = await fetch(`http://localhost:${msg.port}/import-figma`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${msg.token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        figma.ui.postMessage({ type: 'sent-ok' });
      } else {
        figma.ui.postMessage({ type: 'error', message: `Échec de l'envoi (${res.status}).` });
      }
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: 'Erreur : ' + (e && e.message ? e.message : e) });
    }
  }
};
