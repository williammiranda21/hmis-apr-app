export type CellValueType = "count" | "percent" | "currency" | "average" | "text";

export type AprCell = {
  rowIdx: number;
  rowLabel: string;
  sectionLabel?: string;
  colIdx: number;
  colLabel: string;
  value: number | null;
  valueType: CellValueType;
};

export type AprQuestion = {
  questionId: string;
  fileName: string;
  title: string;
  columns: string[];
  rows: Array<{
    rowIdx: number;
    rowLabel: string;
    sectionLabel?: string;
    isSectionHeader: boolean;
    cells: AprCell[];
  }>;
  notApplicable: boolean;
};

export type AprManifest = {
  organizationName: string;
  organizationId: string;
  projectName: string;
  projectId: string;
  hmisProjectType: string;
  hmisProjectTypeLabel: string;
  rrhSubtype?: string;
  coordinatedEntryAccessPoint?: string;
  affiliatedWithResidentialProject?: string;
  projectIdsOfAffiliations?: string;
  cocNumber: string;
  geocode: string;
  victimServiceProvider?: string;
  hmisSoftwareNameAndVersion: string;
  reportStartDate: string;
  reportEndDate: string;
  totalActiveClients: number;
  totalActiveHouseholds: number;
};

export type AprReport = {
  manifest: AprManifest;
  questions: Record<string, AprQuestion>;
  uploadedAt: string;
  sourceFileName: string;
  warnings: string[];
};

export type DataQualityFinding = {
  severity: "info" | "warning" | "critical";
  questionId: string;
  message: string;
  suggestedAction?: string;
};

export type Recommendation = {
  category: string;
  finding: string;
  evidence: string;
  suggestedAction: string;
};

export type AnalysisResult = {
  dataQualityFindings: DataQualityFinding[];
  recommendations: Recommendation[];
  executiveSummary: string;
  generatedAt: string;
  model: string;
};

export const HMIS_PROJECT_TYPE_LABELS: Record<string, string> = {
  "0": "Emergency Shelter — Entry Exit",
  "1": "Emergency Shelter — Night by Night",
  "2": "Transitional Housing",
  "3": "Permanent Supportive Housing",
  "4": "Street Outreach",
  "6": "Services Only",
  "7": "Other",
  "8": "Safe Haven",
  "9": "PH — Housing Only",
  "10": "PH — Housing with Services (no disability required)",
  "11": "Day Shelter",
  "12": "Homeless Prevention",
  "13": "Rapid Re-Housing",
  "14": "Coordinated Entry",
};
