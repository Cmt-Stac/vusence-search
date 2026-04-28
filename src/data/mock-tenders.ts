import type { RawTender } from "@/types/tender";

export const mockTenders: RawTender[] = [
  {
    id: "AO-1001",
    title: "Campagne de releve architectural en centre historique",
    description:
      "Mission de releve architectural et nuage de points pour valorisation du patrimoine urbain.",
    city: "Lyon",
    budget: 48000,
    publicationDate: "2026-04-22",
    keywords: ["releve architectural", "nuage de points", "patrimoine"],
    distanceKm: 12,
  },
  {
    id: "AO-1002",
    title: "Visites virtuelles pour programme immobilier neuf",
    description:
      "Production de visite virtuelle et visite 3D pour lancement commercial de 40 lots.",
    city: "Bordeaux",
    budget: 22000,
    publicationDate: "2026-04-25",
    keywords: ["immobilier", "visite virtuelle", "visite 3D"],
    distanceKm: 45,
  },
  {
    id: "AO-1003",
    title: "Numerisation BIM d un campus tertiaire",
    description:
      "Acquisition laser scanner, modelisation 3D BIM et livrables IFC.",
    city: "Nantes",
    budget: 76000,
    publicationDate: "2026-04-18",
    keywords: ["BIM", "laser scanner", "modelisation 3D"],
    distanceKm: 31,
  },
  {
    id: "AO-1004",
    title: "Pack Matterport pour agences immobilieres premium",
    description:
      "Creation de jumeaux numeriques pour villas de luxe et location saisonniere.",
    city: "Nice",
    budget: 34000,
    publicationDate: "2026-04-27",
    keywords: ["matterport", "agence immobiliere", "villa", "luxe"],
    distanceKm: 67,
  },
  {
    id: "AO-1005",
    title: "Etude urbanisme avec scan 3D multi-sites",
    description:
      "Collecte scan 3D et analyse dediee aux scenarios d urbanisme operationnel.",
    city: "Toulouse",
    budget: 51000,
    publicationDate: "2026-04-15",
    keywords: ["urbanisme", "scan 3D", "nuage de points"],
    distanceKm: 28,
  },
  {
    id: "AO-1006",
    title: "Contenus immersifs Airbnb haut de gamme",
    description:
      "Production de visite virtuelle pour villas premium destinees a la location saisonniere.",
    city: "Biarritz",
    budget: 18000,
    publicationDate: "2026-04-26",
    keywords: ["Airbnb", "location saisonniere", "visite virtuelle", "villa"],
    distanceKm: 54,
  },
  {
    id: "AO-1007",
    title: "Inspection patrimoniale au laser scanner",
    description:
      "Le marche concerne la capture laser scanner de facades classees.",
    city: "Rouen",
    budget: 29000,
    publicationDate: "2026-04-24",
    keywords: ["laser scanner", "patrimoine", "releve architectural"],
    distanceKm: 39,
  },
  {
    id: "AO-1008",
    title: "Digitalisation immobiliere multi-agences",
    description:
      "Accompagnement de 12 agences immobilieres pour la mise en place de visites 3D.",
    city: "Lille",
    budget: 27000,
    publicationDate: "2026-04-20",
    keywords: ["agence immobiliere", "visite 3D", "immobilier"],
    distanceKm: 23,
  },
];
