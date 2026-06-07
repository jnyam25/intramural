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
    <main className="px-16 py-16 max-w-lg mx-auto">
      <h1>Sign In</h1>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="input w-full mt-2"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="input w-full mt-2"
          />
        </label>
        {error && <p className="text-red-700">{error}</p>}
        <button type="submit" className="btn-primary">
          Sign in
        </button>
      </form>
      <p className="mt-6 text-gray-500 text-center">
        Don&apos;t have an account?{" "}
        <a href="/signup" className="text-blue-600">
          Create one
        </a>
      </p>
    </main>
  );
}
