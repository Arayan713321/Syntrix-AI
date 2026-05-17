import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth",
  },
});

export const config = {
  // Enforces next-auth route guards on the dashboard and all nested pages
  matcher: ["/dashboard/:path*"],
};
