import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
} from '@react-pdf/renderer';
import { Project, Component, ComponentCategory, TaskCategory } from '@/lib/types';
import { renderMarkdown } from './renderMarkdown';

// ─── Données ──────────────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  template:    'Templates',
  navigation:  'Navigation',
  section:     'Sections',
  composition: 'Compositions',
  element:     'Éléments',
  media:       'Médias',
  form:        'Formulaires',
  content:     'Contenus',
  document:    'Documents',
};

const CATEGORY_ORDER: ComponentCategory[] = [
  'template', 'navigation', 'section', 'composition',
  'element', 'media', 'form', 'content', 'document',
];

const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  frontend: 'Frontend',
  backend:  'Backend',
  seo:      'SEO',
  motion:   'Motion',
};

const TASK_CATEGORY_ORDER: TaskCategory[] = ['frontend', 'backend', 'seo', 'motion'];

function componentAnchorId(component: Component): string {
  return `comp-${component.id}`;
}

function getPrimaryImage(component: Component): { src: string; pins: NonNullable<typeof component.images>[0]['pins'] } | null {
  const images = component.images ?? [];
  const primary = images.find(i => i.isPrimary) ?? images[0];
  if (!primary) return null;
  const src = primary.base64.startsWith('data:') ? primary.base64 : `data:image/jpeg;base64,${primary.base64}`;
  return { src, pins: primary.pins };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    paddingTop: 52,
    paddingBottom: 52,
    paddingHorizontal: 56,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },

  // En-tête de page
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    borderBottomStyle: 'solid',
  },
  pageHeaderApp:  { fontSize: 8, letterSpacing: 2, color: '#aaa' },
  pageHeaderDate: { fontSize: 8, color: '#aaa' },

  // Titre projet (page 1)
  projectName: {
    fontSize: 30,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: '#1a1a1a',
  },
  projectType: {
    fontSize: 10,
    color: '#777',
    marginBottom: 32,
    letterSpacing: 0.5,
  },

  // Label de section
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    color: '#999',
    marginBottom: 8,
    marginTop: 28,
    textTransform: 'uppercase',
  },

  // Description
  description: {
    fontSize: 10,
    color: '#444',
    lineHeight: 1.7,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderStyle: 'solid',
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 3,
  },
  statDesc: {
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },

  // ─── Sommaire ────────────────────────────────────────────────────────────────
  tocPageTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 28,
    color: '#1a1a1a',
  },
  tocCategorySection: {
    marginBottom: 18,
  },
  tocCategoryHeader: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    color: '#aaa',
    textTransform: 'uppercase',
    marginBottom: 4,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
    borderBottomStyle: 'solid',
  },
  tocRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
    borderBottomStyle: 'solid',
  },
  tocName: {
    fontSize: 10,
    color: '#1a1a1a',
    flex: 1,
    textDecoration: 'none',
  },
  tocHours: {
    fontSize: 8,
    color: '#bbb',
    marginLeft: 8,
  },

  // ─── Détail composants ───────────────────────────────────────────────────────
  categoryHeader: {
    marginTop: 36,
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    borderBottomStyle: 'solid',
  },
  categoryTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    color: '#888',
    textTransform: 'uppercase',
  },

  // Bloc composant
  componentDetailBlock: {
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderBottomStyle: 'solid',
  },
  componentDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  componentDetailContent: {
    flex: 1,
    paddingRight: 16,
  },
  componentDetailName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  componentDetailDesc: {
    fontSize: 9,
    color: '#555',
    lineHeight: 1.5,
    marginBottom: 5,
  },
  componentDetailHours: {
    fontSize: 9,
    color: '#aaa',
  },
  componentDetailImage: {
    width: 150,
    height: 100,
    objectFit: 'contain',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderStyle: 'solid',
    borderRadius: 2,
    flexShrink: 0,
  },

  // Tâches
  taskSection: {
    marginTop: 14,
  },
  taskSectionLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    color: '#bbb',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  taskCategoryGroup: {
    marginBottom: 8,
  },
  taskCategoryTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#ccc',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 7,
  },
  taskCheckbox: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'solid',
    borderRadius: 2,
    flexShrink: 0,
  },
  taskCheckboxDone: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  taskName: {
    fontSize: 9,
    color: '#333',
  },
  taskNameDone: {
    fontSize: 9,
    color: '#bbb',
  },

  // Composants utilisés
  instancesSection: {
    marginTop: 12,
  },
  instancesSectionLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    color: '#bbb',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  instanceName: {
    fontSize: 9,
    color: '#555',
    marginBottom: 3,
    textDecoration: 'none',
  },

  // Numéro de page
  pageNumber: {
    position: 'absolute',
    bottom: 28,
    right: 56,
    fontSize: 8,
    color: '#ccc',
  },

  // ─── Bon pour accord ─────────────────────────────────────────────────────────
  approvalSection: {
    marginTop: 'auto',
    paddingTop: 60,
  },
  approvalTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  approvalProjectRef: {
    fontSize: 10,
    color: '#777',
    marginBottom: 44,
  },
  approvalField: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 22,
  },
  approvalFieldLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    width: 110,
    paddingBottom: 4,
  },
  approvalFieldLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#888',
    borderBottomStyle: 'solid',
    height: 18,
  },
  approvalNote: {
    fontSize: 9,
    color: '#aaa',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  signatureLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  signatureBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'solid',
    borderRadius: 4,
    height: 130,
  },
});

// ─── Sous-composants ──────────────────────────────────────────────────────────

