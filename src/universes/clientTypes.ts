/** A universe's browser-only assets (its folder's client.ts exports one as ASSETS). */
export interface ClientAssets {
  /** Draco glb of its vehicles / weapons (art/build.py); without one the packs' box models are drawn. */
  vehiclesGlb?: string;
  weaponsGlb?: string;
  /** Voiced lines: an import.meta.glob of its *.ogg clips (file name = line id) to their URLs. */
  voice: Record<string, string>;
}
