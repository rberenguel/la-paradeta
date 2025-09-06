/**
 * Creates a filter controller.
 * @param {object} config - The configuration object.
 * @param {Array<object>} config.items - The full list of items to filter.
 * @param {Array<string>} config.searchableFields - Keys to search against in each item.
 * @param {function(Array<object>, string): void} config.onFilter - Callback that receives the filtered items and the search text.
 * @param {function(): void} config.onClear - Callback to run when the filter is cleared.
 * @param {HTMLElement} [config.indicatorElement] - Optional element to display the current filter text.
 * @param {HTMLElement} [config.clearButtonElement] - Optional element to clear the active filter.
 * @param {HTMLElement} [config.countElement] - Optional element to display the count of filtered items.
 */
export default function createFilter(config) {
  let searchText = "";
  let indicatorTimeout;
  let countTimeout;

  const {
    items,
    searchableFields,
    onFilter,
    onClear,
    indicatorElement,
    clearButtonElement,
    countElement,
  } = config;

  /**
   * Manages the visibility and content of the clear button using opacity transitions.
   * @private
   */
  function _updateClearButton() {
    if (!clearButtonElement) return;

    const label = clearButtonElement.querySelector(".filter-text-label");

    if (searchText) {
      if (label) label.textContent = searchText;
      clearButtonElement.style.display = "flex";
      setTimeout(() => {
        clearButtonElement.style.opacity = "1";
      }, 10);
    } else {
      clearButtonElement.style.opacity = "0";
      clearButtonElement.addEventListener(
        "transitionend",
        (event) => {
          if (
            event.propertyName === "opacity" &&
            clearButtonElement.style.opacity === "0"
          ) {
            clearButtonElement.style.display = "none";
            if (label) label.textContent = "";
          }
        },
        { once: true },
      );
    }
  }

  /**
   * Displays the current search text in the indicator element and handles its fade-out.
   * @private
   */
  function _updateIndicator() {
    if (!indicatorElement) return;

    clearTimeout(indicatorTimeout);

    if (searchText) {
      indicatorElement.textContent = searchText;
      indicatorElement.style.display = "block";

      setTimeout(() => {
        indicatorElement.style.opacity = "1";
      }, 10);

      indicatorTimeout = setTimeout(() => {
        indicatorElement.style.opacity = "0";
        indicatorElement.addEventListener(
          "transitionend",
          () => {
            if (indicatorElement.style.opacity === "0") {
              indicatorElement.style.display = "none";
            }
          },
          { once: true },
        );
      }, 1200);
    } else {
      indicatorElement.style.opacity = "0";
      indicatorElement.style.display = "none";
    }
  }

  /**
   * Displays the current item count and handles its fade-out.
   * @param {number} filteredCount - The number of items that match the filter.
   * @private
   */
  function _updateCount(filteredCount) {
    if (!countElement) return;

    clearTimeout(countTimeout);

    if (searchText) {
      countElement.textContent = `${filteredCount} / ${items.length}`;
      countElement.style.display = "block";

      setTimeout(() => {
        countElement.style.opacity = "1";
      }, 10);

      countTimeout = setTimeout(() => {
        countElement.style.opacity = "0";
        countElement.addEventListener(
          "transitionend",
          () => {
            if (countElement.style.opacity === "0") {
              countElement.style.display = "none";
            }
          },
          { once: true },
        );
      }, 1200);
    } else {
      countElement.style.opacity = "0";
      countElement.style.display = "none";
    }
  }

  /**
   * Updates the browser's URL to reflect the current search text.
   * @private
   */
  function _updateURL() {
    const url = new URL(window.location);
    if (searchText) {
      url.searchParams.set("q", searchText);
    } else {
      url.searchParams.delete("q");
    }
    history.replaceState({}, "", url);
  }

  /**
   * Performs the filtering and calls the appropriate callbacks.
   * @private
   */
  function _doFilter() {
    _updateURL();
    _updateIndicator();
    _updateClearButton();

    const trimmedText = searchText.trim();
    if (!trimmedText) {
      onClear();
      _updateCount(items.length);
      return;
    }

    const isTagSearch = trimmedText.startsWith("#");
    const query = isTagSearch ? trimmedText.substring(1) : trimmedText;
    const lowerCaseQuery = query.toLowerCase();

    if (lowerCaseQuery === "") {
      onClear();
      _updateCount(items.length);
      return;
    }

    const fieldsToSearch = isTagSearch ? ["tags"] : searchableFields;

    const filteredItems = items.filter((item) => {
      return fieldsToSearch.some((field) => {
        const value = item[field];
        if (Array.isArray(value)) {
          return value.some((element) => {
            const cleanElement = String(element)
              .replace(/⚠️\s/g, "")
              .replace(/⭐️/g, "star")
              .trim()
              .toLowerCase();
            return cleanElement.includes(lowerCaseQuery);
          });
        }
        if (typeof value === "string") {
          return value.toLowerCase().includes(lowerCaseQuery);
        }
        return false;
      });
    });

    _updateCount(filteredItems.length);
    onFilter(filteredItems, searchText);
  }

  /**
   * Programmatically applies a filter.
   * @param {string} text - The text to filter by.
   */
  function applyFilter(text) {
    searchText = text;
    _doFilter();
  }

  /**
   * Clears the current filter.
   */
  function clearFilter() {
    searchText = "";
    _doFilter();
  }

  /**
   * Handles keydown events for real-time filtering.
   * @param {KeyboardEvent} event - The keyboard event.
   */
  function handleKeyEvent(event) {
    if (
      event.target.tagName === "INPUT" ||
      event.target.tagName === "TEXTAREA"
    ) {
      return;
    }

    if (event.key === "Escape" || event.key === "Backspace") {
      event.preventDefault();
    }

    if (event.key === "Backspace") {
      searchText = searchText.slice(0, -1);
    } else if (event.key === "Escape") {
      searchText = "";
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      searchText += event.key;
    } else {
      return;
    }

    _doFilter();
  }

  // --- Initialization ---
  if (clearButtonElement) {
    clearButtonElement.addEventListener("click", clearFilter);
  }

  return {
    applyFilter,
    clearFilter,
    handleKeyEvent,
  };
}
