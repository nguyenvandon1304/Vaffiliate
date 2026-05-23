import { addBalance } from "../src/lib/db";

async function main() {
  const result = await addBalance("nguyenvandon", 50000, "Cộng số dư");
  console.log(result.success ? "Đã cộng 50.000đ cho nguyenvandon" : `Lỗi: ${result.error}`);
  process.exit(0);
}

main();
