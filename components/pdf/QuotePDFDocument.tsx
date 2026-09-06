import { Document, Page, Text, View } from '@react-pdf/renderer';
import { Project, Component } from '@/lib/types';
import { PDF_DISPLAY_ORDER } from '@/lib/categoryHelpers';
import { CoverPage } from './CoverPage';
import { s } from './pdfStyles';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function euros(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} €`;
}

interface Props {
  project: Project;
  studioName?: string;
}

export function QuotePDFDocument({ project, studioName }: Props) {
  const today = formatDate(new Date().toISOString());
  const rate = project.hourlyRate ?? 0;

  // Ordre d'affichage cohérent avec le cahier des charges
  const components = PDF_DISPLAY_ORDER.flatMap(cat =>
    project.components.filter(c => c.category === cat)
  );
  // Sécurité : composants hors ordre connu
  const rest = project.components.filter(c => !components.includes(c));
  const orderedComponents = [...components, ...rest];

  const lines = orderedComponents.map(c => {
    const hours = c.estimatedHours ?? 0;
    return { component: c, hours, amount: hours * rate };
  });

  const totalHours = lines.reduce((acc, l) => acc + l.hours, 0);
  const totalHT = totalHours * rate;

  const depositPercent = project.depositPercent;
  const depositAmount = depositPercent ? (totalHT * depositPercent) / 100 : null;

  const outOfScope: Array<{ component: Component; names: string[] }> = orderedComponents
    .map(c => ({ component: c, names: c.tasks.filter(t => t.scope === 'v2').map(t => t.name) }))
    .filter(x => x.names.length > 0);

  return (
    <Document title={`${project.name} — Devis`} author={studioName || 'SCOPE'} creator="SCOPE">
      <CoverPage project={project} date={today} studioName={studioName} docKind="Devis" />

      <Page size="A4" style={s.page}>
        <View style={s.pageHeader} fixed>
          <Text style={s.pageHeaderApp}>DEVIS — {project.name.toUpperCase()}</Text>
          <Text style={s.pageHeaderDate}>{today}</Text>
        </View>

        <Text style={s.projectName}>Devis</Text>
        <Text style={s.projectType}>
          {project.name}
          {project.version ? ` — ${project.version}` : ''} — {today}
        </Text>

        {project.description && <Text style={s.quoteIntro}>{project.description}</Text>}

        <Text style={s.sectionLabel}>Détail de la prestation</Text>
        <View style={s.quoteTable}>
          <View style={s.quoteTableHead}>
            <Text style={[s.quoteColName, s.quoteColHead]}>Prestation</Text>
            <Text style={[s.quoteColHours, s.quoteColHead]}>Temps estimé</Text>
            <Text style={[s.quoteColAmount, s.quoteColHead]}>Montant HT</Text>
          </View>
          {lines.map(l => (
            <View key={l.component.id} style={s.quoteTableRow} wrap={false}>
              <Text style={s.quoteColName}>{l.component.name}</Text>
              <Text style={s.quoteColHours}>{l.hours > 0 ? `${l.hours} h` : '—'}</Text>
              <Text style={s.quoteColAmount}>{rate > 0 && l.hours > 0 ? euros(l.amount) : '—'}</Text>
            </View>
          ))}
        </View>

        <View style={s.quoteTotalRow}>
          <Text style={s.quoteTotalLabel}>Total HT</Text>
          <Text style={s.quoteTotalAmount}>{rate > 0 ? euros(totalHT) : `${totalHours} h`}</Text>
        </View>
        <Text style={s.quoteVatMention}>
          {rate > 0
            ? 'TVA non applicable, art. 293 B du CGI'
            : 'Aucun taux horaire défini — montants non calculés'}
        </Text>

        <Text style={s.sectionLabel}>Conditions</Text>
        <View style={s.quoteConditions}>
          {depositPercent && depositAmount !== null && rate > 0 && (
            <View style={s.quoteConditionRow}>
              <Text style={s.quoteConditionLabel}>Acompte à la commande</Text>
              <Text style={s.quoteConditionValue}>
                {depositPercent} % — {euros(depositAmount)} ; solde à la livraison
              </Text>
            </View>
          )}
          {project.estimatedDelay && (
            <View style={s.quoteConditionRow}>
              <Text style={s.quoteConditionLabel}>Délai indicatif</Text>
              <Text style={s.quoteConditionValue}>{project.estimatedDelay}</Text>
            </View>
          )}
          {project.quoteValidityDays && (
            <View style={s.quoteConditionRow}>
              <Text style={s.quoteConditionLabel}>Validité du devis</Text>
              <Text style={s.quoteConditionValue}>{project.quoteValidityDays} jours</Text>
            </View>
          )}
          <View style={s.quoteConditionRow}>
            <Text style={s.quoteConditionLabel}>Périmètre</Text>
            <Text style={s.quoteConditionValue}>
              Conforme au cahier des charges. Les éléments marqués « v2 » sont hors périmètre.
            </Text>
          </View>
        </View>

        {outOfScope.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Hors périmètre — évolutions (v2)</Text>
            <View style={s.quoteScopeList}>
              {outOfScope.map(({ component, names }) => (
                <Text key={component.id} style={s.quoteScopeItem}>
                  {component.name} : {names.join(', ')}
                </Text>
              ))}
            </View>
          </>
        )}

        {studioName ? <Text style={s.footerStudioName} fixed>{studioName}</Text> : null}
        <Text
          style={s.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.pageHeader} fixed>
          <Text style={s.pageHeaderApp}>DEVIS — {project.name.toUpperCase()}</Text>
          <Text style={s.pageHeaderDate}>{today}</Text>
        </View>

        <View style={s.approvalSection}>
          <Text style={s.approvalTitle}>Bon pour accord</Text>
          <Text style={s.approvalProjectRef}>
            Devis : {project.name}
            {rate > 0 ? ` — ${euros(totalHT)} HT` : ''}
          </Text>

          <View style={s.approvalField}>
            <Text style={s.approvalFieldLabel}>Nom / Société</Text>
            <View style={s.approvalFieldLine} />
          </View>
          <View style={s.approvalField}>
            <Text style={s.approvalFieldLabel}>Date</Text>
            <View style={s.approvalFieldLine} />
          </View>

          <Text style={s.approvalNote}>
            {'Bon pour accord — la signature vaut acceptation du devis et de ses conditions.'}
          </Text>

          <Text style={s.signatureLabel}>Signature</Text>
          <View style={s.signatureBox} />
        </View>

        {studioName ? <Text style={s.footerStudioName} fixed>{studioName}</Text> : null}
        <Text
          style={s.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
