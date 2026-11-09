import { FIELDS, LOCAL_SOURCE_IDS, SOURCE_META, type Field, type SourceMeta } from "@/lib/sources/meta";

export interface RrlGuide {
  slug: string;
  /** Short name shown on pills and breadcrumbs. */
  shortTitle: string;
  /** Full page heading and SEO title prefix. */
  title: string;
  /** Meta description for search engines. */
  description: string;
  /** Target search keywords for this field. */
  keywords: string[];
  /** Field in SOURCE_META, or "local" for Philippine-only sources. */
  field: Field | "local";
  /** Practical advice for thesis writers in this discipline. */
  intro: string;
  /** Starter search queries that link straight to /search. */
  sampleQueries: { label: string; query: string; country?: string; localOnly?: boolean }[];
  /** Field-specific tips on what advisers look for. */
  tips: string[];
}

export const RRL_GUIDES: RrlGuide[] = [
  {
    slug: "philippines",
    shortTitle: "Philippine Local RRL",
    title: "Philippine Local RRL Finder — Local Studies, Theses & Journals",
    description:
      "Find Philippine local related literature (RRL) and local studies across UP Diliman, UP Visayas, UPOU, HERDIN, SERP-P (PIDS), PCAARRD, SEAFDEC, Philippine E-Journals, Saliksik and DOST journals.",
    keywords: [
      "Philippine RRL", "local RRL finder", "local studies Philippines", "local literature thesis",
      "Philippine theses repository", "HERDIN RRL", "PIDS SERP-P", "UP Diliman theses", "Filipino research papers",
    ],
    field: "local",
    intro:
      "Most Philippine thesis panels ask for both Local and Foreign RRL. Local studies prove your research gap exists in the Philippine setting — in our schools, barangays, hospitals, farms and agencies.",
    sampleQueries: [
      { label: "Reading comprehension in Philippine public schools", query: "reading comprehension public schools", localOnly: true },
      { label: "Rice productivity and climate resilience", query: "rice productivity climate", localOnly: true },
      { label: "Dengue prevention and barangay health", query: "dengue prevention community health", localOnly: true },
      { label: "Financial literacy of Filipino college students", query: "financial literacy college students", localOnly: true },
      { label: "Disaster preparedness in local government", query: "disaster preparedness local government", localOnly: true },
      { label: "Aquaculture and tilapia feeding in the Philippines", query: "tilapia feeding aquaculture", localOnly: true },
    ],
    tips: [
      "Switch Search scope to Philippines (or set Country focus to Philippines) so foreign databases also filter for Philippine studies.",
      "Tag saved papers as Local in your Library so your exported reference list splits Local and Foreign automatically.",
      "When local journal articles are scarce, graduate theses from UP, BSU, AIIAS and SEARCA count as local studies.",
    ],
  },
  {
    slug: "agriculture",
    shortTitle: "Agriculture & Fisheries RRL",
    title: "Agriculture, Fisheries & Environment RRL Finder — Local & Foreign Studies",
    description:
      "Search free agriculture, fisheries, forestry, crop science, veterinary and environmental RRL across AGRIS (FAO), PubAg, AGRICOLA, CGSpace (IRRI), SEAFDEC, PCAARRD, SEARCA and Philippine agricultural journals.",
    keywords: [
      "agriculture RRL", "agricultural thesis related literature", "fisheries RRL", "aquaculture RRL Philippines",
      "crop science related literature", "veterinary RRL", "IRRI rice research", "PCAARRD eLibrary", "SEAFDEC RRL",
    ],
    field: "agriculture",
    intro:
      "Agricultural and fisheries RRL needs studies that match your climate, soil, species and farming system. Thesisweb searches FAO, USDA, CGIAR/IRRI and Philippine agricultural repositories together.",
    sampleQueries: [
      { label: "Organic fertilizer effects on rice yield", query: "organic fertilizer rice yield" },
      { label: "Tilapia biofloc and feed conversion", query: "tilapia biofloc feed conversion" },
      { label: "Postharvest losses in vegetable supply chains", query: "postharvest losses vegetables" },
      { label: "Black soldier fly larvae as poultry feed", query: "black soldier fly larvae poultry feed" },
      { label: "Agroforestry and soil carbon sequestration", query: "agroforestry soil carbon" },
      { label: "African swine fever biosecurity in smallholders", query: "African swine fever biosecurity smallholder" },
    ],
    tips: [
      "Include the scientific name (e.g. Oryza sativa, Oreochromis niloticus) in one search and the common name in another.",
      "Use CGSpace, PCAARRD, SEAFDEC and SEARCA results for tropical and Southeast Asian field conditions.",
      "Check publication years carefully — varietal trials and pest resistance findings age faster than soil-science baselines.",
    ],
  },
  {
    slug: "education",
    shortTitle: "Education & Teaching RRL",
    title: "Education & Teaching RRL Finder — DepEd, Action Research & Theses",
    description:
      "Find free education RRL for teaching strategies, curriculum, assessment, educational technology and student performance across ERIC, EdArXiv, PNU Journals, UP Open University and Philippine education journals.",
    keywords: [
      "education RRL", "teaching RRL finder", "action research RRL Philippines", "reading comprehension RRL",
      "mathematics education RRL", "ERIC education research", "PNU journals", "senior high school RRL",
    ],
    field: "education",
    intro:
      "Education theses and classroom action research rely on studies about pedagogy, learner outcomes, curriculum implementation and school leadership — both international benchmarks (ERIC) and Philippine classrooms.",
    sampleQueries: [
      { label: "Differentiated instruction and reading comprehension", query: "differentiated instruction reading comprehension" },
      { label: "Gamification in mathematics performance", query: "gamification mathematics achievement" },
      { label: "Parental involvement and academic resilience", query: "parental involvement academic resilience" },
      { label: "AI tools and writing proficiency of students", query: "artificial intelligence writing proficiency students" },
      { label: "Teacher burnout and instructional competence", query: "teacher burnout instructional competence" },
      { label: "Mother tongue-based multilingual education", query: "mother tongue multilingual education Philippines", country: "Philippines" },
    ],
    tips: [
      "Name the school level in your query: elementary, junior high school, senior high school, or undergraduate.",
      "Pair an intervention term (e.g. peer tutoring) with a measurable outcome (e.g. problem-solving skill).",
      "EdArXiv results are preprints — useful for recent ed-tech topics, but balance them with peer-reviewed ERIC and PNU articles.",
    ],
  },
  {
    slug: "medicine",
    shortTitle: "Nursing, Medicine & Health RRL",
    title: "Nursing, Medicine & Public Health RRL Finder — Clinical & Community Studies",
    description:
      "Search free nursing, clinical medicine, public health, pharmacy and physiotherapy RRL across PubMed, PubMed Central, Europe PMC, HERDIN, Acta Medica Philippina, WHO IRIS, PAHO IRIS, PEDro and PROSPERO.",
    keywords: [
      "nursing RRL", "medical RRL finder", "public health RRL Philippines", "HERDIN related literature",
      "clinical research RRL", "pharmacy thesis RRL", "physiotherapy RRL PEDro", "Acta Medica Philippina",
    ],
    field: "medicine",
    intro:
      "Health sciences RRL demands peer-reviewed clinical evidence, epidemiology and official health-agency guidelines. Results with a DOI are checked against Crossref's retraction notices, which include Retraction Watch data.",
    sampleQueries: [
      { label: "Nurse staffing ratios and patient safety", query: "nurse staffing patient safety" },
      { label: "Hypertension self-management in community clinics", query: "hypertension self-management community" },
      { label: "Antimicrobial stewardship in hospitals", query: "antimicrobial stewardship hospital" },
      { label: "Maternal health nutrition and prenatal care", query: "maternal nutrition prenatal care" },
      { label: "Stroke rehabilitation exercise therapy", query: "stroke rehabilitation exercise therapy" },
      { label: "Mental health help-seeking among nursing students", query: "mental health help-seeking nursing students" },
    ],
    tips: [
      "Structure clinical queries with PICO words: Population, Intervention, Comparison and Outcome.",
      "Use HERDIN, Acta Medica Philippina and WHO Western Pacific (IRIS) for Philippine morbidity and DOH-context literature.",
      "Tick 'Hide retracted / concern' in the search filters before exporting citations for your manuscript.",
    ],
  },
  {
    slug: "computing",
    shortTitle: "Computer Science, AI & Math RRL",
    title: "Computer Science, IT, AI & Mathematics RRL Finder — Papers & Code",
    description:
      "Find free computer science, information technology, machine learning, cybersecurity and mathematics RRL across IEEE Xplore, arXiv, OpenReview, Papers with Code, Hugging Face, zbMATH Open, NVD and MIT/Stanford repositories.",
    keywords: [
      "computer science RRL", "IT capstone RRL", "machine learning RRL", "cybersecurity RRL",
      "mathematics RRL finder", "capstone project related literature", "system development RRL",
    ],
    field: "computing",
    intro:
      "CS, IT capstone and mathematics RRL spans peer-reviewed conference papers, arXiv preprints, benchmark datasets, vulnerability advisories and formal mathematical reviews.",
    sampleQueries: [
      { label: "Convolutional neural networks for plant disease detection", query: "plant leaf disease detection convolutional neural network" },
      { label: "Large language models in automated grading", query: "large language models automated essay scoring" },
      { label: "Phishing detection using machine learning", query: "phishing detection machine learning" },
      { label: "IoT smart irrigation and soil moisture sensing", query: "IoT smart irrigation soil moisture" },
      { label: "Graph theory applications in network routing", query: "graph coloring network routing optimization" },
      { label: "SQL injection prevention and web application security", query: "SQL injection detection web security" },
    ],
    tips: [
      "For IT capstones, search both the technical method (e.g. random forest, OCR) and the domain problem (e.g. attendance, inventory).",
      "arXiv and Hugging Face Papers are preprints — check if the paper was later accepted at NeurIPS, ICLR, CVPR or IEEE.",
      "Use zbMATH Open and OpenStax when your chapter needs formal mathematical definitions, theorems and textbook foundations.",
    ],
  },
  {
    slug: "engineering",
    shortTitle: "Engineering & Technology RRL",
    title: "Engineering & Technology RRL Finder — Civil, Mechanical, Electrical & Chemical",
    description:
      "Search free civil, mechanical, electrical, electronics, chemical and aerospace engineering RRL across IEEE Xplore, OSTI.GOV, NASA NTRS, NIST, Google Patents, UP Philippine Engineering Journal and university repositories.",
    keywords: [
      "engineering RRL", "civil engineering RRL", "electrical engineering RRL", "mechanical engineering RRL",
      "Philippine Engineering Journal", "solar tracker RRL", "concrete mix design RRL",
    ],
    field: "engineering",
    intro:
      "Engineering design projects and theses need experimental results, standards, patents and technical reports covering materials, energy systems, structures, electronics and manufacturing.",
    sampleQueries: [
      { label: "Partial replacement of cement with agricultural waste ash", query: "rice husk ash concrete compressive strength" },
      { label: "Dual-axis solar tracker efficiency", query: "dual axis solar tracker efficiency" },
      { label: "Microplastics removal in wastewater treatment", query: "microplastics removal wastewater treatment" },
      { label: "Piezo-electric energy harvesting in pavements", query: "piezoelectric energy harvesting roadway" },
      { label: "Drone photogrammetry for flood mapping", query: "UAV photogrammetry flood hazard mapping" },
      { label: "Battery thermal management in electric vehicles", query: "lithium-ion battery thermal management phase change" },
    ],
    tips: [
      "Search Google Patents alongside journal sources when your thesis involves a hardware prototype or fabrication design.",
      "Check the Philippine Engineering Journal (UP NEC) and DOST-related sources for local material testing and standards.",
      "Include the measured property in your query (e.g. compressive strength, thermal efficiency, voltage regulation).",
    ],
  },
  {
    slug: "business",
    shortTitle: "Business, Economics & Finance RRL",
    title: "Business, Economics, Accounting & Hospitality RRL Finder",
    description:
      "Find free business administration, marketing, accounting, finance, hospitality, tourism and economics RRL across EconBiz, World Bank OKR, NBER, SERP-P (PIDS), SEC EDGAR and open-access business journals.",
    keywords: [
      "business RRL", "marketing thesis RRL", "accounting RRL Philippines", "economics RRL",
      "hospitality management RRL", "SME financial performance RRL", "consumer behavior RRL",
    ],
    field: "business",
    intro:
      "Business and economics RRL connects consumer behavior, firm performance, financial management and macroeconomic policy — from SMEs and local tourism to World Bank and PIDS policy studies.",
    sampleQueries: [
      { label: "Digital payments adoption among micro-enterprises", query: "digital payment adoption micro small enterprises" },
      { label: "Social media influencer marketing and purchase intention", query: "influencer marketing purchase intention Gen Z" },
      { label: "Internal control systems and financial reporting quality", query: "internal control financial reporting SMEs" },
      { label: "Service quality and customer retention in hotels", query: "SERVQUAL customer satisfaction hotel industry" },
      { label: "Inflation, remittance inflows and household consumption", query: "remittances household consumption developing" },
      { label: "Green supply chain practices and firm performance", query: "green supply chain management firm performance" },
    ],
    tips: [
      "Name the framework if your study uses one (e.g. SERVQUAL, TAM, UTAUT, Theory of Planned Behavior).",
      "Use SERP-P (PIDS) and World Bank OKR for Philippine economic indicators, SME policy and development studies.",
      "Note that NBER papers are working papers — check if a journal version has since been published.",
    ],
  },
  {
    slug: "social",
    shortTitle: "Social Sciences, Psychology & Criminology RRL",
    title: "Social Sciences, Psychology, Criminology & Policy RRL Finder",
    description:
      "Search free psychology, sociology, criminology, public administration, political science, law and development RRL across OSF Preprints, NCJRS, IDRC, EUR-Lex, CourtListener, SERP-P and Philippine social science journals.",
    keywords: [
      "psychology RRL", "criminology RRL Philippines", "social science RRL", "public administration RRL",
      "political science RRL", "NCJRS criminal justice", "Philippine Sociological Review",
    ],
    field: "social",
    intro:
      "Social science, psychology, criminology and governance theses depend on empirical surveys, qualitative fieldwork, policy evaluations and legal primary sources.",
    sampleQueries: [
      { label: "Social media use, sleep quality and adolescent anxiety", query: "social media sleep quality anxiety adolescents" },
      { label: "Community policing and crime prevention effectiveness", query: "community policing crime prevention trust" },
      { label: "Barangay governance and citizen participation", query: "local governance citizen participation Philippines", country: "Philippines" },
      { label: "Workplace stress and coping strategies of first responders", query: "occupational stress coping police officers" },
      { label: "Gender-responsive budgeting in local government", query: "gender responsive budgeting local government" },
      { label: "Juvenile delinquency rehabilitation and recidivism", query: "juvenile rehabilitation recidivism restorative justice" },
    ],
    tips: [
      "Combine construct names (e.g. self-efficacy, perceived social support) with the target demographic.",
      "Use NCJRS for criminology and policing studies, and Philippine Politics & Society Journals for local governance RRL.",
      "When citing psychometric scales, trace the original validation study as well as a recent Philippine adaptation.",
    ],
  },
  {
    slug: "sciences",
    shortTitle: "Natural & Earth Sciences RRL",
    title: "Biology, Chemistry, Physics & Earth Science RRL Finder",
    description:
      "Search free biology, biodiversity, chemistry, physics, astronomy, geology, oceanography and climate RRL across OpenAlex, Europe PMC, GBIF Literature, USGS, NASA ADS, INSPIRE-HEP, PANGAEA and Dryad.",
    keywords: [
      "biology RRL", "chemistry thesis RRL", "environmental science RRL", "physics RRL",
      "biodiversity RRL Philippines", "phytochemical screening RRL", "earth science RRL",
    ],
    field: "sciences",
    intro:
      "Natural and earth science RRL covers laboratory assays, phytochemical and microbiological studies, biodiversity surveys, climate models and geophysical monitoring.",
    sampleQueries: [
      { label: "Phytochemical screening and antibacterial activity of medicinal plants", query: "phytochemical antibacterial activity plant extract" },
      { label: "Mangrove biodiversity and coastal carbon stocks", query: "mangrove biodiversity blue carbon" },
      { label: "Water quality assessment of freshwater rivers", query: "water quality physicochemical macroinvertebrates river" },
      { label: "Landslide susceptibility mapping using GIS", query: "landslide susceptibility GIS remote sensing" },
      { label: "Microbial bioremediation of heavy-metal contaminated soil", query: "bioremediation heavy metals bacteria soil" },
      { label: "Coral reef bleaching and thermal stress recovery", query: "coral bleaching thermal stress recovery" },
    ],
    tips: [
      "For medicinal plant or biodiversity studies, search the Latin binomial (genus + species) to find exact matches.",
      "Use GBIF Literature and PANGAEA when you need occurrence-linked papers or environmental datasets with DOIs.",
      "Filter by recent years for climate and environmental monitoring, but widen the year range for taxonomic baselines.",
    ],
  },
  {
    slug: "humanities",
    shortTitle: "Humanities, Media & Arts RRL",
    title: "Humanities, Communication, Literature & Cultural Studies RRL Finder",
    description:
      "Find free communication, journalism, literature, linguistics, history, philosophy and cultural heritage RRL across Plaridel, Saliksik, Persée, OAPEN, DOAB, Internet Archive, OpenStax and DigitalNZ.",
    keywords: [
      "communication RRL", "media studies RRL Philippines", "literature thesis RRL", "linguistics RRL",
      "Plaridel journal", "cultural studies RRL", "history RRL finder",
    ],
    field: "humanities",
    intro:
      "Humanities, media and communication RRL draws on critical essays, discourse and framing analyses, historical primary sources, open-access monographs and regional cultural journals.",
    sampleQueries: [
      { label: "Framing of climate change in Philippine news media", query: "media framing climate change journalism" },
      { label: "Code-switching and language attitudes among bilingual youth", query: "code-switching language attitudes bilingual" },
      { label: "Digital disinformation and fact-checking literacy", query: "disinformation fact-checking media literacy" },
      { label: "Representation and identity in contemporary Philippine cinema", query: "Philippine cinema representation identity" },
      { label: "Oral literature preservation and indigenous knowledge", query: "oral literature indigenous cultural heritage" },
      { label: "Film adaptation and narrative theory", query: "film adaptation narrative fidelity" },
    ],
    tips: [
      "Humanities literature ages more slowly — set 'Published since' to Any year when looking for foundational theory or history.",
      "Filter by Books in the search sidebar to surface open-access monographs from OAPEN, DOAB, Open Library and Internet Archive.",
      "Use Plaridel and Saliksik (UP Diliman Journals) for peer-reviewed Philippine media, cultural and historical studies.",
    ],
  },
];

export const RRL_GUIDE_BY_SLUG: Record<string, RrlGuide> = Object.fromEntries(
  RRL_GUIDES.map((g) => [g.slug, g])
);

/** Sources that serve a given RRL guide, sorted alphabetically by label. */
export function sourcesForGuide(guide: RrlGuide): [string, SourceMeta][] {
  const all = Object.entries(SOURCE_META) as [string, SourceMeta][];
  const filtered =
    guide.field === "local"
      ? all.filter(([id]) => LOCAL_SOURCE_IDS.has(id))
      : all.filter(([, meta]) => meta.fields.includes(guide.field as Field) || meta.fields.includes("all"));
  return filtered.sort((a, b) => a[1].label.localeCompare(b[1].label));
}

export { FIELDS };
