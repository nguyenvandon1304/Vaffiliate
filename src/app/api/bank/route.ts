import { NextRequest, NextResponse } from "next/server";
import { addBankAccount, deleteBankAccount, getUserBankAccounts, setDefaultBankAccount } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const accounts = await getUserBankAccounts(auth.user.id);
  return NextResponse.json({ success: true, accounts });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const data = await request.json();
  const result = await addBankAccount(auth.user.id, data);
  if (!result.success) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ success: false, error: "Thiếu id" }, { status: 400 });

  const result = await deleteBankAccount(auth.user.id, id);
  if (!result.success) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ success: false, error: "Thiếu id" }, { status: 400 });

  const result = await setDefaultBankAccount(auth.user.id, id);
  if (!result.success) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
