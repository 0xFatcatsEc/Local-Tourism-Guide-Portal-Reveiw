import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCompass, faBars, faXmark } from '@fortawesome/free-solid-svg-icons'

function Navbar() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <nav className="sticky top-5 z-50 flex w-full justify-center px-4">
            <div className="h-auto w-full max-w-8xl flex items-center justify-between gap-2 md:gap-5">

                <div className="flex flex-row gap-3 h-[4rem] items-center justify-center text-black bg-white/30 px-4 md:px-8 py-4 backdrop-blur-xl rounded-3xl shadow-lg">
                    <h1 className="flex justify-center gap-2 items-center">
                        <FontAwesomeIcon icon={faCompass} className={"text-[var(--primary-icon-color)] text-[28px] md:text-[35px]"} />
                    </h1>
                    <p className="flex flex-col text-[14px] md:text-[18px] font-bold text-[var(--text-primary)] leading-none">
                        LOCALLENS <span className="text-[6px] md:text-[8px] font-semibold">PHILIPPINE TOURISM PORTAL</span>
                    </p>
                </div>
                <div className="hidden lg:flex h-[4rem] w-full gap-5 items-center justify-evenly text-black bg-white/30 px-8 py-4 backdrop-blur-xl rounded-3xl shadow-lg">
                    <p className="text-[15px] font-semibold cursor-pointer hover:text-[var(--text-hover)] relative group">Explore <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-[#1676A5] group-hover:w-full transition-all duration-300"></span></p>
                    <p className="text-[15px] font-semibold cursor-pointer hover:text-[var(--text-hover)] relative group">Categories <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-[#1676A5] group-hover:w-full transition-all duration-300"></span></p>
                    <p className="text-[15px] font-semibold cursor-pointer hover:text-[var(--text-hover)] relative group">Itineraries <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-[#1676A5] group-hover:w-full transition-all duration-300"></span></p>
                </div>
                <div className="flex gap-2 md:gap-5 h-[4rem] items-center justify-center bg-white/30 px-4 md:px-8 py-4 backdrop-blur-xl rounded-3xl shadow-lg">
                    <div className="hidden md:flex gap-3">
                        <button className="text-white text-[14px] bg-[var(--button-bg-primary)] px-6 py-2 md:py-3 rounded-3xl font-semibold hover:bg-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer">Login</button>
                        <button className="text-white text-[14px] bg-[var(--button-bg-primary)] px-4 py-2 md:py-3 rounded-3xl font-semibold hover:bg-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer">Register</button>
                    </div>
                    <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden text-[var(--text-primary)] text-[22px] p-2">
                        <FontAwesomeIcon icon={isOpen ? faXmark : faBars} />
                    </button>
                </div>
            </div>
            {isOpen && (
                <div className="absolute top-[5rem] left-4 right-4 lg:hidden bg-white/30 backdrop-blur-xl rounded-3xl shadow-xl p-6 flex flex-col gap-4">
                    <p className="text-[16px] font-semibold py-2 border-b">Explore</p>
                    <p className="text-[16px] font-semibold py-2 border-b">Categories</p>
                    <p className="text-[16px] font-semibold py-2 border-b">Itineraries</p>
                    <div className="flex gap-3 mt-2">
                        <button className="w-full text-white text-[14px] bg-[var(--button-bg-primary)] px-6 py-3 rounded-3xl font-semibold">Login</button>
                        <button className="w-full text-white text-[14px] bg-[var(--button-bg-primary)] px-6 py-3 rounded-3xl font-semibold">Register</button>
                    </div>
                </div>
            )}
        </nav>
    )
}

export default Navbar