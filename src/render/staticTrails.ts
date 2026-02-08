import { sampleLoop } from "@/engine/sampling";
import type { EngineParams } from "@/engine/types";
import type { TrailSeries } from "@/render/types";

/**
 * Builds one full-loop static trail series for screenshot-style pattern inspection.
 * This is deterministic and independent of frame timing.
 *
 * @param params Engine parameters for angle/position sampling.
 * @param loopBeats Loop duration in beats.
 * @param sampleHz Static trail sample rate in samples per second.
 * @param startBeat Beat offset where loop sampling starts.
 * @returns Per-hand trail points from sampled head positions.
 */
export function buildStaticTrailSeries(params: EngineParams, loopBeats: number, sampleHz: number, startBeat: number): TrailSeries {
  const samples = sampleLoop(params, sampleHz, loopBeats, startBeat);

  return {
    L: samples.map((sample) => ({
      tBeats: sample.tBeats,
      point: sample.positions.L.head
    })),
    R: samples.map((sample) => ({
      tBeats: sample.tBeats,
      point: sample.positions.R.head
    }))
  };
}
