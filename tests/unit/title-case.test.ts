import { describe, expect, it } from "vitest";
import { containerCase, sentenceCase, titleCase } from "@/lib/title-case";

describe("sentenceCase (APA 7)", () => {
  it("lowercases a title-case title but keeps proper nouns", () => {
    expect(sentenceCase("Teacher Burnout in Public Schools of the Philippines")).toBe(
      "Teacher burnout in public schools of the Philippines"
    );
    expect(sentenceCase("Online Learning Readiness of Filipino Students in Davao City")).toBe(
      "Online learning readiness of Filipino students in Davao City"
    );
  });

  it("keeps acronyms, mixed-case words and the first word of a subtitle", () => {
    expect(sentenceCase("The Effect of COVID-19 on Senior High School (SHS) Students")).toBe(
      "The effect of COVID-19 on senior high school (SHS) students"
    );
    expect(sentenceCase("Using ChatGPT in Academic Writing: A Systematic Review")).toBe(
      "Using ChatGPT in academic writing: A systematic review"
    );
  });

  it("brings an all-caps thesis title down, keeping acronyms and places", () => {
    expect(sentenceCase("READING COMPREHENSION OF GRADE 10 STUDENTS IN ILOILO CITY")).toBe(
      "Reading comprehension of Grade 10 students in Iloilo City"
    );
    expect(sentenceCase("STRESS AMONG SHS TEACHERS IN CALABARZON DURING COVID-19")).toBe(
      "Stress among SHS teachers in CALABARZON during COVID-19"
    );
  });

  it("lowercases both halves of a hyphenated compound", () => {
    expect(sentenceCase("Self-Efficacy and Well-Being of Nurses")).toBe("Self-efficacy and well-being of nurses");
  });

  it("keeps a capital letter joined to a word, as in a model's name", () => {
    expect(sentenceCase("U-Net: Convolutional Networks for Biomedical Image Segmentation")).toBe(
      "U-Net: Convolutional networks for biomedical image segmentation"
    );
  });

  it("leaves a sentence-case title and a non-English title alone", () => {
    expect(sentenceCase("Teacher burnout and the Philippine K to 12 curriculum")).toBe(
      "Teacher burnout and the Philippine K to 12 curriculum"
    );
    expect(sentenceCase("Estrategias de Lectura en Estudiantes de Secundaria")).toBe(
      "Estrategias de Lectura en Estudiantes de Secundaria"
    );
  });

  it("keeps places it doesn't know when the title shows they are places", () => {
    expect(sentenceCase("Teaching Performance in Gingoog City, Philippines")).toBe("Teaching performance in Gingoog City, Philippines");
    expect(sentenceCase("Effects of Feedback in a Private School in Gumaca, Quezon")).toBe(
      "Effects of feedback in a private school in Gumaca, Quezon"
    );
  });

  it("keeps a named school but not a generic one, and an acronym but not the words it stands for", () => {
    expect(sentenceCase("RATINGS IN THE LICENSURE EXAMINATION FOR TEACHERS (LET) OF GRADUATES")).toBe(
      "Ratings in the licensure examination for teachers (LET) of graduates"
    );
    expect(sentenceCase("THE MOTIVATION OF PUPILS OF CECILIO APOSTOL ELEMENTARY SCHOOL, CALOOCAN CITY")).toBe(
      "The motivation of pupils of Cecilio Apostol Elementary School, Caloocan City"
    );
    expect(sentenceCase("Grade 10 Students of a Public High School")).toBe("Grade 10 students of a public high school");
  });

  it("knows May as a month only beside a date", () => {
    expect(sentenceCase("Newsletter 2019 May - June")).toBe("Newsletter 2019 May - June");
    expect(sentenceCase("What Students May Learn From Failure")).toBe("What students may learn from failure");
  });

  it("keeps a minor word before a year lowercase", () => {
    expect(sentenceCase("Learning Loss in 2020 and Recovery in 2021")).toBe("Learning loss in 2020 and recovery in 2021");
  });
});

describe("titleCase (MLA 9, Chicago 17)", () => {
  it("capitalises the major words and keeps the small ones lowercase", () => {
    expect(titleCase("Teacher burnout in public schools of the Philippines")).toBe(
      "Teacher Burnout in Public Schools of the Philippines"
    );
    expect(titleCase("A study of sleep and grades: an analysis")).toBe("A Study of Sleep and Grades: An Analysis");
  });

  it("capitalises the last word, compounds and keeps acronyms", () => {
    expect(titleCase("What is burnout for")).toBe("What Is Burnout For");
    expect(titleCase("self-efficacy of nurses during COVID-19")).toBe("Self-Efficacy of Nurses during COVID-19");
  });

  it("handles an all-caps title", () => {
    expect(titleCase("TEACHER BURNOUT AND COVID-19 IN THE PHILIPPINES")).toBe("Teacher Burnout and COVID-19 in the Philippines");
  });
});

describe("containerCase", () => {
  it("fixes a lowercased journal name and leaves the rest exactly", () => {
    expect(containerCase("Frontiers in psychology")).toBe("Frontiers in Psychology");
    expect(containerCase("International journal of environmental research and public health")).toBe(
      "International Journal of Environmental Research and Public Health"
    );
    for (const name of ["PLOS ONE", "eLife", "Revista de Educación", "Computers & Education", "arXiv"]) {
      expect(containerCase(name)).toBe(name);
    }
  });
});
