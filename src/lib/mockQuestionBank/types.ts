export const MOCK_QUESTION_TYPES = ['PS', 'DS', 'CR', 'RC', 'GI', 'TI', 'MSR', 'TPA'] as const;
export const MOCK_SECTIONS = ['quant', 'verbal', 'data_insights'] as const;
export const MOCK_RESPONSE_TYPES = ['single_choice', 'dropdowns', 'binary_matrix', 'two_part_matrix'] as const;
export const MOCK_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export type MockQuestionType = (typeof MOCK_QUESTION_TYPES)[number];
export type MockSection = (typeof MOCK_SECTIONS)[number];
export type MockResponseType = (typeof MOCK_RESPONSE_TYPES)[number];
export type MockDifficulty = (typeof MOCK_DIFFICULTIES)[number];

export type RichContentV1 = {
  type?: 'doc';
  version: 1;
  blocks: Array<Record<string, unknown>>;
};

export type PackageIssue = {
  severity: 'error' | 'warning';
  sheet: string;
  row?: number;
  field?: string;
  message: string;
  correctiveAction: string;
};

export type NormalizedOption = {
  slotId: string;
  optionId: string;
  displayOrder: number;
  content: RichContentV1;
  isCorrect: boolean;
};

export type NormalizedStimulus = {
  sourceNamespace: string;
  sourceStimulusId: string;
  stimulusType: 'rich_text' | 'passage' | 'graphic' | 'sortable_table' | 'tabbed_content' | 'two_part_context';
  title: string | null;
  content: unknown;
  config: unknown;
  revisionNote: string | null;
  action: 'reject' | 'skip' | 'new_revision';
  contentFingerprint: string;
};

export type NormalizedAsset = {
  sourceNamespace: string;
  sourceAssetId: string;
  fileName: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  altText: string;
  usage: string;
  sourceQuestionId: string | null;
  sourceStimulusId: string | null;
  sha256: string;
  byteSize: number;
  widthPx: number;
  heightPx: number;
  finalPath: string;
};

export type NormalizedQuestion = {
  sourceNamespace: string;
  sourceQuestionId: string;
  section: MockSection;
  questionType: MockQuestionType;
  responseType: MockResponseType;
  topic: string;
  subtopic: string | null;
  difficulty: MockDifficulty;
  sourceStimulusId: string | null;
  stimulusGroupOrder: number | null;
  stem: RichContentV1;
  interaction: Record<string, unknown>;
  explanation: RichContentV1 | null;
  sourceReference: string;
  answerConfirmation: 'FOUNDER_CONFIRMED' | 'SOURCE_CONFIRMED';
  answerCheck: 'PASS' | 'UNVERIFIABLE_REVIEW';
  assetCheck: 'PASS' | 'NOT_APPLICABLE';
  validationStatus: 'READY' | 'REVIEW';
  validationNotes: string | null;
  action: 'reject' | 'skip' | 'new_revision';
  contentFingerprint: string;
  options: NormalizedOption[];
  answer: Record<string, string>;
};

export type NormalizedQuestionPackage = {
  schemaVersion: 'ace-gmat-question-package/1.0';
  packageId: string;
  packageName: string;
  submittingNamespace: string;
  packageFingerprint: string;
  previewDigest: string;
  questions: NormalizedQuestion[];
  stimuli: NormalizedStimulus[];
  assets: NormalizedAsset[];
};

export type QuestionPackagePreview = {
  valid: boolean;
  expiresAt: string;
  package: NormalizedQuestionPackage;
  counts: {
    questions: number;
    stimuli: number;
    assets: number;
    warnings: number;
    errors: number;
    likelyDuplicates: number;
  };
  byQuestionType: Partial<Record<MockQuestionType, number>>;
  issues: PackageIssue[];
  duplicateKeys: string[];
};

export type MockTaxonomyEntry = {
  section: MockSection;
  topic: string;
  subtopic: string | null;
};

export type ExistingMockContent = {
  questions: Map<string, { fingerprint: string; status: string }>;
  stimuli: Map<string, { fingerprint: string; status: string; stimulusType?: string }>;
  assets: Map<string, { sha256: string }>;
  questionFingerprints: Set<string>;
  stimulusFingerprints: Set<string>;
};

export type ParseQuestionPackageContext = {
  authorizedNamespaces: Set<string>;
  taxonomy: MockTaxonomyEntry[];
  existing: ExistingMockContent;
  completedPackageFingerprints: Set<string>;
  now?: Date;
};

export type ParsedQuestionPackage = {
  preview: QuestionPackagePreview;
  assetBytes: Map<string, Buffer>;
};
