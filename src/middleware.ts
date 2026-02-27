import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const protectedRoutes = ["/inventory", "/admin", "/api"];
const publicApiRoutes = ["/api/health"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (publicApiRoutes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const response = await updateSession(request);

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (!isProtected) return response;

  const hasAuthCookie =
    request.cookies.has("sb-access-token") ||
    request.cookies
      .getAll()
      .some((c) => c.name.includes("auth-token") || c.name.includes("access"));

  if (!hasAuthCookie && !pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
