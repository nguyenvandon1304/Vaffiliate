export interface VietnamBank {
  code: string;
  name: string;
  shortName: string;
}

export const VIETNAM_BANKS: VietnamBank[] = [
  { code: "VCB", name: "Ngân hàng TMCP Ngoại thương Việt Nam", shortName: "Vietcombank" },
  { code: "TCB", name: "Ngân hàng TMCP Kỹ thương Việt Nam", shortName: "Techcombank" },
  { code: "VPB", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", shortName: "VPBank" },
  { code: "MBB", name: "Ngân hàng TMCP Quân đội", shortName: "MB Bank" },
  { code: "ACB", name: "Ngân hàng TMCP Á Châu", shortName: "ACB" },
  { code: "BID", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", shortName: "BIDV" },
  { code: "CTG", name: "Ngân hàng TMCP Công thương Việt Nam", shortName: "VietinBank" },
  { code: "AGR", name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn", shortName: "Agribank" },
  { code: "SHB", name: "Ngân hàng TMCP Sài Gòn – Hà Nội", shortName: "SHB" },
  { code: "STB", name: "Ngân hàng TMCP Sài Gòn Thương Tín", shortName: "Sacombank" },
  { code: "HDB", name: "Ngân hàng TMCP Phát triển TP.HCM", shortName: "HDBank" },
  { code: "TPB", name: "Ngân hàng TMCP Tiên Phong", shortName: "TPBank" },
  { code: "MSB", name: "Ngân hàng TMCP Hàng Hải Việt Nam", shortName: "MSB" },
  { code: "LPB", name: "Ngân hàng TMCP Bưu điện Liên Việt", shortName: "LienVietPostBank" },
  { code: "OCB", name: "Ngân hàng TMCP Phương Đông", shortName: "OCB" },
  { code: "EIB", name: "Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam", shortName: "Eximbank" },
  { code: "SSB", name: "Ngân hàng TMCP Đông Nam Á", shortName: "SeABank" },
  { code: "NAB", name: "Ngân hàng TMCP Nam Á", shortName: "Nam A Bank" },
  { code: "BAB", name: "Ngân hàng TMCP Bắc Á", shortName: "Bac A Bank" },
  { code: "VAB", name: "Ngân hàng TMCP Việt Á", shortName: "VietABank" },
  { code: "SCB", name: "Ngân hàng TMCP Sài Gòn", shortName: "SCB" },
  { code: "ABB", name: "Ngân hàng TMCP An Bình", shortName: "ABBank" },
  { code: "KLB", name: "Ngân hàng TMCP Kiên Long", shortName: "KienLongBank" },
  { code: "PGB", name: "Ngân hàng TMCP Xăng dầu Petrolimex", shortName: "PGBank" },
  { code: "VIB", name: "Ngân hàng TMCP Quốc tế Việt Nam", shortName: "VIB" },
  { code: "NVB", name: "Ngân hàng TMCP Quốc Dân", shortName: "NCB" },
  { code: "SGB", name: "Ngân hàng TMCP Sài Gòn Công Thương", shortName: "SaigonBank" },
  { code: "PVC", name: "Ngân hàng TMCP Đại Chúng Việt Nam", shortName: "PVcomBank" },
  { code: "BVB", name: "Ngân hàng TMCP Bảo Việt", shortName: "BaoVietBank" },
  { code: "VRB", name: "Ngân hàng Liên doanh Việt - Nga", shortName: "VRB" },
  { code: "GPB", name: "Ngân hàng TM TNHH MTV Dầu Khí Toàn Cầu", shortName: "GPBank" },
  { code: "CBB", name: "Ngân hàng TM TNHH MTV Xây dựng Việt Nam", shortName: "CB Bank" },
  { code: "OJB", name: "Ngân hàng TM TNHH MTV Đại Dương", shortName: "OceanBank" },
  { code: "CAKE", name: "Ngân hàng Số CAKE by VPBank", shortName: "CAKE" },
  { code: "UBANK", name: "Ngân hàng Số Ubank by VPBank", shortName: "Ubank" },
  { code: "TNEX", name: "Ngân hàng Số TNEX by MSB", shortName: "TNEX" },
  { code: "CIMB", name: "Ngân hàng TNHH MTV CIMB Việt Nam", shortName: "CIMB" },
  { code: "SCVN", name: "Ngân hàng TNHH MTV Standard Chartered VN", shortName: "Standard Chartered" },
  { code: "HSBC", name: "Ngân hàng TNHH MTV HSBC Việt Nam", shortName: "HSBC" },
  { code: "SHBVN", name: "Ngân hàng TNHH MTV Shinhan Việt Nam", shortName: "Shinhan Bank" },
  { code: "WOO", name: "Ngân hàng TNHH MTV Woori Việt Nam", shortName: "Woori Bank" },
  { code: "UOB", name: "Ngân hàng TNHH MTV UOB Việt Nam", shortName: "UOB" },
  { code: "KBVN", name: "Ngân hàng TNHH MTV KB Kookmin Việt Nam", shortName: "KB Bank" },
  { code: "IBKVN", name: "Ngân hàng Công nghiệp Hàn Quốc - CN HN", shortName: "IBK" },
  { code: "PNLVN", name: "Ngân hàng TNHH MTV Public Bank Việt Nam", shortName: "Public Bank" },
  { code: "HLBVN", name: "Ngân hàng TNHH MTV Hong Leong Việt Nam", shortName: "Hong Leong" },
];


/**
 * Map từ bank_code (mã ngắn dùng trong app, vd. "VCB", "MBB") sang BIN số 6 chữ số
 * theo chuẩn NAPAS / VietQR.io. Dùng để generate URL QR thanh toán.
 *
 * Reference: https://api.vietqr.io/v2/banks (verified với data chính thức)
 * Update lần cuối: 2026-05
 */
export const VIETNAM_BANK_BIN_MAP: Record<string, string> = {
  // ─── Ngân hàng phổ biến ───
  VCB: "970436",   // Vietcombank
  TCB: "970407",   // Techcombank
  VPB: "970432",   // VPBank
  MBB: "970422",   // MB Bank
  ACB: "970416",   // ACB
  BID: "970418",   // BIDV
  CTG: "970415",   // VietinBank
  AGR: "970405",   // Agribank
  SHB: "970443",   // SHB
  STB: "970403",   // Sacombank
  HDB: "970437",   // HDBank
  TPB: "970423",   // TPBank
  MSB: "970426",   // MSB
  LPB: "970449",   // LPBank
  OCB: "970448",   // OCB
  EIB: "970431",   // Eximbank
  SSB: "970440",   // SeABank
  NAB: "970428",   // Nam A Bank
  BAB: "970409",   // BacABank
  VAB: "970427",   // VietABank
  SCB: "970429",   // SCB
  ABB: "970425",   // ABBANK
  KLB: "970452",   // KienLongBank
  PGB: "970430",   // PGBank
  VIB: "970441",   // VIB
  NVB: "970419",   // NCB
  SGB: "970400",   // SaigonBank
  PVC: "970412",   // PVcomBank
  BVB: "970438",   // BaoVietBank
  // ─── Liên doanh / quốc tế ───
  VRB: "970421",   // VRB (Việt-Nga)
  GPB: "970408",   // GPBank
  OJB: "970414",   // MBV (former OceanBank)
  CBB: "970444",   // CBBank
  CIMB: "422589",  // CIMB
  SCVN: "970410",  // Standard Chartered VN
  HSBC: "458761",  // HSBC
  SHBVN: "970424", // Shinhan Bank VN
  WOO: "970457",   // Woori VN
  UOB: "970458",   // United Overseas
  KBVN: "970462",  // KB Kookmin (HN)
  IBKVN: "970455", // IBK Hà Nội
  PNLVN: "970439", // Public Bank VN (PBVN)
  HLBVN: "970442", // Hong Leong VN
  // ─── Ngân hàng số ───
  CAKE: "546034",  // CAKE by VPBank
  UBANK: "546035", // Ubank by VPBank
  // TNEX không có trong VietQR.io API → user dùng app MSB chính thay vì TNEX,
  // tạm dùng BIN của MSB để QR vẫn chuyển khoản về MSB (TNEX là nhánh số của MSB).
  TNEX: "970426",  // MSB (TNEX là digital arm của MSB)
};

/**
 * Lấy BIN cho bank code. Fallback rỗng nếu không tìm thấy.
 */
export function getBankBin(bankCode: string): string {
  return VIETNAM_BANK_BIN_MAP[bankCode] || "";
}
