/** Identifiant d'un vrai node Figma (« 123:456 ») ; les groupes d'états fabriqués par le plugin (« 0:1:accueil ») n'en sont pas. */
export const isRealFigmaNodeId = (nodeId?: string): nodeId is string => !!nodeId && /^\d+:\d+$/.test(nodeId);

/** Lien vers un node d'un fichier Figma, ouvrable dans Figma ou par un outil MCP Figma. */
export function figmaNodeUrl(fileKey: string | undefined, nodeId: string | undefined): string | undefined {
  if (!fileKey || !isRealFigmaNodeId(nodeId)) return undefined;
  return `https://www.figma.com/design/${fileKey}?node-id=${nodeId.replace(':', '-')}`;
}
