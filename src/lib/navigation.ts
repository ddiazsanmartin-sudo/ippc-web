export interface NavItem {
  href: string;
  label: string;
}

export const mainNav: NavItem[] = [
  { href: '/quienes-somos', label: 'Quiénes somos' },
  { href: '/que-creemos', label: 'Qué creemos' },
  { href: '/culto-y-sacramentos', label: 'Culto y sacramentos' },
  { href: '/vida-de-iglesia', label: 'Vida de iglesia' },
  { href: '/recursos', label: 'Recursos' },
];

export const visitLink: NavItem = { href: '/visitanos', label: 'Visítanos' };

export const footerNav: NavItem[] = [
  ...mainNav,
  { href: '/actividades', label: 'Actividades' },
  visitLink,
  { href: '/privacidad', label: 'Privacidad' },
];

/** Marca como activo el ítem cuya ruta coincide o es prefijo de la actual. */
export const isActive = (href: string, pathname: string) => pathname === href || pathname.startsWith(`${href}/`);
