import { useEffect, useState } from "react"
import { apiRequest, mediaUrl } from "../api"

const box = "rounded-3xl bg-white p-6 shadow-sm"

const input =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 " +
  "text-sm outline-none focus:border-[#1676A5]"

const button =
  "cursor-pointer rounded-xl bg-[#1676A5] px-5 py-3 text-sm " +
  "font-semibold text-white disabled:cursor-wait disabled:opacity-50"

const link =
  "text-sm font-semibold text-[#1676A5] hover:underline"

const auth = () => ({
  Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
})

function message(error) {
  if (error.status === 401) {
    return "Your session expired. Please login again."
  }

  return error instanceof TypeError
    ? "Cannot connect to the backend."
    : error.message
}

function useLoad(path, privatePage = false) {
  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError("")
    setData(null)

    apiRequest(path, {
      headers: privatePage ? auth() : {},
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) setData(result)
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(message(err))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [path, privatePage, revision])

  return {
    data,
    error,
    loading,
    reload: () => setRevision((value) => value + 1),
  }
}

function Page({ title, children }) {
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-12">
      <a href="#home" className={link}>
        ← Back to home
      </a>

      <h1 className="my-7 text-3xl font-bold text-[#143B4C]">
        {title}
      </h1>

      {children}
    </main>
  )
}

function Notice({ error, success }) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="my-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="my-4 rounded-xl bg-green-50 p-4 text-sm text-green-700"
        >
          {success}
        </p>
      )}
    </>
  )
}

function Status({ value }) {
  return (
    <span className="inline-block rounded-full bg-[#E0F2FA] px-3 py-1 text-xs font-semibold text-[#143B4C]">
      {value || "pending"}
    </span>
  )
}

/* CATEGORIES PAGE */

