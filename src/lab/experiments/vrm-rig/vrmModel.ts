export const VRM_RIG_MODEL_FILENAME = "VRM1_Constraint_Twist_Sample.vrm";
export const VRM_RIG_MODEL_NAME = "VRM1 Constraint Twist Sample";
export const VRM_RIG_MODEL_AUTHOR = "pixiv Inc.";
export const VRM_RIG_MODEL_SOURCE =
  "https://github.com/vrm-c/vrm-specification/tree/master/samples/VRM1_Constraint_Twist_Sample";
export const VRM_RIG_MODEL_LICENSE = "https://vrm.dev/licenses/1.0/";

export function buildVrmRigModelUrl(baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBaseUrl}models/vrm/${VRM_RIG_MODEL_FILENAME}`;
}
