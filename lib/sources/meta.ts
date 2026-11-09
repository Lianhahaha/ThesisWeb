/**
 * Display metadata for every search source. Pure data (no adapter imports), so
 * it is safe to use from client components. Add new sources here so the
 * search page, the Databases page and docs pick them up automatically; the
 * registry (lib/sources/registry.ts) must then give each one an adapter.
 */

/** Broad research areas, for grouping sources on the Databases page. */
export const FIELDS = {
  all: "Every field",
  medicine: "Medicine & health",
  engineering: "Engineering & technology",
  sciences: "Natural sciences",
  agriculture: "Agriculture, food & environment",
  social: "Social sciences & development",
  business: "Business & economics",
  education: "Education",
  humanities: "Humanities & arts",
  computing: "Computing & maths",
} as const;
export type Field = keyof typeof FIELDS;

/** What a source holds, which says a lot about how far to trust a record. */
export const KINDS = {
  index: "Research index",
  journals: "Peer-reviewed journals",
  repository: "Open repository",
  preprints: "Preprints (not peer-reviewed)",
  theses: "Theses & dissertations",
  reports: "Reports & official publications",
  books: "Books",
} as const;
export type Kind = keyof typeof KINDS;

export interface SourceMeta {
  /** Human-readable name. */
  label: string;
  /** What it is good for — shown as a tooltip. */
  blurb: string;
  /** Badge color (hex). */
  color: string;
  /** Who runs it and where its records mostly come from, e.g. "Global", "Japan". */
  region: string;
  fields: Field[];
  kind: Kind;
  /** The database's own site, for students who want to search it directly. */
  url: string;
}

