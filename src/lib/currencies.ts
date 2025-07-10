// A simplified list of countries and their currencies.
// In a real-world app, this might come from a library or a more comprehensive source.
export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export interface Country {
  name: string;
  currency: Currency;
}

export const currencies: { [key: string]: Currency } = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  CHF: { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
};

export const countries: Country[] = [
  { name: 'United States', currency: currencies['USD'] },
  { name: 'Germany', currency: currencies['EUR'] },
  { name: 'France', currency: currencies['EUR'] },
  { name: 'Japan', currency: currencies['JPY'] },
  { name: 'United Kingdom', currency: currencies['GBP'] },
  { name: 'India', currency: currencies['INR'] },
  { name: 'Australia', currency: currencies['AUD'] },
  { name: 'Canada', currency: currencies['CAD'] },
  { name: 'Switzerland', currency: currencies['CHF'] },
  { name: 'China', currency: currencies['CNY'] },
  { name: 'Sweden', currency: currencies['SEK'] },
  { name: 'New Zealand', currency: currencies['NZD'] },
  { name: 'Brazil', currency: currencies['BRL'] },
  { name: 'Russia', currency: currencies['RUB'] },
];
