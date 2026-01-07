<script lang="ts">
  // data and instanceConfig are provided by the template entry (main.ts)
  export let data: any;
  export let instanceConfig: any;

  // Define the current language (can be dynamically set)
  let language = instanceConfig?.language ?? "de";

  let anonymizeProjects = instanceConfig?.anonymizeProjects ?? false;

  // Translation object
  const translations: Record<string, Record<string, string>> = {
    en: {
      profile: "Profile",
      expertise: "Expertise",
      languages: "Languages",
      skills: "Skills",
      "skills.frontend-development": "Frontend Development",
      "skills.backend-development": "Backend Development",
      "skills.programming-languages": "Programming Languages",
      "skills.devops": "DevOps",
      "skills.cloud-platforms": "Cloud Platforms",
      "skills.tools": "Tools",
      "skills.databases": "Databases",
      "skills.operating-systems": "Operating Systems",
      "skills.ides": "IDEs",
      "skills.office-software": "Office Software",
      "skills.cms": "Content Management Systems",
      devops: "DevOps",
      interests: "Interests",
      workExperience: "Work Experience",
      practicalExperience: "Practical Experience",
      caseStudies: "Case Studies",
      awards: "Awards",
      certificates: "Certificates",
      publications: "Publications",
      education: "Education",
      projects: "Selected Projects",
      score: "Score",
      industry: "Industry",
      since: "since",
      courses: "Courses",
    },
    de: {
      profile: "Profil",
      expertise: "Expertise",
      languages: "Sprachen",
      skills: "Fähigkeiten",
      "skills.frontend-development": "Frontend Development",
      "skills.backend-development": "Backend Development",
      "skills.programming-languages": "Programmiersprachen",
      "skills.devops": "DevOps",
      "skills.cloud-platforms": "Cloud Plattformen",
      "skills.tools": "Tools",
      "skills.databases": "Datenbanken",
      "skills.operating-systems": "Betriebssysteme",
      "skills.ides": "IDEs",
      "skills.office-software": "Office Programme",
      "skills.cms": "Content Management Systeme",
      interests: "Interessen",
      workExperience: "Berufserfahrung",
      practicalExperience: "Praktische Erfahrung",
      caseStudies: "Fallstudien",
      awards: "Auszeichnungen",
      certificates: "Zertifizierungen",
      publications: "Publikationen",
      education: "Studium",
      projects: "ausgewählte Referenzprojekte",
      score: "Note",
      industry: "Branche",
      since: "seit",
      courses: "Kurse & Weiterbildungen",
    },
  };

  // Helper function to get the translation
  const t = (key: string) => translations[language as string][key] || key;

  // derive project filter from instance config: includeProjects === null -> show all
  const projectFilter: number[] | null =
    instanceConfig?.includeProjects ?? null;

  const showProject = (id: number | undefined) => {
    if (!projectFilter || projectFilter.length === 0) return true;
    if (id === undefined || id === null) return false;
    return projectFilter.includes(id);
  };

  // Optional: include specific skills by their `key` using instance config
  // Example in instance config: { "includeSkills": ["frontend-development", "backend-development"] }
  const includeSkills: string[] = instanceConfig?.includeSkills ?? [];

  // Reactive filtered skills list (keeps original order)
  // Only skills whose `key` is listed in `includeSkills` will be printed.
  let filteredSkills: any[] = [];
  $: filteredSkills =
    data && Array.isArray(data.skills)
      ? includeSkills.length > 0
        ? data.skills.filter((s: any) =>
            includeSkills.includes(String(s?.key ?? "")),
          )
        : data.skills
      : [];

  let filteredCourses: any[] = [];
  $: filteredCourses =
    data && Array.isArray(data.courses)
      ? data.courses.filter((c: any) => {
          const includeCourses: string[] = instanceConfig?.includeCourses ?? [];
          if (includeCourses.length === 0) return false;
          return includeCourses.includes(String(c?.name ?? ""));
        })
      : [];

  // Optional: include specific languages by their `key` using instance config
  // Example in instance config: { "includeLanguages": ["de", "en"] }
  const includeLanguages: string[] | null =
    instanceConfig?.includeLanguages ?? null;

  // Reactive filtered languages list. If `includeLanguages` is null or not present,
  // all languages are shown. If it's an array, only languages whose `key` matches
  // an entry in the array will be printed. Falls back to `language` value if `key` missing.
  let filteredLanguages: any[] = [];
  $: filteredLanguages =
    data && Array.isArray(data.languages)
      ? includeLanguages && includeLanguages.length > 0
        ? data.languages.filter((l: any) =>
            includeLanguages.includes(String(l?.key ?? l?.language ?? "")),
          )
        : data.languages
      : [];

  // Format ISO date strings. Supported formats:
  //  - 'DMY' (default) => DD.MM.YYYY
  //  - 'MY' => MM/YYYY
  function formatDate(d: string | null | undefined, fmt: "DMY" | "MY" = "DMY") {
    if (!d) return "";
    if (typeof d !== "string") return String(d);

    // Determine current language (fall back to 'de')
    const lang =
      typeof language === "string" && language.length > 0 ? language : "de";

    // Parse date
    const parsedDate = new Date(d);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid date format: ${d}`);
    }
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");

    if (fmt === "MY") {
      if (lang === "de") return `${month}/${year}`;
      return `${parsedDate.toLocaleString("en-US", { month: "short" })} ${year}`;
    }

    if (fmt === "DMY") {
      if (lang === "de") return `${day}.${month}.${year}`;
      return `${month}/${day}/${year}`;
    }

    return d;
  }
</script>

<svelte:head>
  <title>{data?.basics?.name ? `${data.basics.name} — CV` : "cv"}</title>
</svelte:head>

<main>
  {#if data.coverHtml}
    <section
      class="cover block w-full min-h-screen m-0 px-8 py-8 break-before-always break-after-always"
    >
      {@html data.coverHtml}
    </section>
  {/if}

  <section
    class="w-full min-h-screen m-0 px-8 py-8 break-before-always break-after-always"
  >
    <section class="grid grid-cols-10 gap-2 mb-10">
      <div class="col-span-3">
        <img
          src={instanceConfig.photo}
          alt="profile"
          class="w-36 h-36 object-cover"
        />
      </div>

      <div class="col-span-7">
        <h1>{data.basics.name}</h1>
        <h2 class="text-gray-400">{data.basics.label}</h2>
        <p>{data.basics.email}</p>
        <p>{data.basics.url}</p>
        <p>{data.basics.phone}</p>
        <p>
          {data.basics.location.city}, {data.basics.location.region}, {data
            .basics.location.countryCode}
        </p>
        <p>{formatDate(data.basics.birth.date)}, {data.basics.birth.place}</p>
        {#each data.basics.profiles as profile}
          <p>
            {profile.network}: <a href={profile.url}>@{profile.username}</a>
          </p>
        {/each}
      </div>
    </section>

    <section class="mb-10">
      <h2>{t("profile")}</h2>
      <hr class="h-px my-2 bg-gray-400 border-0" />
      <p>{data.basics.summary}</p>
    </section>

    <section class="mb-10">
      <h2>{t("expertise")}</h2>
      <hr class="h-px my-2 bg-gray-400 border-0" />
      <ul class="list-bullets">
        {#each data.basics.expertise as expertise}
          <li>{expertise}</li>
        {/each}
      </ul>
    </section>

    <section class="mb-10">
      <h2>{t("workExperience")}</h2>
      <hr class="h-px my-2 bg-gray-400 border-0" />
      {#each data.work as job}
        <article class="w-full mb-4 flex flex-row">
          <div class="w-1/4 text-left whitespace-nowrap">
            {#if job.endDate === "" || job.endDate === null || job.endDate === undefined}
              <p>{t("since")} {formatDate(job.startDate, "MY")}</p>
            {:else}
              <p>
                {formatDate(job.startDate, "MY")} &ndash; {formatDate(
                  job.endDate,
                  "MY",
                )}
              </p>
            {/if}
          </div>
          <div class="w-3/4">
            <h3>{job.position}</h3>
            {#if job.name !== "" && job.location !== ""}
              <h4>{job.name}, {job.location}</h4>
            {/if}
            {#if job.highlights.length > 0}
              <ul class="list-bullets">
                {#each job.highlights as highlight}
                  <li>{highlight}</li>
                {/each}
              </ul>
            {/if}
          </div>
        </article>
      {/each}
    </section>

    <section class="mb-10">
      <h2>{t("education")}</h2>
      <hr class="h-px my-2 bg-gray-400 border-0" />
      {#each data.education as edu}
        <article class="w-full mb-4 flex flex-row">
          <div class="w-1/4 text-left whitespace-nowrap">
            {#if edu.endDate === ""}
              <p>{t("since")} {formatDate(edu.startDate, "MY")}</p>
            {:else}
              <p>
                {formatDate(edu.startDate, "MY")} &ndash; {formatDate(
                  edu.endDate,
                  "MY",
                )}
              </p>
            {/if}
          </div>
          <div class="w-3/4">
            <h3>{edu.area} {edu.studyType}</h3>
            <h4>{edu.institution}, {edu.location}</h4>
            <p>{t("score")}: {edu.score}</p>
          </div>
        </article>
      {/each}
    </section>

    <section class="mb-10">
      <h2>{t("practicalExperience")}</h2>
      <hr class="h-px my-2 bg-gray-400 border-0" />
      {#each data.practicalExperiences as prac}
        <article class="w-full mb-4 flex flex-row">
          <div class="w-1/4 text-left whitespace-nowrap">
            {#if prac.endDate === ""}
              <p>{t("since")} {formatDate(prac.startDate, "MY")}</p>
            {:else}
              <p>
                {formatDate(prac.startDate, "MY")} &ndash; {formatDate(
                  prac.endDate,
                  "MY",
                )}
              </p>
            {/if}
          </div>
          <div class="w-3/4">
            <h3>{prac.position}</h3>
            <h4>{prac.name}, {prac.location}</h4>
            {#if prac.highlights.length > 0}
              <ul class="list-bullets">
                {#each prac.highlights as highlight}
                  <li>{highlight}</li>
                {/each}
              </ul>
            {/if}
          </div>
        </article>
      {/each}
    </section>

    <section class="mb-10">
      <h2>{t("caseStudies")}</h2>
      <hr class="h-px my-2 bg-gray-400 border-0" />
      {#each data.caseStudies as caseStudy}
        <article class="w-full mb-4 flex flex-row">
          <div class="w-1/4 text-left whitespace-nowrap">
            <p>{formatDate(caseStudy.date, "DMY")}</p>
          </div>
          <div class="w-3/4">
            <h3>{caseStudy.name}</h3>
            <h4>{caseStudy.location}</h4>
            <p>{caseStudy.summary}</p>
          </div>
        </article>
      {/each}
    </section>

    <section class="mb-10">
      <h2>{t("awards")}</h2>
      <hr class="h-px my-2 bg-gray-400 border-0" />
      {#each data.awards as award}
        <article class="w-full mb-4 flex flex-row">
          <div class="w-1/4 text-left whitespace-nowrap">
            {#if award.endDate === undefined}
              <p>{formatDate(award.date, "DMY")}</p>
            {:else}
              <p>
                {formatDate(award.startDate, "MY")} &ndash; {formatDate(
                  award.endDate,
                  "MY",
                )}
              </p>
            {/if}
          </div>
          <div class="w-3/4">
            <p>{award.title}</p>
          </div>
        </article>
      {/each}
    </section>

    <section class="mb-10">
      <h2>{t("certificates")}</h2>
      <hr class="h-px my-2 bg-gray-400 border-0" />
      {#each data.certificates as cert}
        <article class="w-full mb-4 flex flex-row">
          <div class="w-1/4 text-left whitespace-nowrap">
            <p>{formatDate(cert.date, "DMY")}</p>
          </div>
          <div class="w-3/4">
            <h3>{cert.name}</h3>
            <h4>{cert.issuer}</h4>
            <p>{cert.url}</p>
          </div>
        </article>
      {/each}
    </section>

    <section class="mb-10">
      <h2>{t("publications")}</h2>
      <hr class="h-px my-2 bg-gray-400 border-0" />
      {#each data.publications as pub}
        <article class="w-full mb-4 flex flex-row">
          <div class="w-1/4 text-left whitespace-nowrap">
            <p>{formatDate(pub.releaseDate, "DMY")}</p>
          </div>
          <div class="w-3/4">
            <h3>{pub.name}</h3>
            <p>{pub.summary}</p>
          </div>
        </article>
      {/each}
    </section>

    {#if filteredCourses.length > 0}
      <section class="mb-10">
        <h2>{t("courses")}</h2>
        <hr class="h-px my-2 bg-gray-400 border-0" />
        {#each filteredCourses as course}
          <article class="w-full mb-4 flex flex-row">
            <div class="w-1/4 text-left whitespace-nowrap">
              {#if course.endDate === ""}
                <p>{t("since")} {formatDate(course.startDate, "DMY")}</p>
              {:else}
                <p>
                  {formatDate(course.startDate, "DMY")} &ndash; {formatDate(
                    course.endDate,
                    "DMY",
                  )}
                </p>
              {/if}
            </div>
            <div class="w-3/4">
              <h3>{course.name}</h3>
              <h4>{course.institution}</h4>
              <p>{course.url}</p>
            </div>
          </article>
        {/each}
      </section>
    {/if}

    <section class="mb-10">
      <h2>{t("skills")}</h2>
      <hr class="h-px my-2 bg-gray-400 border-0" />
      <article>
        <h3>{t("languages")}</h3>
        <ul class="list-flat">
          {#each filteredLanguages as lang}
            <li>{lang.language} - {lang.fluency}</li>
          {/each}
        </ul>
      </article>
      {#each filteredSkills as skill}
        <article>
          <h3>{t(`skills.${skill.key}`)}</h3>
          <p>{skill.level}</p>
          <ul class="list-inline">
            {#each skill.keywords as keyword, i}
              <li>
                {keyword}{#if i < skill.keywords.length - 1},&nbsp;{/if}
              </li>
            {/each}
          </ul>
        </article>
      {/each}
    </section>

    <section class="mb-10">
      <h2>{t("interests")}</h2>
      <hr class="h-px my-2 bg-gray-400 border-0" />
      <ul class="list-flat">
        {#each data.interests as interest}
          <li>{interest.name}: {interest.keywords.join(", ")}</li>
        {/each}
      </ul>
    </section>
  </section>

  <section class="projects block w-full m-0 px-8 py-8 break-after-always">
    <h2>{t("projects")}</h2>
    <hr class="h-px my-2 bg-gray-400 border-0" />
    {#each data.projects as project}
      {#if showProject(project.id)}
        <article class="w-full mb-4">
          <p>
            {formatDate(project.startDate, "MY")} &ndash; {formatDate(
              project.endDate,
              "MY",
            )}
          </p>
          <h3>{project.title}</h3>
          {#if anonymizeProjects}
            <h4>{project.clientAnonymized}</h4>
          {:else}
            <h4>{project.client}</h4>
          {/if}
          <p>{project.role}</p>
          <p>{project.industry}</p>
          {#if project.clientLocation}
            <p>{project.clientLocation}</p>
          {/if}
          <p>{project.name ? `${project.name}: ` : ""}{project.description}</p>
          <ul class="list-bullets">
            {#each project.highlights as highlight}
              <li>{highlight}</li>
            {/each}
          </ul>
          {#if instanceConfig.showProjectStack}
            <p>{project.stack ? project.stack.join(", ") : ""}</p>
          {/if}
        </article>
      {/if}
    {/each}
  </section>
</main>

<style>
  @page {
    margin: 0;
  }

  /* When an element is fragmented across pages, keep its padding/borders on each fragment */
  @media print {
    section,
    article {
      -webkit-box-decoration-break: clone;
      box-decoration-break: clone;
    }
  }
</style>
