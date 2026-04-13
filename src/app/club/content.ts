export type ClubOffer = {
  title: string;
  description: string;
  icon: "trophy" | "heart" | "calendar" | "handCoins";
};

export type ClubTeam = {
  name: string;
  schedule: string;
  description: string;
};

export type ClubEvent = {
  date: string;
  title: string;
  description: string;
};

export type ClubProjectContribution = {
  id: string;
  displayName: string;
  amount: number;
  isAnonymous?: boolean;
  note?: string;
};

export type ClubProject = {
  slug: string;
  title: string;
  description: string;
  shortDescription: string;
  current: number;
  goal: number;
  imageSrc: string;
  imageAlt: string;
  ctaLabel: string;
  updates: string[];
  contributions: ClubProjectContribution[];
};

export type ClubGalleryItem = {
  src: string;
  title: string;
  description: string;
};

export type ClubSponsor = {
  name: string;
  logoSrc: string;
  url: string;
};

export const clubOffers: ClubOffer[] = [
  {
    title: "Instalaciones y actividad",
    description: "Un espacio para entrenar, compartir y sostener la vida deportiva del club con continuidad.",
    icon: "trophy",
  },
  {
    title: "Comunidad real",
    description: "Familias, socios y equipos construyendo pertenencia alrededor de una identidad comun.",
    icon: "heart",
  },
  {
    title: "Agenda y torneos",
    description: "Fechas, encuentros y competencia para que siempre haya algo para vivir y seguir.",
    icon: "calendar",
  },
  {
    title: "Proyectos que suman",
    description: "Iniciativas concretas para mejorar el club con sponsors, colaboracion y objetivos visibles.",
    icon: "handCoins",
  },
];

export const clubTeams: ClubTeam[] = [
  {
    name: "Masculino",
    schedule: "Martes y jueves · 20:00",
    description: "Competencia local, entrenamientos semanales y una base fuerte de grupo.",
  },
  {
    name: "Femenino",
    schedule: "Lunes y miercoles · 19:00",
    description: "Desarrollo sostenido, actividad constante y espacio para seguir creciendo.",
  },
  {
    name: "+40",
    schedule: "Sabados · 10:00",
    description: "Comunidad, actividad y pertenencia para quienes quieren seguir viviendo el club.",
  },
];

export const clubEvents: ClubEvent[] = [
  {
    date: "25 AGO",
    title: "Torneo amistoso de primavera",
    description: "Una jornada ideal para mover la comunidad del club y mostrar actividad real a familias y nuevos interesados.",
  },
  {
    date: "03 SEP",
    title: "Cena de socios y sponsors",
    description: "Encuentro social para reforzar pertenencia y acercar nuevas personas al proyecto del club.",
  },
  {
    date: "14 SEP",
    title: "Jornada abierta de captacion",
    description: "Actividad pensada para que nuevos interesados conozcan el club y den el paso para asociarse.",
  },
];

export const clubGallery: ClubGalleryItem[] = [
  {
    src: "/club-defaults/training.svg",
    title: "Entrenamientos y cancha",
    description: "Espacios para la practica, la constancia y el crecimiento deportivo.",
  },
  {
    src: "/club-defaults/community.svg",
    title: "Comunidad y familias",
    description: "Una identidad que se construye con presencia, cercania y pertenencia.",
  },
  {
    src: "/club-defaults/event.svg",
    title: "Eventos y torneos",
    description: "Momentos que activan la vida del club y lo vuelven memorable.",
  },
];

export const clubSponsors: ClubSponsor[] = [
  { name: "Nike", logoSrc: "/club-defaults/sponsors/nike.svg", url: "https://www.nike.com" },
  { name: "Adidas", logoSrc: "/club-defaults/sponsors/adidas.svg", url: "https://www.adidas.com" },
  { name: "Puma", logoSrc: "/club-defaults/sponsors/puma.svg", url: "https://www.puma.com" },
  { name: "Umbro", logoSrc: "/club-defaults/sponsors/umbro.svg", url: "https://www.umbro.com" },
  { name: "Joma", logoSrc: "/club-defaults/sponsors/joma.svg", url: "https://www.joma-sport.com" },
];

export const clubProjects: ClubProject[] = [
  {
    slug: "nuevas-camisetas",
    title: "Compra de nuevas camisetas",
    shortDescription: "Renovar la indumentaria para que todos los equipos representen al club con una imagen fuerte.",
    description:
      "Queremos renovar la indumentaria principal del club para que cada categoria represente mejor la identidad de la institucion en torneos, amistosos y actividades especiales.",
    current: 120000,
    goal: 200000,
    imageSrc: "/club-defaults/training.svg",
    imageAlt: "Proyecto de nuevas camisetas",
    ctaLabel: "Colaborar con camisetas",
    updates: [
      "Ya se relevaron talles y cantidades por categoria.",
      "Hay presupuestos preaprobados para el primer lote.",
      "La recaudacion se abrira a socios y colaboradores del club.",
    ],
    contributions: [
      { id: "camisetas-1", displayName: "Familia Pereira", amount: 15000 },
      { id: "camisetas-2", displayName: "Anónimo", amount: 8000, isAnonymous: true },
      { id: "camisetas-3", displayName: "Deportes del Sur", amount: 25000, note: "Apoyo al plantel femenino" },
    ],
  },
  {
    slug: "iluminacion-cancha",
    title: "Iluminación de cancha",
    shortDescription: "Mejorar el espacio para ampliar horarios de entrenamiento y eventos del club.",
    description:
      "La mejora de iluminacion permitiria extender entrenamientos, sumar actividades especiales y reforzar la seguridad general del espacio principal del club.",
    current: 180000,
    goal: 300000,
    imageSrc: "/club-defaults/event.svg",
    imageAlt: "Proyecto de iluminacion de cancha",
    ctaLabel: "Colaborar con la iluminacion",
    updates: [
      "Se definio la zona prioritaria para la primera etapa de obra.",
      "El club ya cuenta con evaluacion tecnica inicial.",
      "La recaudacion tambien queda abierta a sponsors y aliados.",
    ],
    contributions: [
      { id: "luz-1", displayName: "Cancha Sur", amount: 30000, note: "Sponsor institucional" },
      { id: "luz-2", displayName: "Anónimo", amount: 10000, isAnonymous: true },
      { id: "luz-3", displayName: "Socios Veteranos", amount: 18000 },
    ],
  },
  {
    slug: "viaje-al-torneo",
    title: "Viaje al torneo",
    shortDescription: "Ayudar a cubrir traslado y logistica para una participacion que le da visibilidad al club.",
    description:
      "Este proyecto busca cubrir parte del traslado, inscripcion y logistica del viaje para una competencia importante que representa al club fuera de la ciudad.",
    current: 95000,
    goal: 160000,
    imageSrc: "/club-defaults/community.svg",
    imageAlt: "Proyecto de viaje al torneo",
    ctaLabel: "Colaborar con el viaje",
    updates: [
      "La delegacion ya fue confirmada por el cuerpo tecnico.",
      "Hay fecha estimada de salida para el proximo mes.",
      "Se esta trabajando en reducir costos de transporte y estadia.",
    ],
    contributions: [
      { id: "viaje-1", displayName: "Comisión de padres", amount: 22000 },
      { id: "viaje-2", displayName: "Anónimo", amount: 7000, isAnonymous: true },
      { id: "viaje-3", displayName: "Impulso Seguros", amount: 15000 },
    ],
  },
];

export function getClubProjectBySlug(slug: string) {
  return clubProjects.find((project) => project.slug === slug);
}
