/**
 * Minimal ambient types for `qrcode` (ships no bundled declarations). Only the
 * `toDataURL` overload the EUDI VP create-session route uses (Spec §6.5). Not a
 * full binding — extend if other call sites need more.
 */
declare module 'qrcode' {
  interface QRCodeToDataURLOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    width?: number;
    scale?: number;
  }
  function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
  const _default: { toDataURL: typeof toDataURL };
  export default _default;
  export { toDataURL };
}
