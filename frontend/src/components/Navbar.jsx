import { useState } from "react"

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

import {
    faCompass,
    faBars,
    faXmark,
} from "@fortawesome/free-solid-svg-icons"

function Navbar({ user, onLogout }) {
    const [open, setOpen] = useState(false)
    const close = () => setOpen(false)

    const panel =
        "flex items-center gap-3 rounded-3xl bg-white/80 " +
        "px-4 py-4 shadow-lg backdrop-blur-xl"

    const button =
        "rounded-2xl bg-[#1676A5] px-4 py-2 text-sm " +
        "font-semibold text-white hover:bg-[#125e84]"

    const links = [
        ["Explore", "#explore"],
        ["Categories", "#categories"],
        ["Itineraries", "#itineraries"],
    ]

    if (user) {
        links.push(["Dashboard", "#dashboard"])
    }

    if (user?.role === "admin") {
        links.push(["Admin", "#admin"])
    }

    function account() {
        return user ? (
            <>
                <span className="max-w-32 truncate text-sm font-semibold">
                    {user.name}
                </span>

                <button
                    type="button"
                    onClick={() => {
                        close()
                        onLogout()
                    }}
                    className={`${button} cursor-pointer`}
                >
                    Logout
                </button>
            </>
        ) : (
            <>
                <a
                    href="#login"
                    onClick={close}
                    className={button}
                >
                    Login
                </a>

                <a
                    href="#register"
                    onClick={close}
                    className={button}
                >
                    Register
                </a>
            </>
        )
    }

    return (
        <nav className="sticky top-5 z-50 flex justify-center px-4">
            <div className="flex w-full max-w-[1440px] items-center justify-between gap-3">
                <a
                    href="#home"
                    onClick={close}
                    className={`${panel} shrink-0`}
                >
                    <FontAwesomeIcon
                        icon={faCompass}
                        className="text-3xl text-[#1676A5]"
                    />

                    <span className="flex flex-col text-base font-bold leading-none text-[#143B4C]">
                        LOCALLENS

                        <span className="mt-1 text-[7px] tracking-wider">
                            PHILIPPINE TOURISM PORTAL
                        </span>
                    </span>
                </a>

                <div
                    className={`${panel} hidden flex-1 justify-evenly xl:flex`}
                >
                    {links.map(([label, href]) => (
                        <a
                            key={href}
                            href={href}
                            className="text-sm font-semibold text-[#143B4C] hover:text-[#1676A5]"
                        >
                            {label}
                        </a>
                    ))}
                </div>

                <div className={panel}>
                    <div className="hidden items-center gap-3 xl:flex">
                        {account()}
                    </div>

                    <button
                        type="button"
                        aria-label={open ? "Close menu" : "Open menu"}
                        aria-expanded={open}
                        aria-controls="mobile-menu"
                        onClick={() => setOpen(!open)}
                        className="cursor-pointer px-2 text-xl text-[#143B4C] xl:hidden"
                    >
                        <FontAwesomeIcon
                            icon={open ? faXmark : faBars}
                        />
                    </button>
                </div>
            </div>

            {open && (
                <div
                    id="mobile-menu"
                    className="absolute left-4 right-4 top-20 flex flex-col gap-4 rounded-3xl bg-white/95 p-6 shadow-xl backdrop-blur-xl xl:hidden"
                >
                    {links.map(([label, href]) => (
                        <a
                            key={href}
                            href={href}
                            onClick={close}
                            className="text-sm font-semibold text-[#143B4C]"
                        >
                            {label}
                        </a>
                    ))}

                    <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
                        {account()}
                    </div>
                </div>
            )}
        </nav>
    )
}

export default Navbar