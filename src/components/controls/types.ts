import type { AngleUnit } from "@/state/angleUnits";
import type { SpeedUnit } from "@/state/speedUnits";

export interface ExportPresetRequest {
  presetId: string;
  speedUnit: SpeedUnit;
  phaseUnit: AngleUnit;
}