export function CategoriesPage() {
  const categories = useLoad("/portal/categories")
  const [selected, setSelected] = useState("")
  const [page, setPage] = useState(1)

  const destinations = useLoad(
    `/attractions?page=${page}&page_size=12${selected ? `&category_id=${selected}` : ""
    }`
  )

  return (
    <Page title="Browse categories">
      <Notice error={categories.error || destinations.error} />

      {categories.loading ? (
        <p>Loading categories...</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {[
            { id: "", name: "All destinations" },
            ...(categories.data || []),
          ].map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={selected === String(category.id)}
              onClick={() => {
                setSelected(String(category.id))
                setPage(1)
              }}
              className={`cursor-pointer rounded-2xl border px-5 py-4 text-left ${selected === String(category.id)
                ? "border-[#1676A5] bg-[#E0F2FA]"
                : "border-slate-200 bg-white"
                }`}
            >
              <span className="block font-semibold text-[#143B4C]">
                {category.name}
              </span>

              {category.total != null && (
                <span className="text-xs text-[#587481]">
                  {category.total} destination(s)
                </span>
              )}

              {category.description && (
                <span className="mt-1 block max-w-60 text-xs text-[#587481]">
                  {category.description}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {destinations.loading ? (
        <p className="mt-8">Loading destinations...</p>
      ) : (
        destinations.data && (
          <>
            <p className="my-6 text-sm text-[#587481]">
              {destinations.data.total} destination(s) found
            </p>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {destinations.data.items.map((item) => (
                <a
                  key={item.id}
                  href={`#attraction/${item.id}`}
                  className="overflow-hidden rounded-3xl bg-white shadow-sm hover:shadow-lg"
                >
                  <div className="relative flex h-48 items-center justify-center bg-[#E0F2FA] text-sm text-[#587481]">
                    Photo coming soon

                    {mediaUrl(item.primary_image) && (
                      <img
                        src={mediaUrl(item.primary_image)}
                        alt={item.name}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.hidden = true
                        }}
                      />
                    )}
                  </div>

                  <div className="p-5">
                    <h2 className="font-bold text-[#143B4C]">
                      {item.name}
                    </h2>

                    <p className="mt-2 text-sm text-[#587481]">
                      {item.province} · ★{" "}
                      {Number(item.avg_rating || 0).toFixed(1)}
                    </p>
                  </div>
                </a>
              ))}
            </div>

            {!destinations.data.total && (
              <p className={box}>
                No published destinations in this category yet.
              </p>
            )}

            {destinations.data.pages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  type="button"
                  className={button}
                  disabled={page === 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </button>

                <span>
                  {page} / {destinations.data.pages}
                </span>

                <button
                  type="button"
                  className={button}
                  disabled={page >= destinations.data.pages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )
      )}
    </Page>
  )
}

/* TRAVELER DASHBOARD */

export function TravelerDashboard({ user }) {
  const result = useLoad("/portal/dashboard", true)
  const data = result.data

  return (
    <Page title={`Welcome, ${user.name}`}>
      <Notice error={result.error} />

      {result.loading ? (
        <p>Loading dashboard...</p>
      ) : (
        data && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Saved trips", data.trips],
                ["My reviews", data.reviews.length],
                ["My claims", data.claims.length],
              ].map(([label, value]) => (
                <div key={label} className={box}>
                  <p className="text-sm text-[#587481]">
                    {label}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-[#143B4C]">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="my-6 flex flex-wrap gap-3">
              <a href="#itineraries" className={button}>
                Plan a trip
              </a>

              <a href="#explore" className={button}>
                Explore destinations
              </a>

              <a href="#claim" className={button}>
                Claim a listing
              </a>
            </div>

            <section className={box}>
              <h2 className="mb-4 text-xl font-bold text-[#143B4C]">
                My reviews
              </h2>

              {!data.reviews.length && (
                <p className="text-sm text-[#587481]">
                  You have not submitted any reviews yet.
                </p>
              )}

              {data.reviews.map((review) => (
                <article
                  key={review.id}
                  className="border-t border-slate-100 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">
                      {review.attraction_name} · ★ {review.rating}
                    </h3>

                    <Status value={review.status} />
                  </div>

                  <p className="mt-2 whitespace-pre-line text-sm text-[#587481]">
                    {review.text}
                  </p>
                </article>
              ))}
            </section>

            <section className={`${box} mt-6`}>
              <h2 className="mb-4 text-xl font-bold text-[#143B4C]">
                My business claims
              </h2>

              {!data.claims.length && (
                <p className="text-sm text-[#587481]">
                  No claims submitted yet.
                </p>
              )}

              {data.claims.map((claim) => (
                <article
                  key={claim.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-4"
                >
                  <span>{claim.attraction_name}</span>
                  <Status value={claim.status} />
                </article>
              ))}
            </section>
          </>
        )
      )}
    </Page>
  )
}

/* BUSINESS CLAIM FORM */

export function ClaimPage() {
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [attractionId, setAttractionId] = useState("")
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const first = await apiRequest(
          "/attractions?page_size=24",
          { signal: controller.signal }
        )

        const rest = await Promise.all(
          Array.from(
            { length: first.pages - 1 },
            (_, index) =>
              apiRequest(
                `/attractions?page_size=24&page=${index + 2}`,
                { signal: controller.signal }
              )
          )
        )

        if (!controller.signal.aborted) {
          setDestinations([
            ...first.items,
            ...rest.flatMap((page) => page.items),
          ])
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(message(err))
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => controller.abort()
  }, [])

  async function submit(event) {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (notes.trim().length < 10) {
      setError(
        "Explain your connection to the business in at least 10 characters."
      )
      return
    }

    setBusy(true)

    try {
      const result = await apiRequest("/portal/claims", {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({
          attraction_id: Number(attractionId),
          notes: notes.trim(),
        }),
      })

      setSuccess(result.message)
      setAttractionId("")
      setNotes("")
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page title="Claim a business listing">
      <p className="mb-5 text-sm text-[#587481]">
        Submit a claim only for a listing you own or are
        authorized to represent.
      </p>

      <Notice error={error} success={success} />

      {loading ? (
        <p>Loading destinations...</p>
      ) : (
        <form
          onSubmit={submit}
          className={`${box} max-w-2xl`}
        >
          <fieldset
            disabled={busy || !destinations.length}
            className="space-y-5"
          >
            <label className="block space-y-2">
              <span className="text-sm font-semibold">
                Destination / business
              </span>

              <select
                className={input}
                value={attractionId}
                onChange={(event) =>
                  setAttractionId(event.target.value)
                }
                required
              >
                <option value="">Select a listing</option>

                {destinations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.province}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold">
                Explain your claim
              </span>

              <textarea
                className={input}
                rows={6}
                minLength={10}
                maxLength={2000}
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="Your role, business name, and how the admin can verify your authority..."
                required
              />
            </label>

            <p className="text-xs text-[#587481]">
              An administrator will review your request.
              Track its status on your dashboard.
            </p>

            <button className={button} type="submit">
              {busy ? "Submitting..." : "Submit claim"}
            </button>
          </fieldset>

          {!destinations.length && (
            <p>No published listings available.</p>
          )}
        </form>
      )}

      <a
        className={`${link} mt-6 inline-block`}
        href="#dashboard"
      >
        View my dashboard →
      </a>
    </Page>
  )
}

/* ADMIN FORM CONFIGURATION */

const configurations = {
  attractions: {
    title: "Attractions",
    create: true,
    remove: true,
    fields: [
      ["name", "Name", "text", true],
      ["description", "Description", "textarea"],
      ["category_id", "Category", "category", true],
      ["province", "Province", "text"],
      ["city_municipality", "City / municipality", "text"],
      ["region_code", "Region code", "text"],
      ["address", "Address", "text"],
      ["operating_hours", "Operating hours", "text"],
      ["price_range", "Price range", "text"],
      ["phone", "Phone", "text"],
      ["official_website", "Official website", "url"],
      [
        "image_url",
        "Photo URL (blank keeps current photo)",
        "text",
      ],
      [
        "status",
        "Status",
        ["pending", "published", "featured", "rejected"],
        true,
      ],
    ],
  },

  categories: {
    title: "Categories",
    create: true,
    remove: true,
    fields: [
      ["name", "Name", "text", true],
      ["description", "Description", "textarea"],
    ],
  },

  users: {
    title: "Users",
    remove: true,
    fields: [
      ["name", "Name", "text", true],
      ["role", "Role", ["user", "admin"], true],
      [
        "status",
        "Status",
        ["pending", "unverified", "verified", "disabled"],
        true,
      ],
    ],
  },

  reviews: {
    title: "Reviews",
    remove: true,
    fields: [
      [
        "status",
        "Status",
        ["pending", "approved", "rejected"],
        true,
      ],
    ],
  },

  claims: {
    title: "Claims",
    fields: [
      [
        "status",
        "Status",
        ["pending", "approved", "rejected"],
        true,
      ],
    ],
  },

  logs: {
    title: "Activity logs",
    fields: [],
  },
}

/* ADMIN DASHBOARD */

export function AdminDashboard() {
  const [resource, setResource] = useState("attractions")
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [search, setSearch] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [deleteId, setDeleteId] = useState(null)

  const overview = useLoad("/portal/admin-overview", true)
  const records = useLoad(`/portal/admin/${resource}`, true)
  const categories = useLoad("/portal/admin/categories", true)

  const config = configurations[resource]

  function changeResource(value) {
    setResource(value)
    setEditing(null)
    setDeleteId(null)
    setSearch("")
    setError("")
    setSuccess("")
  }

  function openForm(row = null) {
    const values = {}

    config.fields.forEach(([name, , type]) => {
      values[name] =
        row?.[name] ??
        (Array.isArray(type) ? type[0] : "")
    })

    setEditing(row ? row.id : "new")
    setForm(values)
    setError("")
    setSuccess("")
  }

  function refresh() {
    records.reload()
    overview.reload()
    categories.reload()
  }

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError("")
    setSuccess("")

    const payload = { ...form }

    if (resource === "attractions") {
      payload.category_id = Number(payload.category_id)
    }

    try {
      await apiRequest(
        `/portal/admin/${resource}${editing === "new" ? "" : `/${editing}`
        }`,
        {
          method: editing === "new" ? "POST" : "PATCH",
          headers: auth(),
          body: JSON.stringify(payload),
        }
      )

      setEditing(null)
      setSuccess("Changes saved.")
      refresh()
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError("")
    setSuccess("")

    try {
      await apiRequest(
        `/portal/admin/${resource}/${deleteId}`,
        {
          method: "DELETE",
          headers: auth(),
        }
      )

      setDeleteId(null)
      setEditing(null)
      setSuccess("Record removed.")
      refresh()
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  const rows = (records.data || []).filter((row) =>
    Object.values(row).some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  )

  return (
    <Page title="Admin dashboard">
      <Notice
        error={
          error ||
          records.error ||
          overview.error ||
          categories.error
        }
        success={success}
      />

      {overview.data && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(overview.data).map(
            ([key, value]) => (
              <div className={box} key={key}>
                <p className="text-xs capitalize text-[#587481]">
                  {key.replaceAll("_", " ")}
                </p>

                <p className="mt-2 text-3xl font-bold text-[#143B4C]">
                  {value}
                </p>
              </div>
            )
          )}
        </div>
      )}

      <nav
        aria-label="Admin sections"
        className="mb-6 flex flex-wrap gap-2"
      >
        {Object.entries(configurations).map(
          ([key, value]) => (
            <button
              type="button"
              key={key}
              disabled={busy}
              onClick={() => changeResource(key)}
              className={`cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold ${resource === key
                ? "bg-[#1676A5] text-white"
                : "bg-white text-[#143B4C]"
                }`}
            >
              {value.title}
            </button>
          )
        )}
      </nav>

      <div className="mb-5 flex flex-wrap gap-3">
        <input
          aria-label="Search admin records"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder={`Search ${config.title.toLowerCase()}...`}
          className={`${input} max-w-md`}
        />

        {config.create && (
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() => openForm()}
          >
            Add{" "}
            {resource === "categories"
              ? "category"
              : "attraction"}
          </button>
        )}

        <button
          type="button"
          className={button}
          disabled={busy}
          onClick={refresh}
        >
          Refresh
        </button>
      </div>

      {editing !== null && (
        <form
          onSubmit={save}
          className={`${box} mb-6`}
        >
          <h2 className="mb-5 text-xl font-bold text-[#143B4C]">
            {editing === "new"
              ? "Add record"
              : `Edit record #${editing}`}
          </h2>

          <fieldset
            disabled={busy}
            className="grid gap-4 md:grid-cols-2"
          >
            {config.fields.map(
              ([name, label, type, required]) => (
                <label
                  key={name}
                  className={`block space-y-2 ${type === "textarea"
                    ? "md:col-span-2"
                    : ""
                    }`}
                >
                  <span className="text-sm font-semibold text-[#143B4C]">
                    {label}
                  </span>

                  {Array.isArray(type) ||
                    type === "category" ? (
                    <select
                      className={input}
                      required={required}
                      value={form[name]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [name]: event.target.value,
                        }))
                      }
                    >
                      {type === "category" ? (
                        <>
                          <option value="">
                            Select category
                          </option>

                          {(categories.data || []).map(
                            (category) => (
                              <option
                                key={category.id}
                                value={category.id}
                              >
                                {category.name}
                              </option>
                            )
                          )}
                        </>
                      ) : (
                        type.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))
                      )}
                    </select>
                  ) : type === "textarea" ? (
                    <textarea
                      className={input}
                      rows={4}
                      value={form[name]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [name]: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <input
                      className={input}
                      type={type}
                      required={required}
                      value={form[name]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [name]: event.target.value,
                        }))
                      }
                    />
                  )}
                </label>
              )
            )}

            <div className="flex gap-3 md:col-span-2">
              <button
                className={button}
                type="submit"
              >
                {busy ? "Saving..." : "Save changes"}
              </button>

              <button
                className={link}
                type="button"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {deleteId !== null && (
        <div
          role="alert"
          className="mb-6 rounded-2xl bg-red-50 p-5"
        >
          <p>
            Remove record #{deleteId}? It will be hidden
            from active records.
          </p>

          <div className="mt-3 flex gap-4">
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={remove}
            >
              Confirm removal
            </button>

            <button
              type="button"
              className={link}
              disabled={busy}
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {records.loading ? (
        <p>Loading records...</p>
      ) : (
        <div className="space-y-3">
          {!rows.length && (
            <p className={box}>
              No matching records.
            </p>
          )}

          {rows.map((row) => (
            <article
              key={row.id}
              className={`${box} flex flex-wrap items-start justify-between gap-4`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#143B4C]">
                  #{row.id} ·{" "}
                  {row.name ||
                    row.attraction_name ||
                    row.details ||
                    row.action}
                </p>

                {row.user_name && (
                  <p className="mt-1 text-sm text-[#587481]">
                    By {row.user_name}
                  </p>
                )}

                {row.email && (
                  <p className="mt-1 break-all text-sm text-[#587481]">
                    {row.email} · {row.role}
                  </p>
                )}

                {row.province && (
                  <p className="mt-1 text-sm text-[#587481]">
                    {row.province} ·{" "}
                    {row.category || "Uncategorized"}
                  </p>
                )}

                {row.rating != null && (
                  <p className="mt-2 text-sm text-amber-600">
                    ★ {row.rating} / 5
                  </p>
                )}

                {(row.text || row.notes) && (
                  <p className="mt-2 whitespace-pre-line break-words text-sm text-[#587481]">
                    {row.text || row.notes}
                  </p>
                )}

                {row.created_at && (
                  <p className="mt-2 text-xs text-[#587481]">
                    {String(row.created_at).replace("T", " ")}
                  </p>
                )}

                {row.status && (
                  <div className="mt-3">
                    <Status value={row.status} />
                  </div>
                )}
              </div>

              {resource !== "logs" && (
                <div className="flex gap-4">
                  <button
                    type="button"
                    className={link}
                    disabled={busy}
                    onClick={() => openForm(row)}
                  >
                    {["reviews", "claims"].includes(resource)
                      ? "Review"
                      : "Edit"}
                  </button>

                  {config.remove && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setDeleteId(row.id)}
                      className="cursor-pointer text-sm font-semibold text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </Page>
  )
}