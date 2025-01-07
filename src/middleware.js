import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith("/login");

  // Get auth session token from cookie
  const sessionToken = request.cookies.get("session")?.value;
  const isAuthenticated = !!sessionToken;

  // Public paths that don't require authentication
  const publicPaths = ["/login", "/register", "/forgot-password"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // If the user is on an auth page and is already authenticated
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If the user is on a protected page and is not authenticated
  if (!isPublicPath && !isAuthenticated) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
