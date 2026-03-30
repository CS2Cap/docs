import { PublicLayout } from "@/components/PublicLayout";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <PublicLayout>
      <div className="container flex min-h-[70vh] items-center justify-center py-12">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">C2</span>
            </div>
            <h1 className="text-2xl font-bold">Sign in to CS2Cap</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your credentials to access your account.
            </p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Sign In
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
