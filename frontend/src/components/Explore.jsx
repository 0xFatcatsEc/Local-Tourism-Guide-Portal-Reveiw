import { useEffect, useState } from "react"
import { apiRequest, mediaUrl } from "../api"

const emptyFilters = {
  q: "",
  region: "",
  category_id: "",
}

const fieldStyle =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 " +
  "text-sm outline-none focus:border-[#1676A5]"

function Explore() {
  const [draft, setDraft] = useState(emptyFilters)
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState(1)

  const [categories, setCategories] = useState([])
  const [regions, setRegions] = useState([])
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filterError, setFilterError] = useState("")
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadFilters() {
      const results = await Promise.allSettled([
        apiRequest("/categories", { signal: controller.signal }),
        apiRequest("/regions", { signal: controller.signal }),
      ])

      if (controller.signal.aborted) return

      if (results[0].status === "fulfilled") {
        setCategories(results[0].value)
      }

      if (results[1].status === "fulfilled") {
        setRegions(results[1].value)
      }

      if (results.some((result) => result.status === "rejected")) {
        setFilterError("Some filters could not load. You can still search.")
      }
    }

    loadFilters()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadAttractions() {
      setLoading(true)
      setError("")

      const query = new URLSearchParams({
        page: String(page),
        page_size: "12",
      })

      Object.entries(filters).forEach(([key, value]) => {
        if (value) query.set(key, value)
      })

      try {
        const result = await apiRequest(`/attractions?${query}`, {
          signal: controller.signal,
        })

        if (controller.signal.aborted) return

        setItems(result.items)
        setTotal(result.total)
        setPages(result.pages)
      } catch (err) {
        if (controller.signal.aborted) return

        setError(
          err instanceof TypeError
            ? "Cannot connect to the backend."
            : err.message
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadAttractions()

    return () => controller.abort()
  }, [filters, page, retry])

  function updateDraft(event) {
    const { name, value } = event.target

    setDraft((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function search(event) {
    event.preventDefault()
    setPage(1)

    setFilters({
      ...draft,
      q: draft.q.trim(),
    })
  }

  function resetFilters() {
    setDraft({ ...emptyFilters })
    setFilters({ ...emptyFilters })
    setPage(1)
  }

  return (
    <section
      id="explore"
      className="mx-auto max-w-[1440px] scroll-mt-28 px-6 pb-20 lg:px-10"
    >
      <div className="mb-7">
        <p className="text-xs font-bold tracking-widest text-[#1676A5]">
          DISCOVER THE PHILIPPINES
        </p>

        <h2 className="mt-2 text-3xl font-bold text-[#143B4C]">
          Find your next destination
        </h2>

        <p className="mt-2 text-sm text-[#587481]">
          Explore places by name, province, region, or category.
        </p>
      </div>

      <form
        onSubmit={search}
        className="grid gap-3 rounded-3xl bg-white/90 p-5 shadow-lg md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_auto_auto]"
      >
        <div>
          <label htmlFor="destination-search" className="sr-only">
            Search destinations
          </label>

          <input
            id="destination-search"
            name="q"
            value={draft.q}
            onChange={updateDraft}
            placeholder="Search destination or province..."
            maxLength={200}
            className={fieldStyle}
          />
        </div>

        <div>
          <label htmlFor="region-filter" className="sr-only">
            Region
          </label>

          <select
            id="region-filter"
            name="region"
            value={draft.region}
            onChange={updateDraft}
            className={fieldStyle}
          >
            <option value="">All regions</option>

            {regions.map((region) => (
              <option key={region.code} value={region.code}>
                Region {region.code}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="category-filter" className="sr-only">
            Category
          </label>

          <select
            id="category-filter"
            name="category_id"
            value={draft.category_id}
            onChange={updateDraft}
            className={fieldStyle}
          >
            <option value="">All categories</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="cursor-pointer rounded-2xl bg-[#1676A5] px-6 py-3 text-sm font-semibold text-white hover:bg-[#125e84]"
        >
          Search
        </button>

        <button
          type="button"
          onClick={resetFilters}
          className="cursor-pointer rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-[#587481]"
        >
          Reset
        </button>
      </form>

      {filterError && (
        <p role="status" className="mt-3 text-sm text-amber-700">
          {filterError}
        </p>
      )}

      {loading ? (
        <p role="status" className="py-16 text-center text-[#587481]">
          Loading destinations...
        </p>
      ) : error ? (
        <div role="alert" className="mt-8 rounded-2xl bg-red-50 p-5 text-red-700">
          <p>{error}</p>

          <button
            type="button"
            onClick={() => setRetry((current) => current + 1)}
            className="mt-3 cursor-pointer font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <p role="status" className="my-6 text-sm text-[#587481]">
            {total} destination{total === 1 ? "" : "s"} found
          </p>

          {items.length === 0 ? (
            <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
              <h3 className="text-xl font-bold text-[#143B4C]">
                No destinations found
              </h3>

              <p className="mt-2 text-sm text-[#587481]">
                Try another keyword or reset your filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <a
                  key={item.id}
                  href={`#attraction/${item.id}`}
                  className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative flex h-56 items-center justify-center bg-gradient-to-br from-[#E0F2FA] to-[#fce7f3]">
                    <span className="text-sm text-[#587481]">
                      Photo coming soon
                    </span>

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

                    <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#1676A5]">
                      {item.category || "Destination"}
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-xl font-bold text-[#143B4C] group-hover:text-[#1676A5]">
                        {item.name}
                      </h3>

                      <span className="shrink-0 text-sm font-semibold text-amber-600">
                        ★ {Number(item.avg_rating || 0).toFixed(1)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-[#587481]">
                      {[item.city_municipality, item.province]
                        .filter(Boolean)
                        .join(", ") || "Philippines"}
                    </p>

                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#587481]">
                      {item.description || "Discover this local destination."}
                    </p>

                    <p className="mt-5 text-sm font-semibold text-[#1676A5]">
                      View destination →
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}

          {pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-5">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm disabled:cursor-default disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-sm text-[#587481]">
                Page {page} of {pages}
              </span>

              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((current) => current + 1)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm disabled:cursor-default disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default Explore