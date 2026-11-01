import { useState } from "react"
import { apiRequest } from "../api"

function AuthForm({ mode, onLogin }) {
  const isRegister = mode === "register"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setError("")
    setSuccess("")

    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)

    try {
      if (isRegister) {
        const result = await apiRequest("/register", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
          }),
        })

        setSuccess(result.message)
        setName("")
        setEmail("")
        setPassword("")
        setConfirmPassword("")
      } else {
        const result = await apiRequest("/login", {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        })

        onLogin(result)
      }
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot connect to the server. Check if the backend is running."
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  const inputStyle =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 " +
    "outline-none focus:border-[#1676A5] focus:ring-2 focus:ring-[#1676A5]/15"

  return (
    <main className="flex min-h-[85vh] items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-white bg-white/85 p-6 shadow-xl backdrop-blur-xl md:p-9">
        <p className="mb-3 text-xs font-bold tracking-widest text-[#1676A5]">
          LOCALLENS
        </p>

        <h1 className="text-3xl font-bold text-[#143B4C]">
          {isRegister ? "Start your journey" : "Welcome back"}
        </h1>

        <p className="mt-2 text-sm text-[#587481]">
          {isRegister
            ? "Create an account to plan your next adventure."
            : "Sign in to continue your journey."}
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-5 rounded-xl bg-green-50 p-3 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {isRegister && (
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-semibold text-[#143B4C]"
              >
                Full name
              </label>

              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputStyle}
                maxLength={100}
                required
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-semibold text-[#143B4C]"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputStyle}
              maxLength={255}
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-semibold text-[#143B4C]"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputStyle}
              minLength={isRegister ? 8 : 1}
              required
            />

            {isRegister && (
              <p className="mt-1 text-xs text-[#587481]">
                Use at least 8 characters.
              </p>
            )}
          </div>

          {isRegister && (
            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1 block text-sm font-semibold text-[#143B4C]"
              >
                Confirm password
              </label>

              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={inputStyle}
                minLength={8}
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-2xl bg-[#1676A5] py-3 font-semibold text-white transition hover:bg-[#125e84] disabled:cursor-wait disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : isRegister
                ? "Create account"
                : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#587481]">
          {isRegister ? "Already have an account? " : "New to LocalLens? "}

          <a
            href={isRegister ? "#login" : "#register"}
            className="font-semibold text-[#1676A5] hover:underline"
          >
            {isRegister ? "Login" : "Register"}
          </a>
        </p>

        <a
          href="#home"
          className="mt-4 block text-center text-sm text-[#587481] hover:underline"
        >
          Back to home
        </a>
      </section>
    </main>
  )
}

export default AuthForm