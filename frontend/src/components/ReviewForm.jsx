import { useState } from "react"
import { apiRequest } from "../api"

function ReviewForm({ attractionId }) {
  const [rating, setRating] = useState(0)
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [needsLogin, setNeedsLogin] = useState(false)

  const token = sessionStorage.getItem("access_token")

  async function handleSubmit(event) {
    event.preventDefault()

    setError("")
    setSuccess("")

    const currentToken = sessionStorage.getItem("access_token")

    if (!currentToken) {
      setNeedsLogin(true)
      return
    }

    if (rating < 1 || rating > 5) {
      setError("Choose a rating from 1 to 5 stars.")
      return
    }

    if (!text.trim()) {
      setError("Write your review before submitting.")
      return
    }

    setLoading(true)

    try {
      await apiRequest("/reviews", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          attraction_id: Number(attractionId),
          rating,
          text: text.trim(),
        }),
      })

      setSuccess(
        "Review submitted! It will appear after admin approval."
      )

      setSubmitted(true)
      setText("")
      setRating(0)
    } catch (err) {
      if (err.status === 401) {
        setNeedsLogin(true)
        setError("Your session expired. Please login again.")
      } else if (err.status === 409) {
        setSubmitted(true)
        setError("You already submitted a review for this destination.")
      } else {
        setError(
          err instanceof TypeError
            ? "Cannot connect to the backend. Please try again."
            : err.message
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#143B4C]">
        Share your experience
      </h2>

      <p className="mt-2 text-sm text-[#587481]">
        Help other travelers by sharing your rating and review.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {!token || needsLogin ? (
        <div className="mt-5 rounded-2xl bg-[#E0F2FA] p-5">
          <p className="text-sm text-[#143B4C]">
            Login to submit a review.
          </p>

          <a
            href="#login"
            className="mt-3 inline-block rounded-xl bg-[#1676A5] px-5 py-2 text-sm font-semibold text-white"
          >
            Login
          </a>
        </div>
      ) : submitted ? null : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <fieldset disabled={loading}>
            <legend className="text-sm font-semibold text-[#143B4C]">
              Your rating
            </legend>

            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  aria-pressed={rating === value}
                  className={`cursor-pointer rounded-lg px-1 text-4xl transition focus-visible:outline-2 focus-visible:outline-[#1676A5] disabled:cursor-wait ${value <= rating
                    ? "text-amber-400"
                    : "text-slate-300"
                    }`}
                >
                  ★
                </button>
              ))}
            </div>

            <p
              aria-live="polite"
              className="mt-2 text-xs text-[#587481]"
            >
              {rating
                ? `${rating} out of 5 stars`
                : "Select your rating"}
            </p>
          </fieldset>

          <div>
            <label
              htmlFor="review-text"
              className="mb-2 block text-sm font-semibold text-[#143B4C]"
            >
              Your review
            </label>

            <textarea
              id="review-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What did you enjoy? Share helpful tips for other travelers..."
              rows={5}
              maxLength={2000}
              disabled={loading}
              required
              className="w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm text-[#143B4C] outline-none focus:border-[#1676A5] focus:ring-2 focus:ring-[#1676A5]/15 disabled:opacity-60"
            />

            <p className="mt-1 text-right text-xs text-[#587481]">
              {text.length}/2000
            </p>
          </div>

          <p className="text-xs text-[#587481]">
            Reviews are checked by an administrator before publication.
          </p>

          <button
            type="submit"
            disabled={loading || !rating || !text.trim()}
            className="cursor-pointer rounded-2xl bg-[#1676A5] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#125e84] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit review"}
          </button>
        </form>
      )}
    </section>
  )
}

export default ReviewForm