export interface StaticMarketItem {
  symbol: string;
  price: number;
  change: number;
  volume: number; // Mocked for sorting
}

// Helper to generate random volume for sorting requirement
const withVol = (symbol: string, price: number, change: number): StaticMarketItem => ({
  symbol: symbol.replace('#', ''),
  price,
  change,
  volume: Math.floor(Math.random() * 1000000) + 50000
});

export const COMMODITIES_DATA: StaticMarketItem[] = [
  withVol('USCRUDE', 57.071, -1.46),
  withVol('UKBRENT', 60.596, -2.04),
  withVol('XAUUSD', 4514.56, 9.20),
  withVol('XAGUSD', 75.765, 47.52),
  withVol('XPTUSD', 2398.73, 53.86),
  withVol('COCOA', 5946.40, 15.18),
  withVol('COFFEE', 349.52, -8.32),
  withVol('CORN', 448.94, 6.08),
  withVol('OJ', 207.28, 48.40),
  withVol('SOYBEAN', 1058.00, -5.95),
  withVol('WHEAT', 517.88, -1.22),
  withVol('XAUEUR', 3837.45, 7.39),
  withVol('XCUUSD', 12095.25, 11.32),
  withVol('XNGUSD', 3.762, -14.03),
  withVol('XNIUSD', 15601.78, 4.86),
  withVol('XPDUSD', 1856.10, 33.07),
].sort((a, b) => b.volume - a.volume);

export const NYSE_DATA: StaticMarketItem[] = [
  withVol('NIKE', 60.13, -6.03), withVol('T', 24.66, -4.75), withVol('VZ', 40.35, -0.66),
  withVol('PFE', 24.94, -2.62), withVol('JPM', 327.02, 7.28), withVol('LMT', 481.55, 6.07),
  withVol('MMM', 161.10, -6.03), withVol('AXP', 380.97, 4.53), withVol('BAC', 56.09, 6.25),
  withVol('TGT', 98.46, 11.54), withVol('C', 119.68, 17.66), withVol('CLX', 98.05, -8.75),
  withVol('F', 13.27, 0.76), withVol('MS', 181.54, 8.88), withVol('NIO', 5.15, -6.70),
  withVol('AA', 54.09, 34.89), withVol('ABBV', 228.62, -0.09), withVol('ABT', 124.53, -3.02),
  withVol('ADM', 57.53, -4.16), withVol('BA', 216.81, 17.22), withVol('BABA', 152.69, -3.08),
  withVol('BB', 3.92, -2.97), withVol('BLK', 1084.99, 4.43), withVol('CAT', 581.07, 2.64),
  withVol('CL', 79.82, 0.14), withVol('CMA', 88.79, 10.97), withVol('CNC', 40.14, 2.53),
  withVol('COTY', 3.06, -5.85), withVol('CRM', 266.18, 15.69), withVol('CVX', 149.78, 0.67),
  withVol('DELL', 129.19, 0.74), withVol('DIS', 113.52, 9.63), withVol('DVN', 35.52, -1.96),
  withVol('EDU', 55.74, 9.25), withVol('FIS', 67.03, 2.73), withVol('FTI', 44.51, -1.35),
  withVol('GD', 342.04, 0.70), withVol('GE', 315.46, 7.21), withVol('GFI', 46.29, 11.35),
  withVol('GPN', 79.67, 7.56), withVol('GS', 906.38, 11.93), withVol('HD', 348.59, -1.03),
  withVol('HPQ', 23.19, -2.19), withVol('IBM', 303.72, -0.18), withVol('JNJ', 206.89, -0.11),
  withVol('KMI', 27.10, 1.08), withVol('KO', 69.87, -3.73), withVol('KODK', 8.65, 16.89),
  withVol('LAC', 4.76, -8.46), withVol('LLY', 1072.78, -2.97), withVol('LUMN', 7.68, -5.07),
  withVol('MA', 578.92, 5.79), withVol('MCD', 310.14, -0.10), withVol('MLM', 641.75, 3.66),
  withVol('MO', 57.52, -1.94), withVol('NSC', 291.23, 0.46), withVol('OXY', 39.54, -4.75),
  withVol('PG', 144.66, -2.18), withVol('PM', 160.90, 2.05), withVol('RNG', 29.48, 4.76),
  withVol('RTX', 184.83, 7.32), withVol('SLB', 37.58, 6.49), withVol('SNOW', 222.71, -10.18),
  withVol('STZ', 137.76, 2.01), withVol('TAP', 46.01, -1.58), withVol('TME', 17.55, -3.36),
  withVol('TOT', 65.17, -0.61), withVol('TSM', 301.83, 4.66), withVol('V', 354.27, 5.92),
  withVol('VFC', 18.24, 4.53), withVol('VMC', 293.14, -0.46), withVol('WM', 220.66, 1.51),
  withVol('XOM', 118.63, 3.45), withVol('XYZ', 66.03, 1.82), withVol('ZTO', 21.23, 3.16)
].sort((a, b) => b.volume - a.volume);

