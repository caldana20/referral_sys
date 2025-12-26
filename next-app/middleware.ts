import { NextResponse } from "next/server";

// No-op middleware
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};

