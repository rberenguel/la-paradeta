import createFilter from "./filter.js";

document.addEventListener("DOMContentLoaded", () => {
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
    const imageMatch = remainingBlock.match(/!\[.*\]\((.*?)\)/);
    const tagMatches = remainingBlock.match(/#([a-zA-Z0-9_-]+)/g);
    let tags = tagMatches
      ? tagMatches.map((t) => t.substring(1).replace(/-/g, " "))
      : [];
    tags = tags.map((t) => {
      if (t.toLowerCase().trim() === "wip") return `⚠️ ${t}`;
      if (t.toLowerCase().trim() === "star") return `⭐️`;
      return t;
    });
    return {
      title: headerMatch[1],
      url: headerMatch[2],
      actions: actions,
      description: descriptionHtml,
      image: imageMatch?.[1] || "",
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
          : `<div class="card-image placeholder-image"></div>`;
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
                .map((tag) => {
                  const colorIndex = simpleHash(tag) % tagColors.length;
                  const color = tagColors[colorIndex];
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
          ${project.actions.map((action) => `<a href="${action.url}" class="action-button" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${action.text}</a>`).join("")}
        </div>`
            : ""
        }
      </div>`;
      })
      .join("");
    addTagClickHandlers();
  };

  // --- Filter Integration ---

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
        const tagText = e.target.textContent.replace(/⚠️\s|⭐️/g, "").trim();
        filterInstance.applyFilter(tagText);
      });
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

      for (let i = allProjects.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allProjects[i], allProjects[j]] = [allProjects[j], allProjects[i]];
      }

      renderCards(allProjects);

      // --- Create Filter UI Elements ---
      const filterIndicator = document.createElement("div");
      filterIndicator.id = "filter-indicator";
      document.body.appendChild(filterIndicator);

      const clearButton = document.createElement("div");
      clearButton.id = "filter-clear-button";
      clearButton.innerHTML = `<span class="close-icon">&#x2715;</span><span class="filter-text-label"></span>`;
      document.body.appendChild(clearButton);

      const countElement = document.createElement("div");
      countElement.id = "filter-count";
      document.body.appendChild(countElement);

      // --- Mobile Specific UI ---
      const mobileSearchContainer = document.createElement("div");
      mobileSearchContainer.id = "mobile-search-container";
      mobileSearchContainer.innerHTML = `
        <input type="text" id="mobile-search-input" placeholder="Filter projects..." />
      `;
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

      // --- Initialize Filter ---
      filterInstance = createFilter({
        items: allProjects,
        searchableFields: ["title", "description", "tags"],
        onFilter: updateFilteredView,
        onClear: () => {
          showAllCards();
          mobileSearchInput.value = ""; // Also clear mobile input
        },
        indicatorElement: filterIndicator,
        clearButtonElement: clearButton,
        countElement: countElement,
      });

      document.addEventListener("keydown", (e) =>
        filterInstance.handleKeyEvent(e),
      );
    } catch (error) {
      console.error("Could not fetch or parse projects:", error);
      cardGrid.innerHTML = "<p>Error loading projects.</p>";
    }
  };

  main();
});
