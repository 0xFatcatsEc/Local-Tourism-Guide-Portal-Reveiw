import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCompass } from '@fortawesome/free-regular-svg-icons'

function Navbar() {
    return (
        <nav className="sticky top-5 z-50 flex w-full border-b border-white/40">
            <div className="h-auto w-full flex items-center justify-between gap-5 px-5">
                <div className="flex flex-row gap-3 text-center h-[4rem] w-auto items-center justify-center text-black bg-white/50 px-8 py-4 backdrop-blur-6xl rounded-3xl shadow-lg bg-[(--button-bg-primary)]">
                    <h1 className="flex justify-center gap-2 items-center w-auto">
                        <FontAwesomeIcon icon={faCompass} className={"text-[var(--primary-icon-color)] text-[40px] font-extrabold [stroke-width:0.5px]"}/>
                    </h1>
                    <p className="flex justify-center flex-col text-[25px] w-auto font-bold text-[var(--text-primary)]">
                        LOCALLENS
                        <span className="text-[10px] font-semibold text-[var(--text-primary)]">PHILIPPINE TOURISM PORTAL</span>
                    </p>
                  </div>

                  <div className="flex h-[4rem] justify-evenly w-full gap-5 items-center justify-center text-black bg-white/50 px-8 py-4 backdrop-blur-6xl rounded-3xl shadow-lg">
                    <p className="text-[18px] text-[var(--text-primary)] font-semibold cursor-pointer hover:text-[var(--text-hover)] transition-all duration-200 relative group">
                        Explore
                        <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-[#1676A5] group-hover:w-full transition-all duration-300"></span>
                    </p>
                    <p className="text-[18px] text-[var(--text-primary)] font-semibold cursor-pointer hover:text-[var(--text-hover)] transition-all duration-200 relative group">
                        Categories
                        <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-[#1676A5] group-hover:w-full transition-all duration-300"></span>
                    </p>
                    <p className="text-[18px] text-[var(--text-primary)] font-semibold cursor-pointer hover:text-[var(--text-hover)] transition-all duration-200 relative group">
                        Itineraries
                        <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-[#1676A5] group-hover:w-full transition-all duration-300"></span>
                    </p>
                  </div>

                  <div className="flex gap-5 h-[4rem] w-auto items-center justify-center text-black bg-white/50 px-8 py-4 backdrop-blur-6xl rounded-3xl shadow-lg">
                    <button className="text-white bg-[var(--button-bg-primary)] px-6 py-3 rounded-3xl font-semibold cursor-pointer hover:bg-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-200">
                        Login
                    </button>
                    <button className="text-white bg-[var(--button-bg-primary)] px-4 py-3 rounded-3xl font-semibold cursor-pointer hover:bg-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-200">
                        Register
                    </button>
                  </div>
            </div>
        </nav>
    )
}

export default Navbar;