"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl: "/dashboard",
    });

    if (result?.error) {
      setError(result.error);
    } else {
      router.push(result?.url || "/dashboard");
    }
  }

  return (
    <main style={{ padding: "4rem", maxWidth: 520, margin: "0 auto" }}>
      <h1>Sign In</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }}
          />
        </label>
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        <button type="submit" style={{ padding: "0.75rem 1rem" }}>
          Sign in
        </button>
      </form>
      <p style={{ marginTop: "1.5rem", color: "#6b7280", textAlign: "center" }}>
        Don't have an account?{" "}
        <a href="/signup" style={{ color: "#2563eb" }}>
          Create one
        </a>
      </p>
    </main>
  );
}
