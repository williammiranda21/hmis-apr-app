import JSZip from "jszip";
import Papa from "papaparse";
import {
  AprCell,
  AprManifest,
  AprQuestion,
  AprReport,
  CellValueType,
  HMIS_PROJECT_TYPE_LABELS,
} from "@/lib/apr-schema/types";
import { questionTitle } from "./questions";

const cleanLabel = (raw: unknown): string => {
  if (raw === null || raw === undefined) return "";
  let s = String(raw).trim();
  while (s.startsWith('"') && s.endsWith('"') && s.length > 1) {
    s = s.slice(1, -1).trim();
  }
  return s;
};

/**
 * WellSky CSV exports include whitespace around quoted fields in header rows
 * (e.g. `, "Performance Measure: Adults..., Average Gain" ,`). Papaparse only
 * recognizes a field as quoted if the quote immediately follows the delimiter,
 * so the leading space causes it to treat the field as unquoted and split on
 * any internal comma. Strip whitespace between delimiters and quotes so the
 * parser sees a normal CSV.
 */
const preprocessCsv = (text: string): string =>
  text
    .replace(/([,\n\r])[ \t]+"/g, '$1"')
    .replace(/"[ \t]+(?=[,\n\r])/g, '"')
    .replace(/^[ \t]+"/gm, '"');

const parseNumeric = (raw: unknown): number | null => {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(/,/g, "").replace(/\$/g, "").replace(/%/g, "");
  if (s === "" || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const inferValueType = (rowLabel: string, colLabel: string): CellValueType => {
  const lr = rowLabel.toLowerCase();
  const lc = colLabel.toLowerCase();
  if (lc.includes("percent") || lc.includes("%") || lr.startsWith("percentage")) return "percent";
  if (lr.startsWith("average") || lc.includes("average")) return "average";
  if (lr.includes("income") && (lr.includes("$") || lr.includes("amount"))) return "currency";
  return "count";
};

const looksLikeSectionHeader = (row: string[]): boolean => {
  if (row.length === 0) return false;
  const label = cleanLabel(row[0]);
  if (!label) return false;
  const dataCells = row.slice(1);
  if (dataCells.length === 0) return true;
  return dataCells.every((c) => c === undefined || c === null || String(c).trim() === "");
};

const parseManifest = (csvText: string, projectTypeLabels: Record<string, string>): AprManifest => {
  const parsed = Papa.parse<string[]>(preprocessCsv(csvText), { skipEmptyLines: true });
  if (parsed.data.length < 2) {
    throw new Error("Q4a.csv is malformed: expected header row and data row");
  }
  const headers = parsed.data[0].map(cleanLabel);
  const values = parsed.data[1].map((v) => (v === undefined ? "" : String(v).trim()));
  const map: Record<string, string> = {};
  headers.forEach((h, i) => {
    map[h.toLowerCase()] = values[i] ?? "";
  });

  const get = (key: string): string => {
    const found = Object.keys(map).find((k) => k === key.toLowerCase());
    return found ? map[found] : "";
  };

  const hmisType = get("HMIS Project Type");
  return {
    organizationName: get("Organization Name"),
    organizationId: get("Organization ID"),
    projectName: get("Project Name"),
    projectId: get("Project ID"),
    hmisProjectType: hmisType,
    hmisProjectTypeLabel: projectTypeLabels[hmisType] ?? `Type ${hmisType}`,
    rrhSubtype: get("RRH Subtype") || undefined,
    coordinatedEntryAccessPoint: get("Coordinated Entry Access Point") || undefined,
    affiliatedWithResidentialProject: get("Affiliated with a residential project") || undefined,
    projectIdsOfAffiliations: get("Project IDs of affiliations") || undefined,
    cocNumber: get("CoC Number"),
    geocode: get("Geocode"),
    victimServiceProvider: get("Victim Service Provider") || undefined,
    hmisSoftwareNameAndVersion: get("HMIS Software Name and Version Number"),
    reportStartDate: get("Report Start Date"),
    reportEndDate: get("Report End Date"),
    totalActiveClients: Number(get("Total Active Clients") || 0),
    totalActiveHouseholds: Number(get("Total Active Households") || 0),
  };
};

const parseQuestionCsv = (questionId: string, fileName: string, csvText: string): AprQuestion => {
  const trimmed = csvText.trim();
  if (!trimmed) {
    return {
      questionId,
      fileName,
      title: questionTitle(questionId),
      columns: [],
      rows: [],
      notApplicable: true,
    };
  }

  const parsed = Papa.parse<string[]>(preprocessCsv(csvText), { skipEmptyLines: true });
  const data = parsed.data.filter((r) => r.length > 0 && r.some((c) => String(c).trim() !== ""));

  if (data.length === 0) {
    return {
      questionId,
      fileName,
      title: questionTitle(questionId),
      columns: [],
      rows: [],
      notApplicable: true,
    };
  }

  const headerRow = data[0].map(cleanLabel);
  const columns = headerRow.slice(1);

  let currentSection: string | undefined;
  const rows: AprQuestion["rows"] = [];

  for (let i = 1; i < data.length; i++) {
    const raw = data[i];
    const rowLabel = cleanLabel(raw[0]);
    if (!rowLabel) continue;

    if (looksLikeSectionHeader(raw)) {
      currentSection = rowLabel;
      rows.push({
        rowIdx: i,
        rowLabel,
        sectionLabel: currentSection,
        isSectionHeader: true,
        cells: [],
      });
      continue;
    }

    const cells: AprCell[] = columns.map((col, idx) => {
      const value = parseNumeric(raw[idx + 1]);
      return {
        rowIdx: i,
        rowLabel,
        sectionLabel: currentSection,
        colIdx: idx,
        colLabel: col,
        value,
        valueType: inferValueType(rowLabel, col),
      };
    });

    rows.push({
      rowIdx: i,
      rowLabel,
      sectionLabel: currentSection,
      isSectionHeader: false,
      cells,
    });
  }

  return {
    questionId,
    fileName,
    title: questionTitle(questionId),
    columns,
    rows,
    notApplicable: rows.length === 0,
  };
};

export const parseAprZip = async (zipBuffer: ArrayBuffer, sourceFileName: string): Promise<AprReport> => {
  const zip = await JSZip.loadAsync(zipBuffer);
  const warnings: string[] = [];
  const questions: Record<string, AprQuestion> = {};

  const fileEntries = Object.values(zip.files).filter((f) => !f.dir && /^Q[\w]+\.csv$/i.test(f.name));

  if (fileEntries.length === 0) {
    throw new Error("ZIP does not contain any APR question CSV files (expected files like Q4a.csv, Q5a.csv).");
  }

  const manifestFile = fileEntries.find((f) => /^Q4a\.csv$/i.test(f.name));
  if (!manifestFile) {
    throw new Error("Missing Q4a.csv (report manifest) in ZIP.");
  }
  const manifestText = await manifestFile.async("string");
  const manifest = parseManifest(manifestText, HMIS_PROJECT_TYPE_LABELS);

  await Promise.all(
    fileEntries.map(async (entry) => {
      const id = entry.name.replace(/\.csv$/i, "");
      if (id.toLowerCase() === "q4a") return;
      try {
        const text = await entry.async("string");
        questions[id] = parseQuestionCsv(id, entry.name, text);
      } catch (err) {
        warnings.push(`Failed to parse ${entry.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    })
  );

  return {
    manifest,
    questions,
    uploadedAt: new Date().toISOString(),
    sourceFileName,
    warnings,
  };
};
