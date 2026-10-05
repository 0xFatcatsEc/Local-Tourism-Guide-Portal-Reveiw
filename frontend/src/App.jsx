import Navbar from './components/Navbar'
import Hero from './components/Hero'

function App() {
  return (
    <div className="min-h-screen">
      <div className="relative min-h-screen bg-[#fefcff]">
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 30% 70%, rgba(197, 216, 230, 0.20), transparent 60%),
              radial-gradient(circle at 70% 30%, rgba(255, 182, 193, 0.25), transparent 60%)
            `,
          }}
        />
        <div className="relative z-10">
          <Navbar />
          <Hero />
        </div>
      </div>
    </div>
  )
}

export default App