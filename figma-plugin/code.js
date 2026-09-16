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
// en une fois (msg.type === 'send-all') — chaque état part comme un envoi
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

/** Les états d'un component set sont ses enfants directs de type COMPONENT. */
function getStates(componentSet) {
  return componentSet.children.filter((c) => c.type === 'COMPONENT');
}

function errorMessage(e) {
  return e && e.message ? e.message : String(e);
}

/** Instances de composant dans le sous-arbre, sans descendre dans une
 * instance déjà trouvée (on veut les composants utilisés sur la page, pas
 * ceux imbriqués à l'intérieur, ex. une icône dans un bouton). */
function findInstances(node, out) {
  if (!node || !('children' in node)) return out;
  for (const child of node.children) {
    if (child.type === 'INSTANCE') {
      out.push(child);
    } else {
      findInstances(child, out);
    }
  }
  return out;
}

/** Id du component set (ou du composant lui-même hors variant) dont ce node
 * est une instance — même valeur que FigmaLink.groupNodeId côté SCOPE.
 * Utilise getMainComponentAsync (pas la propriété mainComponent, dépréciée)
 * car un composant venant d'une bibliothèque externe peut ne pas être
 * chargé en mémoire au moment de l'appel synchrone, qui renverrait alors
 * `null` silencieusement. */
async function getInstanceGroupId(instanceNode) {
  const main = await instanceNode.getMainComponentAsync();
  if (!main) return null;
  return main.parent && main.parent.type === 'COMPONENT_SET' ? main.parent.id : main.id;
}

/** Ids (dédupliqués) des composants Figma utilisés comme instances sur cette page. */
async function collectUsedComponentIds(node) {
  const instances = findInstances(node, []);
  const ids = await Promise.all(instances.map(getInstanceGroupId));
  return Array.from(new Set(ids.filter((id) => !!id)));
}

/** Légende taguée à la main sur variantNode/groupNode, sinon déduite de la
 * propriété de variant (ex: "Desktop"), sinon vide. */
function resolveCaption(groupNode, variantNode) {
  const captionHost = variantNode || groupNode;
  return captionHost.getPluginData('scopeCaption') || deriveVariantLabel(variantNode) || '';
}

async function serializeNode(node) {
  if (!node) return null;

  if (node.type === 'COMPONENT_SET') {
    const states = getStates(node)
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

  const caption = resolveCaption(groupNode, variantNode);

  return {
    id: pinHost.id,
    name: groupNode.name,
    type: groupNode.getPluginData('scopeType') || 'component',
    caption,
    description: getDescription(groupNode),
    isVariant: !!variantNode,
    isComponentSet: false,
    children,
    usedComponentsCount: (await collectUsedComponentIds(pinHost)).length,
  };
}

async function postSelection() {
  figma.ui.postMessage({ type: 'selection', node: await serializeNode(getSelection()) });
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

  const caption = resolveCaption(groupNode, variantNode);

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
    // Composants Figma détectés comme instances sur cette page — SCOPE relie
    // ceux déjà présents côté SCOPE (matching par groupNodeId) à ce composant.
    usedComponentIds: await collectUsedComponentIds(exportNode),
    bulk: !!bulk,
  };

  const res = await fetch(`http://localhost:${port}/scope-push`, {
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

/** Vérifie que port/token sont renseignés ; poste l'erreur et renvoie false sinon. */
function requireBridgeConfig(msg) {
  if (msg.port && msg.token) return true;
  figma.ui.postMessage({ type: 'error', message: 'Port et token requis (voir Paramètres SCOPE).' });
  return false;
}

figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case 'init': {
      const token = (await figma.clientStorage.getAsync('scopeToken')) || '';
      const port = (await figma.clientStorage.getAsync('scopePort')) || '';
      figma.ui.postMessage({ type: 'config', token, port });
      return;
    }

    case 'save-config': {
      await figma.clientStorage.setAsync('scopeToken', msg.token || '');
      await figma.clientStorage.setAsync('scopePort', msg.port || '');
      return;
    }

    case 'tag-type': {
      const node = getSelection();
      if (node) {
        const { groupNode } = getComponentGroup(node);
        groupNode.setPluginData('scopeType', msg.value);
        postSelection();
      }
      return;
    }

    case 'tag-caption': {
      const node = getSelection();
      if (node) {
        const { groupNode, variantNode } = getComponentGroup(node);
        (variantNode || groupNode).setPluginData('scopeCaption', msg.value || '');
      }
      return;
    }

    case 'tag-pin': {
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

    case 'send': {
      const node = getSelection();
      if (!node) {
        figma.ui.postMessage({ type: 'error', message: "Sélectionne un composant ou une frame." });
        return;
      }
      if (!requireBridgeConfig(msg)) return;

      try {
        const { groupNode, variantNode } = getComponentGroup(node);
        await exportAndSend({ groupNode, variantNode, name: msg.name, port: msg.port, token: msg.token, bulk: false });
        figma.ui.postMessage({ type: 'sent-ok' });
      } catch (e) {
        figma.ui.postMessage({ type: 'error', message: 'Erreur : ' + errorMessage(e) });
      }
      return;
    }

    case 'send-all': {
      const node = getSelection();
      if (!node || node.type !== 'COMPONENT_SET') {
        figma.ui.postMessage({ type: 'error', message: "Sélectionne un component set." });
        return;
      }
      if (!requireBridgeConfig(msg)) return;

      const states = getStates(node);
      let sent = 0;
      for (const variantNode of states) {
        try {
          await exportAndSend({ groupNode: node, variantNode, name: msg.name, port: msg.port, token: msg.token, bulk: true });
          sent++;
          figma.ui.postMessage({ type: 'send-all-progress', sent, total: states.length });
        } catch (e) {
          figma.ui.postMessage({
            type: 'error',
            message: `État "${variantNode.name}" : ` + errorMessage(e),
          });
        }
      }
      figma.ui.postMessage({ type: 'send-all-done', sent, total: states.length });
      return;
    }
  }
};
