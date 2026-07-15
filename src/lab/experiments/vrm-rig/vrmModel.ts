export const VRM_RIG_MODEL_FILENAME = "Aurora.vrm";
export const VRM_RIG_MODEL_NAME = "Aurora";
export const VRM_RIG_MODEL_AUTHOR = "Polygonal Mind";
export const VRM_RIG_MODEL_FORMAT = "VRM 0.x";
export const VRM_RIG_MODEL_SOURCE = "https://www.polygonalmind.com/";
export const VRM_RIG_MODEL_LICENSE = "https://creativecommons.org/publicdomain/zero/1.0/";

export const VRM_CONSTRAINT_FIXTURE_FILENAME = "VRM1_Constraint_Twist_Sample.vrm";

export function buildVrmRigModelUrl(baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBaseUrl}models/vrm/${VRM_RIG_MODEL_FILENAME}`;
}
