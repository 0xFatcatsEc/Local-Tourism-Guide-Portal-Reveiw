import HeroImg from '../assets/tourist_spot/hero_img.jpeg'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot } from '@fortawesome/free-solid-svg-icons'
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons'
import { faRoute } from '@fortawesome/free-solid-svg-icons'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { faArrowDownLong } from '@fortawesome/free-solid-svg-icons'

function Hero() {
    return (
        <div id="hero-container">
            <div className="fixed inset-0 z-0 pointer-events-none" style={{
                backgroundImage: `radial-gradient(circle at 30% 70%, rgba(173, 216, 230, 0.6), transparent 50%), radial-gradient(circle at 70% 30%, rgba(255, 182, 193, 0.4), transparent 50%)`,
            }} />

            <div id="hero-content" className="flex flex-row max-lg:flex-col justify-between min-h-[100vh] relative items-center max-w-8xl mx-auto px-6 lg:px-10 gap-10 lg:ml-10 pt-20 lg:pt-0">

                <div className="flex flex-col h-auto justify-start text-center lg:text-left w-full">
                    <div className="text-center lg:text-left w-full flex justify-center lg:justify-start mb-5">
                        <p className="bg-[var(--text-bg-secondary)] text-[var(--text-hover)] font-semibold text-[10px] md:text-[12px] py-2 rounded-3xl w-72 md:w-80 px-4">YOUR NEXT JOURNEY STARTS HERE</p>
                    </div>

                    <div className="flex flex-col text-center lg:text-left leading-[0.9]">
                        <p className="text-[40px] md:text-[60px] lg:text-[90px] text-[var(--text-primary)]">A little closer to</p>
                        <p className="text-[40px] md:text-[60px] lg:text-[90px] text-[var(--text-primary)] font-bold">paradise.</p>
                    </div>

                    <div className="text-center lg:text-left mt-6 md:mt-10 text-[#587481] px-2 lg:px-0">
                        <p className="text-[13px] md:text-[14px]">Find a place that moves you. Explore Philippine destinations, collect your favorites, <br className="hidden md:block" />and make the journey your own.</p>
                    </div>

                    <div id="hero-buttons" className="flex flex-col md:flex-row mt-8 md:mt-10 gap-4 md:gap-10 justify-center lg:justify-start items-center">
                        <button className="flex gap-2 bg-[var(--text-hover)] text-white font-semibold text-[16px] md:text-[18px] px-8 py-3 rounded-4xl cursor-pointer w-full md:w-auto justify-center">
                            <span><FontAwesomeIcon icon={faArrowUpRightFromSquare} /></span> Explore
                        </button>
                        <button className="flex gap-4 bg-white font-semibold text-[var(--text-primary)] shadow-lg px-6 py-3 rounded-4xl cursor-pointer w-full md:w-auto justify-center">
                            <span><FontAwesomeIcon icon={faRoute} className={"text-[var(--text-hover)]"} /></span> Plan a trip
                        </button>
                    </div>
                </div>
                <div id="img-container" className="flex justify-center lg:justify-end relative w-full lg:mr-10">
                    <img src={HeroImg} alt="hero" className="rounded-3xl object-cover w-full max-w-[700px] lg:w-[1000px] xl:w-[1200px] h-[400px] md:h-[600px] lg:h-[500px]" />
                    <div className="flex items-center gap-4 bottom-4 left-1/2 lg:left-4 -translate-x-1/2 lg:translate-x-0 bg-white/70 backdrop-blur-xl px-4 py-3 rounded-3xl shadow-lg absolute w-[90%] lg:w-auto justify-between">
                        <span><FontAwesomeIcon icon={faLocationDot} className={"text-[var(--text-hover)] text-[20px] md:text-[25px]"} /></span>
                        <p className="text-[12px] md:text-[14px] text-[var(--text-primary)] font-semibold">Big Lagoon <br /> El Nido, Palawan</p>
                        <span><FontAwesomeIcon icon={faArrowUpRightFromSquare} className={"text-[var(--text-hover)]"} /></span>
                    </div>
                </div>
            </div>
            <div id="search-bar-container" className="w-full flex justify-center h-auto px-4 pb-10 mt-10 lg:mt-0">
                <div id="form-container" className="flex flex-col lg:flex-row items-center gap-4 lg:gap-5 justify-between h-auto lg:h-[70px] w-full max-w-[1440px] bg-white/90 shadow-lg rounded-3xl lg:rounded-4xl p-4 lg:p-0">
                    <div className="w-full lg:w-[880px] lg:px-10">
                        <form>
                            <div className="relative">
                                <input className="bg-white shadow-xl w-full h-[45px] rounded-xl pr-10 pl-10" placeholder="Where would you like to go?" />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                    <span><FontAwesomeIcon icon={faMagnifyingGlass} /></span>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div id="content-container" className="flex flex-wrap lg:flex-nowrap gap-2 md:gap-4 lg:mr-20 items-center justify-center w-full lg:w-auto">
                        <button className="text-[12px] md:text-[13px] bg-white/70 shadow-lg px-3 md:px-4 py-3 rounded-3xl text-[var(--search-text)] font-semibold flex gap-2 cursor-pointer">All regions <span><FontAwesomeIcon icon={faArrowDownLong} /></span> </button>
                        <button className="text-[12px] md:text-[13px] bg-white/70 shadow-lg px-3 md:px-4 py-3 rounded-3xl text-[var(--search-text)] font-semibold flex gap-2 cursor-pointer">All categories <span><FontAwesomeIcon icon={faArrowDownLong} /></span></button>
                        <button className="text-[12px] md:text-[13px] bg-white/70 shadow-lg px-3 md:px-4 py-3 rounded-3xl text-[var(--search-text)] font-semibold flex gap-2 cursor-pointer"><span><FontAwesomeIcon icon={faMagnifyingGlass} /> </span>Search</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Hero;