const rawTimelineEvents = [
  // LIVING PLACE (background only)
  {
    title: "Bousies",
    category: "living_place",
    startDate: "2002-02-20",
    endDate: "2019-08-31",
    description: "Enfance",
    color: "#00c3ff",
    city: "Bousies",
    country: "France",
    latitude: 50.1500978941162,
    longitude: 3.628078171014601
  },
  {
    title: "Résidence Jules Marmottan, Aulnoye-lez-Valenciennes",
    category: "living_place",
    startDate: "2019-09-01",
    endDate: "2022-09-01",
    color: "#00c3ff",
    city: "Valenciennes",
    country: "France",
    latitude: 50.32014331908122,
    longitude: 3.5131744182123468
  },
  {
    title: "Vénissieux",
    category: "living_place",
    startDate: "2022-09-02",
    endDate: "2023-01-22",
    color: "#00c3ff",
    city: "Vénissieux",
    country: "France",
    latitude: 45.71716012008505,
    longitude: 4.889322758101268
  },
  {
    title: "Colocation L'Épave, Anzin",
    category: "living_place",
    startDate: "2023-01-23",
    endDate: "2024-03-01",
    color: "#00c3ff",
    city: "Anzin",
    country: "France",
    latitude: 50.372632899131226,
    longitude: 3.516082656934646
  },
  {
    title: "Malacca",
    category: "living_place",
    startDate: "2024-03-02",
    endDate: "2024-07-25",
    color: "#00c3ff",
    city: "Malacca",
    country: "Malaisie",
    latitude: 2.1992834859871064,
    longitude: 102.23149617804286
  },
  {
    title: "Bousies",
    category: "living_place",
    startDate: "2024-07-26",
    endDate: "2025-03-01",
    color: "#00c3ff",
    city: "Bousies",
    country: "France",
    latitude: 50.1500978941162,
    longitude: 3.628078171014601
  },
  {
    title: "Fréjus",
    category: "living_place",
    startDate: "2025-03-02",
    endDate: "today",
    color: "#00c3ff",
    city: "Fréjus",
    country: "France",
    latitude: 43.47348292243457,
    longitude: 6.732980709624157
  },

  // EDUCATION
  {
    title: "Maternelle",
    category: "education",
    startDate: "2004-09-01",
    endDate: "2007-06-30",
    description: "",
    color: "#73aff6",
    city: "Bousies",
    country: "France",
    latitude: 50.148,
    longitude: 3.619
  },
  {
    title: "Primaire",
    category: "education",
    startDate: "2007-09-01",
    endDate: "2012-06-30",
    description: "",
    color: "#73aff6",
    city: "Bousies",
    country: "France",
    latitude: 50.148,
    longitude: 3.619
  },
  {
    title: "Collège Montaigne Poix du nord",
    category: "education",
    startDate: "2012-09-01",
    endDate: "2016-06-15",
    description: "",
    color: "#73aff6",
    city: "Poix-du-Nord",
    country: "France",
    latitude: 50.189,
    longitude: 3.644
  },
  {
    title: "Brevet des Collèges",
    category: "education",
    startDate: "2016-06-15",
    description: "Mention Très Bien",
    color: "#73aff6",
  },
  {
    title: "Lycée Dupleix Landrecies",
    category: "education",
    startDate: "2016-09-01",
    endDate: "2019-06-30",
    description: "",
    color: "#22a6b3",
    city: "Landrecies",
    country: "France",
    latitude: 50.122828318807166,
    longitude: 3.6871139758649445
  },
  {
    title: "Briançon (lycée)",
    category: "education",
    startDate: "2018-10-01",
    description: "Déplacement scolaire",
    color: "#2FD866",
    city: "Briançon",
    country: "France",
    latitude: 44.866597723817335,
    longitude: 6.600266734709518
  },
  {
    title: "Paris (Palais de la découverte)",
    category: "education",
    startDate: "2018-11-01",
    description: "Déplacement scolaire",
    color: "#22a6b3",
    city: "Paris",
    country: "France",
    latitude: 48.8662227844682,
    longitude: 2.3126148876737664
  },
  {
    title: "Baccalauréat",
    category: "education",
    startDate: "2019-06-30",
    description: "Mention Très Bien",
    color: "#73aff6",
  },
  {
    title: "INSA Hauts-de-France",
    category: "education",
    startDate: "2019-09-01",
    endDate: "2024-07-19",
    description: "Études ingénieur",
    color: "#DD2517",
    city: "Valenciennes",
    country: "France",
    latitude: 50.32477614992255,
    longitude: 3.5149673843270937
  },
  {
    title: "Stage CEREMA",
    category: "education",
    startDate: "2022-09-05",
    endDate: "2023-01-20",
    description: "Bron, France",
    color: "#EB7D20",
    city: "Bron",
    country: "France",
    latitude: 45.73811999556272,
    longitude: 4.925074352472816
  },
  {
    title: "PLP (Plateau Projet) - PFE",
    category: "education",
    startDate: "2023-09-15",
    endDate: "2024-02-15",
    description: "",
    color: "#22a6b3",
  },
  {
    title: "Projet VINCI",
    category: "education",
    startDate: "2023-12-03",
    endDate: "2024-02-15",
    description: "",
    color: "#22a6b3",
  },
  {
    title: "Stage Joubert Group",
    category: "education",
    startDate: "2024-03-03",
    endDate: "2024-07-19",
    description: "Malacca, Malaisie",
    color: "#095D8F",
    city: "Malacca",
    country: "Malaisie",
    latitude: 2.3622738557667207,
    longitude: 102.20449376231203,
    steps: [
      {
        type: "departure",
        category: "travel",
        title: "Départ de Paris",
        date: "2024-02-29",
        city: "Paris",
        country: "France",
        latitude: 49.007844048455425,
        longitude: 2.550611200403899
      },
      {
        type: "layover",
        category: "travel",
        title: "Escale à Dubai",
        date: "2024-03-01",
        city: "Dubai",
        country: "Emirats Arabes Unis",
        latitude: 24.88588449190717,
        longitude: 55.1587217229964
      },
      {
        type: "layover",
        category: "travel",
        title: "Arrivée à Kuala Lumpur",
        date: "2024-03-02",
        city: "Kuala Lumpur",
        country: "Malaisie",
        latitude: 2.740226962168589,
        longitude: 101.70117720538843
      },
            {
        type: "arrival",
        category: "travel",
        title: "Malacca",
        date: "2024-03-03",
        city: "Malacca",
        country: "Malaisie",
    latitude: 2.1992834859871064,
    longitude: 102.23149617804286
      },
            {
        type: "departure",
        category: "travel",
        title: "Malacca",
        date: "2024-07-23",
        city: "Malacca",
        country: "Malaisie",
    latitude: 2.1992834859871064,
    longitude: 102.23149617804286
      },
      {
        type: "departure",
        category: "travel",
        title: "Départ de Kuala Lumpur",
        date: "2024-07-24",
        city: "Kuala Lumpur",
        country: "Malaisie",
        latitude: 2.740226962168589,
        longitude: 101.70117720538843
      },
      {
        type: "layover",
        category: "travel",
        title: "Escale à Dubai",
        date: "2024-07-25",
        city: "Dubai",
        country: "Emirats Arabes Unis",
        latitude: 24.88588449190717,
        longitude: 55.1587217229964
      },
      {
        type: "arrival",
        category: "travel",
        title: "Arrivée à Paris",
        date: "2024-07-26",
        city: "Paris",
        country: "France",
        latitude: 49.007844048455425,
        longitude: 2.550611200403899
      },
    ]
  },
  {
    title: "Diplôme d'Ingénieur",
    category: "education",
    startDate: "2024-09-03",
    description: "ME, CIM, VINCI",
    color: "#DD2517",
  },
  {
    title: "Ingénieur Conception Mécanique",
    category: "education",
    startDate: "2025-03-03",
    endDate: "today",
    description: "Deleo S.A.S, Fréjus, France",
    color: "#01B0DC",
    city: "Fréjus",
    country: "France",
    latitude: 43.46444350562011,
    longitude: 6.730946052315697,
    gallery: [
      {
        src: "images/deleo_cristal_pro_neon.JPG",
        alt: "Cristal pro",
        caption: "Cristal pro"
      },
      {
        src: "images/deleo-sublim2x-neon-machine-IVhUH8__.webp",
        alt: "Sublim",
        caption: "SUBLIM"
      }
    ]
  },
  {
    title: "Remise des Diplômes",
    category: "education",
    startDate: "2025-03-22",
    color: "#DD2517",
  },

  // PROJECTS
  {
    title: "Création Bricks Creations",
    category: "projects",
    startDate: "2016-06-22",
    color: "#f0932b",
  },
  {
    title: "Site Bricks Creations",
    category: "projects",
    startDate: "2024-06-22",
    color: "#f0932b",
  },
  {
    title: "Vlog Malaisie",
    category: "projects",
    startDate: "2024-09-29",
    color: "#2F3F56",
    youtubeUrl: "https://www.youtube.com/watch?v=QbA0t786GwU",
  },
  {
    title: "Site Portfolio",
    category: "projects",
    startDate: "2024-10-22",
    color: "#f0932b",
  },
  {
    title: "Site L'Atelier Médiéval",
    category: "projects",
    startDate: "2024-11-22",
    color: "#f0932b",
  },
  {
    title: "Vidéo présentation INSA Alumni HDF",
    category: "projects",
    startDate: "2025-08-28",
    color: "#ffbdcb",
    youtubeUrl: "https://www.youtube.com/watch?v=FfRxwOQFKSk",
  },

  // EVENTS
  {
    title: "Expo LEGO Bousies",
    category: "event",
    startDate: "2018-02-03",
    color: "#FFD401",
    city: "Bousies",
    country: "France",
    latitude: 50.14753820519508,
    longitude: 3.61485584235157
  },
  {
    title: "Expo LEGO Escaudoeuvre",
    category: "event",
    startDate: "2019-10-05",
    color: "#FFD401",
    city: "Escaudoeuvres",
    country: "France",
    latitude: 50.19054749117549,
    longitude: 3.265149785263834
  },
  {
    title: "Expo LEGO Divion",
    category: "event",
    startDate: "2022-02-26",
    color: "#FFD401",
    city: "Divion",
    country: "France",
    latitude: 50.468129399177215,
    longitude: 2.4953253188444613
  },
  {
    title: "Great Day 2",
    category: "event",
    startDate: "2023-06-08",
    description: "",
    color: "#ffbdcb",
    city: "Valenciennes",
    country: "France",
    latitude: 50.32368705011155,
    longitude: 3.5135789925017678,
    youtubeUrl: "https://youtu.be/UM52jmoDyJU?si=nFqd1WcQpxD_u3qo"
  },
  {
    title: "Main Square Festival",
    category: "event",
    startDate: "2023-06-30",
    color: "#FF6A6E",
    city: "Arras",
    country: "France",
    latitude: 50.28280444472462,
    longitude: 2.7596123950792806
  },
  {
    title: "Festival Nuits Secrètes",
    category: "event",
    startDate: "2023-07-21",
    color: "#FF6A6E",
    city: "Aulnoye-Aymeries",
    country: "France",
    latitude: 50.19531093953841,
    longitude: 3.8547170746861097
  },
  {
    title: "Spa-Francorchamps",
    category: "event",
    startDate: "2023-07-30",
    description: "GP Formule 1",
    color: "#F1D60A",
    city: "Francorchamps",
    country: "Belgique",
    latitude: 50.438249714596864,
    longitude: 5.970471274786538
  },
  {
    title: "SK'INSA",
    category: "event",
    startDate: "2024-01-01",
    color: "#DD2517",
    city: "Les Sybelles",
    country: "France",
    latitude: 45.26643232862341,
    longitude: 6.296191748201377,
    youtubeUrl: "https://youtu.be/X0-CEotx8hI?si=LxHvK-py3JDXelKL",
  },
  {
    title: "Soirée de Passation",
    category: "event",
    startDate: "2024-02-02",
    color: "#ffbdcb",
  },
  {
    title: "Soirée des Pleurs",
    category: "event",
    startDate: "2024-02-22",
    color: "#ffbdcb",
  },
  {
    title: "Spa-Francorchamps",
    category: "event",
    startDate: "2024-07-28",
    description: "GP Formule 1",
    color: "#F1D60A",
    city: "Francorchamps",
    country: "Belgique",
    latitude: 50.438249714596864,
    longitude: 5.970471274786538
  },
  {
    title: "Gala INSA HDF",
    category: "event",
    startDate: "2025-03-22",
    color: "#DD2517",
    city: "Anzin",
    country: "France",
    latitude: 50.375292964496396,
    longitude: 3.5219095190037613
  },
  {
    title: "Soirée Yacht Monaco",
    category: "event",
    startDate: "2025-03-29",
    description: "15 ans de DELEO",
    color: "#01B0DC",
    city: "Monaco",
    country: "Monaco",
    latitude: 43.736574872512115,
    longitude: 7.422248392449757
  },
  {
    title: "Match OGC Nice",
    category: "event",
    startDate: "2025-09-13",
    color: "#01B0DC",
    city: "Nice",
    country: "France",
    latitude: 43.70501063225729,
    longitude: 7.192594632144543
  },
  {
    title: "Match OM",
    category: "event",
    startDate: "2025-10-29",
    color: "#01B0DC",
    city: "Marseille",
    country: "France",
    latitude: 43.26985294683768,
    longitude: 5.396072380478287
  },
  {
    title: "Ski Isola 2000",
    category: "event",
    startDate: "2026-02-22",
    color: "#ffffff",
    city: "Isola 2000",
    country: "France",
    latitude: 44.18551202560337,
    longitude: 7.157200982255279
  },
  {
    title: "AMWC - Soirée Monaco",
    category: "event",
    startDate: "2026-03-26",
    color: "#01B0DC",
    city: "Monaco",
    country: "Monaco",
    latitude: 43.736761548271005,
    longitude: 7.422983618723099
  },
  {
    title: "Gala INSA HDF",
    category: "event",
    startDate: "2026-03-28",
    color: "#ffbdcb",
    city: "Anzin",
    country: "France",
    latitude: 50.375292964496396,
    longitude: 3.5219095190037613
  },
  {
    title: "GP Historique France",
    category: "event",
    startDate: "2026-05-08",
    color: "#00454B",
    city: "Le Castellet",
    country: "France",
    latitude: 43.251355747607136,
    longitude: 5.793338140173849
  },

  // TRAVEL
  {
    title: "Ayen",
    category: "travel",
    startDate: "2005-07-15",
    endDate: "2005-08-01",
    color: "#22a6b3",
    city: "Ayen",
    country: "France",
    latitude: 45.237970159216964,
    longitude: 1.337997294703146
  },
  {
    title: "Ayen",
    category: "travel",
    startDate: "2006-07-15",
    endDate: "2006-08-01",
    color: "#22a6b3",
    city: "Ayen",
    country: "France",
    latitude: 45.237970159216964,
    longitude: 1.337997294703146
  },
  {
    title: "Ayen",
    category: "travel",
    startDate: "2007-07-15",
    endDate: "2007-08-01",
    color: "#22a6b3",
    city: "Ayen",
    country: "France",
    latitude: 45.237970159216964,
    longitude: 1.337997294703146
  },
  {
    title: "Ayen",
    category: "travel",
    startDate: "2008-07-15",
    endDate: "2008-08-01",
    color: "#22a6b3",
    city: "Ayen",
    country: "France",
    latitude: 45.237970159216964,
    longitude: 1.337997294703146
  },
  {
    title: "Ayen",
    category: "travel",
    startDate: "2009-07-15",
    endDate: "2009-08-01",
    color: "#22a6b3",
    city: "Ayen",
    country: "France",
    latitude: 45.237970159216964,
    longitude: 1.337997294703146
  },
  {
    title: "Ayen",
    category: "travel",
    startDate: "2010-07-15",
    endDate: "2010-08-01",
    color: "#22a6b3",
    city: "Ayen",
    country: "France",
    latitude: 45.237970159216964,
    longitude: 1.337997294703146
  },
  {
    title: "Ayen",
    category: "travel",
    startDate: "2011-07-15",
    endDate: "2011-08-01",
    color: "#22a6b3",
    city: "Ayen",
    country: "France",
    latitude: 45.237970159216964,
    longitude: 1.337997294703146
  },
  {
    title: "Ayen",
    category: "travel",
    startDate: "2012-07-15",
    endDate: "2012-08-01",
    color: "#22a6b3",
    city: "Ayen",
    country: "France",
    latitude: 45.237970159216964,
    longitude: 1.337997294703146
  },
  {
    title: "Croisière Costa Deliziosa",
    category: "travel",
    startDate: "2012-04-24",
    endDate: "2012-05-03",
    color: "#1B4397",
    steps: [
      {
        category: "travel",
        color: "#1B4397",
        city: "Savone",
        country: "Italie",
        latitude: 44.315038428721074,
        longitude: 8.497466049659366
      },
      {
        category: "travel",
        color: "#1B4397",
        city: "Naples",
        country: "Italie",
        latitude: 40.83807846938446,
        longitude: 14.260521071254884
      },
      {
        category: "travel",
        color: "#1B4397",
        city: "La Valette",
        country: "Malte",
        latitude: 35.89153959940506,
        longitude: 14.51763467167239
      },
      {
        category: "travel",
        color: "#1B4397",
        city: "Gagliari",
        country: "Italie",
        latitude: 39.210917693910666,
        longitude: 9.106684272559873
      },
      {
        category: "travel",
        color: "#1B4397",
        city: "Ajaccio",
        country: "France",
        latitude: 41.92228053609511,
        longitude: 8.741404752959944
      },
      {
        category: "travel",
        color: "#1B4397",
        city: "Savone",
        country: "Italie",
        latitude: 44.315038428721074,
        longitude: 8.497466049659366
      },
    ]
  },
  {
    title: "Croisière Costa Luminosa",
    category: "travel",
    startDate: "2012-10-29",
    endDate: "2012-11-03",
    color: "#1B4397",
    steps: [
      {
        category: "travel",
        color: "#1B4397",
        city: "Marseille",
        country: "France",
        latitude: 43.34432699124567,
        longitude: 5.3309562158240675
      },
      {
        category: "travel",
        color: "#1B4397",
        city: "Savone",
        country: "Italie",
        latitude: 44.315038428721074,
        longitude: 8.497466049659366
      },
      {
        category: "travel",
        color: "#1B4397",
        city: "Barcelone",
        country: "Espagne",
        latitude: 41.37088594046451,
        longitude: 2.1809917656819287
      },
      {
        category: "travel",
        color: "#1B4397",
        city: "Palma",
        country: "Espagne",
        latitude: 39.55562174277503,
        longitude: 2.627061857642466
      },
      {
        category: "travel",
        color: "#1B4397",
        city: "Ajaccio",
        country: "France",
        latitude: 41.92228053609511,
        longitude: 8.741404752959944
      },
      {
        category: "travel",
        color: "#1B4397",
        city: "Marseille",
        country: "France",
        latitude: 43.34432699124567,
        longitude: 5.3309562158240675
      },
    ]
  },
  {
    title: "Croisière Costa Serena",
    category: "travel",
    startDate: "2013-10-29",
    color: "#1B4397",
    steps: [
      {
        category: "travel",
        color: "#0051ff",
        city: "Savone",
        country: "Italie",
        latitude: 44.315038428721074,
        longitude: 8.497466049659366
      },
      {
        category: "travel",
        color: "#0051ff",
        city: "Rome",
        country: "Italie",
        latitude: 42.094052397925836,
        longitude: 11.778228789255637
      },
      {
        category: "travel",
        color: "#0051ff",
        city: "Palerme",
        country: "Italie",
        latitude: 38.12697100848982,
        longitude: 13.365432749388749
      },
      {
        category: "travel",
        color: "#0051ff",
        city: "Valence",
        country: "Espagne",
        latitude: 39.46131733250623,
        longitude: - 0.30782575177382016
      },
      {
        category: "travel",
        color: "#0051ff",
        city: "Palma",
        country: "Espagne",
        latitude: 39.55562174277503,
        longitude: 2.627061857642466
      },
      {
        category: "travel",
        color: "#0051ff",
        city: "Marseille",
        country: "France",
        latitude: 43.34432699124567,
        longitude: 5.3309562158240675
      },
    ]
  },
  {
    title: "Croisière Costa Luminosa",
    category: "travel",
    startDate: "2014-08-17",
    endDate: "2014-08-25",
    color: "#1B4397",
    steps: [
      {
        category: "travel",
        color: "#1B4397",
        city: "Copenhague",
        country: "Danemark",
        latitude: 55.71554174079403,
        longitude: 12.624303379978363
      },
      {
        category: "travel",
        color: "#1B4397",
        city: "Stockholm",
        country: "Suède",
        latitude: 58.90925923915847,
        longitude: 17.959204155728063
      },
      {
        category: "travel",
        color: "#1B4397",
        city: "Helsinki",
        country: "Finlande",
        latitude: 60.1485881703305,
        longitude: 24.920683488092802
      },
      {
        category: "travel",
        color: "#1B4397",
        city: "St Petersbourg",
        country: "Russie",
        latitude: 59.93122316052001,
        longitude: 30.27185273662598
      },
      {
        category: "travel",
        color: "#1B4397",
        city: "Tallinn",
        country: "Estonie",
        latitude: 59.44759876022049,
        longitude: 24.764679354397288
      },
      {
        category: "travel",
        color: "#1B4397",
        city: "Copenhague",
        country: "Danemark",
        latitude: 55.71554174079403,
        longitude: 12.624303379978363
      },
    ]
  },
  {
    title: "Croisière Costa Diadema",
    category: "travel",
    startDate: "2015-10-18",
    endDate: "2015-10-25",
    color: "#ffc400",
    steps: [
      {
        category: "travel",
        color: "#ffc400",
        city: "Marseille",
        country: "France",
        latitude: 43.34432699124567,
        longitude: 5.3309562158240675
      },
      {
        category: "travel",
        color: "#ffc400",
        city: "Barcelone",
        country: "Espagne",
        latitude: 41.37088594046451,
        longitude: 2.1809917656819287
      },
      {
        category: "travel",
        color: "#ffc400",
        city: "Palma",
        country: "Espagne",
        latitude: 39.55562174277503,
        longitude: 2.627061857642466
      },
      {
        category: "travel",
        color: "#ffc400",
        city: "Naples",
        country: "Italie",
        latitude: 40.83807846938446,
        longitude: 14.260521071254884
      },
      {
        category: "travel",
        color: "#ffc400",
        city: "Pise",
        country: "Italie",
        latitude: 43.55313835882257,
        longitude: 10.29656634026772
      },
      {
        category: "travel",
        color: "#ffc400",
        city: "Marseille",
        country: "France",
        latitude: 43.34432699124567,
        longitude: 5.3309562158240675
      },
    ]
  },
  {
    title: "Ayen",
    category: "travel",
    startDate: "2013-07-15",
    endDate: "2013-08-01",
    color: "#22a6b3",
    city: "Ayen",
    country: "France",
    latitude: 45.237970159216964,
    longitude: 1.337997294703146
  },
  {
    title: "Ayen",
    category: "travel",
    startDate: "2014-07-15",
    endDate: "2014-08-01",
    color: "#22a6b3",
    city: "Ayen",
    country: "France",
    latitude: 45.237970159216964,
    longitude: 1.337997294703146
  },
  {
    title: "Ayen",
    category: "travel",
    startDate: "2015-07-15",
    endDate: "2015-08-01",
    color: "#22a6b3",
    city: "Ayen",
    country: "France",
    latitude: 45.237970159216964,
    longitude: 1.337997294703146
  },
  {
    title: "Ayen",
    category: "travel",
    startDate: "2016-07-15",
    endDate: "2016-08-01",
    color: "#22a6b3",
    city: "Ayen",
    country: "France",
    latitude: 45.237970159216964,
    longitude: 1.337997294703146
  },
  {
    title: "Ayen",
    category: "travel",
    startDate: "2017-07-15",
    endDate: "2017-08-01",
    color: "#22a6b3",
    city: "Ayen",
    country: "France",
    latitude: 45.237970159216964,
    longitude: 1.337997294703146
  },
  {
    title: "Ayen",
    category: "travel",
    startDate: "2018-07-15",
    endDate: "2018-08-07",
    color: "#22a6b3",
    city: "Ayen",
    country: "France",
    latitude: 45.237970159216964,
    longitude: 1.337997294703146
  },
  {
    title: "Ski",
    category: "travel",
    startDate: "2019-02-09",
    endDate: "2019-02-16",
    color: "#ffffff",
    city: "Les Sybelles",
    country: "France",
    latitude: 45.237970159216964,
    longitude: 1.337997294703146
  },
  {
    title: "Ayen",
    category: "travel",
    startDate: "2019-07-15",
    endDate: "2019-08-07",
    color: "#22a6b3",
    city: "Ayen",
    country: "France",
    latitude: 45.237970159216964,
    longitude: 1.337997294703146
  },
  {
    title: "Été à Toulouse",
    category: "travel",
    startDate: "2021-07-01",
    endDate: "2021-08-31",
    color: "#22a6b3",
    city: "Toulouse",
    country: "France",
    latitude: 43.6045,
    longitude: 1.444
  },
  {
    title: "Billund (LEGO House)",
    category: "travel",
    startDate: "2022-04-01",
    color: "#FFD401",
    city: "Billund",
    country: "Danemark",
    latitude: 55.73064476170786,
    longitude: 9.114845705359995
  },
  {
    title: "Luxembourg",
    category: "travel",
    startDate: "2023-05-01",
    description: "Avec l'Epave",
    color: "#2FD866",
    city: "Luxembourg",
    country: "Luxembourg",
    latitude: 49.6116,
    longitude: 6.1319
  },
  {
    title: "Amsterdam",
    category: "travel",
    startDate: "2023-06-10",
    description: "Organisé par le BDE",
    color: "#DD2517",
    city: "Amsterdam",
    country: "Pays-Bas",
    latitude: 52.3676,
    longitude: 4.9041
  },
  {
    title: "Londres",
    category: "travel",
    startDate: "2023-12-09",
    description: "Organisé par le BDE",
    color: "#DD2517",
    city: "London",
    country: "Angleterre",
    latitude: 51.5072,
    longitude: -0.1276
  },
  {
    title: "Kuala Lumpur",
    category: "travel",
    startDate: "2024-04-15",
    color: "#095D8F",
    city: "Kuala Lumpur",
    country: "Malaisie",
    steps: [
      {
        category: "travel",
        color: "#095D8F",
        latitude: 3.1340741499864717,
        longitude: 101.68586462331264
      },
      {
        category: "travel",
        color: "#095D8F",
        latitude: 3.237603631767675,
        longitude: 101.68343890389687
      },
      {
        category: "travel",
        color: "#095D8F",
        latitude: 3.157490751524035,
        longitude: 101.71176144297
      },
      {
        category: "travel",
        color: "#095D8F",
        latitude: 3.1550831740843575,
        longitude: 101.7129295586841
      },
      {
        category: "travel",
        color: "#095D8F",
        latitude: 3.1340741499864717,
        longitude: 101.68586462331264
      },
    ]
  },
  {
    title: "Singapour",
    category: "travel",
    startDate: "2024-06-15",
    color: "#095D8F",
    city: "Singapour",
    country: "Singapour",
    latitude: 1.2843277942862887,
    longitude: 103.85916445116489
  },
  {
    title: "Singapour",
    category: "travel",
    startDate: "2024-07-20",
    color: "#095D8F",
    city: "Singapour",
    country: "Singapour",
    latitude: 1.25240695545997,
    longitude: 103.83374038381272
  },
  {
    title: "Pairi Daiza",
    category: "travel",
    startDate: "2024-12-28",
    color: "#2FD866",
    city: "Ath",
    country: "Belgique",
    latitude: 50.58441635686449,
    longitude: 3.8869135051694452
  },
  {
    title: "Monaco",
    category: "travel",
    startDate: "2025-05-30",
    description: "",
    color: "#01B0DC",
    city: "Monaco",
    country: "Monaco",
    latitude: 43.7384,
    longitude: 7.4246
  },
  {
    title: "Pairi Daiza",
    category: "travel",
    startDate: "2025-12-27",
    color: "#2FD866",
    city: "Ath",
    country: "Belgique",
    latitude: 50.58441635686449,
    longitude: 3.8869135051694452
  },
  {
    title: "Singapour - Malaisie",
    category: "travel",
    startDate: "2026-08-04",
    endDate: "2026-08-12",
    color: "#138a3a",
    steps: [
      {
        category: "travel",
        date: "2026-08-04",
        endDate: "2026-08-07",
        city: "Singapour",
        country: "Singapour",
        latitude: 1.2861521751029412,
        longitude: 103.85352936659403
      },
      {
        category: "travel",
        date: "2026-08-08",
        city: "Malacca",
        country: "Malaisie",
        latitude: 2.194056715773639,
        longitude: 102.24911178168816
      },
      {
        category: "travel",
        date: "2026-08-09",
        city: "Kuala Lumpur",
        country: "Malaisie",
        latitude: 2.741572427260337,
        longitude: 101.70038871903554
      },
      {
        category: "travel",
        date: "2026-08-10",
        city: "Langkawi",
        country: "Malaisie",
        latitude: 6.355048341115887,
        longitude: 99.7845896515892
      },
      {
        category: "travel",
        date: "2026-08-11",
        endDate: "2026-08-12",
        city: "Kuala Lumpur",
        country: "Malaisie",
        latitude: 3.15641329416338,
        longitude: 101.70849865227237
      },
    ]
  },

  // ASSOCIATION
  {
    title: "WEI 3e année",
    category: "association",
    startDate: "2021-09-01",
    color: "#DD2517",
  },
  {
    title: "Préparation liste INS'Avengers",
    category: "association",
    startDate: "2021-12-01",
    endDate: "2022-05-01",
    color: "#5F1696",
  },
  {
    title: "Campagne BDE INS'Avengers",
    category: "association",
    startDate: "2022-05-02",
    endDate: "2022-05-06",
    description: "VS Caristocrates",
    color: "#5F1696",
  },
  {
    title: "Mandat BDE",
    category: "association",
    startDate: "2023-02-01",
    endDate: "2024-02-08",
    description: "INS'Avengers",
    color: "#ffbdcb",
  },
  {
    title: "TOSS CentraleSupélec",
    category: "association",
    startDate: "2023-05-15",
    description: "Prix de l'ambiance 2023",
    color: "#DD2517",
    city: "Gif-sur-Yvette",
    country: "France",
    latitude: 48.70864495649992,
    longitude: 2.1592213406099368,
    youtubeUrl: "https://youtu.be/-bzoR3Ta0uU?si=9kBjnCR8j9rvlv-X"
  },
  {
    title: "WEI",
    category: "association",
    startDate: "2023-09-01",
    color: "#DD2517",
    description: "Organisé par INS'Avengers",
  },
  {
    title: "Seigneurs des Caribous",
    category: "association",
    startDate: "2024-04-12",
    description: "Liste troll BDE",
    color: "#705834",
  },
  {
    title: "Secrétaire INSA Alumni HDF",
    category: "association",
    startDate: "2024-10-01",
    endDate: "2026-03-28",
    color: "#ffbdcb",
  },
  {
    title: "AGO INSA Alumni HDF",
    category: "association",
    startDate: "2026-03-28",
    color: "#ffbdcb",
    gallery: [
      {
        src: "images/AGO_INSA_Alumni_HdF_2026.jpeg",
        alt: "AGO INSA Alumni HDF",
        caption: "AGO INSA Alumni HDF"
      }
    ]
  },
  {
    title: "Secrétaire Adjoint INSA Alumni HDF",
    category: "association",
    startDate: "2026-03-28",
    endDate: "today",
    color: "#ffbdcb",
  },

  // PERSONAL
  {
    title: "Clara",
    category: "personal",
    startDate: "2019-08-15",
    endDate: "2020-01-06",
    color: "#ffffff",
  },
  {
    title: "Anelly",
    category: "personal",
    startDate: "2020-01-20",
    endDate: "2021-09-01",
    color: "#ffffff",
  },
  {
    title: "Florine",
    category: "personal",
    startDate: "2023-03-03",
    endDate: "2023-10-01",
    color: "#ffffff",
  },
  {
    title: "Margot",
    category: "personal",
    startDate: "2023-10-10",
    endDate: "2024-11-15",
    color: "#ffffff",
  },
  {
    title: "Auriane",
    category: "personal",
    startDate: "2025-04-19",
    endDate: "2025-12-19",
    color: "#ffffff",
  },
  {
    title: "Aujourd’hui",
    type: "system",
    category: "system",
    startDate: "today",
    color: "#ffffff",
  }
];

function buildTimelineEventId(event, index) {
  if (event.type === "system" && String(event.startDate).toLowerCase() === "today") {
    return "TODAY";
  }
  return `E${index + 1}`;
}

window.timelineEvents = rawTimelineEvents.map((event, index) => ({
  ...event,
  id: buildTimelineEventId(event, index)
}));
