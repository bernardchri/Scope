import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
} from '@react-pdf/renderer';
import { Project, Component, TaskCategory, ComponentCategory } from '@/lib/types';
import { renderMarkdown } from './renderMarkdown';
import { CATEGORY_SECTION_LABELS, PDF_DISPLAY_ORDER, getActiveWidgets } from '@/lib/categoryHelpers';
import { TASK_CATEGORY_ORDER } from '@/lib/taskCategoryHelpers';
import { s, CONTENT_WIDTH, IMG_MAX_HEIGHT } from './pdfStyles';

// ─── Données ──────────────────────────────────────────────────────────────────

// Labels PDF pour les catégories de tâches (sans emoji ni tiret)
const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  frontend: 'Frontend',
  backend:  'Backend',
  seo:      'SEO',
  motion:   'Motion',
};

const CATEGORY_ORDER = PDF_DISPLAY_ORDER;

function componentAnchorId(component: Component): string {
  return `comp-${component.id}`;
}

function normalizeBase64(base64: string): string {
  return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ─── Styles : voir ./pdfStyles.ts ─────────────────────────────────────────────

// ─── Sous-composants ──────────────────────────────────────────────────────────

function PageHeader({ projectName, date }: { projectName: string; date: string }) {
  return (
    <View style={s.pageHeader} fixed>
      <Text style={s.pageHeaderApp}>SCOPE — {projectName.toUpperCase()}</Text>
      <Text style={s.pageHeaderDate}>{date}</Text>
    </View>
  );
}

function PageFooter({ studioName }: { studioName?: string }) {
  return (
    <>
      {studioName ? (
        <Text style={s.footerStudioName} fixed>{studioName}</Text>
      ) : null}
      <Text
        style={s.pageNumber}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        fixed
      />
    </>
  );
}

function TocRow({ component, showEstimations = true }: { component: Component; showEstimations?: boolean }) {
  return (
    <Link src={`#${componentAnchorId(component)}`}>
      <View style={s.tocRow}>
        <Text style={s.tocName}>{component.name}</Text>
        {showEstimations && component.estimatedHours != null && component.estimatedHours > 0 && (
          <Text style={s.tocHours}>{component.estimatedHours}h</Text>
        )}
      </View>
    </Link>
  );
}

function ComponentDetailBlock({
  component,
  allComponents,
  showEstimations = true,
  exportComments = false,
}: {
  component: Component;
  allComponents: Component[];
  showEstimations?: boolean;
  exportComments?: boolean;
}) {
  const images = (component.images ?? []).map(img => ({
    ...img,
    src: normalizeBase64(img.base64 || ''),
  }));

  const tasksByCategory = TASK_CATEGORY_ORDER.reduce<Partial<Record<TaskCategory, typeof component.tasks>>>(
    (acc, cat) => {
      const tasks = component.tasks.filter(t => t.category === cat);
      if (tasks.length > 0) acc[cat] = tasks;
      return acc;
    }, {}
  );

  const instanceComponents = component.instances
    .map(inst => {
      const comp = allComponents.find(c => c.id === inst.componentId);
      return comp ? { instance: inst, comp } : null;
    })
    .filter((x): x is { instance: typeof component.instances[0]; comp: Component } => x !== null);

  return (
    <View id={componentAnchorId(component)} style={s.componentDetailBlock}>

      {/* En-tête : nom + desc + heures (pleine largeur) */}
      <View style={s.componentDetailHeader} wrap={false}>
        <Text style={s.componentDetailName}>{component.name}</Text>
        {component.description && (
          <Text style={s.componentDetailDesc}>{component.description}</Text>
        )}
        {showEstimations && component.estimatedHours != null && component.estimatedHours > 0 && (
          <Text style={s.componentDetailHours}>{component.estimatedHours}h estimées</Text>
        )}
      </View>

      {/* Toutes les images, pleine largeur (pins pré-cuits dans le pixel par pdfExport) */}
      {images.map((img) => (
        <View key={img.id} style={s.componentImageBlock} wrap={false}>
          <Image src={img.src} style={s.componentImage} />
          {img.caption && (
            <Text style={s.imageCaption}>{img.caption}</Text>
          )}
        </View>
      ))}

      {/* Liste des tâches groupées par catégorie */}
      {component.tasks.length > 0 && (
        <View style={s.taskSection}>
          <Text style={s.taskSectionLabel}>Éléments</Text>
          {TASK_CATEGORY_ORDER.map(cat => {
            const tasks = tasksByCategory[cat];
            if (!tasks) return null;
            return (
              <View key={cat} style={s.taskCategoryGroup}>
                <Text style={s.taskCategoryTitle}>{TASK_CATEGORY_LABELS[cat]}</Text>
                {tasks.map(task => (
                  <View key={task.id} style={s.taskRow} wrap={false}>
                    <View style={[s.taskCheckbox, ...(task.completed ? [s.taskCheckboxDone] : [])]} />
                    <Text style={task.completed ? s.taskNameDone : s.taskName}>
                      {task.name}
                    </Text>
                    {task.pinRef && (
                      <View style={{
                        width: 13, height: 13, borderRadius: 6.5,
                        backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
                        marginLeft: 3,
                      }}>
                        <Text style={{ fontSize: 6, color: '#1d4ed8' }}>
                          {task.pinRef.pinNumber}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      )}

      {/* Contenu markdown (notes), paragraphes et commentaires */}
      {getActiveWidgets(component)
        .filter(w => w.type === 'notes' || w.type === 'paragraph' || (w.type === 'comment' && exportComments))
        .map(w => {
          const note = component.notes?.find(n => n.id === w.id);
          if (!note?.content) return null;
          if (w.type === 'paragraph') {
            return (
              <View key={w.id} style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 10, lineHeight: 1 }}>{note.content}</Text>
              </View>
            );
          }
          if (w.type === 'comment') {
            return (
              <View key={w.id} style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid #9ca3af' }}>
                <Text style={{ fontSize: 10, lineHeight: 1, color: '#6b7280' }}>{note.content}</Text>
              </View>
            );
          }
          return (
            <View key={w.id} style={{ marginTop: 14 }}>
              <Text style={s.taskSectionLabel}>Contenu</Text>
              {renderMarkdown(note.content)}
            </View>
          );
        })}

      {/* Composants utilisés (instances) */}
      {instanceComponents.length > 0 && (
        <View style={s.instancesSection}>
          <Text style={s.instancesSectionLabel}>Composants utilisés</Text>
          {instanceComponents.map(({ instance, comp }) => (
            <Link key={instance.id} src={`#${componentAnchorId(comp)}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <Text style={s.instanceName}>→ {comp.name}</Text>
                {instance.pinRef && (
                  <View style={{
                    width: 13, height: 13, borderRadius: 6.5,
                    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 6, color: '#1d4ed8'}}>
                      {instance.pinRef.pinNumber}
                    </Text>
                  </View>
                )}
              </View>
            </Link>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Document principal ───────────────────────────────────────────────────────

interface Props {
  project: Project;
  showEstimations?: boolean;
  exportComments?: boolean;
  studioName?: string;
}

export function ProjectPDFDocument({ project, showEstimations = true, exportComments = false, studioName }: Props) {
  const today = formatDate(new Date().toISOString());

  // Dédupliquer par ID (sécurité contre les données corrompues)
  const components = project.components.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);

  const totalHours = components.reduce((acc, c) => acc + (c.estimatedHours ?? 0), 0);
  const totalTasks = components.reduce((acc, c) => acc + c.tasks.length, 0);
  const doneTasks  = components.reduce((acc, c) => acc + c.tasks.filter(t => t.completed).length, 0);

  const grouped = CATEGORY_ORDER.reduce<Array<{ cat: ComponentCategory; components: Component[] }>>(
    (acc, cat) => {
      const items = components.filter(c => c.category === cat);
      if (items.length > 0) acc.push({ cat, components: items });
      return acc;
    }, []
  );

  return (
    <Document
      title={`${project.name} — Cahier des charges`}
      author="SCOPE"
      creator="SCOPE"
    >
      {/* ── Page 1 : Vue d'ensemble ─────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader projectName={project.name} date={today} />

        <Text style={s.projectName}>{project.name}</Text>
        <Text style={s.projectType}>Cahier des charges — {today}</Text>

        {project.description && (
          <>
            <Text style={s.sectionLabel}>Description</Text>
            <Text style={s.description}>{project.description}</Text>
          </>
        )}

        <Text style={s.sectionLabel}>Vue d'ensemble</Text>
        <View style={s.statsRow}>
          {showEstimations && totalHours > 0 && (
            <View style={s.statBox}>
              <Text style={s.statNumber}>{totalHours}h</Text>
              <Text style={s.statDesc}>estimées</Text>
            </View>
          )}
          <View style={s.statBox}>
            <Text style={s.statNumber}>{project.components.length}</Text>
            <Text style={s.statDesc}>composants</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNumber}>{totalTasks}</Text>
            <Text style={s.statDesc}>éléments</Text>
          </View>
        </View>

        <PageFooter studioName={studioName} />
      </Page>

      {/* ── Page 2 : Sommaire ────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader projectName={project.name} date={today} />

        <Text style={s.tocPageTitle}>Sommaire</Text>

        {grouped.map(({ cat, components: catComponents }) => (
          <View key={cat} style={s.tocCategorySection}>
            <Text style={s.tocCategoryHeader}>{CATEGORY_SECTION_LABELS[cat]}</Text>
            {catComponents.map(component => (
              <TocRow key={component.id} component={component} showEstimations={showEstimations} />
            ))}
          </View>
        ))}

        <PageFooter studioName={studioName} />
      </Page>

      {/* ── Pages composants (détail) — une page par catégorie ─────────────── */}
      {grouped.map(({ cat, components: catComponents }) => (
        <Page key={cat} size="A4" style={s.page}>
          <PageHeader projectName={project.name} date={today} />

          <View style={s.categoryHeader} wrap={false}>
            <Text style={s.categoryTitle}>{CATEGORY_SECTION_LABELS[cat]}</Text>
          </View>
          {catComponents.map(component => (
            <ComponentDetailBlock
              key={component.id}
              component={component}
              allComponents={components}
              showEstimations={showEstimations}
              exportComments={exportComments}
            />
          ))}

          <PageFooter studioName={studioName} />
        </Page>
      ))}

      {/* ── Bon pour accord ─────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader projectName={project.name} date={today} />

        <View style={s.approvalSection}>
          <Text style={s.approvalTitle}>Bon pour accord</Text>
          <Text style={s.approvalProjectRef}>Projet : {project.name}</Text>

          <View style={s.approvalField}>
            <Text style={s.approvalFieldLabel}>Nom / Société</Text>
            <View style={s.approvalFieldLine} />
          </View>
          <View style={s.approvalField}>
            <Text style={s.approvalFieldLabel}>Date</Text>
            <View style={s.approvalFieldLine} />
          </View>

          <Text style={s.approvalNote}>
            En signant ce document, le client reconnaît avoir pris connaissance du cahier des charges
            et approuve l'ensemble des composants et des solutions techniques présentés.
          </Text>

          <Text style={s.signatureLabel}>Signature</Text>
          <View style={s.signatureBox} />
        </View>

        <PageFooter studioName={studioName} />
      </Page>
    </Document>
  );
}
