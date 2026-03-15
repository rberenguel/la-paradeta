import createFilter from "./filter.js";

const ICONOIRS = ["github", "play", "video", "use", "example", "demo"];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("title-info-icon").addEventListener("click", () => {
    document.getElementById("title-translation").classList.toggle("visible");
  });

  const cardGrid = document.getElementById("card-grid");
  const tagColors = [
    { bg: "#bb9af7", text: "#1a1b26" },
    { bg: "#7dcfff", text: "#1a1b26" },
    { bg: "#73daca", text: "#1a1b26" },
    { bg: "#9ece6a", text: "#1a1b26" },
    { bg: "#e0af68", text: "#1a1b26" },
    { bg: "#414868", text: "#c0caf5" },
    { bg: "#ff9e64", text: "#1a1b26" },
    { bg: "#f7768e", text: "#1a1b26" },
    { bg: "#c0caf5", text: "#1a1b26" },
  ];

  let allProjects = [];
  let filterInstance;
  let currentSortOrder = "shuffled"; // 'shuffled', 'asc', 'desc'
  let currentFilterText = "";

  const simpleHash = (str) => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) + hash + char) | 0;
    }
    return Math.abs(hash);
  };

  const parseBlock = (block) => {
    if (block.trim() === "") return null;
    const lines = block.trim().split("\n");
    const headerMatch = lines[0]?.match(/#\s\[(.*?)\]\((.*?)\)/);
    if (!headerMatch) return null;
    const actions = [];
    let firstDescLineIndex = 1;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === "") continue;
      const actionMatch = line.match(/^\[(.*?)\]\((.*?)\)$/);
      if (actionMatch) {
        actions.push({ text: actionMatch[1], url: actionMatch[2] });
      } else {
        firstDescLineIndex = i;
        break;
      }
      if (i === lines.length - 1) firstDescLineIndex = lines.length;
    }
    const remainingLines = lines.slice(firstDescLineIndex);
    const remainingBlock = remainingLines.join("\n");
    const firstSpecialLineIndex = remainingLines.findIndex(
      (line) => line.startsWith("![") || line.startsWith("#"),
    );
    const descriptionEndIndex =
      firstSpecialLineIndex === -1
        ? remainingLines.length
        : firstSpecialLineIndex;
    const descriptionHtml = remainingLines
      .slice(0, descriptionEndIndex)
      .map((line) => line.trim())
      .filter((line) => line)
      .map(
        (line) =>
          `<p>${line.replace(/\*(.*?)\*/g, "<strong>$1</strong>").replace(/_(.*?)_/g, "<em>$1</em>")}</p>`,
      )
      .join("");
    const imageMatch = remainingBlock.match(/!\[(.*?)\]\((.*?)\)/);
    const blockLines = remainingBlock.split("\n");
    let tagMatches = [];
    blockLines.map(
      (b) => (tagMatches = tagMatches.concat(b.match(/^#([\.a-zA-Z0-9_-]+)/g))),
    );
    tagMatches = tagMatches.filter(Boolean);
    console.log(tagMatches);
    let tags = tagMatches
      ? tagMatches.map((t) => t.substring(1).replace(/-/g, " "))
      : [];
    tags = tags.map((t) => {
      if (t.toLowerCase().trim() === "wip") return `⚠️ ${t}`;
      if (t.toLowerCase().trim() === "rip") return `🪦 ${t}`;
      if (t.toLowerCase().trim() === "star") return `⭐️`;
      return t;
    });
    return {
      title: headerMatch[1],
      url: headerMatch[2],
      actions: actions,
      description: descriptionHtml,
      image: imageMatch && !imageMatch[1] ? imageMatch[2] : "",
      icon: imageMatch && imageMatch[1] ? imageMatch[2] : "",
      iconColor: imageMatch?.[1]?.match(/,(\#[0-9a-fA-F]+)/)?.[1] || "",
      tags: tags,
    };
  };

  const renderCards = (projects) => {
    if (!projects) return;
    cardGrid.innerHTML = projects
      .map((project) => {
        if (!project) return "";
        const imageHtml = project.image
          ? `<img src="${project.image}" alt="${project.title} logo" class="card-image">`
          : project.icon
            ? `<div class="card-image placeholder-with-icon" style="background-color:${project.iconColor || "var(--bg-color)"}"><div class="icon-x-track"><img src="${project.icon}" alt="${project.title} icon"></div></div>`
            : `<div class="card-image placeholder-image"></div>`;
        const allActions = () => {
          return project.actions
            .map((action) => {
              const icon = action.text.toLowerCase().trim().split(" ")[0];
              let iconoir = "iconoir-" + icon;
              if (!ICONOIRS.includes(icon)) {
                iconoir = "";
              }
              return `<a href="${action.url}" class="action-button ${iconoir}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${action.text}</a>`;
            })
            .join("");
        };

        return `
      <div class="card" data-title="${project.title}">
        ${imageHtml}
        <div class="card-content">
          <div class="card-header">
            <h2 class="card-title">
              <a href="${project.url}" target="_blank" rel="noopener noreferrer">${project.title}</a>
            </h2>
            <div class="card-tags">
              ${project.tags
                .map((tag_) => {
                  let tag = tag_;
                  const isNumericTag = /^\d{6}/.test(tag_.split(".")[0]);
                  const color = isNumericTag
                    ? { bg: "#666666", text: "#c0caf5" }
                    : tagColors[simpleHash(tag) % tagColors.length];
                  if (isNumericTag) {
                    tag = tag_.split(".")[0];
                  }
                  return `<span class="card-tag" style="background-color: ${color.bg}; color: ${color.text};">${tag}</span>`;
                })
                .join("")}
            </div>
          </div>
          <div class="card-description">${project.description}</div>
        </div>
        ${
          project.actions.length > 0
            ? `
        <div class="card-actions">
          ${allActions()}
        </div>`
            : ""
        }
      </div>`;
      })
      .join("");
    addTagClickHandlers();
    addTagTitles();
  };

  const findDateTag = (project) => {
    if (!project || !project.tags) return null;
    console.log(project.tags);
    return project.tags.find((tag) => /^\d{6}/.test(tag));
  };

  const updateSortURL = () => {
    const url = new URL(window.location);
    if (currentSortOrder !== "shuffled") {
      url.searchParams.set("sort", currentSortOrder);
    } else {
      url.searchParams.delete("sort");
    }
    history.replaceState({}, "", url);
  };

  const reorderAndRender = () => {
    let projectsToRender = [...allProjects];
    switch (currentSortOrder) {
      case "asc":
        projectsToRender.sort((a, b) => {
          const dateA = findDateTag(a);
          const dateB = findDateTag(b);
          console.log(dateA);
          return !dateA || !dateB
            ? 0
            : parseFloat(dateA, 10) - parseFloat(dateB, 10);
        });
        break;
      case "desc":
        projectsToRender.sort((a, b) => {
          const dateA = findDateTag(a);
          const dateB = findDateTag(b);
          console.log(dateA);
          return !dateA || !dateB
            ? 0
            : parseFloat(dateB, 10) - parseFloat(dateA, 10);
        });
        break;
      default:
        for (let i = projectsToRender.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [projectsToRender[i], projectsToRender[j]] = [
            projectsToRender[j],
            projectsToRender[i],
          ];
        }
        break;
    }
    updateSortURL();
    renderCards(projectsToRender);
    if (filterInstance && currentFilterText) {
      filterInstance.applyFilter(currentFilterText);
    }
  };

  function updateFilteredView(filteredProjects) {
    const visibleTitles = new Set(filteredProjects.map((p) => p.title));
    document.querySelectorAll(".card").forEach((card) => {
      card.style.display = visibleTitles.has(card.dataset.title)
        ? "flex"
        : "none";
    });
  }

  function showAllCards() {
    document.querySelectorAll(".card").forEach((card) => {
      card.style.display = "flex";
    });
  }

  function addTagClickHandlers() {
    document.querySelectorAll(".card-tag").forEach((tagElement) => {
      tagElement.replaceWith(tagElement.cloneNode(true));
    });
    document.querySelectorAll(".card-tag").forEach((tagElement) => {
      tagElement.addEventListener("click", (e) => {
        e.stopPropagation();
        let rawTag = e.target.textContent
          .replace(/⚠️\s/g, "")
          .replace(/🪦\s/g, "")
          .trim();
        if (rawTag === "⭐️") {
          rawTag = "star";
        }
        filterInstance.applyFilter(`#${rawTag}`);
      });
    });
  }

  function addTagTitles() {
    document.querySelectorAll(".card-tag").forEach((tagElement) => {
      if (tagElement.textContent === "pwa") {
        tagElement.title =
          "PWA: Progressive Web App (installable browser application)";
      }
    });
  }

  const main = async () => {
    try {
      const response = await fetch("projects.md");
      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);
      const markdownText = await response.text();
      const projectBlocks = markdownText.trim().split(/\n(?=#\s)/);
      allProjects = projectBlocks.map(parseBlock).filter(Boolean);

      const filterIndicator = document.createElement("div");
      filterIndicator.id = "filter-indicator";
      document.body.appendChild(filterIndicator);
      const clearButton = document.createElement("div");
      clearButton.id = "filter-clear-button";
      clearButton.innerHTML = `<span class="close-icon">&#x2715;</span><span class="filter-text-label"></span><span class="filter-count-label"></span>`;
      document.body.appendChild(clearButton);

      const mobileSearchContainer = document.createElement("div");
      mobileSearchContainer.id = "mobile-search-container";
      mobileSearchContainer.innerHTML = `<input type="text" id="mobile-search-input" placeholder="Filter projects..." />`;
      document.body.appendChild(mobileSearchContainer);
      const mobileSearchInput = document.getElementById("mobile-search-input");
      const mobileSearchButton = document.createElement("button");
      mobileSearchButton.id = "mobile-search-button";
      mobileSearchButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
      document.body.appendChild(mobileSearchButton);
      mobileSearchButton.addEventListener("click", () => {
        mobileSearchContainer.classList.toggle("visible");
        mobileSearchInput.focus();
      });
      mobileSearchInput.addEventListener("input", (e) => {
        filterInstance.applyFilter(e.target.value);
      });

      filterInstance = createFilter({
        items: allProjects,
        searchableFields: ["title", "description", "tags"],
        onFilter: (filtered, text) => {
          currentFilterText = text;
          updateFilteredView(filtered);
        },
        onClear: () => {
          currentFilterText = "";
          showAllCards();
          mobileSearchInput.value = "";
        },
        indicatorElement: filterIndicator,
        clearButtonElement: clearButton,
      });

      document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
          return;
        }
        const isAscKey = e.key === "<" || e.key === ",";
        const isDescKey = e.key === ">" || e.key === ".";
        if (isAscKey || isDescKey) {
          e.preventDefault();
          const newSortOrder = isAscKey ? "asc" : "desc";
          if (newSortOrder !== currentSortOrder) {
            currentSortOrder = newSortOrder;
            reorderAndRender();
          }
        } else {
          filterInstance.handleKeyEvent(e);
        }
      });

      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get("q");
      const sort = urlParams.get("sort");
      if (sort === "asc" || sort === "desc") {
        currentSortOrder = sort;
      }

      reorderAndRender();

      if (query) {
        filterInstance.applyFilter(query);
      }
    } catch (error) {
      console.error("Could not fetch or parse projects:", error);
      cardGrid.innerHTML = "<p>Error loading projects.</p>";
    }
  };

  main();
});
