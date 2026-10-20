'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useProjectStore, undo, redo, initPreviousProject } from '@/lib/projectStore';
import { Component, ScopeItemType } from '@/lib/types';
import { FigmaImportPayload, applyFigmaImport, buildComponentFromFigmaUpdates, diffFigmaFields } from '@/lib/figmaImport';
import CollectionsPage from './CollectionsPage';
import { Collection } from '@/lib/types';
import FigmaSyncRecapDialog, { SyncRecapEntry } from './modals/FigmaSyncRecapDialog';
import { withDefaultEstimate, openProjectFolder } from '@/lib/persistence';
import { clearImageCache } from '@/lib/imageManager';
import { message } from '@tauri-apps/plugin-dialog';
import { publishFigmaComponentCatalog } from '@/lib/figmaBridge';
import { publishMcpSnapshot } from '@/lib/mcpSnapshot';
import { runMcpCommand } from '@/lib/mcpCommands';
import { invoke } from '@tauri-apps/api/core';
import { useShortcuts } from '@/lib/hooks/useShortcuts';
import ComponentSidebar from './ComponentSidebar';
import ScopeItemDetail from './ScopeItemDetail';
import ProjectHeader from './ProjectHeader';
import ProjectDashboard from './ProjectDashboard';
import CreateComponentModal, { COLLECTION_TYPE, type NewElementType } from './modals/CreateComponentModal';
import { createCollection } from '@/lib/collections';
import FigmaImportDialog from './modals/FigmaImportDialog';
import { Button } from '@/components/ui/button';
import { PanelLeftOpen } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';

interface ComponentListProps {
  projectId: string;
}

