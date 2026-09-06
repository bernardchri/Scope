import { Page, Text, View } from '@react-pdf/renderer';
import { Project } from '@/lib/types';
import { s } from './pdfStyles';

/** Page de garde partagée entre le cahier des charges et le devis. */
export function CoverPage({
  project,
  date,
  studioName,
  docKind,
}: {
  project: Project;
  date: string;
  studioName?: string;
  docKind: string;
}) {
  const client = project.client;
  const hasClient = !!(client?.name || client?.url || client?.contact);
  return (
    <Page size="A4" style={s.coverPage}>
      <Text style={s.coverStudio}>{studioName || 'SCOPE'}</Text>

      <View style={s.coverMiddle}>
        <Text style={s.coverDocKind}>{docKind}</Text>
        <Text style={s.coverProjectName}>{project.name}</Text>

        <View style={s.coverMeta}>
          <Text>
            <Text style={s.coverMetaLabel}>Date : </Text>{date}
          </Text>
          {project.version && (
            <Text>
              <Text style={s.coverMetaLabel}>Version : </Text>{project.version}
            </Text>
          )}
        </View>

        {hasClient && (
          <View style={s.coverClientBlock}>
            <Text style={s.coverClientLabel}>Client</Text>
            {client?.name && <Text style={s.coverClientName}>{client.name}</Text>}
            {client?.url && <Text style={s.coverClientDetail}>{client.url}</Text>}
            {client?.contact && <Text style={s.coverClientDetail}>{client.contact}</Text>}
          </View>
        )}
      </View>

      <Text style={s.coverStudio}>{date}</Text>
    </Page>
  );
}
