import HeroImg from "../assets/tourist_spot/hero_img.jpeg"

function Hero() {
    return (
        <section className="mx-auto grid min-h-[85vh] max-w-[1440px] items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:px-10">
            <div className="text-center lg:text-left">
                <p className="mb-6 inline-block rounded-full bg-[#E0F2FA] px-5 py-2 text-xs font-bold tracking-wide text-[#1676A5]">
                    YOUR NEXT JOURNEY STARTS HERE
                </p>

                <h1 className="text-5xl leading-tight text-[#143B4C] md:text-6xl xl:text-7xl">
                    A little closer to
                    <br />
                    <span className="font-bold">paradise.</span>
                </h1>

                <p className="mx-auto mt-6 max-w-lg text-sm leading-7 text-[#587481] lg:mx-0">
                    Find a place that moves you. Explore Philippine destinations,
                    discover local favorites, and make the journey your own.
                </p>

                <a
                    href="#explore"
                    className="mt-8 inline-flex rounded-full bg-[#1676A5] px-8 py-3 font-semibold text-white transition hover:bg-[#125e84]"
                >
                    Explore destinations →
                </a>
            </div>

            <div className="relative">
                <img
                    src={HeroImg}
                    alt="Big Lagoon in El Nido, Palawan"
                    className="h-[350px] w-full rounded-3xl object-cover md:h-[480px]"
                />

                <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/85 p-4 shadow-lg backdrop-blur-xl">
                    <p className="font-bold text-[#143B4C]">Big Lagoon</p>
                    <p className="text-sm text-[#587481]">El Nido, Palawan</p>
                </div>
            </div>
        </section>
    )
}

export default Hero