"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useUser } from "@/context/UserContext";
import {
  CalenderIcon,
  GridIcon,
  PageIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
};

const adminNav: NavItem[] = [
  { icon: <GridIcon />, name: "Kontrol Paneli", path: "/dashboard" },
  { icon: <PageIcon />, name: "Istasyonlar", path: "/dashboard/stations" },
  { icon: <TableIcon />, name: "Tablolar", path: "/dashboard/basic-tables" },
  { icon: <UserCircleIcon />, name: "Profil", path: "/dashboard/profile" },
];

const customerNav: NavItem[] = [
  { icon: <PageIcon />, name: "Istasyonlar", path: "/app/stations" },
  { icon: <CalenderIcon />, name: "Rezervasyonlar", path: "/app/reservations" },
  { icon: <UserCircleIcon />, name: "Gecmis", path: "/app/history" },
  { icon: <UserCircleIcon />, name: "Profil", path: "/app/profile" },
];

const AppSidebar: React.FC = () => {
  const { user } = useUser();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const navItems = user?.role === "admin" ? adminNav : customerNav;
  const homeHref = user?.role === "admin" ? "/dashboard" : "/app";
  const isActive = (path: string) => path === pathname;

  return (
    <aside
      className={`fixed mt-16 top-0 left-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out lg:mt-0 dark:border-gray-800 dark:bg-gray-900
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <Link href={homeHref} className="flex items-center gap-2">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image src="/images/logo/ev-logo.svg" alt="Logo" width={150} height={48} className="dark:hidden" priority />
              <Image
                src="/images/logo/logo_dark.svg"
                alt="Logo"
                width={150}
                height={48}
                className="hidden dark:block"
                priority
              />
            </>
          ) : (
            <>
              <Image
                src="/images/logo/ev-logo.svg"
                alt="Logo"
                width={40}
                height={40}
                className="rounded-lg dark:hidden"
                priority
              />
              <Image
                src="/images/logo/logo_dark.svg"
                alt="Logo"
                width={40}
                height={40}
                className="hidden rounded-lg dark:block"
                priority
              />
            </>
          )}
        </Link>
      </div>

      <div className="flex flex-col overflow-y-auto no-scrollbar duration-300 ease-linear">
        <nav className="mb-6">
          <h2
            className={`mb-4 text-xs uppercase leading-[20px] text-gray-400 ${
              !isExpanded && !isHovered ? "lg:text-center" : "text-left"
            }`}
          >
            Menu
          </h2>
          <ul className="flex flex-col gap-4">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`menu-item ${isActive(item.path) ? "menu-item-active" : "menu-item-inactive"} ${
                    !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
                  }`}
                >
                  <span className={isActive(item.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}>
                    {item.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && <span className="menu-item-text">{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
