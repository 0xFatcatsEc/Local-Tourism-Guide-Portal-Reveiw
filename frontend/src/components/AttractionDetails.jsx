import { useEffect, useState } from "react"
import { apiRequest, mediaUrl } from "../api"
import ReviewForm from "./ReviewForm"

function AttractionDetails({ id }) {
  const [attraction, setAttraction] = useState(null)
  const [reviews, setReviews] = useState([])
  const [selectedImage, setSelectedImage] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reviewsError, setReviewsError] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    async function loadDetails() {
      setLoading(true)
      setError("")
      setReviewsError("")
      setAttraction(null)
      setReviews([])
      setSelectedImage("")

      const results = await Promise.allSettled([
        apiRequest(`/attractions/${id}`, {
          signal: controller.signal,
        }),
        apiRequest(`/attractions/${id}/reviews`, {
          signal: controller.signal,
        }),
      ])

      if (controller.signal.aborted) return

      if (results[0].status === "fulfilled") {
        const data = results[0].value

        setAttraction(data)
        setSelectedImage(data.images?.[0]?.url || "")
      } else {
        const reason = results[0].reason

        setError(
          reason instanceof TypeError
            ? "Cannot connect to the backend."
            : reason.message
        )
      }

      if (results[1].status === "fulfilled") {
        setReviews(results[1].value)
      } else {
        setReviewsError("Reviews could not be loaded.")
      }

      setLoading(false)
    }

    loadDetails()

    return () => controller.abort()
  }, [id])

  if (loading) {
    return (
      <p role="status" className="py-24 text-center text-[#587481]">
        Loading destination...
      </p>
    )
  }

  if (error || !attraction) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        <a href="#explore" className="font-semibold text-[#1676A5]">
          ← Back to destinations
        </a>

        <p
          role="alert"
          className="mt-6 rounded-2xl bg-red-50 p-5 text-red-700"
        >
          {error || "Destination not found."}
        </p>
      </main>
    )
  }

  const a = attraction
  const images = a.images || []

  const location = [
    a.barangay,
    a.city_municipality,
    a.province,
  ]
    .filter(Boolean)
    .join(", ")

  const hasCoordinates =
    a.lat != null &&
    a.lng != null &&
    Number.isFinite(Number(a.lat)) &&
    Number.isFinite(Number(a.lng))

  const website = /^https?:\/\//i.test(a.official_website || "")
    ? a.official_website
    : ""

  const information = [
    ["Address", a.address || location],
    ["Region", a.region_code],
    ["Operating hours", a.operating_hours],
    ["Price range", a.price_range],
    ["Contact", a.phone || a.contact_info],
    ["Accessibility", a.accessibility_info],
  ]

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-12">
      <a
        href="#explore"
        className="text-sm font-semibold text-[#1676A5]"
      >
        ← Back to destinations
      </a>

      <div className="mt-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#1676A5]">
            {a.category_name || "Destination"}
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#143B4C] md:text-4xl">
            {a.name}
          </h1>

          <p className="mt-2 text-sm text-[#587481]">
            {location || "Philippines"}
          </p>
        </div>

        <div className="rounded-2xl bg-white px-5 py-3 shadow-sm">
          <p className="font-bold text-amber-600">
            ★ {Number(a.avg_rating || 0).toFixed(1)} / 5
          </p>

          <p className="text-xs text-[#587481]">
            Average rating
          </p>
        </div>
      </div>

      <div className="relative mt-8 flex h-[300px] items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#E0F2FA] to-[#fce7f3] md:h-[480px]">
        <p className="text-[#587481]">
          Photo coming soon
        </p>

        {mediaUrl(selectedImage) && (
          <img
            key={selectedImage}
            src={mediaUrl(selectedImage)}
            alt={a.name}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.hidden = true
            }}
          />
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelectedImage(image.url)}
              aria-label={`View photo ${index + 1}`}
              aria-pressed={selectedImage === image.url}
              className={`h-20 w-28 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 bg-[#E0F2FA] ${selectedImage === image.url
                ? "border-[#1676A5]"
                : "border-transparent"
                }`}
            >
              <img
                src={mediaUrl(image.url)}
                alt={image.caption || `Photo ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#143B4C]">
            About this destination
          </h2>

          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#587481]">
            {a.description || "No description available yet."}
          </p>
        </section>

        <aside className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#143B4C]">
            Visit information
          </h2>

          <dl className="mt-5 space-y-4">
            {information.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-bold uppercase text-[#587481]">
                  {label}
                </dt>

                <dd className="mt-1 break-words text-sm text-[#143B4C]">
                  {value || "Not provided"}
                </dd>
              </div>
            ))}
          </dl>

          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 block rounded-xl border border-[#1676A5] px-4 py-3 text-center text-sm font-semibold text-[#1676A5]"
            >
              Official website ↗
            </a>
          )}

          {hasCoordinates && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block rounded-xl bg-[#1676A5] px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Open in Google Maps ↗
            </a>
          )}
        </aside>
      </div>

      <ReviewForm key={id} attractionId={id} />

      <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#143B4C]">
          Traveler reviews
        </h2>

        {reviewsError ? (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {reviewsError}
          </p>
        ) : reviews.length === 0 ? (
          <p className="mt-4 text-sm text-[#587481]">
            No approved reviews yet.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-slate-100 p-4"
              >
                <p className="font-semibold text-amber-600">
                  ★ {review.rating} / 5
                </p>

                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#587481]">
                  {review.text}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default AttractionDetails