function PageHeader({ projectName, date }: { projectName: string; date: string }) {
  return (
    <View style={s.pageHeader} fixed>
      <Text style={s.pageHeaderApp}>SCOPE — {projectName.toUpperCase()}</Text>
      <Text style={s.pageHeaderDate}>{date}</Text>
    </View>
  );
}

function PageNum() {
  return (
    <Text
      style={s.pageNumber}
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      fixed
    />
  );
}

function TocRow({ component }: { component: Component }) {
  return (
    <Link src={`#${componentAnchorId(component)}`}>
      <View style={s.tocRow}>
        <Text style={s.tocName}>{component.name}</Text>
        {component.estimatedHours != null && component.estimatedHours > 0 && (
          <Text style={s.tocHours}>{component.estimatedHours}h</Text>
        )}
      </View>
    </Link>
  );
}

function ComponentDetailBlock({
  component,
  allComponents,
}: {
  component: Component;
  allComponents: Component[];
}) {
  const primaryImage = getPrimaryImage(component);
  const imageSrc = primaryImage?.src ?? null;
  const imagePins = primaryImage?.pins ?? [];

  const tasksByCategory = TASK_CATEGORY_ORDER.reduce<Partial<Record<TaskCategory, typeof component.tasks>>>(
    (acc, cat) => {
      const tasks = component.tasks.filter(t => t.category === cat);
      if (tasks.length > 0) acc[cat] = tasks;
      return acc;
    }, {}
  );

  const instanceComponents = component.instances
    .map(inst => allComponents.find(c => c.id === inst.componentId))
    .filter((c, i, arr): c is Component => !!c && arr.findIndex(x => x?.id === c.id) === i);

  return (
    <View id={componentAnchorId(component)} style={s.componentDetailBlock}>

      {/* En-tête : nom + image côte à côte */}
      <View style={s.componentDetailHeader} wrap={false}>
        <View style={s.componentDetailContent}>
          <Text style={s.componentDetailName}>{component.name}</Text>
          {component.description && (
            <Text style={s.componentDetailDesc}>{component.description}</Text>
          )}
          {component.estimatedHours != null && component.estimatedHours > 0 && (
            <Text style={s.componentDetailHours}>⏱ {component.estimatedHours}h estimées</Text>
          )}
        </View>
        {imageSrc && (
          <View style={{ position: 'relative', width: 150, height: 100, flexShrink: 0 }}>
            <Image src={imageSrc} style={s.componentDetailImage} />
            {imagePins?.map(pin => (
              <View
                key={pin.id}
                style={{
                  position: 'absolute',
                  left: (pin.x / 100) * 150 - 7,
                  top: (pin.y / 100) * 100 - 7,
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: '#3b82f6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 6, color: 'white', fontFamily: 'Helvetica-Bold' }}>
                  {pin.number}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

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
                  <View key={task.id} style={s.taskRow}>
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
                        <Text style={{ fontSize: 6, color: '#1d4ed8', fontFamily: 'Helvetica-Bold' }}>
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

      {/* Contenu markdown (documents) */}
      {component.category === 'document' && component.content && (
        <View style={{ marginTop: 14 }}>
          <Text style={s.taskSectionLabel}>Contenu</Text>
          {renderMarkdown(component.content)}
        </View>
      )}

      {/* Composants utilisés (instances) */}
      {instanceComponents.length > 0 && (
        <View style={s.instancesSection}>
          <Text style={s.instancesSectionLabel}>Composants utilisés</Text>
          {instanceComponents.map(inst => (
            <Link key={inst.id} src={`#${componentAnchorId(inst)}`}>
              <Text style={s.instanceName}>→ {inst.name}</Text>
            </Link>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Document principal ───────────────────────────────────────────────────────

interface Props { project: Project }

export function ProjectPDFDocument({ project }: Props) {
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
          <View style={s.statBox}>
            <Text style={s.statNumber}>{totalHours}h</Text>
            <Text style={s.statDesc}>estimées</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNumber}>{project.components.length}</Text>
            <Text style={s.statDesc}>composants</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNumber}>{totalTasks}</Text>
            <Text style={s.statDesc}>éléments</Text>
          </View>
        </View>

        <PageNum />
      </Page>

      {/* ── Page 2 : Sommaire ────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader projectName={project.name} date={today} />

        <Text style={s.tocPageTitle}>Sommaire</Text>

        {grouped.map(({ cat, components }) => (
          <View key={cat} style={s.tocCategorySection}>
            <Text style={s.tocCategoryHeader}>{CATEGORY_LABELS[cat]}</Text>
            {components.map(component => (
              <TocRow key={component.id} component={component} />
            ))}
          </View>
        ))}

        <PageNum />
      </Page>

      {/* ── Pages composants (détail) ────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader projectName={project.name} date={today} />

        {grouped.map(({ cat, components }) => (
          <View key={cat}>
            <View style={s.categoryHeader} wrap={false}>
              <Text style={s.categoryTitle}>{CATEGORY_LABELS[cat]}</Text>
            </View>
            {components.map(component => (
              <ComponentDetailBlock
                key={component.id}
                component={component}
                allComponents={components}
              />
            ))}
          </View>
        ))}

        <PageNum />
      </Page>

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
            et approuve l'ensemble des composants et estimations présentés.
          </Text>

          <Text style={s.signatureLabel}>Signature</Text>
          <View style={s.signatureBox} />
        </View>

        <PageNum />
      </Page>
    </Document>
  );
}
