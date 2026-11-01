import { useEffect, useState } from "react"

import Navbar from "./components/Navbar"
import Hero from "./components/Hero"
import AuthForm from "./components/AuthForm"
import Explore from "./components/Explore"
import AttractionDetails from "./components/AttractionDetails"
import Itineraries from "./components/Itineraries"

import {
  AdminDashboard,
  CategoriesPage,
  ClaimPage,
  TravelerDashboard,
} from "./components/PortalPages"

import { apiRequest } from "./api"

function getPage() {
  const hash = window.location.hash.replace("#", "")

  if (
    [
      "login",
      "register",
      "itineraries",
      "categories",
      "dashboard",
      "claim",
      "admin",
    ].includes(hash)
  ) {
    return hash
  }

  return /^attraction\/[1-9]\d*$/.test(hash)
    ? hash
    : "home"
}

function clearTokens() {
  sessionStorage.removeItem("access_token")
  sessionStorage.removeItem("refresh_token")
}

function App() {
  const [page, setPage] = useState(getPage)
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [sessionError, setSessionError] = useState("")

  useEffect(() => {
    const navigate = () => setPage(getPage())

    window.addEventListener("hashchange", navigate)

    return () =>
      window.removeEventListener("hashchange", navigate)
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (
        page === "home" &&
        window.location.hash === "#explore"
      ) {
        document.getElementById("explore")?.scrollIntoView()
      } else {
        window.scrollTo(0, 0)
      }
    })

    return () => cancelAnimationFrame(frame)
  }, [page, checkingSession])

  useEffect(() => {
    let cancelled = false

    async function restore() {
      const token = sessionStorage.getItem("access_token")

      if (!token) {
        setCheckingSession(false)
        return
      }

      try {
        const result = await apiRequest("/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!cancelled) setUser(result)
      } catch (error) {
        if (!cancelled) {
          if (
            error.status === 401 ||
            error.status === 403
          ) {
            clearTokens()

            setSessionError(
              "Your session ended. Please login again."
            )
          } else {
            setSessionError(
              "Could not check your session. Check the backend and reload."
            )
          }
        }
      } finally {
        if (!cancelled) setCheckingSession(false)
      }
    }

    restore()

    return () => {
      cancelled = true
    }
  }, [])

  function handleLogin(result) {
    sessionStorage.setItem(
      "access_token",
      result.access_token
    )

    sessionStorage.setItem(
      "refresh_token",
      result.refresh_token
    )

    setUser({
      id: result.user_id,
      name: result.name,
      role: result.role,
    })

    setSessionError("")

    window.location.hash =
      result.role === "admin" ? "admin" : "dashboard"
  }

  async function handleLogout() {
    const refreshToken =
      sessionStorage.getItem("refresh_token")

    clearTokens()
    setUser(null)
    setSessionError("")
    window.location.hash = "login"

    if (!refreshToken) return

    try {
      await apiRequest("/logout", {
        method: "POST",
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      })
    } catch {
      setSessionError(
        "Signed out here, but the server could not revoke the session."
      )
    }
  }

  let content

  if (["login", "register"].includes(page)) {
    content = (
      <AuthForm
        key={page}
        mode={page}
        onLogin={handleLogin}
      />
    )
  } else if (page === "categories") {
    content = <CategoriesPage />
  } else if (
    ["itineraries", "dashboard", "claim", "admin"].includes(page)
  ) {
    if (!user) {
      content = (
        <main className="px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-[#143B4C]">
            Login to continue
          </h1>

          <a
            href="#login"
            className="mt-5 inline-block rounded-xl bg-[#1676A5] px-6 py-3 font-semibold text-white"
          >
            Login
          </a>
        </main>
      )
    } else if (page === "admin") {
      content =
        user.role === "admin" ? (
          <AdminDashboard key={user.id} />
        ) : (
          <p
            role="alert"
            className="p-12 text-center text-red-700"
          >
            Admin access required.
          </p>
        )
    } else if (page === "dashboard") {
      content = (
        <TravelerDashboard
          key={user.id}
          user={user}
        />
      )
    } else if (page === "claim") {
      content = <ClaimPage key={user.id} />
    } else {
      content = <Itineraries key={user.id} />
    }
  } else if (page.startsWith("attraction/")) {
    content = (
      <AttractionDetails
        key={page}
        id={page.split("/")[1]}
      />
    )
  } else {
    content = (
      <>
        <Hero />
        <Explore />
      </>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#fefcff] text-[#143B4C]">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 70%,rgba(197,216,230,.20),transparent 60%),radial-gradient(circle at 70% 30%,rgba(255,182,193,.25),transparent 60%)",
        }}
      />

      <div className="relative z-10">
        {checkingSession ? (
          <p className="py-24 text-center">
            Checking session...
          </p>
        ) : (
          <>
            <Navbar
              user={user}
              onLogout={handleLogout}
            />

            {sessionError && (
              <p
                role="alert"
                className="mx-auto mt-10 max-w-xl rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
              >
                {sessionError}
              </p>
            )}

            {content}
          </>
        )}
      </div>
    </div>
  )
}

export default App