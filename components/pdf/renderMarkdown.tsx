import { Text, View } from '@react-pdf/renderer';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root, RootContent, PhrasingContent } from 'mdast';

// ─── Styles ───────────────────────────────────────────────────────────────────

const t = {
  h1: { fontSize: 18, fontWeight: 700, marginBottom: 6, marginTop: 16, color: '#1a1a1a' },
  h2: { fontSize: 15, fontWeight: 700, marginBottom: 5, marginTop: 14, color: '#1a1a1a' },
  h3: { fontSize: 12, fontWeight: 700, marginBottom: 4, marginTop: 10, color: '#1a1a1a' },
  h4: { fontSize: 11, fontWeight: 700, marginBottom: 3, marginTop: 8,  color: '#333' },
  h5: { fontSize: 10, fontWeight: 700, marginBottom: 3, marginTop: 6,  color: '#333' },
  h6: { fontSize: 9,  fontWeight: 700, marginBottom: 3, marginTop: 6,  color: '#555' },
  p:  { fontSize: 8, lineHeight: 1.7, marginBottom: 8, color: '#333' },
  blockquote: {
    borderLeftWidth: 3, borderLeftColor: '#ddd', borderLeftStyle: 'solid',
    paddingLeft: 12, marginBottom: 8,
  } as const,
  codeBlock: {
    backgroundColor: '#1e1e1e', borderRadius: 4, padding: 12,
    marginBottom: 10, marginTop: 4,
  },
  code: { fontFamily: 'Courier', fontSize: 9, color: '#d4d4d4', lineHeight: 1.5 },
  list:            { marginBottom: 8 },
  listItem:        { flexDirection: 'row', marginBottom: 0 } as const,
  bullet:          { fontSize: 10, width: 16, color: '#555', flexShrink: 0 },
  listItemContent: { flex: 1 },
  hr: {
    borderBottomWidth: 1, borderBottomColor: '#e0e0e0',
    borderBottomStyle: 'solid', marginTop: 10, marginBottom: 10,
  } as const,
  table: { marginBottom: 10 },
  tableHeaderRow: {
    flexDirection: 'row', backgroundColor: '#f5f5f5',
    borderBottomWidth: 1, borderBottomColor: '#e0e0e0', borderBottomStyle: 'solid',
  } as const,
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', borderBottomStyle: 'solid',
  } as const,
  tableCellHeader: { flex: 1, padding: 6, fontSize: 9, fontWeight: 700, color: '#1a1a1a' },
  tableCell:       { flex: 1, padding: 6, fontSize: 9, color: '#333' },
};

const HEADING_STYLES = [t.h1, t.h2, t.h3, t.h4, t.h5, t.h6] as const;

// ─── Inline renderer ──────────────────────────────────────────────────────────

function renderInline(nodes: PhrasingContent[]): React.ReactElement[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text':
        return <Text key={i}>{node.value}</Text>;
      case 'strong':
        return <Text key={i} style={{ fontWeight: 700 }}>
          {renderInline(node.children as PhrasingContent[])}
        </Text>;
      case 'emphasis':
        return <Text key={i} style={{ fontStyle: 'italic' }}>
          {renderInline(node.children as PhrasingContent[])}
        </Text>;
      case 'inlineCode':
        return <Text key={i} style={{ fontFamily: 'Courier', fontSize: 9, color: '#c7254e' }}>
          {node.value}
        </Text>;
      case 'delete':
        return <Text key={i} style={{ color: '#999' }}>
          {renderInline(node.children as PhrasingContent[])}
        </Text>;
      case 'link':
        return <Text key={i} style={{ color: '#2563eb' }}>
          {renderInline(node.children as PhrasingContent[])}
        </Text>;
      case 'break':
        return <Text key={i}>{'\n'}</Text>;
      default:
        if ('value' in node) return <Text key={i}>{node.value as string}</Text>;
        return <Text key={i} />;
    }
  });
}

// ─── Block renderer ───────────────────────────────────────────────────────────

function renderBlock(node: RootContent, key: number, isInList: boolean = false): React.ReactElement | null {
  switch (node.type) {

    case 'heading':
      return (
        <Text key={key} style={HEADING_STYLES[node.depth - 1]}>
          {renderInline(node.children as PhrasingContent[])}
        </Text>
      );

    case 'paragraph':
      return (
        <Text key={key} style={{ ...t.p, marginBottom: isInList ? 0 : t.p.marginBottom }}>
          {renderInline(node.children as PhrasingContent[])}
        </Text>
      );

    case 'code':
      return (
        <View key={key} style={t.codeBlock}>
          <Text style={t.code}>{node.value}</Text>
        </View>
      );

    case 'blockquote':
      return (
        <View key={key} style={t.blockquote}>
          {node.children.map((child, i) => renderBlock(child, i, false))}
        </View>
      );

    case 'list': {
      const ordered = node.ordered;
      return (
        <View key={key} style={t.list}>
          {node.children.map((item, i) => (
            <View key={i} style={t.listItem}>
              <Text style={t.bullet}>{ordered ? `${i + 1}.` : '•'}</Text>
              <View style={t.listItemContent}>
                {item.children.map((child, j) => renderBlock(child, j, true))}
              </View>
            </View>
          ))}
        </View>
      );
    }

    case 'thematicBreak':
      return <View key={key} style={t.hr} />;

    case 'table': {
      const [header, ...rows] = node.children;
      return (
        <View key={key} style={t.table}>
          <View style={t.tableHeaderRow}>
            {header.children.map((cell, i) => (
              <Text key={i} style={t.tableCellHeader}>
                {renderInline(cell.children as PhrasingContent[])}
              </Text>
            ))}
          </View>
          {rows.map((row, i) => (
            <View key={i} style={t.tableRow}>
              {row.children.map((cell, j) => (
                <Text key={j} style={t.tableCell}>
                  {renderInline(cell.children as PhrasingContent[])}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    }

    default:
      return null;
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function renderMarkdown(content: string): React.ReactElement {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(content) as Root;
  return (
    <View>
      {tree.children.map((node, i) => renderBlock(node, i, false))}
    </View>
  );
}