export const NASDAQ_DATA: StaticMarketItem[] = [
  withVol('BYND', 0.95, 7.95), withVol('PLUG', 2.09, 7.18), withVol('IQ', 1.94, -12.22),
  withVol('NVAX', 6.80, 0.00), withVol('INTC', 36.34, -0.22), withVol('MSFT', 487.55, 1.08),
  withVol('TSLA', 479.69, 14.88), withVol('NFLX', 94.02, -11.32), withVol('AMZN', 232.64, 1.39),
  withVol('PYPL', 59.79, -2.65), withVol('ADP', 257.78, 0.77), withVol('AMD', 215.51, 3.53),
  withVol('NVDA', 190.76, 6.87), withVol('GOOG', 314.68, -1.81), withVol('WMT', 111.67, 3.44),
  withVol('VFS', 3.39, -0.29), withVol('ADBE', 353.22, 10.61), withVol('AAPL', 274.33, -0.86),
  withVol('COIN', 236.81, -6.91), withVol('CSCO', 78.01, 3.43), withVol('AAL', 15.40, 11.68),
  withVol('AGNC', 10.82, 3.74), withVol('AMAT', 261.75, 7.02), withVol('AMGN', 331.04, -2.91),
  withVol('AVGO', 351.65, -9.67), withVol('BIDU', 124.54, 6.33), withVol('BKNG', 5432.70, 10.47),
  withVol('CME', 276.12, -0.79), withVol('COST', 872.67, -2.94), withVol('CVAC', 4.26, -19.77),
  withVol('DBX', 27.94, -5.99), withVol('DKNG', 34.53, 7.37), withVol('DOCU', 69.56, 0.65),
  withVol('EA', 204.52, 1.35), withVol('EBAY', 84.76, 1.76), withVol('EXPE', 286.98, 11.60),
  withVol('GILD', 124.58, -1.60), withVol('INTU', 675.33, 5.85), withVol('JD', 29.30, -0.68),
  withVol('LCID', 11.53, -11.78), withVol('LI', 17.37, -8.19), withVol('LRCX', 178.39, 15.95),
  withVol('MDLZ', 54.40, -3.78), withVol('META', 663.13, 4.86), withVol('MRNA', 31.35, 28.22),
  withVol('OKTA', 88.14, 9.21), withVol('PANW', 188.12, 1.43), withVol('PDD', 115.53, -1.54),
  withVol('PEP', 143.34, -2.40), withVol('POOL', 231.27, -4.79), withVol('QCOM', 174.96, 6.68),
  withVol('RIOT', 13.68, -5.52), withVol('RIVN', 21.09, 33.90), withVol('ROST', 180.78, 2.42),
  withVol('SBUX', 84.70, -1.99), withVol('TRIP', 14.14, -5.61), withVol('WB', 10.11, 2.22),
  withVol('ZM', 87.81, 2.25)
].sort((a, b) => b.volume - a.volume);

export const EU_DATA: StaticMarketItem[] = [
  withVol('BLND', 390.81, 2.36), withVol('ALV', 391.21, 6.34), withVol('VOD', 97.23, 6.37),
  withVol('ADS', 164.61, 6.79), withVol('AHT', 5173.99, 8.67), withVol('AIR', 196.27, -3.15),
  withVol('ASML', 898.71, 2.03), withVol('BAES', 1708.01, 3.61), withVol('BARC', 470.11, 14.18),
  withVol('BATS', 4205.99, -2.64), withVol('BAYN', 35.82, 15.18), withVol('BMW', 92.31, 6.09),
  withVol('BNP', 80.72, 12.55), withVol('BRBY', 1253.51, 6.05), withVol('BT', 184.96, 4.26),
  withVol('CON', 66.05, 3.19), withVol('HIK', 1524.99, -3.72), withVol('HSBA', 1172.41, 11.64),
  withVol('III', 3232.01, -0.92), withVol('IMB', 3126.99, -3.46), withVol('ITRK', 4646.01, 1.04),
  withVol('KER', 302.59, 0.55), withVol('LRLCY', 363.15, -2.35), withVol('MBG', 59.27, 2.61),
  withVol('MC', 628.29, 0.79), withVol('NWG', 645.39, 6.71), withVol('PAH3', 39.67, 9.53),
  withVol('PSON', 1051.49, 6.79), withVol('RNO', 35.64, 3.42), withVol('SIE', 237.84, 4.93),
  withVol('TSCO', 436.99, -2.30), withVol('TTE', 55.91, -0.48), withVol('UNA', 55.47, 7.56),
  withVol('UU', 1176.79, -3.61), withVol('VOW', 104.29, 7.31)
].sort((a, b) => b.volume - a.volume);

export const HKEX_DATA: StaticMarketItem[] = [
  withVol('1211', 93.41, -4.79), withVol('175', 16.88, -0.18),
  withVol('1810', 39.11, -3.93), withVol('992', 9.30, -4.12)
].sort((a, b) => b.volume - a.volume);
