import { StyleSheet } from '@react-pdf/renderer';

// Largeur de contenu A4 : 595.28pt − 2 × 56pt de padding
export const CONTENT_WIDTH = 483;
export const IMG_MAX_HEIGHT = 620;

export const s = StyleSheet.create({
  page: {
    paddingTop: 52,
    paddingBottom: 52,
    paddingHorizontal: 56,
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },

  // En-tête de page
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
    fontFamily: 'Inter', fontWeight: 700,
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
    fontFamily: 'Inter', fontWeight: 700,
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
    fontFamily: 'Inter', fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 3,
  },
  statDesc: {
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },

  // ─── Page de garde ───────────────────────────────────────────────────────────
  coverPage: {
    paddingTop: 52,
    paddingBottom: 52,
    paddingHorizontal: 56,
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  coverStudio: {
    fontSize: 9,
    letterSpacing: 2,
    color: '#999',
    textTransform: 'uppercase',
  },
  coverMiddle: {
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  coverDocKind: {
    fontSize: 10,
    letterSpacing: 1,
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  coverProjectName: {
    fontSize: 34,
    fontFamily: 'Inter', fontWeight: 700,
    color: '#1a1a1a',
    lineHeight: 1.15,
  },
  coverMeta: {
    marginTop: 24,
    fontSize: 10,
    color: '#555',
    lineHeight: 1.7,
  },
  coverMetaLabel: {
    color: '#aaa',
  },
  coverClientBlock: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    borderTopStyle: 'solid',
  },
  coverClientLabel: {
    fontSize: 8,
    fontFamily: 'Inter', fontWeight: 700,
    letterSpacing: 1.5,
    color: '#aaa',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  coverClientName: {
    fontSize: 13,
    fontFamily: 'Inter', fontWeight: 700,
    color: '#1a1a1a',
  },
  coverClientDetail: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },

  // ─── Sommaire ────────────────────────────────────────────────────────────────
  tocPageTitle: {
    fontSize: 22,
    fontFamily: 'Inter', fontWeight: 700,
    marginBottom: 28,
    color: '#1a1a1a',
  },
  tocCategorySection: {
    marginBottom: 18,
  },
  tocCategoryHeader: {
    fontSize: 7,
    fontFamily: 'Inter', fontWeight: 700,
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
    fontFamily: 'Inter', fontWeight: 700,
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
    marginBottom: 10,
  },
  componentDetailName: {
    fontSize: 13,
    fontFamily: 'Inter', fontWeight: 700,
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
  componentImageBlock: {
    marginBottom: 10,
  },
  componentImage: {
    width: CONTENT_WIDTH,
    maxHeight: IMG_MAX_HEIGHT,
    objectFit: 'contain',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderStyle: 'solid',
    borderRadius: 2,
  },
  imageCaption: {
    fontSize: 8,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Tâches
  taskSection: {
    marginTop: 14,
  },
  taskSectionLabel: {
    fontSize: 7,
    fontFamily: 'Inter', fontWeight: 700,
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
    fontFamily: 'Inter', fontWeight: 700,
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
    fontFamily: 'Inter', fontWeight: 700,
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
  footerStudioName: {
    position: 'absolute' as const,
    bottom: 28,
    left: 56,
    fontSize: 8,
    color: '#ccc',
  },

  // ─── Devis ───────────────────────────────────────────────────────────────────
  quoteIntro: {
    fontSize: 10,
    color: '#555',
    lineHeight: 1.6,
    marginBottom: 20,
  },
  quoteTable: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderStyle: 'solid',
    borderRadius: 3,
    marginBottom: 14,
  },
  quoteTableHead: {
    flexDirection: 'row',
    backgroundColor: '#f6f6f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    borderBottomStyle: 'solid',
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  quoteTableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    borderBottomStyle: 'solid',
  },
  quoteColName: { flex: 1, fontSize: 9, color: '#333' },
  quoteColHours: { width: 90, fontSize: 9, color: '#666', textAlign: 'right' },
  quoteColAmount: { width: 90, fontSize: 9, color: '#333', textAlign: 'right' },
  quoteColHead: {
    fontSize: 7,
    fontFamily: 'Inter', fontWeight: 700,
    letterSpacing: 1,
    color: '#999',
    textTransform: 'uppercase',
  },
  quoteTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'baseline',
    gap: 14,
    paddingTop: 10,
    marginBottom: 4,
  },
  quoteTotalLabel: {
    fontSize: 10,
    fontFamily: 'Inter', fontWeight: 700,
    color: '#1a1a1a',
  },
  quoteTotalAmount: {
    fontSize: 16,
    fontFamily: 'Inter', fontWeight: 700,
    color: '#1a1a1a',
  },
  quoteVatMention: {
    fontSize: 8,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'right',
    marginBottom: 24,
  },
  quoteConditions: {
    marginTop: 8,
  },
  quoteConditionRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  quoteConditionLabel: {
    width: 130,
    fontSize: 9,
    color: '#999',
  },
  quoteConditionValue: {
    flex: 1,
    fontSize: 9,
    color: '#333',
  },
  quoteScopeList: {
    marginTop: 4,
  },
  quoteScopeItem: {
    fontSize: 9,
    color: '#777',
    marginBottom: 2,
  },

  // ─── Bon pour accord ─────────────────────────────────────────────────────────
  approvalSection: {
    marginTop: 'auto',
    paddingTop: 60,
  },
  approvalTitle: {
    fontSize: 22,
    fontFamily: 'Inter', fontWeight: 700,
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
    fontFamily: 'Inter', fontWeight: 700,
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
    fontFamily: 'Inter', fontWeight: 700,
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
