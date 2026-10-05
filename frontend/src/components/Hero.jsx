import HeroImg from '../assets/tourist_spot/hero_img.jpeg'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot } from '@fortawesome/free-solid-svg-icons'
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { faRoute } from '@fortawesome/free-solid-svg-icons';

function Hero() {
    return (
        <div className="min-h-screen w-full bg-[#fefcff] relative">
            <div
              className="absolute inset-0 z-0 pointer-events-none"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 30% 70%, rgba(173, 216, 230, 0.6), transparent 50%),
                  radial-gradient(circle at 70% 30%, rgba(255, 182, 193, 0.4), transparent 50%)`,
              }}
            />
            <div id="hero-container" className="flex flex-row justify-between  h-[100vh] relative z-10 items-center max-w-8xl mx-auto px-10 gap-10 ml-10">
                <div id="hero-content" className="flex flex-col h-auto justify-start text-center">
                    <div className="text-center w-auto mb-5">
                        <p className="bg-[var(--text-bg-secondary)] text-[var(--text-hover)] font-semibold text-[12px] py-2 rounded-3xl w-80">YOUR NEXT JOURNEY STARTS HERE</p>
                    </div>
                    <div className="flex flex-col text-left leading-[0.9]">
                        <p className="text-[115px] text-[var(--text-primary)]">A little closer to</p>
                        <p className="text-[115px] text-[var(--text-primary)] font-bold">paradise.</p>
                    </div>
                    <div className="text-left mt-10 text-[#587481]">
                        <p className="">Find a place that moves you. Explore Philippine destinations, collect your favorites, <br />and make the journey your own.</p>
                    </div>
                    <div id="hero-buttons" className="flex mt-10 gap-10">
                        <button className="flex gap-2 bg-[var(--text-hover)] text-white font-semibold text-[18px] px-8 py-3 rounded-4xl cursor-pointer">
                            <span><FontAwesomeIcon icon={faArrowUpRightFromSquare} className={"text-white text-[18px]"}/></span> Explore
                        </button>
                        <button className="flex gap-4 bg-white font-semibold text-[var(--text-primary)] shadow-lg px-6 py-3 rounded-4xl cursor-pointer">
                            <span><FontAwesomeIcon icon={faRoute} className={"text-[var(--text-hover)] text-[18px]"} /></span> Plan a trip
                        </button>
                    </div>
                </div>
                <div id="img-container" className="flex justify-end relative mr-10">
                    <img src={HeroImg} alt="hero" className="rounded-3xl object-cover w-230"></img>
                    <div className="flex items-center gap-4 bottom-4 left-4 bg-white/50 backdrop-blur-6xl px-6 py-5 rounded-3xl shadow-lg absolute">
                        <span><FontAwesomeIcon icon={faLocationDot} className={"text-[var(--text-hover)] text-[25px]"}/></span>
                        <p>Big Lagoon <br /> El Nido, Palawan</p>
                        <span><FontAwesomeIcon icon={faArrowUpRightFromSquare} className={"text-[var(--text-hover)] text-[18px]"}/></span>
                    </div>
                </div>
            </div>
          </div>
    )
}

export default Hero;