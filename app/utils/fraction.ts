export function parseQuantity(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const str = value.toString().trim();
  
  // Handle mixed fractions like "1 1/2"
  if (str.includes(' ') && str.includes('/')) {
    const parts = str.split(' ');
    const whole = parseFloat(parts[0]) || 0;
    const fractionParts = parts[1].split('/');
    if (fractionParts.length === 2) {
      const num = parseFloat(fractionParts[0]) || 0;
      const den = parseFloat(fractionParts[1]) || 1;
      return whole + (num / den);
    }
  }
  
  // Handle simple fractions like "1/4"
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]) || 0;
      const den = parseFloat(parts[1]) || 1;
      return num / den;
    }
  }
  
  // Handle standard decimals
  return parseFloat(str) || 0;
}

export function formatQuantity(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '';
  
  // Find common fractions
  const tolerance = 1.0E-6;
  const whole = Math.floor(num);
  const decimal = num - whole;
  
  if (decimal < tolerance) return whole.toString();
  
  const commonFractions = [
    { dec: 1/2, frac: '1/2' },
    { dec: 1/3, frac: '1/3' },
    { dec: 2/3, frac: '2/3' },
    { dec: 1/4, frac: '1/4' },
    { dec: 3/4, frac: '3/4' },
    { dec: 1/5, frac: '1/5' },
    { dec: 2/5, frac: '2/5' },
    { dec: 3/5, frac: '3/5' },
    { dec: 4/5, frac: '4/5' },
    { dec: 1/8, frac: '1/8' },
    { dec: 3/8, frac: '3/8' },
    { dec: 5/8, frac: '5/8' },
    { dec: 7/8, frac: '7/8' },
  ];
  
  for (const f of commonFractions) {
    if (Math.abs(decimal - f.dec) < tolerance) {
      if (whole > 0) {
        return `${whole} ${f.frac}`;
      }
      return f.frac;
    }
  }
  
  // If no common fraction matches perfectly, just return 2 decimal places
  return Number(num.toFixed(2)).toString();
}
