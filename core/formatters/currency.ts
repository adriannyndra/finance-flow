export const formatIDR = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper to format input string with thousands separators
export const formatNumberInput = (value: string) => {
  if (!value) return '';
  const number = value.replace(/\D/g, '');
  if (!number) return '';
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Helper to parse the formatted string back to a number
export const parseNumberInput = (formattedValue: string) => {
  return formattedValue.replace(/\./g, '');
};
