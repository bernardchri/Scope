import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import { Project, Component, ComponentCategory } from '@/lib/types';

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

function getPrimaryImage(component: Component): string | null {
  const images = component.images ?? [];
  const primary = images.find(i => i.isPrimary) ?? images[0];
  if (!primary) return null;
  return primary.base64.startsWith('data:') ? primary.base64 : `data:image/jpeg;base64,${primary.base64}`;
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
  pageHeaderApp: { fontSize: 8, letterSpacing: 2, color: '#aaa' },
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

  // Entête catégorie
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
  componentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#ebebeb',
    borderLeftStyle: 'solid',
  },
  componentContent: { flex: 1 },
  componentName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 3,
  },
  componentDesc: {
    fontSize: 9,
    color: '#555',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  componentHours: {
    fontSize: 9,
    color: '#aaa',
  },
  componentImage: {
    width: 160,
    height: 110,
    objectFit: 'contain',
    marginLeft: 16,
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderStyle: 'solid',
    borderRadius: 2,
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

function ComponentBlock({ component }: { component: Component }) {
  const imageSrc = getPrimaryImage(component);
  return (
    <View style={s.componentRow} wrap={false}>
      <View style={s.componentContent}>
        <Text style={s.componentName}>{component.name}</Text>
        {component.description && (
          <Text style={s.componentDesc}>{component.description}</Text>
        )}
        {component.estimatedHours != null && component.estimatedHours > 0 && (
          <Text style={s.componentHours}>⏱ {component.estimatedHours}h estimées</Text>
        )}
      </View>
      {imageSrc && (
        <Image src={imageSrc} style={s.componentImage} />
      )}
    </View>
  );
}

// ─── Document principal ───────────────────────────────────────────────────────

interface Props { project: Project }

export function ProjectPDFDocument({ project }: Props) {
  const today = formatDate(new Date().toISOString());

  const totalHours = project.components.reduce((acc, c) => acc + (c.estimatedHours ?? 0), 0);
  const totalTasks = project.components.reduce((acc, c) => acc + c.tasks.length, 0);
  const doneTasks  = project.components.reduce((acc, c) => acc + c.tasks.filter(t => t.completed).length, 0);

  const grouped = CATEGORY_ORDER.reduce<Array<{ cat: ComponentCategory; components: Component[] }>>(
    (acc, cat) => {
      const items = project.components.filter(c => c.category === cat);
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
            <Text style={s.statNumber}>{doneTasks}/{totalTasks}</Text>
            <Text style={s.statDesc}>tâches complétées</Text>
          </View>
        </View>

        {/* Sommaire */}
        <Text style={s.sectionLabel}>Sommaire</Text>
        {grouped.map(({ cat, components }) => (
          <View key={cat} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 10, color: '#444' }}>{CATEGORY_LABELS[cat]}</Text>
            <Text style={{ fontSize: 10, color: '#aaa' }}>{components.length} composant{components.length > 1 ? 's' : ''}</Text>
          </View>
        ))}

        <PageNum />
      </Page>

      {/* ── Pages composants ────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader projectName={project.name} date={today} />

        {grouped.map(({ cat, components }) => (
          <View key={cat}>
            <View style={s.categoryHeader}>
              <Text style={s.categoryTitle}>{CATEGORY_LABELS[cat]}</Text>
            </View>
            {components.map(component => (
              <ComponentBlock key={component.id} component={component} />
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
