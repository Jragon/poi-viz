import {
  createPresetFileName,
  createPresetId,
  createUserPresetRecord,
  createUserPresetSummary,
  deserializeUserPresetFile,
  ensureUniquePresetId,
  getUserPreset,
  removeUserPreset,
  sanitizePresetName,
  serializeUserPresetFile,
  upsertUserPreset,
  type UserPresetRecord,
  type UserPresetSummary
} from "@/state/presetLibrary";
import type { AngleUnit } from "@/state/angleUnits";
import { createDefaultState } from "@/state/defaults";
import type { SpeedUnit } from "@/state/speedUnits";
import type { AppState } from "@/types/state";
import { computed, ref, type ComputedRef, type Ref } from "vue";

const PRESET_LIBRARY_STATUS_RESET_DELAY_MS = 2400;

/**
 * User-preset export request.
 */
export interface ExportPresetRequest {
  presetId: string;
  speedUnit: SpeedUnit;
  phaseUnit: AngleUnit;
}

interface PresetLibraryControllerOptions {
  state: AppState;
  commitState: (nextState: AppState) => void;
  persistRecords: (records: UserPresetRecord[]) => void;
}

/**
 * Preset-library controller contract for save/load/import/export flows.
 */
export interface PresetLibraryController {
  userPresetSummaries: ComputedRef<UserPresetSummary[]>;
  presetLibraryStatus: Ref<string>;
  setUserPresetRecords: (records: UserPresetRecord[]) => void;
  handleSaveUserPreset: (name: string) => void;
  handleLoadUserPreset: (presetId: string) => void;
  handleDeleteUserPreset: (presetId: string) => void;
  handleExportUserPreset: (request: ExportPresetRequest) => void;
  handleImportUserPreset: (file: File) => Promise<void>;
  dispose: () => void;
}

function downloadTextFile(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

/**
 * Creates user-preset management handlers and status lifecycle.
 */
export function usePresetLibraryController(options: PresetLibraryControllerOptions): PresetLibraryController {
  const { state, commitState, persistRecords } = options;
  const userPresetRecords = ref<UserPresetRecord[]>([]);
  const userPresetSummaries = computed(() => userPresetRecords.value.map(createUserPresetSummary));
  const presetLibraryStatus = ref("");
  let presetLibraryStatusTimerId = 0;

  function resetPresetLibraryStatusSoon(): void {
    if (presetLibraryStatusTimerId !== 0) {
      window.clearTimeout(presetLibraryStatusTimerId);
    }
    presetLibraryStatusTimerId = window.setTimeout(() => {
      presetLibraryStatus.value = "";
      presetLibraryStatusTimerId = 0;
    }, PRESET_LIBRARY_STATUS_RESET_DELAY_MS);
  }

  return {
    userPresetSummaries,
    presetLibraryStatus,
    setUserPresetRecords(records: UserPresetRecord[]): void {
      userPresetRecords.value = records;
    },
    handleSaveUserPreset(name: string): void {
      const sanitizedName = sanitizePresetName(name);
      const existingByName = userPresetRecords.value.find((record) => record.name === sanitizedName);
      const now = new Date();

      const nextRecord = existingByName
        ? createUserPresetRecord(sanitizedName, state, now, existingByName.id)
        : createUserPresetRecord(
            sanitizedName,
            state,
            now,
            ensureUniquePresetId(userPresetRecords.value, createPresetId(sanitizedName, now))
          );

      userPresetRecords.value = upsertUserPreset(userPresetRecords.value, nextRecord);
      persistRecords(userPresetRecords.value);
      presetLibraryStatus.value = existingByName ? "Preset updated" : "Preset saved";
      resetPresetLibraryStatusSoon();
    },
    handleLoadUserPreset(presetId: string): void {
      const preset = getUserPreset(userPresetRecords.value, presetId);
      if (!preset) {
        presetLibraryStatus.value = "Preset not found";
        resetPresetLibraryStatusSoon();
        return;
      }

      commitState(preset.state);
      presetLibraryStatus.value = `Loaded: ${preset.name}`;
      resetPresetLibraryStatusSoon();
    },
    handleDeleteUserPreset(presetId: string): void {
      const preset = getUserPreset(userPresetRecords.value, presetId);
      if (!preset) {
        presetLibraryStatus.value = "Preset not found";
        resetPresetLibraryStatusSoon();
        return;
      }

      userPresetRecords.value = removeUserPreset(userPresetRecords.value, presetId);
      persistRecords(userPresetRecords.value);
      presetLibraryStatus.value = `Deleted: ${preset.name}`;
      resetPresetLibraryStatusSoon();
    },
    handleExportUserPreset(request: ExportPresetRequest): void {
      const preset = getUserPreset(userPresetRecords.value, request.presetId);
      if (!preset) {
        presetLibraryStatus.value = "Preset not found";
        resetPresetLibraryStatusSoon();
        return;
      }

      const fileName = createPresetFileName(preset.name);
      const payload = serializeUserPresetFile(preset, {
        speedUnit: request.speedUnit,
        phaseUnit: request.phaseUnit
      });
      downloadTextFile(fileName, payload);
      presetLibraryStatus.value = `Exported: ${fileName}`;
      resetPresetLibraryStatusSoon();
    },
    async handleImportUserPreset(file: File): Promise<void> {
      try {
        const content = await file.text();
        const defaults = createDefaultState();
        const importedPreset = deserializeUserPresetFile(content, defaults);
        if (!importedPreset) {
          presetLibraryStatus.value = "Import failed: invalid preset file";
          resetPresetLibraryStatusSoon();
          return;
        }

        const existing = getUserPreset(userPresetRecords.value, importedPreset.id);
        const nextPreset = existing
          ? importedPreset
          : {
              ...importedPreset,
              id: ensureUniquePresetId(userPresetRecords.value, importedPreset.id)
            };

        userPresetRecords.value = upsertUserPreset(userPresetRecords.value, nextPreset);
        persistRecords(userPresetRecords.value);
        presetLibraryStatus.value = existing ? `Updated import: ${nextPreset.name}` : `Imported: ${nextPreset.name}`;
        resetPresetLibraryStatusSoon();
      } catch {
        presetLibraryStatus.value = "Import failed: unreadable file";
        resetPresetLibraryStatusSoon();
      }
    },
    dispose(): void {
      if (presetLibraryStatusTimerId !== 0) {
        window.clearTimeout(presetLibraryStatusTimerId);
      }
    }
  };
}
