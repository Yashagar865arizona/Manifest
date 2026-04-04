import { NextResponse } from "next/server";
import { deleteSessionCookie } from "@/lib/auth";

export async function POST() {
  await deleteSessionCookie();
  return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
}

export async function GET() {
  await deleteSessionCookie();
  return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
}
