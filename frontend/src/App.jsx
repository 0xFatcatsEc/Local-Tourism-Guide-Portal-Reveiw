import { useState, useEffect } from 'react'
import Hero from './components/Hero'

const API_URL = 'http://127.0.0.1:8000'

function App() {
    const [attractions, setAttractions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedId, setSelectedId] = useState (null)
    const [detail, setDetail] = useState(null)
    const [reviews, setReviews] = useState([])

    useEffect(() => {
        async function loadAttractions() {
          try {
            const res = await fetch(`${API_URL}/attractions`)
            const data = await res.json()
            setAttractions(data)
          } catch (err) {
            setError(err.message)
          } finally {
            setLoading(false)
          }
        }
        loadAttractions()
      }, [])

    useEffect(() => {
      if (selectedId === null) return

      async function loadDetail() {
        try {
          const detailRes = await fetch(`${API_URL}/attractions/${selectedId}`)
          const detailData = await detailRes.json()
          setDetail(detailData)

          const reviewsRes = await fetch(`${API_URL}/attractions/${selectedId}/reviews`)
          if (reviewsRes.status === 404){
            setReviews([])
          } else {
            const reviewsData = await reviewsRes.json()
            setReviews(reviewsData)
          }
        } catch (err) {
          setError(err.message)
        }
      }
      loadDetail()
    }, [selectedId])

    return (
      <div className="min-h-screen bg-slate-100 py-10">
        <div className="mx-auto max-w-4xl px-4">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Local Tourism Guide Portal
          </h1>
          <p className="text-slate-500 mb-8">
            Discover tourist spots in the Philippines
          </p>

          {loading && <p className="text-slate-600">Loading attractions...</p>}
          {error && <p className="text-red-600">Error: {error}</p>}

          {/* ===== DETAIL VIEW (pag may na-click) ===== */}
          {selectedId !== null && detail && (
            <div>
              {/* Back button */}
              <button
                onClick={() => setSelectedId(null)}
                className="mb-6 rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600 transition"
              >
                ← Back to Attractions
              </button>

              {/* Detail card */}
              <div className="rounded-xl bg-white p-6 shadow">
                <h2 className="text-2xl font-bold text-slate-800">{detail.name}</h2>
                <p className="text-slate-500 mt-1">{detail.province}</p>
                <p className="text-sm text-slate-400 mt-1">{detail.category_name}</p>
                <p className="mt-3 text-amber-500 font-medium">★ {detail.avg_rating} average rating</p>

                {detail.description && (
                  <p className="mt-4 text-slate-600">{detail.description}</p>
                )}
              </div>

              {/* Reviews section */}
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-slate-800 mb-4">
                  Reviews ({reviews.length})
                </h3>

                {reviews.length === 0 ? (
                    <p className="text-slate-400 italic">No reviews yet. Be the first to review!</p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((r) => (
                        <div key={r.id} className="rounded-lg bg-white p-4 shadow">
                          <p className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
                          <p className="mt-2 text-slate-700">{r.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* ===== GRID VIEW (pag walang na-click) ===== */}
          {selectedId === null && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {attractions.map((a) => (
                <div
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className="rounded-xl bg-white p-5 shadow hover:shadow-md transition cursor-pointer"
                >
                  <h2 className="text-lg font-semibold text-slate-800">{a.name}</h2>
                  <p className="text-sm text-slate-500">{a.category}</p>
                  <p className="mt-2 font-medium text-amber-500">★ {a.avg_rating}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
}

export default App;