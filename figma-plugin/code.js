// Plugin Figma minimal : tag un composant/frame (type SCOPE) + ses calques
// enfants (zones d'intérêt nommées), exporte une image, et pousse le tout
// vers le pont HTTP local de SCOPE (voir src-tauri/src/figma_bridge.rs).
//
// Gère les variants de composant (ex: "Header" avec un état "State=Desktop") :
// le nom/type/description SCOPE sont partagés au niveau du component set
// ("Header"), la légende/l'image/les pins sont propres à l'état sélectionné
// ("Desktop"). Sans variant, groupNode === le node sélectionné (comportement
// inchangé).
//
// Sélectionner directement le component set permet d'envoyer tous ses états
// en une fois (msg.type === 'send-all') — chaque état part comme un import
// distinct (payload.bulk = true), appliqué automatiquement côté SCOPE sans
// popup de confirmation par état (voir ComponentList.tsx).

figma.showUI(__html__, { width: 340, height: 520 });

function getSelection() {
  const sel = figma.currentPage.selection;
  return sel.length === 1 ? sel[0] : null;
}

/** Sépare le node sélectionné en { groupNode, variantNode } si c'est un état
 * d'un component set. groupNode porte le nom/type/description partagés,
 * variantNode (si présent) porte la légende/les pins/l'export propres à
 * cet état précis. */
function getComponentGroup(node) {
  if (node && node.type === 'COMPONENT' && node.parent && node.parent.type === 'COMPONENT_SET') {
    return { groupNode: node.parent, variantNode: node };
  }
  return { groupNode: node, variantNode: null };
}

function deriveVariantLabel(variantNode) {
  if (!variantNode || !variantNode.variantProperties) return '';
  return Object.values(variantNode.variantProperties).join(', ');
}

function getDescription(node) {
  return 'description' in node ? (node.description || '') : '';
}

function serializeNode(node) {
  if (!node) return null;

  if (node.type === 'COMPONENT_SET') {
    const states = node.children
      .filter((c) => c.type === 'COMPONENT')
      .map((c) => ({
        id: c.id,
        label: c.getPluginData('scopeCaption') || deriveVariantLabel(c) || c.name,
      }));
    return {
      id: node.id,
      name: node.name,
      type: node.getPluginData('scopeType') || 'component',
      description: getDescription(node),
      isComponentSet: true,
      states,
    };
  }

  const { groupNode, variantNode } = getComponentGroup(node);
  const pinHost = variantNode || groupNode;

  const children = 'children' in pinHost
    ? pinHost.children.map((c) => ({
        id: c.id,
        name: c.name,
        label: c.getPluginData('scopePinLabel') || '',
        included: c.getPluginData('scopePinLabel') !== '',
      }))
    : [];

  const captionHost = variantNode || groupNode;
  const caption = captionHost.getPluginData('scopeCaption') || deriveVariantLabel(variantNode) || '';

  return {
    id: pinHost.id,
    name: groupNode.name,
    type: groupNode.getPluginData('scopeType') || 'component',
    caption,
    description: getDescription(groupNode),
    isVariant: !!variantNode,
    isComponentSet: false,
    children,
  };
}

function postSelection() {
  figma.ui.postMessage({ type: 'selection', node: serializeNode(getSelection()) });
}

figma.on('selectionchange', postSelection);
postSelection();

/** Exporte un état (variantNode ou groupNode lui-même hors variant) et le
 * pousse vers le pont SCOPE. Utilisé pour un envoi simple et pour chaque
 * état d'un envoi groupé. */
async function exportAndSend({ groupNode, variantNode, name, port, token, bulk }) {
  const exportNode = variantNode || groupNode;

  const bytes = await exportNode.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } });
  const image = figma.base64Encode(bytes);

  const pins = ('children' in exportNode ? exportNode.children : [])
    .map((c) => {
      const label = c.getPluginData('scopePinLabel');
      if (!label) return null;
      return {
        figmaLayerId: c.id,
        label,
        x: exportNode.width ? ((c.x + c.width / 2) / exportNode.width) * 100 : 0,
        y: exportNode.height ? ((c.y + c.height / 2) / exportNode.height) * 100 : 0,
      };
    })
    .filter(Boolean);

  const captionHost = variantNode || groupNode;
  const caption = captionHost.getPluginData('scopeCaption') || deriveVariantLabel(variantNode) || '';

  const payload = {
    name: name || groupNode.name,
    category: groupNode.getPluginData('scopeType') || 'component',
    caption,
    description: getDescription(groupNode),
    fileKey: figma.fileKey || '',
    // Identifie le composant (stable entre tous les états) : sert à
    // retrouver le bon composant SCOPE cible sans repasser par la liste.
    groupNodeId: groupNode.id,
    // Identifie l'état exporté (une image distincte par état).
    nodeId: exportNode.id,
    image,
    pins,
    bulk: !!bulk,
  };

  const res = await fetch(`http://localhost:${port}/import-figma`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Échec de l'envoi (${res.status}).`);
  }
}

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
      const { groupNode } = getComponentGroup(node);
      groupNode.setPluginData('scopeType', msg.value);
      postSelection();
    }
    return;
  }

  if (msg.type === 'tag-caption') {
    const node = getSelection();
    if (node) {
      const { groupNode, variantNode } = getComponentGroup(node);
      (variantNode || groupNode).setPluginData('scopeCaption', msg.value || '');
    }
    return;
  }

  if (msg.type === 'tag-pin') {
    const node = getSelection();
    if (!node) return;
    const { groupNode, variantNode } = getComponentGroup(node);
    const pinHost = variantNode || groupNode;
    if (!('children' in pinHost)) return;
    const child = pinHost.children.find((c) => c.id === msg.childId);
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
      const { groupNode, variantNode } = getComponentGroup(node);
      await exportAndSend({ groupNode, variantNode, name: msg.name, port: msg.port, token: msg.token, bulk: false });
      figma.ui.postMessage({ type: 'sent-ok' });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: 'Erreur : ' + (e && e.message ? e.message : e) });
    }
    return;
  }

  if (msg.type === 'send-all') {
    const node = getSelection();
    if (!node || node.type !== 'COMPONENT_SET') {
      figma.ui.postMessage({ type: 'error', message: "Sélectionne un component set." });
      return;
    }
    if (!msg.port || !msg.token) {
      figma.ui.postMessage({ type: 'error', message: 'Port et token requis (voir Paramètres SCOPE).' });
      return;
    }

    const states = node.children.filter((c) => c.type === 'COMPONENT');
    let sent = 0;
    for (const variantNode of states) {
      try {
        await exportAndSend({ groupNode: node, variantNode, name: msg.name, port: msg.port, token: msg.token, bulk: true });
        sent++;
        figma.ui.postMessage({ type: 'send-all-progress', sent, total: states.length });
      } catch (e) {
        figma.ui.postMessage({
          type: 'error',
          message: `État "${variantNode.name}" : ` + (e && e.message ? e.message : e),
        });
      }
    }
    figma.ui.postMessage({ type: 'send-all-done', sent, total: states.length });
  }
};
