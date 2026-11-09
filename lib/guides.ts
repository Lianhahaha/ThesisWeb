export type GuideCategory =
  | "RRL basics"
  | "Philippines"
  | "Writing & citations"
  | "Research types";

export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface GuideFaq {
  q: string;
  a: string;
}

export interface GuideSearch {
  label: string;
  query: string;
  country?: string;
  localOnly?: boolean;
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  category: GuideCategory;
  updated: string;
  intro: string[];
  sections: GuideSection[];
  faqs: GuideFaq[];
  related: string[];
  searches: GuideSearch[];
}

const UPDATED = "2026-11-09";

export const GUIDES: Guide[] = [
  {
    slug: "how-to-write-rrl",
    title: "How to Write Chapter 2 RRL (Review of Related Literature)",
    description:
      "A practical, step-by-step guide to writing Chapter 2 RRL for a Philippine thesis: choose a structure, synthesize studies by theme, avoid abstract copying, and connect the literature to your research gap.",
    keywords: ["how to write RRL", "Chapter 2 RRL", "review of related literature guide", "RRL format Philippines", "thesis Chapter 2"],
    category: "RRL basics",
    updated: UPDATED,
    intro: [
      "Chapter 2 is not a list of summaries. It is an argument that your study is needed. A good RRL shows what is already known, what is still missing, and why your research question follows from that gap.",
      "This guide gives a workable structure for Philippine senior high school, college and graduate theses. Check your school's format manual first; department requirements override generic advice.",
    ],
    sections: [
      {
        heading: "Start with a working outline, not a blank page",
        paragraphs: [
          "Before writing, list the variables or themes your study covers. For a quantitative study, that may be each independent variable, the dependent variable and the moderating factors. For a qualitative study, use the concepts that appear in your research questions.",
          "Turn that list into 3–6 thematic headings. Each heading becomes a subsection of Chapter 2. This prevents a chronological 'study after study' dump and makes the chapter easier for your adviser to follow.",
        ],
        bullets: [
          "Theme 1: the main concept and how researchers define it",
          "Theme 2: known causes, factors or mechanisms",
          "Theme 3: interventions or strategies already tested",
          "Theme 4: Philippine or local context",
          "Theme 5: the gap your study addresses",
        ],
      },
      {
        heading: "Use a synthesis matrix while reading",
        paragraphs: [
          "For every source, record the author, year, method, sample, key findings, limitations, and how it relates to your study. A synthesis matrix makes patterns visible: where studies agree, where they conflict, and which contexts have not been studied.",
          "Write from the matrix, not from the PDF. If you cannot explain a study's finding in one sentence, you are not ready to cite it.",
        ],
      },
      {
        heading: "Synthesize instead of summarizing",
        paragraphs: [
          "A summary describes one study. A synthesis compares several studies around one idea. Use reporting verbs that show relationships: found, confirmed, contradicted, extended, questioned, replicated.",
          "Example: 'Three Philippine studies found that reading comprehension improved with explicit strategy instruction (Author, Year; Author, Year), but none examined learners in multigrade rural classrooms.'",
        ],
        bullets: [
          "Group studies by finding, not by author surname",
          "State where the evidence is strong, mixed or thin",
          "Point out sample, method and context differences",
          "End each theme with what it means for your study",
        ],
      },
      {
        heading: "Connect every section to your research gap",
        paragraphs: [
          "The last paragraph of each theme should move the reader toward your study. Do not save the gap for the final page. Show the gap progressively so the final synthesis feels inevitable.",
          "Your gap can be a missing population, an untested intervention, a conflicting result, an outdated context, or a lack of Philippine data. State it plainly and avoid claiming that 'no study has ever been conducted' unless you can support it.",
        ],
      },
      {
        heading: "Edit for academic tone and honesty",
        paragraphs: [
          "Write in your own words, keep quotations rare, and cite the original study rather than a secondary summary. Check every in-text citation against your reference list.",
          "Never invent a citation or copy an abstract. An abstract is the authors' summary; your RRL must interpret the study in relation to your own research problem.",
        ],
      },
    ],
    faqs: [
      {
        q: "How long should Chapter 2 RRL be?",
        a: "Follow your school's manual. Many undergraduate theses run 15–30 pages, but length is less important than coverage, synthesis and a clear link to your gap. A tight 12-page RRL can beat a padded 40-page list of summaries.",
      },
      {
        q: "Can I use a study published 10 years ago?",
        a: "Yes, when it is foundational or the only available source for a concept. Balance older theory with recent empirical studies, and explain why the older source still matters.",
      },
      {
        q: "Do I need both local and foreign RRL?",
        a: "Most Philippine panels expect both. Local studies show the Philippine context; foreign studies show the wider evidence base. Label them clearly if your school requires separate sections.",
      },
    ],
    related: ["related-literature-vs-related-studies", "how-to-organize-rrl-by-theme", "how-to-find-research-gap"],
    searches: [
      { label: "Reading comprehension studies", query: "reading comprehension strategies" },
      { label: "Philippine local studies", query: "reading comprehension students", localOnly: true },
      { label: "Synthesis matrix examples", query: "literature synthesis matrix education" },
    ],
  },
  {
    slug: "rrl-finder-tool",
    title: "What Is an RRL Finder Tool? How Students Can Find Related Literature Faster",
    description:
      "An RRL finder tool searches many free academic databases for related literature at once. Learn how it works, what it can and cannot do, and how to use search results honestly in Chapter 2.",
    keywords: ["RRL finder", "RRL finder tool", "related literature finder", "free RRL tool Philippines", "find related studies"],
    category: "RRL basics",
    updated: UPDATED,
    intro: [
      "An RRL finder is a search tool built for one job: helping you discover published studies, theses and reports related to your research topic. It is not a citation generator that invents sources, and it does not write Chapter 2 for you.",
      "Thesisweb sends one query to dozens of free databases, merges duplicates, flags preprints and retractions, and lets you save results into a synthesis matrix.",
    ],
    sections: [
      {
        heading: "What makes it different from Google",
        paragraphs: [
          "Google searches the open web. An academic RRL finder searches databases that index journals, university repositories, theses and government reports. That means fewer content farms and more records you can actually cite.",
          "A good tool also shows where each record came from and links to the original publisher or repository page, so you can verify the source before citing it.",
        ],
      },
      {
        heading: "What a good RRL finder should do",
        bullets: [
          "Search many free sources in one query",
          "Merge duplicates by DOI or title and year",
          "Show authors, year, venue, abstract and a stable link",
          "Label preprints, retractions and expressions of concern",
          "Let you save, organize and export citations",
          "Keep your search terms private and avoid fabricated records",
        ],
      },
      {
        heading: "What it cannot do",
        paragraphs: [
          "No search tool can guarantee completeness. Coverage differs by field, language and repository. Local Philippine journals that are not indexed anywhere may still require a library visit or a direct request to the author.",
          "A finder also cannot judge whether a study is good. You still need to read the method, sample and limitations, and decide whether the source fits your research problem.",
        ],
      },
      {
        heading: "How to use results responsibly",
        paragraphs: [
          "Treat the search results as a map, not as the final RRL. Open the most relevant papers, read beyond the abstract, and take notes in your own words. Cite the original study, not the search result page.",
          "Keep a record of your search terms and dates. Reproducibility matters if your adviser or panel asks how you selected your literature.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is an RRL finder free?",
        a: "Thesisweb is free and needs no account to search. Saving a library, notes or shared collections may require signing in, but the search itself is free.",
      },
      {
        q: "Does it use AI to invent papers?",
        a: "No. Results come from real databases and repositories, and nothing is generated. DOIs are checked against Crossref's retraction notices, which include the Retraction Watch data, so retractions and expressions of concern are flagged when a notice is found.",
      },
    ],
    related: ["how-to-write-rrl", "free-rrl-databases-philippines", "how-to-find-local-studies-philippines"],
    searches: [
      { label: "Try a sample RRL search", query: "social media academic performance" },
      { label: "Search Philippine sources", query: "student well-being", localOnly: true },
      { label: "Find a research gap", query: "teacher feedback writing skills" },
    ],
  },
  {
    slug: "related-literature-vs-related-studies",
    title: "Related Literature vs Related Studies: What Is the Difference?",
    description:
      "Related literature and related studies are not the same. Learn the difference, see examples of each, and understand how Philippine thesis manuals usually arrange Chapter 2.",
    keywords: ["related literature vs related studies", "local literature and studies", "RRL meaning", "Chapter 2 related studies"],
    category: "RRL basics",
    updated: UPDATED,
    intro: [
      "Many students use 'related literature' and 'related studies' interchangeably. Advisers often do not. The difference is mainly about the type of source and how directly it reports evidence.",
      "The safest approach is to understand the distinction, then follow the exact headings required by your school's thesis manual.",
    ],
    sections: [
      {
        heading: "Related literature",
        paragraphs: [
          "Related literature usually refers to published discussion, theory, commentary or journal articles that explain concepts related to your topic. It may include books, review articles, professional guidelines and conceptual papers.",
          "Literature helps you define variables, explain mechanisms and show how scholars think about the problem. It is often broader and less directly comparable to your own study.",
        ],
      },
      {
        heading: "Related studies",
        paragraphs: [
          "Related studies are empirical investigations with a method, sample and findings. They may be journal articles, theses, dissertations or institutional research reports.",
          "Because they report actual data, related studies are usually stronger evidence for your gap. You can compare their population, design, intervention and results with your proposed study.",
        ],
      },
      {
        heading: "How Philippine manuals arrange them",
        paragraphs: [
          "Some manuals separate Local Literature, Foreign Literature, Local Studies and Foreign Studies. Others use thematic sections and label sources inside the text. Some use 'Review of Related Literature and Studies' as one chapter title.",
          "Do not guess. Copy the heading structure from your school's template, then use the labels consistently throughout Chapter 2 and the reference list.",
        ],
        bullets: [
          "Local literature: concepts or commentary published in the Philippines",
          "Foreign literature: concepts or commentary from outside the Philippines",
          "Local studies: empirical research conducted in a Philippine setting",
          "Foreign studies: empirical research conducted elsewhere",
        ],
      },
      {
        heading: "A practical rule",
        paragraphs: [
          "If the source reports data collected from participants, treat it as a study. If it mainly explains or reviews ideas, treat it as literature. When a source mixes both, describe what it contributes instead of forcing it into a label.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is a thesis a related study?",
        a: "Yes. A thesis or dissertation that reports original data is a related study, even if it is unpublished. Cite it as a thesis in your reference list.",
      },
      {
        q: "Can a review article be a related study?",
        a: "It is usually classified as literature because it does not collect new data, but a systematic review still carries strong evidence weight. Explain what kind of review it is.",
      },
    ],
    related: ["how-to-write-rrl", "local-and-foreign-rrl-examples", "literature-review-vs-rrl"],
    searches: [
      { label: "Find related studies", query: "academic motivation students" },
      { label: "Find Philippine studies", query: "academic motivation students", localOnly: true },
      { label: "Find review literature", query: "systematic review academic motivation" },
    ],
  },
  {
    slug: "literature-review-vs-rrl",
    title: "Literature Review vs RRL: Are They the Same?",
    description:
      "A literature review and an RRL overlap, but they serve different purposes. Learn how a thesis Chapter 2 differs from a standalone literature review and how to structure each one.",
    keywords: ["literature review vs RRL", "review of related literature vs literature review", "thesis literature review", "Chapter 2 RRL"],
    category: "RRL basics",
    updated: UPDATED,
    intro: [
      "In everyday student language, 'literature review' and 'RRL' often mean the same chapter. In research writing, they can describe different scopes and purposes.",
      "Understanding the difference helps you avoid writing a generic essay when your panel expects a focused review tied to your research gap.",
    ],
    sections: [
      {
        heading: "What an RRL usually means",
        paragraphs: [
          "RRL stands for Review of Related Literature. In many Philippine schools it is the Chapter 2 requirement: a review of local and foreign literature and studies related to your topic.",
          "Its scope is deliberately tied to your research problem. You select sources because they explain your variables, context, method or gap, not because they are interesting in general.",
        ],
      },
      {
        heading: "What a literature review can mean",
        paragraphs: [
          "A literature review can be a section of a paper, a chapter of a thesis, or a standalone article that maps a whole field. A systematic review follows an explicit protocol, search strategy and inclusion criteria.",
          "A standalone review may cover a field more broadly than a thesis RRL. A thesis RRL is usually narrower and more directly justified by the study you are proposing.",
        ],
      },
      {
        heading: "Where they overlap",
        paragraphs: [
          "Both require reading original sources, synthesizing findings by theme, identifying gaps and citing accurately. Both should be organized around ideas, not around a list of authors.",
          "If your school calls the chapter 'Review of Related Literature and Studies', treat it as an RRL. If it asks for a 'Review of Literature', ask your adviser whether local/foreign studies sections are also required.",
        ],
      },
      {
        heading: "What panels look for",
        bullets: [
          "A clear connection between each theme and your research questions",
          "Evidence that you searched beyond the first page of Google",
          "A gap that your study can realistically address",
          "Accurate citations and a complete reference list",
          "No copied abstracts and no fabricated sources",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I use a literature review as my RRL?",
        a: "You can use review articles as sources, but your RRL still needs to connect the evidence to your own research problem, population and context.",
      },
      {
        q: "Do I need a systematic review for Chapter 2?",
        a: "Usually no, unless your program or study design requires one. A systematic review has stricter protocol and reporting requirements than a standard thesis RRL.",
      },
    ],
    related: ["how-to-write-rrl", "related-literature-vs-related-studies", "how-to-find-research-gap"],
    searches: [
      { label: "Find review articles", query: "systematic review student engagement" },
      { label: "Find primary studies", query: "student engagement classroom" },
      { label: "Find local studies", query: "student engagement Philippines", localOnly: true },
    ],
  },
  {
    slug: "how-many-related-studies",
    title: "How Many Related Studies Should an RRL Have?",
    description:
      "There is no universal number of related studies for Chapter 2. Learn how to judge enough coverage by theme, saturation, source quality and your school's requirements.",
    keywords: ["how many related studies in RRL", "number of related literature thesis", "RRL sources count", "Chapter 2 sources"],
    category: "RRL basics",
    updated: UPDATED,
    intro: [
      "Students often ask for a magic number: 10, 20 or 50 studies. The honest answer is that quantity alone does not make a good RRL. Coverage and synthesis matter more.",
      "Still, panels and advisers need enough evidence to trust your claims. The right number depends on your topic, field and level of study.",
    ],
    sections: [
      {
        heading: "Start with coverage, not a quota",
        paragraphs: [
          "List the themes your Chapter 2 must cover. For each theme, ask whether you have at least two or three credible sources, including one recent study and one foundational source where relevant.",
          "If a theme has only one source, your claim is fragile. If a theme has twenty sources that say the same thing, you probably need synthesis, not more citations.",
        ],
      },
      {
        heading: "Typical ranges by level",
        bullets: [
          "Senior high school practical research: often 10–20 sources, with a mix of local and foreign studies",
          "Undergraduate thesis: often 20–40 sources, depending on the field and school",
          "Master's thesis: often 40–80 sources, with stronger attention to theory and methods",
          "Doctoral dissertation: often 80+ sources, plus a clear theoretical framework",
        ],
      },
      {
        heading: "Quality beats quantity",
        paragraphs: [
          "One peer-reviewed study with a strong design can outweigh five weak blog posts or unverified PDFs. Prioritize journal articles, university theses, government reports and reputable books.",
          "Check whether each source is peer-reviewed, current enough for your topic, and directly relevant to your population or context. A famous foreign study may still be a poor fit for a Philippine barangay setting.",
        ],
      },
      {
        heading: "Know when to stop",
        paragraphs: [
          "You are approaching saturation when new searches keep returning studies you have already seen and the same themes keep repeating. At that point, improve your synthesis instead of padding the count.",
          "Ask your adviser if your department has a minimum. If it does, meet it with relevant sources, not with citations you have not read.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is 10 related studies enough?",
        a: "It can be enough for a small senior high school study if the sources are relevant and well synthesized, but many panels expect more. Check your school's minimum.",
      },
      {
        q: "Can I cite the same study twice?",
        a: "You can discuss one study under two themes if it genuinely contributes to both, but avoid repeating the same summary. Explain the different point it supports.",
      },
    ],
    related: ["how-to-write-rrl", "how-to-organize-rrl-by-theme", "avoid-plagiarism-rrl"],
    searches: [
      { label: "Find recent studies", query: "student motivation academic achievement" },
      { label: "Find foundational studies", query: "self-determination theory motivation" },
      { label: "Find Philippine studies", query: "student motivation Philippines", localOnly: true },
    ],
  },
  {
    slug: "how-to-find-research-gap",
    title: "How to Find the Research Gap in Your RRL",
    description:
      "Learn how to identify a defensible research gap from related literature: missing populations, conflicting findings, untested interventions, outdated contexts and absent Philippine data.",
    keywords: ["how to find research gap", "research gap in RRL", "thesis gap statement", "research problem justification"],
    category: "RRL basics",
    updated: UPDATED,
    intro: [
      "A research gap is not simply a topic nobody has written about. It is a specific limitation in the existing evidence that your study can reasonably address.",
      "The best gaps come from reading carefully, not from claiming that no research exists.",
    ],
    sections: [
      {
        heading: "Five common types of gap",
        bullets: [
          "Population gap: a group has not been studied (e.g. multigrade teachers, rural fishers, out-of-school youth)",
          "Context gap: findings come from another country or setting and may not transfer",
          "Intervention gap: a strategy has been tested elsewhere but not in your school or community",
          "Method gap: earlier studies used small samples, limited measures or weak designs",
          "Conflicting evidence: studies disagree, and your study can help explain why",
        ],
      },
      {
        heading: "Read the limitations and recommendations",
        paragraphs: [
          "Authors often state what their study could not do. These sentences are gap-finding gold. Look for phrases such as 'further research is needed', 'limited to', 'did not examine' and 'future studies should'.",
          "Do not copy the recommendation blindly. Check whether the suggested study is feasible for you and relevant to your program.",
        ],
      },
      {
        heading: "Compare local and foreign evidence",
        paragraphs: [
          "A common Philippine gap is the lack of local evidence for an intervention that is well studied abroad. Another is an outdated local study whose context has changed.",
          "Use local studies to show the Philippine situation, then use foreign studies to show what is known elsewhere. The gap often sits between the two.",
        ],
      },
      {
        heading: "Write a defensible gap statement",
        paragraphs: [
          "A good gap statement names the limitation, the evidence and the consequence. Example: 'Several studies examine teacher feedback and writing performance in urban secondary schools, but few include multigrade rural classrooms in Davao del Sur, where feedback is often delayed by teacher load.'",
          "Avoid absolute claims such as 'no study has ever been conducted'. Say 'few studies', 'limited evidence' or 'no study in this specific context' when that is what you can support.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can a gap be a new method?",
        a: "Yes. If earlier studies used surveys and your study adds interviews or a quasi-experiment, that can be a methodological contribution.",
      },
      {
        q: "What if my adviser says my gap is too broad?",
        a: "Narrow it to a population, place, variable or method. 'Lack of research on education' is too broad; 'lack of Philippine evidence on peer feedback in multigrade science classes' is workable.",
      },
    ],
    related: ["how-to-write-rrl", "related-literature-vs-related-studies", "rrl-for-thesis-proposal"],
    searches: [
      { label: "Find studies with limitations", query: "teacher feedback writing performance limitations" },
      { label: "Find local evidence", query: "multigrade classroom Philippines", localOnly: true },
      { label: "Find recent reviews", query: "systematic review feedback writing" },
    ],
  },
  {
    slug: "how-to-organize-rrl-by-theme",
    title: "How to Organize RRL by Theme (Not by Author)",
    description:
      "Thematic organization makes Chapter 2 easier to read and shows synthesis. Learn how to group studies, write theme headings, and connect each theme to your research gap.",
    keywords: ["how to organize RRL", "thematic RRL", "RRL by theme", "Chapter 2 organization", "synthesis by theme"],
    category: "RRL basics",
    updated: UPDATED,
    intro: [
      "A chronological or author-by-author RRL reads like a list. A thematic RRL reads like an argument. The difference is organization.",
      "Themes should come from your research questions and variables, not from the order you happened to find the papers.",
    ],
    sections: [
      {
        heading: "Derive themes from your variables",
        paragraphs: [
          "Write your research questions on one page. Under each question, list the concepts it contains. Those concepts become candidate themes.",
          "For a study on social media and academic performance, themes might be: social media use patterns, mechanisms linking use to performance, academic outcomes, and Philippine student context.",
        ],
      },
      {
        heading: "Write descriptive theme headings",
        paragraphs: [
          "Use headings that state the idea, not just the variable name. 'Social media use and sleep quality' is more useful than 'Related Literature 1'.",
          "Keep headings parallel in grammar. If one heading is a question, make the others questions too.",
        ],
      },
      {
        heading: "Order themes logically",
        paragraphs: [
          "Common orders are broad-to-specific, cause-to-effect, problem-to-intervention, or theory-to-application. Choose one and keep it consistent.",
          "A reader should be able to follow why one theme comes after another. If the order feels arbitrary, your reader will treat the chapter as a list.",
        ],
      },
      {
        heading: "End each theme with a bridge",
        paragraphs: [
          "Finish each subsection by stating what the evidence means for your study. This bridge is where synthesis becomes argument.",
          "Example: 'These studies establish a link between sleep quality and academic performance, but they rely on self-reported grades. The present study uses registrar data in a Philippine senior high school.'",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I use chronological order?",
        a: "Only when the history of an idea is your point. Even then, group the history into periods or debates rather than listing one study per year.",
      },
      {
        q: "How many themes should Chapter 2 have?",
        a: "Usually 3–6. Fewer can feel thin; more can feel fragmented. Let your research questions decide.",
      },
    ],
    related: ["how-to-write-rrl", "synthesis-matrix-template", "how-to-find-research-gap"],
    searches: [
      { label: "Find social media studies", query: "social media academic performance sleep" },
      { label: "Find local studies", query: "social media students Philippines", localOnly: true },
      { label: "Find theory sources", query: "uses and gratifications theory social media" },
    ],
  },
  {
    slug: "rrl-for-thesis-proposal",
    title: "RRL for a Thesis Proposal: What to Include Before Defense",
    description:
      "Your thesis proposal RRL needs to justify the study, not finish it. Learn what to include in Chapter 2 before proposal defense and what can wait until the final thesis.",
    keywords: ["RRL for thesis proposal", "thesis proposal Chapter 2", "proposal defense RRL", "research proposal literature review"],
    category: "RRL basics",
    updated: UPDATED,
    intro: [
      "A proposal RRL has a different job from a final thesis RRL. It must convince the panel that the study is needed, feasible and grounded in existing evidence.",
      "You do not need to include every source you will eventually cite. You need enough coverage to defend the problem, variables, method and gap.",
    ],
    sections: [
      {
        heading: "What the proposal RRL must prove",
        bullets: [
          "The topic is important and current",
          "The variables or concepts are clearly defined",
          "The gap is real and specific",
          "The proposed method is appropriate",
          "The study is feasible in your setting",
        ],
      },
      {
        heading: "What can wait",
        paragraphs: [
          "You can add more sources later for the discussion of results. The proposal RRL does not need to anticipate every finding.",
          "However, do not leave obvious gaps in the justification. If a panel member can name a major study you missed, the proposal will look underprepared.",
        ],
      },
      {
        heading: "A proposal-ready structure",
        paragraphs: [
          "Start with the concept and theory, move to empirical studies, then narrow to the local context and the gap. End with a short synthesis that states your research questions.",
          "Keep the final paragraph focused on why the study should be approved, not on how long your literature search took.",
        ],
      },
      {
        heading: "Prepare for questions",
        paragraphs: [
          "Panels often ask why you chose a theory, why a foreign study applies locally, and why your method is defensible. Know the limitations of your key sources.",
          "Bring a copy of your synthesis matrix or source list. It shows that your RRL is organized and that you can trace every claim.",
        ],
      },
    ],
    faqs: [
      {
        q: "How many sources should a proposal RRL have?",
        a: "Enough to cover each variable and justify the gap. Many undergraduate proposals use 15–30 sources; check your department's guidance.",
      },
      {
        q: "Can I revise the RRL after proposal defense?",
        a: "Yes. Proposal defense feedback often improves the framework and gap statement. Revise before data collection and again before final defense.",
      },
    ],
    related: ["how-to-write-rrl", "how-to-find-research-gap", "how-to-organize-rrl-by-theme"],
    searches: [
      { label: "Find proposal-ready studies", query: "teacher workload instructional quality" },
      { label: "Find local studies", query: "teacher workload Philippines", localOnly: true },
      { label: "Find method examples", query: "mixed methods teacher workload" },
    ],
  },
  {
    slug: "local-and-foreign-rrl-examples",
    title: "Local and Foreign RRL Examples: How to Label and Use Them",
    description:
      "See how local and foreign related literature and studies differ, how to label them in Chapter 2, and how to use both to support your Philippine research gap.",
    keywords: ["local and foreign RRL examples", "local literature examples", "foreign studies examples", "RRL local foreign"],
    category: "Philippines",
    updated: UPDATED,
    intro: [
      "Many Philippine thesis manuals ask for separate local and foreign literature and studies. The labels are simple, but students often misclassify sources or repeat the same study in both sections.",
      "This guide explains the categories with practical examples and a labeling rule you can apply consistently.",
    ],
    sections: [
      {
        heading: "The four common labels",
        bullets: [
          "Local literature: conceptual or review material published in the Philippines",
          "Foreign literature: conceptual or review material published abroad",
          "Local studies: empirical research conducted in a Philippine setting",
          "Foreign studies: empirical research conducted outside the Philippines",
        ],
      },
      {
        heading: "Classify by setting, not by author nationality",
        paragraphs: [
          "A Filipino author publishing a study on Indonesian schools has a foreign setting. A foreign author studying Manila households has a local setting.",
          "When the setting is unclear, read the methods section. The sample location, institution and data source tell you more than the author's name.",
        ],
      },
      {
        heading: "Use local studies for context",
        paragraphs: [
          "Local studies show that the problem exists in Philippine schools, hospitals, farms or communities. They also reveal local policies, language issues and cultural factors that foreign studies may miss.",
          "If local evidence is thin, say so. That thinness can be part of your gap.",
        ],
      },
      {
        heading: "Use foreign studies for breadth and theory",
        paragraphs: [
          "Foreign studies provide larger samples, established instruments and comparative evidence. They help you explain mechanisms and choose a method.",
          "Do not assume a foreign finding transfers automatically. Discuss differences in context, sample and measurement before applying it to your study.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does a study by Filipino authors abroad count as local?",
        a: "No. The label usually follows the research setting, not the authors' nationality. If the data were collected abroad, treat it as foreign unless your manual says otherwise.",
      },
      {
        q: "What if a source is both literature and a study?",
        a: "Describe its main contribution and place it under the label that best fits your chapter's structure. Do not cite it twice as if it were two different sources.",
      },
    ],
    related: ["related-literature-vs-related-studies", "how-to-find-local-studies-philippines", "how-to-write-rrl"],
    searches: [
      { label: "Find local studies", query: "reading comprehension elementary students", localOnly: true },
      { label: "Find foreign studies", query: "reading comprehension elementary students" },
      { label: "Find Philippine journals", query: "reading intervention Philippines", localOnly: true },
    ],
  },
  {
    slug: "how-to-find-local-studies-philippines",
    title: "How to Find Local Studies in the Philippines for Your RRL",
    description:
      "Find Philippine local studies and theses using free repositories: UP Diliman, UP Visayas, UPOU, BSU, HERDIN, SERP-P, PCAARRD, SEAFDEC, Philippine E-Journals, Saliksik and DOST journals.",
    keywords: ["how to find local studies Philippines", "Philippine theses online", "local RRL sources", "free Philippine research papers"],
    category: "Philippines",
    updated: UPDATED,
    intro: [
      "Local studies are often the hardest part of a Philippine RRL. Foreign papers are easy to find; Philippine theses and journals are scattered across university repositories and agency databases.",
      "The good news is that most of these sources are free and searchable. You just need to know where to look.",
    ],
    sections: [
      {
        heading: "Start with the big Philippine repositories",
        bullets: [
          "UP Diliman and UP Visayas repositories for theses and faculty research",
          "UP Open University for distance education, development communication and health informatics",
          "Benguet State University and other regional repositories for local agriculture and community studies",
          "AIIAS, PNU Journals and Saliksik for education, theology and social science",
          "HERDIN for Philippine health research",
          "SERP-P (PIDS) for economics, policy and development studies",
          "PCAARRD, SEAFDEC and SEARCA for agriculture, fisheries and environment",
        ],
      },
      {
        heading: "Search by place and population",
        paragraphs: [
          "Add the region, province, city or community to your query. A study on 'reading comprehension' may be too broad; 'reading comprehension Grade 3 Davao' is more likely to surface local work.",
          "Try both English and Filipino terms. Some theses use Filipino titles or abstracts, and repository search may not translate automatically.",
        ],
      },
      {
        heading: "Use thesis citations as a trail",
        paragraphs: [
          "A Philippine thesis often cites other local theses that are not indexed elsewhere. Open the reference list of a relevant thesis and search for those titles.",
          "If the full text is not online, the abstract and reference list may still be available. Ask your librarian about access.",
        ],
      },
      {
        heading: "Document what you find",
        paragraphs: [
          "Record the repository, URL, author, year and accession number. Local records change or disappear, so a stable citation note matters.",
          "If a local study is unpublished, cite it as a thesis or dissertation and follow your school's format for unpublished works.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are Philippine theses free to read?",
        a: "Many are free to read online, but some repositories allow metadata viewing only or restrict full text to the university. Check the record page and ask your librarian.",
      },
      {
        q: "Can I use a thesis from another university?",
        a: "Yes, if it is relevant and publicly accessible. Cite it properly and note that it is a thesis, not a journal article.",
      },
    ],
    related: ["local-and-foreign-rrl-examples", "free-rrl-databases-philippines", "how-to-write-rrl"],
    searches: [
      { label: "Search Philippine theses", query: "reading comprehension elementary", localOnly: true },
      { label: "Search health research", query: "dengue prevention community", localOnly: true },
      { label: "Search agriculture research", query: "rice farmers climate", localOnly: true },
    ],
  },
  {
    slug: "free-rrl-databases-philippines",
    title: "Free RRL Databases in the Philippines for Thesis Students",
    description:
      "A practical list of free Philippine and international databases for RRL, including UP repositories, HERDIN, SERP-P, PCAARRD, SEAFDEC, PNU, Saliksik, ERIC, PubMed, OpenAlex and more.",
    keywords: ["free RRL databases Philippines", "Philippine thesis database", "free research papers Philippines", "RRL sources list"],
    category: "Philippines",
    updated: UPDATED,
    intro: [
      "You do not need a paid subscription to build a strong RRL. Dozens of free databases cover Philippine theses, local journals, government reports and international research.",
      "This list groups the sources by what they are best at, so you can choose the right starting point for your topic.",
    ],
    sections: [
      {
        heading: "Philippine theses and university research",
        bullets: [
          "UP Diliman, UP Visayas and UPOU repositories",
          "Benguet State University and SEARCA for regional and agriculture theses",
          "AIIAS for education, business, public health and theology",
          "DataCite Theses and BDTD for international and Brazilian theses",
        ],
      },
      {
        heading: "Philippine journals",
        bullets: [
          "Philippine E-Journals for hundreds of university journals",
          "Saliksik (UP Diliman Journals)",
          "Philippine Journals via Crossref",
          "PNU Journals for education",
          "Acta Medica Philippina and HERDIN for health",
          "Philippine Politics & Society Journals",
          "Philippine Agriculture & Veterinary Journals",
        ],
      },
      {
        heading: "Government and policy sources",
        bullets: [
          "SERP-P (PIDS) for socioeconomic research",
          "PCAARRD eLibrary for agriculture, aquatic and natural resources",
          "SEAFDEC/AQD for fisheries and aquaculture",
          "PSA OpenSTAT for statistics, not literature",
        ],
      },
      {
        heading: "International sources that cover the Philippines",
        bullets: [
          "OpenAlex, Crossref, Semantic Scholar and CORE",
          "DOAJ for open-access journals",
          "PubMed, Europe PMC and PMC for health",
          "ERIC for education",
          "AGRIS, PubAg, AGRICOLA and FAO OpenKnowledge for agriculture",
          "OpenAIRE and LA Referencia for repositories",
        ],
      },
    ],
    faqs: [
      {
        q: "Which database should I start with?",
        a: "Start broad with OpenAlex or Crossref, then narrow to a Philippine source such as HERDIN, SERP-P or a university repository for local evidence.",
      },
      {
        q: "Are these databases really free?",
        a: "Yes. Some require a free registration key for higher limits, but the records and links are free to search.",
      },
    ],
    related: ["how-to-find-local-studies-philippines", "rrl-finder-tool", "local-and-foreign-rrl-examples"],
    searches: [
      { label: "Try all databases", query: "student mental health" },
      { label: "Try Philippine sources", query: "student mental health", localOnly: true },
      { label: "Try health sources", query: "dengue community prevention" },
    ],
  },
  {
    slug: "rrl-for-senior-high-school",
    title: "RRL for Senior High School Practical Research",
    description:
      "A senior high school RRL guide: how many sources, how to separate local and foreign studies, how to write simply, and how to avoid copying abstracts in Practical Research 2.",
    keywords: ["RRL for senior high school", "Practical Research 2 RRL", "SHS research RRL", "senior high research paper"],
    category: "Philippines",
    updated: UPDATED,
    intro: [
      "Senior high school Practical Research has its own rhythm. You are expected to write a focused RRL, not a graduate-level literature review, but you still need real sources and honest synthesis.",
      "Most SHS panels look for clear variables, a local context, a simple gap and correct citations.",
    ],
    sections: [
      {
        heading: "Keep the scope small",
        paragraphs: [
          "Choose 2–4 variables or themes. A common SHS mistake is to include every possible factor, which makes the RRL shallow.",
          "For a quantitative study, align each theme with a variable in your questionnaire. For a qualitative study, align themes with your interview questions.",
        ],
      },
      {
        heading: "Use both local and foreign sources",
        paragraphs: [
          "Aim for a mix of Philippine and foreign studies. Local sources show that the problem matters in your community; foreign sources show the wider evidence.",
          "If your school requires separate headings, use Local Literature, Foreign Literature, Local Studies and Foreign Studies. Otherwise, label the setting inside each paragraph.",
        ],
      },
      {
        heading: "Write in your own words",
        paragraphs: [
          "Do not copy abstracts. Read the abstract, then read the method and findings you need, then write a sentence that connects the study to your topic.",
          "Keep quotations short and rare. Your teacher wants to see your understanding, not a patchwork of copied sentences.",
        ],
      },
      {
        heading: "A simple paragraph pattern",
        bullets: [
          "What the study examined",
          "Who the participants were and where the study was done",
          "What it found",
          "How it connects to your study or your gap",
        ],
      },
    ],
    faqs: [
      {
        q: "How many sources for SHS RRL?",
        a: "Many schools expect 10–20 relevant sources. Check your teacher's requirement and prioritize credible local and foreign studies.",
      },
      {
        q: "Can I use websites?",
        a: "Use government, university and journal websites. Avoid content farms, essay mills and sources without authors or dates.",
      },
    ],
    related: ["how-to-write-rrl", "how-many-related-studies", "avoid-plagiarism-rrl"],
    searches: [
      { label: "Find SHS-friendly studies", query: "study habits academic performance senior high" },
      { label: "Find Philippine studies", query: "study habits senior high Philippines", localOnly: true },
      { label: "Find education studies", query: "study habits academic achievement" },
    ],
  },
  {
    slug: "rrl-for-college-thesis",
    title: "RRL for College Thesis: A Practical Checklist",
    description:
      "A college thesis RRL checklist covering source quality, local and foreign studies, synthesis, theory, gap statements, citation accuracy and adviser expectations.",
    keywords: ["RRL for college thesis", "undergraduate thesis RRL", "college research paper RRL", "thesis literature review checklist"],
    category: "Philippines",
    updated: UPDATED,
    intro: [
      "College thesis panels expect more independence than senior high school. You need to show that you can select credible sources, synthesize evidence and defend your gap.",
      "This checklist helps you catch the usual problems before submission.",
    ],
    sections: [
      {
        heading: "Source quality checklist",
        bullets: [
          "Peer-reviewed journal articles or reputable university theses",
          "Government or international agency reports for official data",
          "Recent studies for current context, plus foundational theory",
          "A mix of local and foreign evidence",
          "No predatory journals, essay mills or untraceable PDFs",
        ],
      },
      {
        heading: "Synthesis checklist",
        bullets: [
          "Themes match your research questions",
          "Each theme compares at least two studies",
          "Agreements and contradictions are explained",
          "Sample and context differences are noted",
          "Each theme ends with a link to your gap",
        ],
      },
      {
        heading: "Citation checklist",
        bullets: [
          "Every in-text citation appears in the reference list",
          "Every reference is cited in the text",
          "Author, year, title, venue and DOI/URL are correct",
          "Direct quotations have page numbers where required",
          "Citation style matches your department's manual",
        ],
      },
      {
        heading: "Adviser meeting checklist",
        paragraphs: [
          "Bring your synthesis matrix, a one-page outline and a list of questions. Advisers give better feedback when they can see your structure.",
          "Ask specifically whether your gap is defensible, whether your sources are sufficient, and whether your local/foreign organization matches the manual.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do I need a theoretical framework in Chapter 2?",
        a: "Many programs include it in Chapter 2 or in a separate section. Use theory to explain why your variables should be related, not as a decorative paragraph.",
      },
      {
        q: "Can I cite a study I only read the abstract of?",
        a: "Avoid it unless you have no access. At minimum, read the method and findings so you do not misrepresent the study.",
      },
    ],
    related: ["how-to-write-rrl", "how-many-related-studies", "apa-7-rrl-format"],
    searches: [
      { label: "Find college-level studies", query: "organizational commitment employee performance" },
      { label: "Find local studies", query: "organizational commitment Philippines", localOnly: true },
      { label: "Find theory sources", query: "social exchange theory commitment" },
    ],
  },
  {
    slug: "synthesis-matrix-template",
    title: "Synthesis Matrix Template for RRL (Free, With Columns)",
    description:
      "Use this free synthesis matrix template to organize RRL sources by theme, method, sample, findings, limitations and relevance. Includes a downloadable-friendly structure and example.",
    keywords: ["synthesis matrix template", "RRL synthesis matrix", "literature matrix example", "research synthesis table"],
    category: "Writing & citations",
    updated: UPDATED,
    intro: [
      "A synthesis matrix is a table that turns a pile of papers into a usable argument. Each row is a source; each column captures the information you need to compare it with others.",
      "You can build it in Excel, Google Sheets or a notebook. The tool matters less than using it consistently.",
    ],
    sections: [
      {
        heading: "Recommended columns",
        bullets: [
          "Author and year",
          "Title and venue",
          "Country or setting",
          "Research design and sample",
          "Main variables or themes",
          "Key findings",
          "Limitations",
          "How it relates to your study",
          "Citation notes or DOI",
        ],
      },
      {
        heading: "How to use it",
        paragraphs: [
          "Fill one row per source as you read. Do not wait until you have twenty papers; the matrix should guide your reading.",
          "Sort or color rows by theme. When a theme has enough rows, write the synthesis paragraph directly from the grouped rows.",
        ],
      },
      {
        heading: "What the matrix reveals",
        bullets: [
          "Which themes are well supported and which are thin",
          "Where studies agree or conflict",
          "Which populations and settings are missing",
          "Which methods dominate and what they cannot answer",
          "Where your study can contribute",
        ],
      },
      {
        heading: "Example entry",
        paragraphs: [
          "Author: Dela Cruz (2024). Setting: Davao del Sur public high schools. Design: quasi-experimental, 120 Grade 11 students. Finding: peer feedback improved revision quality but not grammar accuracy. Limitation: one division, one semester. Relevance: supports your intervention but leaves grammar as a gap.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I use a synthesis matrix for a qualitative study?",
        a: "Yes. Replace numeric columns with themes, participant quotes and analytic notes. The goal is still to compare sources by idea.",
      },
      {
        q: "Do I submit the matrix to my adviser?",
        a: "Often yes, as an appendix or progress requirement. Even when it is not required, it makes writing faster and feedback more specific.",
      },
    ],
    related: ["rrl-synthesis-matrix-example", "how-to-organize-rrl-by-theme", "rrl-note-taking-template"],
    searches: [
      { label: "Find studies to matrix", query: "peer feedback writing revision" },
      { label: "Find local studies", query: "peer feedback writing Philippines", localOnly: true },
      { label: "Find method examples", query: "quasi experimental peer feedback writing" },
    ],
  },
  {
    slug: "rrl-synthesis-matrix-example",
    title: "RRL Synthesis Matrix Example: From Table to Paragraph",
    description:
      "See a worked RRL synthesis matrix example and how to turn grouped sources into a synthesis paragraph that compares findings, contexts and gaps.",
    keywords: ["RRL synthesis matrix example", "synthesis matrix sample", "literature synthesis example", "RRL table example"],
    category: "Writing & citations",
    updated: UPDATED,
    intro: [
      "A matrix only helps if you can turn it into prose. This worked example shows how three related studies become one synthesized paragraph.",
      "Use the structure as a model, not as text to copy. Your own findings and sources must drive the content.",
    ],
    sections: [
      {
        heading: "The example sources",
        bullets: [
          "Study A (2021, Philippines): peer feedback improved essay revision among Grade 11 students in one division.",
          "Study B (2022, Indonesia): written feedback improved grammar accuracy in a large urban sample.",
          "Study C (2023, Philippines): teacher feedback was limited by class size in rural schools.",
        ],
      },
      {
        heading: "The grouped pattern",
        paragraphs: [
          "All three studies agree that feedback can improve writing, but they measure different outcomes and operate in different contexts. Study A focuses on revision quality; Study B on grammar; Study C explains why feedback is uneven in rural settings.",
          "The gap appears at the intersection: little evidence tests a feedback approach in large rural Philippine classes while measuring both revision quality and grammar accuracy.",
        ],
      },
      {
        heading: "The synthesis paragraph",
        paragraphs: [
          "Recent studies show that feedback can improve student writing, although the measured outcomes vary. In a Philippine division, peer feedback improved revision quality among Grade 11 students (Study A, 2021), while a larger Indonesian study linked written feedback to grammar gains (Study B, 2022). A separate Philippine study found that teacher feedback was constrained by class size in rural schools (Study C, 2023). Together, these findings suggest that feedback works, but its effect depends on context and outcome. Few studies test a structured feedback cycle in large rural Philippine classes while measuring both revision quality and grammar accuracy.",
        ],
      },
      {
        heading: "Why this is synthesis, not summary",
        paragraphs: [
          "The paragraph does not spend one sentence per study. It states a claim, compares evidence, notes a contextual limitation and ends with a gap.",
          "That is the pattern your panel wants to see throughout Chapter 2.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I use this paragraph in my thesis?",
        a: "No. It is an illustration. Replace the sources and findings with your own, and write the paragraph in your own words.",
      },
      {
        q: "What if my sources disagree completely?",
        a: "Say so. A contradiction is a finding, not a problem. Explain possible reasons: sample, method, setting or measurement.",
      },
    ],
    related: ["synthesis-matrix-template", "how-to-organize-rrl-by-theme", "avoid-plagiarism-rrl"],
    searches: [
      { label: "Find feedback studies", query: "peer feedback writing revision" },
      { label: "Find rural education studies", query: "rural classroom feedback class size" },
      { label: "Find local studies", query: "feedback writing Philippines", localOnly: true },
    ],
  },
  {
    slug: "apa-citation-generator-thesis",
    title: "APA Citation Generator for Thesis: How to Use It Correctly",
    description:
      "Learn how to use an APA citation generator for thesis references without trusting it blindly. Covers authors, dates, DOIs, hanging indents, and common APA 7 mistakes.",
    keywords: ["APA citation generator thesis", "APA 7 citation generator", "thesis reference generator", "APA format Philippines"],
    category: "Writing & citations",
    updated: UPDATED,
    intro: [
      "A citation generator saves time, but it does not know your source as well as you do. The safest workflow is to generate a draft, then check every field against the original record.",
      "This guide covers what to verify in APA 7, especially for thesis students in the Philippines.",
    ],
    sections: [
      {
        heading: "What to check on every generated reference",
        bullets: [
          "Author names and order",
          "Year of publication",
          "Title capitalization and punctuation",
          "Journal, book or publisher name",
          "Volume, issue and page range",
          "DOI or stable URL",
          "Hanging indent and alphabetical order",
        ],
      },
      {
        heading: "Common APA 7 mistakes",
        paragraphs: [
          "APA 7 uses sentence case for article titles but title case for journal names. It italicizes journal names and volume numbers, not article titles.",
          "For theses, include the type of thesis, the institution and the repository or database. Do not treat a thesis as a journal article.",
        ],
      },
      {
        heading: "DOIs and URLs",
        paragraphs: [
          "Use a DOI when one exists. Present it as a full https://doi.org/ link. If there is no DOI, use a stable URL only when the source is freely available online.",
          "Do not add a retrieval date unless the source is designed to change over time, such as a wiki or a live dashboard.",
        ],
      },
      {
        heading: "Final manual check",
        paragraphs: [
          "Sort the reference list alphabetically by author surname. Check that every in-text citation matches a reference and vice versa.",
          "Run one final pass with your school's style guide. Department templates sometimes modify spacing, font or heading rules.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is a citation generator accurate?",
        a: "Usually for common fields, but it can misread authors, dates and titles. Always compare the output with the source record.",
      },
      {
        q: "Can I generate citations for a whole library?",
        a: "Yes. Thesisweb can export your saved library in APA, MLA, IEEE, Chicago, BibTeX or RIS, but verify the output before submission.",
      },
    ],
    related: ["apa-7-rrl-format", "how-to-cite-thesis-apa", "avoid-plagiarism-rrl"],
    searches: [
      { label: "Find APA examples", query: "APA 7 journal article citation" },
      { label: "Find thesis citation examples", query: "APA thesis citation format" },
      { label: "Find sources to cite", query: "teacher feedback writing performance" },
    ],
  },
  {
    slug: "apa-7-rrl-format",
    title: "APA 7 Format for RRL: In-Text Citations and Reference List",
    description:
      "A concise APA 7 guide for RRL: how to cite one, two and three or more authors, how to quote, how to format the reference list, and how to avoid common mistakes.",
    keywords: ["APA 7 RRL format", "APA in-text citation", "APA reference list thesis", "APA 7 guide Philippines"],
    category: "Writing & citations",
    updated: UPDATED,
    intro: [
      "APA 7 is one of the most common citation styles in Philippine colleges. The basic rules are simple, but small errors in author order, punctuation and italics add up.",
      "This guide focuses on the parts that appear most often in an RRL.",
    ],
    sections: [
      {
        heading: "In-text citation basics",
        bullets: [
          "One author: (Dela Cruz, 2024) or Dela Cruz (2024)",
          "Two authors: (Dela Cruz & Santos, 2024)",
          "Three or more authors: (Dela Cruz et al., 2024)",
          "Direct quotation: add a page number, e.g. (Dela Cruz, 2024, p. 15)",
        ],
      },
      {
        heading: "Reference list format",
        paragraphs: [
          "List references alphabetically by the first author's surname. Use a hanging indent of 0.5 inch and double spacing if your manual requires it.",
          "For a journal article: Author, A. A., & Author, B. B. (Year). Title of article. Journal Name, volume(issue), pages. https://doi.org/xxxx",
        ],
      },
      {
        heading: "Theses and unpublished works",
        paragraphs: [
          "For a thesis: Author, A. A. (Year). Title of thesis [Master's thesis, University Name]. Repository or database. URL",
          "If the thesis is unpublished and not in a repository, state that it is an unpublished thesis and give the institution.",
        ],
      },
      {
        heading: "Common errors to fix",
        bullets: [
          "Using title case for article titles",
          "Forgetting to italicize journal names and volume numbers",
          "Listing authors in the wrong order",
          "Putting a period after a DOI",
          "Citing a secondary source as if you read the original",
        ],
      },
    ],
    faqs: [
      {
        q: "Do I need page numbers for paraphrases?",
        a: "APA encourages page numbers for direct quotations. For paraphrase, a page number is optional but can help readers locate the passage.",
      },
      {
        q: "How do I cite a source with no date?",
        a: "Use (n.d.) in place of the year, for example (Dela Cruz, n.d.).",
      },
    ],
    related: ["apa-citation-generator-thesis", "how-to-cite-thesis-apa", "how-to-write-rrl"],
    searches: [
      { label: "Find citable studies", query: "academic writing feedback" },
      { label: "Find local studies", query: "academic writing feedback Philippines", localOnly: true },
      { label: "Find citation examples", query: "APA 7 reference examples" },
    ],
  },
  {
    slug: "how-to-cite-thesis-apa",
    title: "How to Cite a Thesis in APA 7 (With Examples)",
    description:
      "Step-by-step APA 7 examples for citing undergraduate theses, master's theses, doctoral dissertations and unpublished works, including in-text and reference list formats.",
    keywords: ["how to cite a thesis in APA", "APA thesis citation", "cite dissertation APA 7", "unpublished thesis APA"],
    category: "Writing & citations",
    updated: UPDATED,
    intro: [
      "Theses are common sources in Philippine RRL, especially local studies. APA 7 treats them differently from journal articles, so the reference needs the type of thesis and the institution.",
      "Use the examples below as templates, then check the exact record for the author, year, title and repository.",
    ],
    sections: [
      {
        heading: "Published or repository thesis",
        paragraphs: [
          "Format: Author, A. A. (Year). Title of thesis [Master's thesis, University Name]. Repository Name. URL",
          "Example: Santos, M. L. (2024). Peer feedback and revision quality in senior high school writing [Master's thesis, University of the Philippines Diliman]. UP Diliman Repository. https://example.org/record",
        ],
      },
      {
        heading: "Unpublished thesis",
        paragraphs: [
          "Format: Author, A. A. (Year). Title of thesis [Unpublished master's thesis]. University Name.",
          "Use this only when the thesis is not available in a repository or database.",
        ],
      },
      {
        heading: "In-text citation",
        paragraphs: [
          "Use the author's surname and year, just like any other source: (Santos, 2024) or Santos (2024).",
          "If you quote directly, add the page number from the thesis.",
        ],
      },
      {
        heading: "What to verify",
        bullets: [
          "The degree type (bachelor's, master's, doctoral)",
          "The exact institution name",
          "The repository or database name",
          "Whether the thesis is published, unpublished or embargoed",
          "The stable URL or DOI",
        ],
      },
    ],
    faqs: [
      {
        q: "Is a thesis italicized in APA 7?",
        a: "Yes, the title of the thesis is italicized in the reference list. The bracketed description is not italicized.",
      },
      {
        q: "How do I cite a thesis I found in a database?",
        a: "Name the database or repository in the reference and include the URL. If the database is proprietary, the URL may be omitted when it requires login.",
      },
    ],
    related: ["apa-7-rrl-format", "apa-citation-generator-thesis", "how-to-find-local-studies-philippines"],
    searches: [
      { label: "Find theses to cite", query: "reading comprehension thesis" },
      { label: "Find Philippine theses", query: "reading comprehension thesis", localOnly: true },
      { label: "Find dissertation examples", query: "dissertation reading comprehension" },
    ],
  },
  {
    slug: "avoid-plagiarism-rrl",
    title: "How to Avoid Plagiarism in Your RRL",
    description:
      "Learn the difference between copying, patchwriting and real synthesis, and use a practical note-taking and citation workflow to keep your Chapter 2 RRL original.",
    keywords: ["avoid plagiarism RRL", "plagiarism in literature review", "how to paraphrase thesis", "RRL copying abstract"],
    category: "Writing & citations",
    updated: UPDATED,
    intro: [
      "Most RRL plagiarism is not intentional theft. It is patchwriting: copying phrases from sources and changing a few words. Panels and plagiarism detectors catch it quickly.",
      "The fix is a workflow that separates reading, note-taking and writing.",
    ],
    sections: [
      {
        heading: "Read first, write later",
        paragraphs: [
          "Read the source and close the PDF before writing your note. If you write with the source open, you are more likely to copy its sentence structure.",
          "Write the finding in your own words, then check the source again for accuracy.",
        ],
      },
      {
        heading: "Take notes with citations",
        paragraphs: [
          "Every note should include the author, year, page or section, and a short summary. If you copy a direct quotation, put it in quotation marks immediately.",
          "Use a synthesis matrix so notes are tied to themes, not just stored as isolated summaries.",
        ],
      },
      {
        heading: "Paraphrase at the idea level",
        paragraphs: [
          "A real paraphrase changes the sentence structure and vocabulary while keeping the meaning. Replacing synonyms is not enough.",
          "If the original wording is important, quote it and cite the page. Otherwise, explain the idea in your own voice.",
        ],
      },
      {
        heading: "Check before submission",
        bullets: [
          "Search your draft for long strings of words from each source",
          "Confirm every direct quotation has quotation marks and a citation",
          "Confirm every paraphrase has an in-text citation",
          "Run your school's plagiarism checker if available",
          "Ask a classmate to point out sentences that sound different from your usual style",
        ],
      },
    ],
    faqs: [
      {
        q: "Is copying an abstract plagiarism?",
        a: "Yes, unless you quote it and cite it. Even then, an abstract is the authors' summary, not your synthesis. Write your own explanation.",
      },
      {
        q: "Can I reuse my own previous paper?",
        a: "Ask your instructor. Reusing your own work without disclosure can be self-plagiarism under many academic integrity policies.",
      },
    ],
    related: ["how-to-write-rrl", "synthesis-matrix-template", "rrl-note-taking-template"],
    searches: [
      { label: "Find sources to paraphrase", query: "reading comprehension strategies" },
      { label: "Find local sources", query: "reading comprehension Philippines", localOnly: true },
      { label: "Find synthesis examples", query: "literature synthesis writing" },
    ],
  },
  {
    slug: "rrl-note-taking-template",
    title: "RRL Note-Taking Template: What to Record for Every Source",
    description:
      "A practical note-taking template for RRL sources: citation details, method, sample, findings, limitations, useful quotes and how the study connects to your research gap.",
    keywords: ["RRL note taking template", "research notes template", "literature notes example", "thesis source notes"],
    category: "Writing & citations",
    updated: UPDATED,
    intro: [
      "Good notes save you from rereading the same paper five times. They also make it harder to plagiarize, because you write the idea in your own words the first time.",
      "Use one consistent template for every source, whether it is a journal article, thesis or report.",
    ],
    sections: [
      {
        heading: "The template",
        bullets: [
          "Full citation in your required style",
          "DOI, URL or repository record",
          "Research question or purpose",
          "Design, sample and setting",
          "Variables or themes",
          "Key findings (2–4 bullets)",
          "Limitations stated by the authors",
          "One short quote with page number, if useful",
          "How it connects to your study",
          "Theme or RRL section where it belongs",
        ],
      },
      {
        heading: "Write notes in your own words",
        paragraphs: [
          "Summarize the finding without looking at the source sentence. Then verify the meaning against the source.",
          "If you need the exact wording, copy it into a clearly marked quotation field. Never mix copied text with your own notes.",
        ],
      },
      {
        heading: "Link notes to themes",
        paragraphs: [
          "Tag each note with a theme from your outline. When you are ready to write, open all notes for one theme and look for patterns.",
          "This is faster than searching a folder of PDFs and trying to remember which paper said what.",
        ],
      },
      {
        heading: "Review before writing",
        paragraphs: [
          "Read your notes for a theme and highlight agreements, conflicts and missing contexts. That highlight is your synthesis.",
          "Then write the paragraph without opening the PDFs. Use the notes only, and verify citations afterward.",
        ],
      },
    ],
    faqs: [
      {
        q: "Should I take notes by hand or digitally?",
        a: "Either works if the notes are consistent and searchable. Digital notes are easier to tag by theme and reuse in a synthesis matrix.",
      },
      {
        q: "How long should one note be?",
        a: "Short enough to scan: citation details plus a few bullets. The goal is to capture what you need to compare, not to rewrite the paper.",
      },
    ],
    related: ["synthesis-matrix-template", "avoid-plagiarism-rrl", "how-to-organize-rrl-by-theme"],
    searches: [
      { label: "Find sources to note", query: "formative assessment student learning" },
      { label: "Find local sources", query: "formative assessment Philippines", localOnly: true },
      { label: "Find review articles", query: "formative assessment systematic review" },
    ],
  },
  {
    slug: "rrl-for-quantitative-research",
    title: "RRL for Quantitative Research: What to Include",
    description:
      "Build a quantitative RRL around variables, hypotheses, measurement and prior findings. Learn how to use theory, define constructs and justify your method.",
    keywords: ["RRL for quantitative research", "quantitative thesis RRL", "variables literature review", "hypothesis justification"],
    category: "Research types",
    updated: UPDATED,
    intro: [
      "A quantitative RRL should make your variables and hypotheses feel inevitable. Every construct needs a definition, prior evidence and a reason to be measured the way you plan to measure it.",
      "It is less about broad commentary and more about comparable empirical studies.",
    ],
    sections: [
      {
        heading: "Organize by variable and relationship",
        paragraphs: [
          "Use one theme per variable or relationship: independent variable, dependent variable, mediating or moderating factors, and control variables.",
          "For each relationship, summarize what prior studies found, how strong the evidence is, and where results disagree.",
        ],
      },
      {
        heading: "Define and operationalize constructs",
        paragraphs: [
          "Cite how previous studies defined each construct and which instrument they used. If you adopt a scale, cite its validation study and any Philippine adaptation.",
          "Explain why your measure fits your population. A scale validated on Western college students may need adaptation for Philippine senior high school learners.",
        ],
      },
      {
        heading: "Use theory to justify hypotheses",
        paragraphs: [
          "Theory explains why a relationship should exist. Place it before the empirical studies so the hypotheses follow logically.",
          "Do not list a theory and then ignore it. Connect each hypothesis to a theoretical mechanism.",
        ],
      },
      {
        heading: "Report the evidence honestly",
        bullets: [
          "Note sample sizes and settings",
          "Distinguish correlation from causation",
          "Mention effect sizes when available",
          "Flag studies with weak designs",
          "Explain conflicting findings instead of hiding them",
        ],
      },
    ],
    faqs: [
      {
        q: "Do I need hypotheses in Chapter 2?",
        a: "Often yes, but placement varies. Some programs put hypotheses at the end of Chapter 1 or Chapter 2. Follow your manual.",
      },
      {
        q: "Can I use qualitative studies in a quantitative RRL?",
        a: "Yes, for definitions and context, but prioritize quantitative evidence when justifying measurable relationships.",
      },
    ],
    related: ["rrl-for-qualitative-research", "how-to-write-rrl", "how-many-related-studies"],
    searches: [
      { label: "Find quantitative studies", query: "self-efficacy academic achievement correlation" },
      { label: "Find local quantitative studies", query: "self-efficacy academic achievement Philippines", localOnly: true },
      { label: "Find scale validation studies", query: "academic self-efficacy scale validation" },
    ],
  },
  {
    slug: "rrl-for-qualitative-research",
    title: "RRL for Qualitative Research: Themes, Context and Theory",
    description:
      "A qualitative RRL guide: organize literature by themes and contexts, use theory sensitively, justify your qualitative design, and connect findings to your research questions.",
    keywords: ["RRL for qualitative research", "qualitative thesis RRL", "phenomenology RRL", "case study literature review"],
    category: "Research types",
    updated: UPDATED,
    intro: [
      "A qualitative RRL should deepen your understanding of the phenomenon, not force it into a hypothesis. Themes, context and participant perspectives matter more than counting studies.",
      "The goal is to show what is known about the experience, setting or process you plan to study, and where that knowledge is thin.",
    ],
    sections: [
      {
        heading: "Organize by experience and context",
        paragraphs: [
          "Group studies by the aspect of the phenomenon they illuminate: meanings, processes, barriers, coping strategies, relationships or institutional context.",
          "For phenomenology, prioritize studies of lived experience. For case study, prioritize studies of similar cases and settings.",
        ],
      },
      {
        heading: "Use theory as a lens, not a cage",
        paragraphs: [
          "Theory can sensitize you to important concepts without determining your findings. Explain how you will use it and remain open to unexpected themes.",
          "Avoid overquoting theory at the expense of empirical studies from your field.",
        ],
      },
      {
        heading: "Justify the qualitative gap",
        paragraphs: [
          "A qualitative gap often concerns missing voices, unexplored processes or context-dependent experiences that surveys cannot capture.",
          "State why interviews, focus groups, observations or document analysis are needed instead of another survey.",
        ],
      },
      {
        heading: "Quality signals to notice",
        bullets: [
          "Clear participant selection and setting",
          "Rich description and illustrative quotes",
          "Researcher reflexivity and ethical procedures",
          "Triangulation or member checking",
          "Limitations that acknowledge transferability rather than statistical generalization",
        ],
      },
    ],
    faqs: [
      {
        q: "How many sources for a qualitative RRL?",
        a: "Enough to cover the key themes and contexts, often 20–40 for an undergraduate thesis. Depth matters more than a large count.",
      },
      {
        q: "Can I use quantitative studies in a qualitative RRL?",
        a: "Yes, for context and prevalence, but explain what they cannot tell you about meaning and experience.",
      },
    ],
    related: ["rrl-for-quantitative-research", "how-to-write-rrl", "how-to-organize-rrl-by-theme"],
    searches: [
      { label: "Find qualitative studies", query: "teacher lived experiences inclusive education" },
      { label: "Find local qualitative studies", query: "teacher experiences inclusive education Philippines", localOnly: true },
      { label: "Find phenomenology examples", query: "phenomenology teacher experiences" },
    ],
  },
  {
    slug: "rrl-for-action-research",
    title: "RRL for Action Research and DepEd Classroom Studies",
    description:
      "Write an action research RRL that justifies a classroom intervention, uses local evidence, respects teacher workload, and connects the literature to your reflection cycle.",
    keywords: ["RRL for action research", "DepEd action research RRL", "classroom action research literature", "teacher action research"],
    category: "Research types",
    updated: UPDATED,
    intro: [
      "Action research is practical and cyclical. Your RRL should justify the intervention, show that it is feasible in your classroom, and connect to the reflection and evaluation stages of your cycle.",
      "It does not need to mimic a large-scale thesis, but it still needs credible sources and honest claims.",
    ],
    sections: [
      {
        heading: "Start with the classroom problem",
        paragraphs: [
          "Describe the local problem with evidence: assessment results, attendance, observed behavior or learner feedback. Then show what research says about similar problems.",
          "The gap is often contextual: an intervention works elsewhere, but has not been tested with your learners or your constraints.",
        ],
      },
      {
        heading: "Justify the intervention",
        paragraphs: [
          "Use studies that explain why the strategy should work. Include practical details such as duration, materials, group size and teacher training.",
          "Cite both successful and mixed results. Panels trust a balanced review more than a one-sided sales pitch.",
        ],
      },
      {
        heading: "Include local and policy context",
        paragraphs: [
          "Connect the study to DepEd priorities, school improvement plans or existing classroom practices. Local studies and official reports help.",
          "Explain how the intervention fits your workload and schedule. Feasibility is part of rigor in action research.",
        ],
      },
      {
        heading: "Plan the reflection link",
        paragraphs: [
          "Your RRL should set up the indicators you will observe during the action cycle. If the literature says a strategy improves engagement, define what engagement will look like in your class.",
          "At the end of the cycle, return to these sources in your reflection and discuss whether your results agree.",
        ],
      },
    ],
    faqs: [
      {
        q: "How long should an action research RRL be?",
        a: "Usually shorter than a thesis Chapter 2. Focus on the intervention, the local problem and the indicators you will observe.",
      },
      {
        q: "Do I need foreign studies?",
        a: "Local studies are often more useful for classroom context, but foreign studies can justify the intervention and show its evidence base.",
      },
    ],
    related: ["rrl-for-qualitative-research", "how-to-find-research-gap", "how-to-write-rrl"],
    searches: [
      { label: "Find classroom interventions", query: "peer tutoring reading fluency" },
      { label: "Find local action research", query: "peer tutoring reading Philippines", localOnly: true },
      { label: "Find DepEd-related studies", query: "reading intervention elementary Philippines", localOnly: true },
    ],
  },
  {
    slug: "rrl-for-capstone-projects",
    title: "RRL for IT Capstone Projects: A Practical Guide",
    description:
      "Write an RRL for an IT or computer science capstone: justify the problem, compare existing systems, review methods and technologies, and cite papers, patents and standards.",
    keywords: ["RRL for capstone", "IT capstone RRL", "computer science capstone literature", "system development RRL"],
    category: "Research types",
    updated: UPDATED,
    intro: [
      "A capstone RRL has to do two jobs: justify the real-world problem and justify your technical choices. That means reviewing both the domain literature and the computing literature.",
      "Panels want to see that you are not rebuilding an existing system without reason.",
    ],
    sections: [
      {
        heading: "Review the problem domain",
        paragraphs: [
          "Find studies or reports about the process you are improving: enrollment, inventory, attendance, health records, disaster response, learning analytics or whatever your system addresses.",
          "Show the cost of the current process, the error rate, the delay or the user pain. That evidence justifies the system.",
        ],
      },
      {
        heading: "Compare existing systems",
        paragraphs: [
          "Review similar systems, apps or studies. Compare features, platform, users, limitations and evaluation methods.",
          "The gap can be a missing feature, a local context, an accessibility issue, an offline requirement or a better algorithm.",
        ],
      },
      {
        heading: "Justify methods and technologies",
        paragraphs: [
          "Cite the algorithm, framework or architecture you use and explain why it fits. A citation is not decoration; it should explain a design decision.",
          "Include security and privacy literature when your system handles personal data.",
        ],
      },
      {
        heading: "Use patents, standards and code papers",
        bullets: [
          "IEEE Xplore for engineering and computing papers",
          "arXiv and OpenReview for recent methods and preprint discussion",
          "Papers with Code for benchmarks and implementations",
          "Google Patents for existing inventions",
          "NIST and NVD for security standards and vulnerabilities",
          "Philippine journals for local system studies",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I cite GitHub repositories?",
        a: "Use them as implementation references, not as peer-reviewed evidence. Cite the paper or documentation when possible.",
      },
      {
        q: "How do I prove my system is novel?",
        a: "Compare existing systems feature by feature and show a specific gap in context, users, data, offline access, security or evaluation. Novelty does not require inventing a new algorithm.",
      },
    ],
    related: ["rrl-for-quantitative-research", "free-rrl-databases-philippines", "how-to-find-research-gap"],
    searches: [
      { label: "Find capstone-related papers", query: "web based attendance system" },
      { label: "Find local system studies", query: "web based system Philippines", localOnly: true },
      { label: "Find security papers", query: "SQL injection prevention web application" },
    ],
  },
];

export const GUIDE_BY_SLUG: Record<string, Guide> = Object.fromEntries(GUIDES.map((g) => [g.slug, g]));

export const GUIDE_CATEGORIES: GuideCategory[] = ["RRL basics", "Philippines", "Writing & citations", "Research types"];

export function guidesByCategory(category: GuideCategory): Guide[] {
  return GUIDES.filter((g) => g.category === category);
}

export function relatedGuides(guide: Guide): Guide[] {
  return guide.related.map((slug) => GUIDE_BY_SLUG[slug]).filter(Boolean);
}
