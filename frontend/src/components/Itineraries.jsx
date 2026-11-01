import { useEffect, useState } from "react"
import { apiRequest } from "../api"

const inputStyle =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 " +
  "text-sm outline-none focus:border-[#1676A5]"

function Itineraries() {
  const [trips, setTrips] = useState([])
  const [attractions, setAttractions] = useState([])

  const [title, setTitle] = useState("")
  const [days, setDays] = useState(1)
  const [summary, setSummary] = useState("")
  const [region, setRegion] = useState("")
  const [cost, setCost] = useState("0")

  const [selectedAttraction, setSelectedAttraction] = useState("")
  const [selectedDay, setSelectedDay] = useState(1)
  const [stops, setStops] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [activeTrip, setActiveTrip] = useState(null)
  const [viewing, setViewing] = useState(false)

  function authHeaders() {
    return {
      Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
    }
  }

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const [savedTrips, firstPage] = await Promise.all([
          apiRequest("/itineraries", {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
            },
            signal: controller.signal,
          }),
          apiRequest("/attractions?page=1&page_size=24", {
            signal: controller.signal,
          }),
        ])

        let destinations = [...firstPage.items]

        for (let page = 2; page <= firstPage.pages; page++) {
          const result = await apiRequest(
            `/attractions?page=${page}&page_size=24`,
            { signal: controller.signal }
          )

          destinations = [...destinations, ...result.items]
        }

        if (controller.signal.aborted) return

        setTrips(savedTrips)
        setAttractions(destinations)
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.status === 401
              ? "Your session expired. Please login again."
              : err instanceof TypeError
                ? "Cannot connect to the backend."
                : err.message
          )
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

  function addStop() {
    setError("")
    setSuccess("")

    const attraction = attractions.find(
      (item) => item.id === Number(selectedAttraction)
    )

    if (!attraction) {
      setError("Select a destination first.")
      return
    }

    if (
      stops.some(
        (stop) =>
          stop.attraction_id === attraction.id &&
          stop.day_index === selectedDay
      )
    ) {
      setError("That destination is already included on this day.")
      return
    }

    setStops((current) => [
      ...current,
      {
        attraction_id: attraction.id,
        name: attraction.name,
        day_index: selectedDay,
      },
    ])

    setSelectedAttraction("")
  }

  async function saveTrip(event) {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (!title.trim() || !summary.trim() || !region.trim()) {
      setError("Complete the trip title, summary, and region.")
      return
    }

    if (!stops.length) {
      setError("Add at least one destination.")
      return
    }

    if (stops.some((stop) => stop.day_index > days)) {
      setError("Remove stops assigned beyond your selected number of days.")
      return
    }

    const estimatedCost = Number(cost)

    if (
      !Number.isFinite(estimatedCost) ||
      estimatedCost < 0 ||
      estimatedCost > 99999999.99
    ) {
      setError("Enter a valid estimated cost.")
      return
    }

    const dayOrder = {}

    const plannedStops = stops.map((stop) => {
      dayOrder[stop.day_index] = (dayOrder[stop.day_index] || 0) + 1

      return {
        attraction_id: stop.attraction_id,
        day_index: stop.day_index,
        order_index: dayOrder[stop.day_index],
        notes: null,
      }
    })

    setSaving(true)

    try {
      const result = await apiRequest("/itineraries", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          days,
          summary: summary.trim(),
          region_scope: region.trim(),
          estimated_cost: estimatedCost,
          attractions: plannedStops,
        }),
      })

      // Update the visible list from the successfully saved data.
      setTrips((current) => [
        {
          id: result.itinerary_id,
          title: title.trim(),
          days,
          summary: summary.trim(),
          region_scope: region.trim(),
          estimated_cost: estimatedCost,
        },
        ...current,
      ])

      setTitle("")
      setDays(1)
      setSummary("")
      setRegion("")
      setCost("0")
      setStops([])
      setSelectedDay(1)
      setSelectedAttraction("")
      setSuccess("Your itinerary was saved successfully!")
    } catch (err) {
      setError(
        err.status === 401
          ? "Your session expired. Please login again."
          : err instanceof TypeError
            ? "Cannot connect to the backend."
            : err.message
      )
    } finally {
      setSaving(false)
    }
  }

  async function viewTrip(id) {
    setViewing(true)
    setError("")
    setActiveTrip(null)

    try {
      const trip = await apiRequest(`/itineraries/${id}`, {
        headers: authHeaders(),
      })

      setActiveTrip(trip)
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot connect to the backend."
          : err.message
      )
    } finally {
      setViewing(false)
    }
  }

  if (loading) {
    return (
      <p className="py-24 text-center text-[#587481]">
        Loading your trip planner...
      </p>
    )
  }

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-12">
      <a href="#home" className="text-sm font-semibold text-[#1676A5]">
        ← Back to home
      </a>

      <h1 className="mt-6 text-3xl font-bold text-[#143B4C]">
        My itineraries
      </h1>

      <p className="mt-2 text-sm text-[#587481]">
        Organize destinations into your own daily travel plan.
      </p>

      {error && (
        <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
          <a href="#login" className="ml-2 font-semibold underline">
            Login
          </a>
        </div>
      )}

      {success && (
        <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">
          {success}
        </p>
      )}

      <form
        onSubmit={saveTrip}
        className="mt-8 space-y-5 rounded-3xl bg-white p-6 shadow-sm"
      >
        <h2 className="text-xl font-bold text-[#143B4C]">
          Create a trip
        </h2>

        <fieldset disabled={saving} className="space-y-5">
          <label className="block space-y-2 text-sm text-[#143B4C]">
            <span className="font-semibold">Trip title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="My Philippine getaway"
              maxLength={200}
              className={inputStyle}
              required
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block space-y-2 text-sm text-[#143B4C]">
              <span className="font-semibold">Number of days</span>

              <select
                value={days}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  setDays(value)
                  setSelectedDay((current) => Math.min(current, value))
                }}
                className={inputStyle}
              >
                {Array.from({ length: 30 }, (_, index) => index + 1).map(
                  (day) => (
                    <option key={day} value={day}>
                      {day} day{day === 1 ? "" : "s"}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="block space-y-2 text-sm text-[#143B4C]">
              <span className="font-semibold">Region / destination area</span>
              <input
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                placeholder="e.g. Palawan"
                maxLength={100}
                className={inputStyle}
                required
              />
            </label>

            <label className="block space-y-2 text-sm text-[#143B4C]">
              <span className="font-semibold">Estimated cost (₱)</span>
              <input
                type="number"
                min="0"
                max="99999999.99"
                step="0.01"
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                className={inputStyle}
                required
              />
            </label>
          </div>

          <label className="block space-y-2 text-sm text-[#143B4C]">
            <span className="font-semibold">Trip summary</span>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Describe your travel plan..."
              rows={3}
              maxLength={2000}
              className={inputStyle}
              required
            />
          </label>

          <div className="rounded-2xl bg-[#f5fafc] p-4">
            <h3 className="mb-3 font-semibold text-[#143B4C]">
              Add destinations
            </h3>

            <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
              <select
                aria-label="Trip day"
                value={selectedDay}
                onChange={(event) => setSelectedDay(Number(event.target.value))}
                className={inputStyle}
              >
                {Array.from({ length: days }, (_, index) => index + 1).map(
                  (day) => (
                    <option key={day} value={day}>
                      Day {day}
                    </option>
                  )
                )}
              </select>

              <select
                aria-label="Destination"
                value={selectedAttraction}
                onChange={(event) => setSelectedAttraction(event.target.value)}
                className={inputStyle}
              >
                <option value="">Select destination</option>

                {attractions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.province}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={addStop}
                disabled={stops.length >= 300}
                className="cursor-pointer rounded-xl bg-[#E0F2FA] px-5 py-3 text-sm font-semibold text-[#1676A5] disabled:opacity-50"
              >
                Add stop
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {stops.map((stop, index) => (
                <div
                  key={`${stop.day_index}-${stop.attraction_id}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm"
                >
                  <p className={stop.day_index > days ? "text-red-700" : "text-[#143B4C]"}>
                    <strong>Day {stop.day_index}</strong> — {stop.name}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setStops((current) =>
                        current.filter((_, position) => position !== index)
                      )
                    }
                    className="cursor-pointer font-semibold text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {!stops.length && (
                <p className="text-sm text-[#587481]">
                  No destinations added yet.
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="cursor-pointer rounded-xl bg-[#1676A5] px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save itinerary"}
          </button>
        </fieldset>
      </form>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-[#143B4C]">
          Saved trips
        </h2>

        {!trips.length ? (
          <p className="mt-4 text-sm text-[#587481]">
            You have no saved itineraries yet.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {trips.map((trip) => (
              <article key={trip.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-[#143B4C]">
                  {trip.title}
                </h3>

                <p className="mt-2 text-sm text-[#587481]">
                  {trip.days} day(s) · {trip.region_scope}
                </p>

                <p className="mt-3 text-sm text-[#587481]">
                  {trip.summary}
                </p>

                <p className="mt-3 font-semibold text-[#1676A5]">
                  ₱{Number(trip.estimated_cost || 0).toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>

                <button
                  type="button"
                  disabled={viewing}
                  onClick={() => viewTrip(trip.id)}
                  className="mt-4 cursor-pointer text-sm font-semibold text-[#1676A5] disabled:opacity-50"
                >
                  View daily plan →
                </button>
              </article>
            ))}
          </div>
        )}

        {viewing && (
          <p role="status" className="mt-5 text-sm text-[#587481]">
            Loading daily plan...
          </p>
        )}

        {activeTrip && (
          <article className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-[#143B4C]">
                {activeTrip.title}
              </h3>

              <button
                type="button"
                onClick={() => setActiveTrip(null)}
                className="cursor-pointer text-sm text-[#587481]"
              >
                Close
              </button>
            </div>

            {Array.from(
              { length: Number(activeTrip.days) },
              (_, index) => index + 1
            ).map((day) => {
              const dayStops = activeTrip.attractions.filter(
                (stop) => stop.day_index === day
              )

              return (
                <div key={day} className="mt-5 border-t border-slate-100 pt-4">
                  <h4 className="font-bold text-[#1676A5]">Day {day}</h4>

                  {dayStops.length ? (
                    <ol className="mt-2 list-inside list-decimal space-y-2 text-sm text-[#143B4C]">
                      {dayStops.map((stop) => (
                        <li key={stop.id}>
                          <a
                            href={`#attraction/${stop.attraction_id}`}
                            className="hover:underline"
                          >
                            {stop.name}
                          </a>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-2 text-sm text-[#587481]">
                      No stops planned.
                    </p>
                  )}
                </div>
              )
            })}
          </article>
        )}
      </section>
    </main>
  )
}

export default Itineraries