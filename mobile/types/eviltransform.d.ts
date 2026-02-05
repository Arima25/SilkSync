//definitions for eviltransform
declare module "eviltransform/transform" {
  export function wgs2gcj(
    lat: number,
    lng: number
  ): [number, number] | { lat: number; lng: number };
}