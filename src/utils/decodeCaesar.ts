export function decodeCaesar(text: string, shift: number): string {
  const aCode = "a".charCodeAt(0);
  const ACode = "A".charCodeAt(0);
  const mod = (n: number, m: number) => ((n % m) + m) % m;
  return text.replace(/[a-z]/gi, (char) => {
    const isUpper = char === char.toUpperCase();
    const base = isUpper ? ACode : aCode;
    const code = char.charCodeAt(0) - base;
    const decoded = mod(code - shift, 26) + base;
    return String.fromCharCode(decoded);
  });
} 