export default function ComponentList({ projectId }: ComponentListProps) {
  const projects = useProjectStore(state => state.projects);
  const currentProjectPath = useProjectStore(state => state.currentProjectPath);
  const updateProject = useProjectStore(state => state.updateProject);
  const addComponent = useProjectStore(state => state.addComponent);
  const deleteComponent = useProjectStore(state => state.deleteComponent);
  const updateComponent = useProjectStore(state => state.updateComponent);
  const reorderComponents = useProjectStore(state => state.reorderComponents);
  const duplicateComponent = useProjectStore(state => state.duplicateComponent);
  const canDeleteComponent = useProjectStore(state => state.canDeleteComponent);

  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Fenêtre étroite : la sidebar quitte la mise en page et s'ouvre depuis un burger.
  const compact = useMediaQuery('(max-width: 900px)');
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { if (!compact) setMenuOpen(false); }, [compact]);
  const [figmaImportPayload, setFigmaImportPayload] = useState<FigmaImportPayload | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // Collection ouverte dans la zone principale (choisie dans la sidebar) ; exclusive avec un élément ouvert.
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [syncRecap, setSyncRecap] = useState<SyncRecapEntry[]>([]);
  const bulkQueueRef = useRef(Promise.resolve());
  const detailScrollRef = useRef<HTMLDivElement>(null);

  const activeProject = projects.find(p => p.id === projectId);

  const currentDetailId = navHistory.length > 0 ? navHistory[navHistory.length - 1] : null;
  useEffect(() => {
    // Le remount (key) + un scrollTo synchrone ne suffisaient pas : WebKit
    // (webview Tauri) semble réappliquer son propre scroll après le paint,
    // après le passage de cet effet. On repousse le reset après le rendu du
    // navigateur (double rAF) pour gagner la course contre cette restauration.
    const el = detailScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      });
    });
  }, [currentDetailId]);

  useShortcuts({
    'new-element': useCallback(() => setIsModalOpen(true), []),
    'undo': useCallback(() => undo(), []),
    'redo': useCallback(() => redo(), []),
  });

  // Import Figma issu d'un "Importer tous les états" : plusieurs événements
  // arrivent en rafale, on les applique en série (sans popup de revue par
  // état) pour que chacun voie l'état du store laissé par le précédent —
  // sinon deux états créeraient chacun un nouveau composant au lieu de
  // partager le même.
  const autoApplyFigmaImport = useCallback(async (payload: FigmaImportPayload) => {
    const state = useProjectStore.getState();
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return;
    const existing = project.components.find(c => c.figmaLink?.groupNodeId === payload.groupNodeId);
    try {
      const result = await applyFigmaImport(state.currentProjectPath || '', payload, existing, project.components);
      if (existing) {
        const diffs = diffFigmaFields(payload, existing);
        if (diffs.length) {
          setSyncRecap(prev => prev.some(e => e.componentId === existing.id)
            ? prev
            : [...prev, { componentId: existing.id, name: existing.name, diffs }]);
        }
        state.updateComponent(project.id, existing.id, result.componentUpdates);
      } else {
        state.addComponent(project.id, await withDefaultEstimate(buildComponentFromFigmaUpdates(result.componentUpdates)));
      }
    } catch (e) {
      console.error('[figma-import bulk] échec pour', payload.nodeId, e);
    }
  }, [projectId]);

  useEffect(() => {
    const unlisten = listen<FigmaImportPayload>('figma-import', (event) => {
      if (event.payload.bulk) {
        bulkQueueRef.current = bulkQueueRef.current.then(() => autoApplyFigmaImport(event.payload));
      } else {
        setFigmaImportPayload(event.payload);
      }
    });
    return () => { unlisten.then(fn => fn()); };
  }, [autoApplyFigmaImport]);

  // Liste servie au plugin Figma (GET /scope-components) pour lier chaque
  // composant coché dans une frame à un composant SCOPE.
  const catalogComponents = activeProject?.components;
  useEffect(() => {
    const catalog = (catalogComponents || []).map(c => ({
      id: c.id,
      name: c.name,
      category: c.category,
      figmaGroupNodeId: c.figmaLink?.groupNodeId,
    }));
    publishFigmaComponentCatalog(catalog).catch(() => {});
  }, [catalogComponents]);

  // Instantané lu par le serveur MCP (Claude Code) : republié à chaque changement, retiré à la fermeture.
  useEffect(() => {
    if (!activeProject) return;
    const timer = setTimeout(() => { publishMcpSnapshot(activeProject, currentProjectPath || undefined).catch(() => {}); }, 300);
    return () => clearTimeout(timer);
  }, [activeProject, currentProjectPath]);
  useEffect(() => () => { publishMcpSnapshot(null).catch(() => {}); }, []);

  // Commandes d'écriture de Claude Code (serveur MCP) : appliquées via le store, donc annulables (Cmd+Z).
  useEffect(() => {
    const unlisten = listen<{ id: string; tool: string; args: Record<string, unknown> }>('mcp-command', async (event) => {
      const { id, tool, args } = event.payload;
      const state = useProjectStore.getState();
      const project = state.projects.find(p => p.id === projectId);
      let outcome: { ok: boolean; result?: unknown; error?: string };
      if (!project) {
        outcome = { ok: false, error: 'Aucun projet ouvert dans SCOPE.' };
      } else {
        const run = runMcpCommand(project, tool, args ?? {});
        if (run.ok) {
          state.updateComponent(project.id, run.componentId, run.updates);
          outcome = { ok: true, result: run.result };
        } else {
          outcome = { ok: false, error: run.error };
        }
      }
      await invoke('mcp_respond', { id, outcome }).catch(() => {});
    });
    return () => { unlisten.then(fn => fn()); };
  }, [projectId]);

  if (!activeProject) return null;

  const selectedComponentId = navHistory.length > 0 ? navHistory[navHistory.length - 1] : null;
  const canGoBack = navHistory.length > 1;

  // Ajout depuis un pin : lit le store au moment de l'appel (plusieurs créations de suite).
  function handleCreateCollection(collection: Collection) {
    const project = useProjectStore.getState().projects.find(p => p.id === projectId);
    updateProject(projectId, { collections: [...(project?.collections || []), collection] });
  }

  // Relit scope.json et remonte l'interface : reprend les changements faits hors de l'écran (serveur MCP,
  // édition du fichier) et les états locaux des blocs. Rien n'est réécrit sur le disque.
  async function handleRefresh() {
    if (!currentProjectPath) return;
    setRefreshing(true);
    try {
      const fresh = await openProjectFolder(currentProjectPath);
      if (!fresh) throw new Error('scope.json illisible');
      clearImageCache();
      initPreviousProject(fresh);
      useProjectStore.getState().openProject(fresh, currentProjectPath);
      setRefreshKey(k => k + 1);
    } catch (e) {
      await message(`Impossible de recharger le projet : ${e instanceof Error ? e.message : e}`, { title: 'Recharger', kind: 'error' });
    } finally {
      setRefreshing(false);
    }
  }

  function selectFromSidebar(id: string | null) {
    setSelectedCollectionId(null);
    setNavHistory(id ? [id] : []);
  }

  function navigateTo(id: string) {
    setNavHistory(prev => [...prev, id]);
  }

  function navigateBack() {
    setNavHistory(prev => prev.slice(0, -1));
  }

  const selectedItem = selectedComponentId
    ? activeProject.components.find(c => c.id === selectedComponentId)
    : null;

  const showingDashboard = !selectedComponentId;

  async function handleCreateComponent(name: string, description: string, category: NewElementType) {
    if (!activeProject) return;
    if (category === COLLECTION_TYPE) {
      const collection = { ...createCollection(name, activeProject.collections ?? []), description: description.trim() || undefined };
      updateProject(activeProject.id, { collections: [...(activeProject.collections ?? []), collection] });
      setIsModalOpen(false);
      setSelectedCollectionId(collection.id);
      setNavHistory([]);
      return;
    }
    const newComponent = await withDefaultEstimate({
      id: crypto.randomUUID(),
      name,
      description: description || undefined,
      category,
      instances: [],
      tasks: [],
    });
    addComponent(activeProject.id, newComponent);
    setIsModalOpen(false);
    setNavHistory([newComponent.id]);
  }

  function handleDeleteComponent(componentId: string) {
    if (!activeProject) return;
    if (!canDeleteComponent(activeProject.id, componentId)) {
      const usages = activeProject.components.filter(c =>
        c.instances.some(i => i.componentId === componentId)
      );
      alert(`Impossible de supprimer, utilisé dans : ${usages.map(c => c.name).join(', ')}`);
      return;
    }
    if (selectedComponentId === componentId) setNavHistory([]);
    deleteComponent(activeProject.id, componentId);
  }

  function handleDuplicateComponent(componentId: string) {
    if (!activeProject) return;
    const newId = duplicateComponent(activeProject.id, componentId);
    if (newId) setNavHistory([newId]);
  }

  function handleUpdateComponent(componentId: string, updates: Partial<Component>) {
    if (!activeProject) return;
    updateComponent(activeProject.id, componentId, updates);
  }

  async function handleFigmaImportCreate(updates: Partial<Component>) {
    if (!activeProject) return;
    const newComponent = await withDefaultEstimate(buildComponentFromFigmaUpdates(updates));
    addComponent(activeProject.id, newComponent);
    setNavHistory([newComponent.id]);
  }

  // Même sidebar en colonne fixe ou dans le menu burger ; `afterNavigate` referme le menu après un choix.
  function renderSidebar(afterNavigate?: () => void) {
    const then = (fn: () => void) => () => { fn(); afterNavigate?.(); };
    return (
      <ComponentSidebar
        components={activeProject!.components}
        selectedComponentId={selectedComponentId}
        showingDashboard={showingDashboard && !selectedCollectionId}
        onSelectComponent={(id) => { selectFromSidebar(id); afterNavigate?.(); }}
        onReorderComponents={(ids, categoryChange) => reorderComponents(activeProject!.id, ids, categoryChange)}
        onGoHome={then(() => { setSelectedCollectionId(null); setNavHistory([]); })}
        collections={activeProject!.collections}
        selectedCollectionId={selectedComponentId ? null : selectedCollectionId}
        onSelectCollection={(id) => { setSelectedCollectionId(id); setNavHistory([]); afterNavigate?.(); }}
        onToggleSidebar={() => setSidebarOpen(false)}
        onNewElement={then(() => setIsModalOpen(true))}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <ProjectHeader
        projectName={activeProject.name}
        onRenameProject={(name) => updateProject(activeProject.id, { name })}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onOpenMenu={compact ? () => setMenuOpen(true) : undefined}
      />

      <CreateComponentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleCreateComponent}
      />

      <FigmaSyncRecapDialog
        entries={syncRecap}
        onApply={(id, updates) => {
          updateComponent(activeProject.id, id, updates);
          // Le champ appliqué ne doit plus être proposé.
          const field = Object.keys(updates)[0];
          setSyncRecap(prev => prev
            .map(e => e.componentId === id ? { ...e, diffs: e.diffs.filter(d => d.field !== field) } : e)
            .filter(e => e.diffs.length));
        }}
        onDismiss={(id) => setSyncRecap(prev => prev.filter(e => e.componentId !== id))}
        onClose={() => setSyncRecap([])}
      />
      <FigmaImportDialog
        payload={figmaImportPayload}
        components={activeProject.components}
        folderPath={currentProjectPath || ''}
        onClose={() => setFigmaImportPayload(null)}
        onCreate={handleFigmaImportCreate}
        onUpdate={handleUpdateComponent}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {compact ? (
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetContent side="left" className="w-72 p-0 sm:max-w-xs">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {/* Marge haute : la croix de fermeture du menu occupe le coin */}
              <div className="h-full pt-10">{renderSidebar(() => setMenuOpen(false))}</div>
            </SheetContent>
          </Sheet>
        ) : sidebarOpen ? (
          <div className="w-64 border-r shrink-0 overflow-y-auto">
            {renderSidebar()}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            title="Afficher la sidebar"
            className="absolute top-3 left-3 z-10"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}

        {selectedItem ? (
          <div key={`${selectedItem.id}-${refreshKey}`} ref={detailScrollRef} className="flex-1 overflow-y-auto p-8 pl-14">
              <ScopeItemDetail
                projectId={projectId}
                item={selectedItem}
                allComponents={activeProject.components}
                folderPath={currentProjectPath || ''}
                onUpdate={handleUpdateComponent}
                onDelete={() => handleDeleteComponent(selectedItem.id)}
                onDuplicate={() => handleDuplicateComponent(selectedItem.id)}
                onNavigate={navigateTo}
                collections={activeProject.collections}
                onCreateCollection={handleCreateCollection}
              />
          </div>
        ) : selectedCollectionId && activeProject.collections?.some(c => c.id === selectedCollectionId) ? (
          <CollectionsPage
            key={`${selectedCollectionId}-${refreshKey}`}
            collectionId={selectedCollectionId}
            onRemoved={() => setSelectedCollectionId(null)}
            collections={activeProject.collections || []}
            components={activeProject.components}
            onChange={(collections) => updateProject(activeProject.id, { collections })}
            onSelectComponent={(id) => { setSelectedCollectionId(null); setNavHistory([id]); }}
            className="flex-1"
          />
        ) : (
          <ProjectDashboard
            key={refreshKey}
            project={activeProject}
            folderPath={currentProjectPath || ''}
            onSelectComponent={(id) => setNavHistory([id])}
            onOpenCollection={(id) => { setSelectedCollectionId(id); setNavHistory([]); }}
            onUpdateProject={(updates) => updateProject(activeProject.id, updates)}
            className="flex-1 min-h-0"
          />
        )}
      </div>
    </div>
  );
}
