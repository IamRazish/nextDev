/** Promise wrapper around the callback-style canvas encoder. */
export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob((blob) => resolve(blob), type, quality),
  );
}
