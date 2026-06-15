export const SITE_CONFIG = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "Multiline Moto Peças",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://multilinemotopecas.com.br",
  description:
    "A maior vitrine de motopeças do Brasil. Encontre peças para sua moto com busca inteligente e compre com segurança no Mercado Livre.",
  whatsapp:
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5591985627919",
  whatsappDisplay: "+55 (91) 98562-7919",
  keywords: [
    "motopecas",
    "peças de moto",
    "peças motocicleta",
    "autopeças moto",
    "honda",
    "yamaha",
    "suzuki",
    "kawasaki",
    "mercado livre",
  ],
};

export const TRUST_BADGES = [
  { icon: "Shield", title: "Compra Segura", description: "Via Mercado Livre" },
  { icon: "Truck", title: "Entrega Rápida", description: "Envio para todo Brasil" },
  { icon: "RefreshCw", title: "Troca Fácil", description: "7 dias para devolução" },
  { icon: "Award", title: "Peças Originais", description: "Qualidade garantida" },
];

export const BENEFITS = [
  {
    title: "Busca Inteligente",
    description: "Encontre a peça certa digitando modelo, marca ou código.",
    icon: "Search",
  },
  {
    title: "Milhares de Peças",
    description: "Catálogo completo para todas as marcas de motos.",
    icon: "Package",
  },
  {
    title: "Compra no Mercado Livre",
    description: "Segurança e proteção na compra pelo maior marketplace.",
    icon: "ShoppingCart",
  },
  {
    title: "Suporte WhatsApp",
    description: "Tire dúvidas rapidamente com nossa equipe.",
    icon: "MessageCircle",
  },
];

export const PRODUCTS_PER_PAGE = 24;
export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_MIN_CHARS = 2;