const META = {
  openalex: {
    label: "OpenAlex", blurb: "250M+ works across every field; primary discovery source", color: "#388bfd",
    region: "Global", fields: ["all"], kind: "index", url: "https://openalex.org",
  },
  crossref: {
    label: "Crossref", blurb: "Publisher-deposited metadata and DOIs", color: "#3fb950",
    region: "Global", fields: ["all"], kind: "index", url: "https://search.crossref.org",
  },
  semanticscholar: {
    label: "Semantic Scholar", blurb: "AI-written TLDRs and citation graph", color: "#bc8cff",
    region: "Global", fields: ["all"], kind: "index", url: "https://www.semanticscholar.org",
  },
  doaj: {
    label: "DOAJ", blurb: "Fully open-access journals worldwide", color: "#d29922",
    region: "Global", fields: ["all"], kind: "journals", url: "https://doaj.org",
  },
  europepmc: {
    label: "Europe PMC", blurb: "Life sciences, biomedical and preprints", color: "#64c4c4",
    region: "Europe", fields: ["medicine", "sciences"], kind: "index", url: "https://europepmc.org",
  },
  pubmed: {
    label: "PubMed", blurb: "Biomedical and health literature", color: "#f8814a",
    region: "United States", fields: ["medicine"], kind: "index", url: "https://pubmed.ncbi.nlm.nih.gov",
  },
  arxiv: {
    label: "arXiv", blurb: "Preprints in physics, maths, CS, economics and more", color: "#e06060",
    region: "Global", fields: ["sciences", "computing", "engineering"], kind: "preprints", url: "https://arxiv.org",
  },
  eric: {
    label: "ERIC", blurb: "Education research: articles, theses and reports (U.S. Dept. of Education)", color: "#e3b341",
    region: "United States", fields: ["education"], kind: "index", url: "https://eric.ed.gov",
  },
  edarxiv: {
    label: "EdArXiv", blurb: "Education research preprints from the EdArXiv community: teaching, learning, policy, assessment and educational technology. Not peer-reviewed", color: "#2f9e8f",
    region: "Global (COS)", fields: ["education", "social"], kind: "preprints", url: "https://edarxiv.org",
  },
  huggingface: {
    label: "Hugging Face Papers", blurb: "The AI community's daily research feed: machine learning, language models, computer vision, agents, AI safety and applications, with free arXiv PDFs", color: "#f0b429",
    region: "Global", fields: ["computing", "sciences", "engineering", "social"], kind: "preprints", url: "https://huggingface.co/papers",
  },
  openreview: {
    label: "OpenReview", blurb: "Open peer review for AI and machine-learning conferences and workshops: ICLR, NeurIPS, ICML, CoRL and more, with free PDFs", color: "#8b5cf6",
    region: "Global", fields: ["computing", "sciences", "engineering"], kind: "journals", url: "https://openreview.net",
  },
  zbmath: {
    label: "zbMATH Open", blurb: "Mathematical reviews and abstracts across pure and applied mathematics, statistics, mathematical computer science and mathematical physics (FIZ Karlsruhe / EMS)", color: "#b06a2c",
    region: "Global", fields: ["sciences", "computing", "engineering"], kind: "index", url: "https://zbmath.org",
  },
  zenodo: {
    label: "Zenodo", blurb: "Open articles, theses, reports and preprints from every field (CERN)", color: "#58a6ff",
    region: "Global", fields: ["all"], kind: "repository", url: "https://zenodo.org",
  },
  hal: {
    label: "HAL", blurb: "French national open archive: articles, theses and reports (multilingual)", color: "#f778ba",
    region: "France", fields: ["all"], kind: "repository", url: "https://hal.science",
  },
  openaire: {
    label: "OpenAIRE", blurb: "European open-science graph: repositories, publishers and funder-linked research", color: "#ff7b72",
    region: "Europe", fields: ["all"], kind: "index", url: "https://explore.openaire.eu",
  },
  inspire: {
    label: "INSPIRE-HEP", blurb: "High-energy physics, astrophysics and cosmology (CERN, Fermilab, DESY)", color: "#a5d6ff",
    region: "Global", fields: ["sciences"], kind: "index", url: "https://inspirehep.net",
  },
  plos: {
    label: "PLOS", blurb: "PLOS ONE, Climate, Medicine, Biology and more — all open access", color: "#ff9bce",
    region: "Global", fields: ["medicine", "sciences"], kind: "journals", url: "https://plos.org",
  },
  datacite: {
    label: "DataCite Theses", blurb: "Theses and dissertations from university repositories worldwide", color: "#7ee787",
    region: "Global", fields: ["all"], kind: "theses", url: "https://commons.datacite.org",
  },
  nist: {
    label: "NIST Publications", blurb: "National Institute of Standards and Technology papers and reports: physics, chemistry, materials, metrology, engineering, computing and cybersecurity, all free", color: "#1f4e79",
    region: "United States", fields: ["engineering", "sciences", "computing"], kind: "reports", url: "https://www.nist.gov/publications",
  },
  osti: {
    label: "OSTI.GOV", blurb: "U.S. Dept. of Energy research: energy, engineering, physics and environment reports and articles", color: "#f0b72f",
    region: "United States", fields: ["engineering", "sciences"], kind: "reports", url: "https://www.osti.gov",
  },
  cinii: {
    label: "CiNii Research", blurb: "Japanese and Asian research: articles, theses and books, many in English (NII Japan)", color: "#79c0ff",
    region: "Japan", fields: ["all"], kind: "index", url: "https://cir.nii.ac.jp",
  },
  jstage: {
    label: "J-STAGE", blurb: "3,000+ journals published in Japan: engineering, medicine, agriculture, education (JST)", color: "#ffa198",
    region: "Japan", fields: ["all"], kind: "journals", url: "https://www.jstage.jst.go.jp",
  },
  figshare: {
    label: "Figshare", blurb: "University and publisher repository items: journal articles, theses and conference papers", color: "#556cd6",
    region: "Global", fields: ["all"], kind: "repository", url: "https://figshare.com",
  },
  worldbank: {
    label: "World Bank OKR", blurb: "World Bank research, working papers and country studies on development, poverty, health and education, all free", color: "#2f81f7",
    region: "Global (World Bank)", fields: ["social", "business", "education", "agriculture"], kind: "reports", url: "https://openknowledge.worldbank.org",
  },
  fao: {
    label: "FAO OpenKnowledge", blurb: "Food and Agriculture Organization publications: food security, fisheries and aquaculture, agriculture, forestry, climate and rural development, all free", color: "#2f6f4e",
    region: "Global (FAO)", fields: ["agriculture", "sciences", "social", "business"], kind: "reports", url: "https://openknowledge.fao.org",
  },
  cgspace: {
    label: "CGSpace (CGIAR)", blurb: "Agricultural research from CGIAR centres incl. IRRI (Los Baños): crops, fisheries, livestock, nutrition, climate", color: "#56d364",
    region: "Global (CGIAR)", fields: ["agriculture", "sciences"], kind: "repository", url: "https://cgspace.cgiar.org",
  },
  idrc: {
    label: "IDRC Digital Library", blurb: "Development research funded by IDRC across Asia, Africa and Latin America, free to read", color: "#e8912d",
    region: "Global South (IDRC, Canada)", fields: ["social", "medicine", "agriculture", "education"], kind: "reports", url: "https://idl-bnc-idrc.dspacedirect.org",
  },
  pmc: {
    label: "PubMed Central", blurb: "10M+ full-text medical and life-science articles from the U.S. National Library of Medicine, all free", color: "#f2a65a",
    region: "United States", fields: ["medicine", "sciences"], kind: "journals", url: "https://pmc.ncbi.nlm.nih.gov",
  },
  ntrs: {
    label: "NASA NTRS", blurb: "NASA technical reports, conference papers and journal reprints: aerospace, Earth science, materials, engineering", color: "#0b3d91",
    region: "United States", fields: ["engineering", "sciences"], kind: "reports", url: "https://ntrs.nasa.gov",
  },
  econbiz: {
    label: "EconBiz", blurb: "Economics and business: articles, working papers and books from RePEc, EconStor and publishers (ZBW Germany)", color: "#d4a72c",
    region: "Global (ZBW, Germany)", fields: ["business", "social"], kind: "index", url: "https://www.econbiz.de",
  },
  pubag: {
    label: "PubAg", blurb: "USDA National Agricultural Library's index of peer-reviewed agricultural literature: agronomy, food, nutrition, forestry, fisheries and veterinary science", color: "#2e6b3a",
    region: "United States (USDA)", fields: ["agriculture", "sciences", "medicine"], kind: "index", url: "https://pubag.nal.usda.gov",
  },
  agricola: {
    label: "AGRICOLA", blurb: "USDA National Agricultural Library catalogue and article index, back to the 15th century: agriculture, forestry, nutrition, veterinary medicine and rural life", color: "#4f7a28",
    region: "United States (USDA)", fields: ["agriculture", "sciences", "medicine", "social"], kind: "index", url: "https://search.nal.usda.gov",
  },
  usgs: {
    label: "USGS Publications", blurb: "U.S. Geological Survey reports and articles: earthquakes, volcanoes, water, minerals, ecosystems, climate", color: "#6e9a3c",
    region: "United States", fields: ["sciences", "agriculture", "engineering"], kind: "reports", url: "https://pubs.usgs.gov",
  },
  ieee: {
    label: "IEEE Xplore", blurb: "IEEE journals, conference papers and standards: engineering, computing, electronics, communications (free registration key)", color: "#00629b",
    region: "Global", fields: ["engineering", "computing", "sciences"], kind: "index", url: "https://ieeexplore.ieee.org",
  },
  agris: {
    label: "AGRIS", blurb: "15M+ records on agriculture, forestry, fisheries, food, nutrition and the environment from FAO's international information system, multilingual and AGROVOC-indexed", color: "#4c8c2b",
    region: "Global (FAO)", fields: ["agriculture", "sciences", "social"], kind: "index", url: "https://agris.fao.org",
  },
  gbif: {
    label: "GBIF Literature", blurb: "Biodiversity research: species, ecosystems, conservation, fisheries and agriculture (Global Biodiversity Information Facility)", color: "#4c9f38",
    region: "Global (GBIF)", fields: ["sciences", "agriculture"], kind: "index", url: "https://www.gbif.org/resource/search?contentType=literature",
  },
  lareferencia: {
    label: "LA Referencia", blurb: "Open repositories of Latin America: articles, theses and reports, mostly Spanish and Portuguese", color: "#ec6547",
    region: "Latin America", fields: ["all"], kind: "repository", url: "https://www.lareferencia.info",
  },
  bdtd: {
    label: "BDTD Brazil", blurb: "900k+ master's and doctoral theses from Brazilian universities, full text free (IBICT)", color: "#2ea043",
    region: "Brazil", fields: ["all"], kind: "theses", url: "https://bdtd.ibict.br",
  },
  thesesfr: {
    label: "theses.fr", blurb: "Every doctoral thesis defended in France since 1985, many in English (ABES)", color: "#3e63dd",
    region: "France", fields: ["all"], kind: "theses", url: "https://theses.fr",
  },
  osf: {
    label: "OSF Preprints", blurb: "Moderated preprint servers: PsyArXiv, SocArXiv, EdArXiv, AfricArXiv, INA-Rxiv (Indonesia) and more. Not peer-reviewed", color: "#36b37e",
    region: "Global (COS)", fields: ["social", "education", "medicine", "sciences"], kind: "preprints", url: "https://osf.io/preprints",
  },
  bsu: {
    label: "BSU Repository", blurb: "Benguet State University theses, dissertations and research: Cordillera agriculture, rice, nursing, education and indigenous community studies", color: "#2e7d32",
    region: "Philippines", fields: ["agriculture", "education", "medicine", "social"], kind: "theses", url: "https://repository.bsu.edu.ph",
  },
  seafdec: {
    label: "SEAFDEC/AQD", blurb: "Aquaculture and fisheries research from SEAFDEC's Aquaculture Department in Iloilo: articles, manuals, theses and conference papers", color: "#1f9ece",
    region: "Philippines", fields: ["agriculture", "sciences"], kind: "repository", url: "https://repository.seafdec.org.ph",
  },
  ssoar: {
    label: "SSOAR", blurb: "Social science articles, working papers and reports, all free full text (GESIS, Germany)", color: "#c2185b",
    region: "Germany (GESIS)", fields: ["social", "education"], kind: "repository", url: "https://www.ssoar.info",
  },
  paho: {
    label: "PAHO IRIS", blurb: "Pan American Health Organization publications: guidelines, technical reports, country health profiles and journal articles from the Americas, all free", color: "#0072ce",
    region: "Americas (PAHO/WHO)", fields: ["medicine", "social"], kind: "reports", url: "https://iris.paho.org",
  },
  who: {
    label: "WHO IRIS", blurb: "World Health Organization guidelines, reports and articles, incl. the Western Pacific office in Manila, all free", color: "#0093d5",
    region: "Global (WHO)", fields: ["medicine", "social"], kind: "reports", url: "https://iris.who.int",
  },
  nber: {
    label: "NBER", blurb: "Economics working papers on labour, health, education, development and finance (U.S. National Bureau of Economic Research). Not yet peer-reviewed", color: "#8c1d40",
    region: "United States", fields: ["business", "social"], kind: "preprints", url: "https://www.nber.org/papers",
  },
  openlibrary: {
    label: "Open Library", blurb: "30M+ books from library catalogues, for the textbooks and monographs an RRL cites; public-domain scans free to read (Internet Archive)", color: "#e1a95f",
    region: "Global (Internet Archive)", fields: ["all"], kind: "books", url: "https://openlibrary.org",
  },
  googlebooks: {
    label: "Google Books", blurb: "Books, textbooks and monographs across every field, with previews where the publisher allows them", color: "#4285f4",
    region: "Global", fields: ["all"], kind: "books", url: "https://books.google.com",
  },
  openstax: {
    label: "OpenStax", blurb: "Free, peer-reviewed university textbooks from Rice University: maths, science, business, social science and the humanities, each with a free PDF", color: "#0b6e4f",
    region: "United States (Rice University)", fields: ["sciences", "computing", "business", "social", "education", "humanities"], kind: "books", url: "https://openstax.org",
  },
  core: {
    label: "CORE", blurb: "300M+ open-access papers harvested from 10,000+ university repositories and journals worldwide, incl. Philippine ones (Open University & Jisc, UK)", color: "#b75400",
    region: "Global (UK)", fields: ["all"], kind: "index", url: "https://core.ac.uk",
  },
  ntu: {
    label: "DR-NTU (Singapore)", blurb: "Nanyang Technological University theses, student projects and papers: engineering, computing, business, education (NIE)", color: "#c8102e",
    region: "Singapore", fields: ["engineering", "computing", "business", "education"], kind: "repository", url: "https://dr.ntu.edu.sg",
  },
  upspace: {
    label: "UPSpace (South Africa)", blurb: "University of Pretoria theses, articles and reports: education, health, veterinary science, engineering, economics", color: "#005baa",
    region: "South Africa", fields: ["education", "medicine", "engineering", "business", "agriculture"], kind: "repository", url: "https://repository.up.ac.za",
  },
  upou: {
    label: "UP Open University", blurb: "UPOU theses, capstone projects and research: online and distance education, development communication, health informatics, environment", color: "#7b1113",
    region: "Philippines", fields: ["education", "social", "medicine", "agriculture"], kind: "repository", url: "https://repository.upou.edu.ph",
  },
  upv: {
    label: "UP Visayas", blurb: "UP Visayas theses and research: fisheries, ocean sciences, aquaculture, food science, management, social sciences", color: "#014421",
    region: "Philippines", fields: ["agriculture", "sciences", "social", "business"], kind: "repository", url: "https://repository.upv.edu.ph",
  },
  philjournals: {
    label: "Philippine Journals (Crossref)", blurb: "One search across major DOI-backed Philippine journals: Philippine Journal of Science, engineering and applied science, teacher education, agriculture and fisheries, and psychology", color: "#1f6f8b",
    region: "Philippines", fields: ["engineering", "education", "agriculture", "sciences", "social"], kind: "journals", url: "https://search.crossref.org",
  },
  pej: {
    label: "Philippine Engineering Journal", blurb: "The UP National Engineering Center's peer-reviewed engineering journal: civil, mechanical, electrical, industrial, chemical and mining engineering research from the Philippines", color: "#8a1538",
    region: "Philippines", fields: ["engineering", "computing", "sciences"], kind: "journals", url: "https://saliksik.upd.edu.ph",
  },
  ajol: {
    label: "AJOL (African Journals Online)", blurb: "1,000+ peer-reviewed African journals: health, agriculture, engineering, education and social sciences, with English titles and abstracts", color: "#c65d21",
    region: "Africa", fields: ["all"], kind: "journals", url: "https://www.ajol.info",
  },

  ncjrs: {
    label: "NCJRS Virtual Library", blurb: "U.S. National Criminal Justice Reference Service: research reports, statistics, program evaluations and federal publications on policing, courts, corrections, victims, drugs and crime prevention", color: "#1f4e79",
    region: "United States", fields: ["social"], kind: "reports", url: "https://www.ojp.gov/ncjrs",
  },
  herdin: {
    label: "HERDIN", blurb: "Philippine national health research registry: journal articles, theses and reports on health research done in the Philippines (DOST-PCHRD)", color: "#00843d",
    region: "Philippines", fields: ["medicine", "social"], kind: "index", url: "https://www.herdin.ph",
  },
  serpp: {
    label: "SERP-P (PIDS)", blurb: "Socioeconomic Research Portal for the Philippines: discussion papers, policy notes and studies from PIDS, BSP, NEDA and universities, free to download", color: "#9b2335",
    region: "Philippines", fields: ["social", "business", "education", "agriculture", "medicine"], kind: "reports", url: "https://serp-p.pids.gov.ph",
  },
  upd: {
    label: "UP Diliman", blurb: "Digital Archives @ UP Diliman: 6,000+ theses and dissertations from every UP Diliman college, most with full abstracts", color: "#8a1538",
    region: "Philippines", fields: ["all"], kind: "theses", url: "https://digitalarchives.upd.edu.ph",
  },
  aiias: {
    label: "AIIAS Repository", blurb: "Adventist International Institute of Advanced Studies (Cavite) graduate theses and dissertations: education, business, public health, nursing, theology", color: "#1f4e79",
    region: "Philippines", fields: ["education", "business", "medicine", "humanities"], kind: "theses", url: "https://dspace.aiias.edu",
  },
  actamedica: {
    label: "Acta Medica Philippina", blurb: "UP Manila's national health sciences journal since 1939: peer-reviewed, open-access Philippine clinical, nursing and public health studies", color: "#7a0019",
    region: "Philippines", fields: ["medicine"], kind: "journals", url: "https://actamedicaphilippina.upm.edu.ph",
  },
  pnu: {
    label: "PNU Journals", blurb: "Philippine Normal University's open-access education journals: The Normal Lights, APHERJ, AsTEN Journal of Teacher Education, Paghabi", color: "#003f87",
    region: "Philippines", fields: ["education"], kind: "journals", url: "https://po.pnuresearchportal.org/ejournal",
  },
  ejournalsph: {
    label: "Philippine E-Journals", blurb: "Articles from hundreds of Philippine university and society journals, most with a free PDF: education, business, health, sciences, social sciences (C&E Publishing)", color: "#0b6e4f",
    region: "Philippines", fields: ["all"], kind: "journals", url: "https://ejournals.ph",
  },
  krishikosh: {
    label: "Krishikosh (India)", blurb: "150k+ agricultural theses from India's agricultural universities: agronomy, horticulture, fisheries, veterinary, food technology (ICAR)", color: "#3b7d23",
    region: "India", fields: ["agriculture", "sciences"], kind: "theses", url: "https://krishikosh.egranth.ac.in",
  },
  saliksik: {
    label: "Saliksik (UP Diliman Journals)", blurb: "Peer-reviewed journals from UP Diliman colleges and units: public administration, social sciences, humanities, education, science and Filipino language", color: "#6f1d2c",
    region: "Philippines", fields: ["all"], kind: "journals", url: "https://saliksik.upd.edu.ph",
  },
  pcaarrd: {
    label: "PCAARRD eLibrary", blurb: "DOST-PCAARRD's agriculture, aquatic and natural resources library: theses, research papers, books, manuals and reports from Philippine consortia and state universities", color: "#2f7d32",
    region: "Philippines", fields: ["agriculture", "sciences", "social"], kind: "repository", url: "https://elibrary.pcaarrd.dost.gov.ph",
  },
  scielo: {
    label: "SciELO", blurb: "Open-access journals from Latin America, Spain, Portugal and South Africa, mostly Spanish and Portuguese with English titles and abstracts", color: "#d52b1e",
    region: "Latin America", fields: ["all"], kind: "journals", url: "https://www.scielo.org",
  },
  persee: {
    label: "Persée", blurb: "French humanities and social science journals, books and reviews, many with free full text", color: "#4b6cb7",
    region: "France", fields: ["humanities", "social"], kind: "journals", url: "https://www.persee.fr",
  },
  euctr: {
    label: "EU Clinical Trials Register", blurb: "Legacy EU/EEA clinical trials registered in EudraCT: sponsor, condition, population, start date and results links", color: "#4b5fa8",
    region: "Europe (EU)", fields: ["medicine", "social"], kind: "index", url: "https://www.clinicaltrialsregister.eu",
  },
  ctis: {
    label: "CTIS (EU)", blurb: "EU Clinical Trials Information System: authorised trials under the EU Clinical Trials Regulation, with status, sponsor, conditions, phase and participating countries", color: "#1e4f91",
    region: "Europe (EU)", fields: ["medicine", "social"], kind: "index", url: "https://euclinicaltrials.eu/ctis-public/search",
  },
  isrctn: {
    label: "ISRCTN Registry", blurb: "International register of randomised controlled trials: status, sponsor, conditions, interventions and outcomes, with CC0 metadata (UK)", color: "#b45309",
    region: "Global (UK)", fields: ["medicine", "social"], kind: "index", url: "https://www.isrctn.com",
  },
  clinicaltrials: {
    label: "ClinicalTrials.gov", blurb: "Clinical studies from around the world: status, sponsor, conditions, interventions and outcomes (U.S. NLM)", color: "#2d7d9a",
    region: "Global", fields: ["medicine"], kind: "reports", url: "https://clinicaltrials.gov",
  },
  eurlex: {
    label: "EUR-Lex", blurb: "EU treaties, legislation, case law and preparatory acts in every EU language, free to read and reuse (Publications Office of the EU)", color: "#003399",
    region: "Europe (EU)", fields: ["social", "business", "humanities"], kind: "reports", url: "https://eur-lex.europa.eu",
  },
  federalregister: {
    label: "Federal Register", blurb: "U.S. rules, proposed rules, notices and executive orders, with abstracts and free PDFs", color: "#8b5e3c",
    region: "United States", fields: ["social", "business", "humanities"], kind: "reports", url: "https://www.federalregister.gov",
  },
  internetarchive: {
    label: "Internet Archive", blurb: "Books, texts, reports and historical primary sources from libraries and archives worldwide", color: "#6b7280",
    region: "Global", fields: ["humanities", "social", "education", "sciences"], kind: "books", url: "https://archive.org",
  },
  paperswithcode: {
    label: "Papers with Code", blurb: "Machine-learning papers linked to code, tasks and benchmarks; mostly arXiv preprints", color: "#c2410c",
    region: "Global", fields: ["computing", "engineering", "sciences"], kind: "preprints", url: "https://paperswithcode.co",
  },
  mit: {
    label: "MIT DSpace", blurb: "MIT theses, technical reports and papers, strong in AI, robotics, computer systems and electrical engineering", color: "#a31f34",
    region: "United States", fields: ["computing", "engineering", "sciences"], kind: "repository", url: "https://dspace.mit.edu",
  },
  epfl: {
    label: "EPFL Infoscience", blurb: "EPFL papers, theses and reports: computer and communication sciences, robotics and micro-engineering", color: "#ff4b2b",
    region: "Switzerland", fields: ["computing", "engineering", "sciences"], kind: "repository", url: "https://infoscience.epfl.ch",
  },
  gatech: {
    label: "Georgia Tech SMARTech", blurb: "Theses, dissertations and technical reports from Georgia Tech: computing, machine learning and engineering", color: "#b3a369",
    region: "United States", fields: ["computing", "engineering", "sciences"], kind: "repository", url: "https://repository.gatech.edu",
  },
  toronto: {
    label: "University of Toronto TSpace", blurb: "Toronto theses, articles and reports, including computer science and machine learning", color: "#002a5c",
    region: "Canada", fields: ["computing", "engineering", "medicine"], kind: "repository", url: "https://tspace.library.utoronto.ca",
  },
  cornell: {
    label: "Cornell eCommons", blurb: "Cornell theses, technical reports and papers: computing, information science, engineering and sciences", color: "#b31b1b",
    region: "United States", fields: ["computing", "engineering", "sciences"], kind: "repository", url: "https://ecommons.cornell.edu",
  },
  duke: {
    label: "DukeSpace", blurb: "Duke theses, dissertations and reports: computing, engineering, medicine and sciences", color: "#012169",
    region: "United States", fields: ["computing", "engineering", "medicine"], kind: "repository", url: "https://dukespace.lib.duke.edu",
  },
  vtech: {
    label: "VTechWorks", blurb: "Virginia Tech theses, dissertations and reports: engineering, computing and sciences", color: "#630031",
    region: "United States", fields: ["engineering", "computing", "sciences"], kind: "repository", url: "https://vtechworks.lib.vt.edu",
  },
  uminn: {
    label: "University of Minnesota Conservancy", blurb: "Minnesota theses, technical reports and papers: computing, engineering and sciences", color: "#ffcc33",
    region: "United States", fields: ["computing", "engineering", "sciences"], kind: "repository", url: "https://conservancy.umn.edu",
  },
  arizona: {
    label: "University of Arizona Repository", blurb: "Arizona theses, dissertations and reports: optical sciences, electrical engineering, computing and AI", color: "#ab0520",
    region: "United States", fields: ["engineering", "sciences", "computing"], kind: "repository", url: "https://repository.arizona.edu",
  },
  unsw: {
    label: "UNSW Sydney UNSWorks", blurb: "UNSW Sydney theses, reports and papers: engineering, computing, AI and sciences", color: "#ffd100",
    region: "Australia", fields: ["engineering", "computing", "sciences"], kind: "repository", url: "https://unsworks.unsw.edu.au",
  },
  googlepatents: {
    label: "Google Patents", blurb: "Published patents and applications worldwide: hardware, electronics, mechanical, materials and software inventions (public endpoint)", color: "#4285f4",
    region: "Global", fields: ["engineering", "computing", "sciences"], kind: "reports", url: "https://patents.google.com",
  },
  oapen: {
    label: "OAPEN Library", blurb: "Open-access academic books from publishers and university presses: humanities, social sciences, science and technology", color: "#f59e0b",
    region: "Global", fields: ["all"], kind: "books", url: "https://library.oapen.org",
  },
  doab: {
    label: "DOAB", blurb: "Directory of Open Access Books: peer-reviewed books from many publishers, across every field", color: "#16a34a",
    region: "Global", fields: ["all"], kind: "books", url: "https://directory.doabooks.org",
  },
  harvard: {
    label: "Harvard DASH", blurb: "Harvard theses, articles, working papers and reports: law, medicine, sciences, social sciences and humanities", color: "#a51c30",
    region: "United States", fields: ["all"], kind: "repository", url: "https://dash.harvard.edu",
  },
  melbourne: {
    label: "University of Melbourne Minerva Access", blurb: "Melbourne theses, reports and papers across all fields", color: "#094183",
    region: "Australia", fields: ["all"], kind: "repository", url: "https://minerva-access.unimelb.edu.au",
  },
  digitalnz: {
    label: "DigitalNZ", blurb: "New Zealand cultural heritage and research: archives, newspapers, magazines, images, government documents and some theses from libraries and museums", color: "#0b6b6b",
    region: "New Zealand", fields: ["humanities", "social", "sciences"], kind: "repository", url: "https://digitalnz.org",
  },
  auckland: {
    label: "University of Auckland ResearchSpace", blurb: "Auckland theses, reports and papers across all fields", color: "#00467f",
    region: "New Zealand", fields: ["all"], kind: "repository", url: "https://researchspace.auckland.ac.nz",
  },
  caltech: {
    label: "CaltechAUTHORS", blurb: "Caltech papers, preprints, theses and reports: AI, robotics, physics and engineering", color: "#ff6f00",
    region: "United States", fields: ["computing", "engineering", "sciences"], kind: "repository", url: "https://authors.library.caltech.edu",
  },
  dryad: {
    label: "Dryad", blurb: "Open research-data packages across ecology, agriculture, fisheries, earth and environmental science, each with a citable DOI", color: "#3b7f6b",
    region: "Global", fields: ["sciences", "agriculture", "medicine", "social"], kind: "repository", url: "https://datadryad.org",
  },
  pangaea: {
    label: "PANGAEA", blurb: "Earth, ocean and environmental science datasets and publications, each with a DOI", color: "#0e7490",
    region: "Global", fields: ["sciences", "agriculture"], kind: "repository", url: "https://pangaea.de",
  },
  secedgar: {
    label: "SEC EDGAR", blurb: "U.S. corporate filings (10-K, 10-Q, 8-K and more): business, finance, accounting and governance primary sources", color: "#1e3a8a",
    region: "United States", fields: ["business", "social"], kind: "reports", url: "https://www.sec.gov/edgar",
  },
  nvd: {
    label: "NVD (NIST)", blurb: "CVE vulnerability records from the U.S. National Vulnerability Database: descriptions, CWE classes and references", color: "#0b5394",
    region: "United States", fields: ["computing", "engineering"], kind: "reports", url: "https://nvd.nist.gov",
  },
  cisakev: {
    label: "CISA KEV", blurb: "Known Exploited Vulnerabilities catalog: CVEs confirmed exploited in the wild, with the required remediation action", color: "#b45309",
    region: "United States", fields: ["computing", "engineering"], kind: "reports", url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
  },
  prospero: {
    label: "PROSPERO", blurb: "International prospective register of systematic review protocols: 500,000+ records with review status, type, population, intervention and outcomes (CRD, University of York)", color: "#7c3aed",
    region: "Global (UK)", fields: ["medicine", "social", "education"], kind: "index", url: "https://www.crd.york.ac.uk/PROSPERO",
  },
  pedro: {
    label: "PEDro", blurb: "Physiotherapy Evidence Database: trials, systematic reviews and guidelines with a methodological quality score (sports, rehab, performance)", color: "#0f766e",
    region: "Global", fields: ["medicine"], kind: "index", url: "https://search.pedro.org.au",
  },
  philpolitics: {
    label: "Philippine Politics & Society Journals", blurb: "Philippine Political Science Journal, Philippine Journal of Public Administration, Kasarinlan and Philippine Sociological Review, via DOI-backed OpenAlex records", color: "#7c2d12",
    region: "Philippines", fields: ["social", "business", "education"], kind: "journals", url: "https://openalex.org",
  },
  philagri: {
    label: "Philippine Agriculture & Veterinary Journals", blurb: "The Philippine Agricultural Scientist, Philippine Journal of Veterinary Medicine and Philippine Journal of Agricultural Economics, via DOI-backed OpenAlex records", color: "#166534",
    region: "Philippines", fields: ["agriculture", "sciences", "business"], kind: "journals", url: "https://openalex.org",
  },
} satisfies Record<string, SourceMeta>;

/** Every source id. lib/sources/registry.ts must have an adapter for each one. */
export type SourceId = keyof typeof META;

/** Metadata by id; indexable by any string, since ids arrive from the API. */
export const SOURCE_META: Record<string, SourceMeta> = META;

/** Number of databases every search goes to. */
export const SOURCE_COUNT = Object.keys(SOURCE_META).length;

/**
 * The faster preset: major indexes and broad aggregators. Kept here so the
 * UI, API and tests share one definition.
 */
export const CORE_SOURCE_IDS = new Set([
  "openalex", "crossref", "semanticscholar", "doaj", "europepmc", "pubmed",
  "pmc", "arxiv", "eric", "core", "openaire", "ieee", "ajol", "scielo", "zbmath",
]);

/** Sources whose records are explicitly from the Philippines. */
export const LOCAL_SOURCE_IDS = new Set(
  Object.entries(SOURCE_META)
    .filter(([, meta]) => meta.region === "Philippines")
    .map(([id]) => id)
);

export function sourceLabel(id: string): string {
  // "imported": added from a .bib/.ris file (lib/library/import.ts), not found by a search.
  return SOURCE_META[id]?.label ?? (id === "imported" ? "an imported file" : id);
}
