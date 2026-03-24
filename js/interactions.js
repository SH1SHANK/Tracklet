import { DESTINATIONS, MODES } from "./data.js";
import { elements } from "./dom.js";

export const setupInteractions = ({
  onApplyRoute,
  onHistoryRoute,
  onModeSelect,
  onThemeChange,
}) => {
  let currentItems = [];
  let activeIndex = -1;

  const closeAutocomplete = () => {
    if (!elements.autocompleteList || !elements.destinationInput) return;
    elements.autocompleteList.classList.add("hidden");
    elements.autocompleteList.innerHTML = "";
    elements.autocompleteList.setAttribute("aria-expanded", "false");
    elements.destinationInput.setAttribute("aria-expanded", "false");
    elements.destinationInput.removeAttribute("aria-activedescendant");
    currentItems = [];
    activeIndex = -1;
  };

  const setActiveAutocomplete = (index) => {
    if (!elements.autocompleteList || !elements.destinationInput) return;
    const items = Array.from(
      elements.autocompleteList.querySelectorAll("[role='option']"),
    );
    if (!items.length) return;

    activeIndex = ((index % items.length) + items.length) % items.length;
    items.forEach((item, itemIndex) => {
      item.classList.toggle("bg-primary", itemIndex === activeIndex);
      item.classList.toggle("text-black", itemIndex === activeIndex);
      item.classList.toggle("font-bold", itemIndex === activeIndex);
      item.setAttribute(
        "aria-selected",
        itemIndex === activeIndex ? "true" : "false",
      );
    });
    elements.destinationInput.setAttribute(
      "aria-activedescendant",
      items[activeIndex].id,
    );
  };

  const openAutocomplete = (items) => {
    if (!elements.autocompleteList || !elements.destinationInput) return;
    elements.autocompleteList.innerHTML = "";
    currentItems = items;
    activeIndex = -1;

    if (!items.length) {
      closeAutocomplete();
      return;
    }

    items.forEach((item, index) => {
      const option = document.createElement("li");
      option.id = `autocomplete-item-${index}`;
      option.textContent = item;
      option.className =
        "px-3 py-2 font-mono text-[11px] uppercase cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-primary hover:text-black transition-colors";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.addEventListener("mousemove", () => setActiveAutocomplete(index));
      option.addEventListener("mousedown", (event) => {
        event.preventDefault();
        elements.destinationInput.value = item;
        closeAutocomplete();
        onApplyRoute();
      });
      elements.autocompleteList.appendChild(option);
    });

    elements.autocompleteList.classList.remove("hidden");
    elements.autocompleteList.setAttribute("aria-expanded", "true");
    elements.destinationInput.setAttribute("aria-expanded", "true");
  };

  if (elements.destinationInput) {
    elements.destinationInput.setAttribute("autocomplete", "off");
    elements.destinationInput.setAttribute("role", "combobox");
    elements.destinationInput.setAttribute("aria-autocomplete", "list");
    elements.destinationInput.setAttribute("aria-controls", "autocomplete-list");
    elements.destinationInput.setAttribute("aria-expanded", "false");

    elements.destinationInput.addEventListener("input", () => {
      const query = elements.destinationInput.value.trim().toLowerCase();
      if (!query) {
        closeAutocomplete();
        return;
      }
      const matches = DESTINATIONS.filter((destination) =>
        destination.toLowerCase().includes(query),
      ).slice(0, 6);
      openAutocomplete(matches);
    });

    elements.destinationInput.addEventListener("keydown", (event) => {
      const open = !elements.autocompleteList?.classList.contains("hidden");

      if (event.key === "Escape") {
        closeAutocomplete();
        return;
      }

      if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        const query = elements.destinationInput.value.trim().toLowerCase();
        const matches = DESTINATIONS.filter((destination) =>
          destination.toLowerCase().includes(query),
        ).slice(0, 6);
        openAutocomplete(matches);
      }

      if (event.key === "ArrowDown" && currentItems.length) {
        event.preventDefault();
        setActiveAutocomplete(activeIndex + 1);
        return;
      }
      if (event.key === "ArrowUp" && currentItems.length) {
        event.preventDefault();
        setActiveAutocomplete(activeIndex - 1);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (currentItems.length) {
          elements.destinationInput.value =
            currentItems[activeIndex >= 0 ? activeIndex : 0];
          closeAutocomplete();
        }
        onApplyRoute();
      }
    });

    elements.destinationInput.addEventListener("blur", () => {
      window.setTimeout(closeAutocomplete, 120);
    });
  }

  document.addEventListener("pointerdown", (event) => {
    if (!elements.destinationInput || !elements.autocompleteList) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (
      !elements.destinationInput.closest(".relative")?.contains(target) &&
      !elements.autocompleteList.contains(target)
    ) {
      closeAutocomplete();
    }
  });

  elements.goButton?.addEventListener("click", () => onApplyRoute());
  elements.originSelect?.addEventListener("change", () => onApplyRoute());

  elements.historyChips?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("[data-history-destination]");
    if (!(button instanceof HTMLElement)) return;
    const destination = button.dataset.historyDestination;
    if (!destination || !elements.destinationInput) return;
    elements.destinationInput.value = destination;
    onHistoryRoute(destination);
  });

  if (elements.optionsGrid) {
    elements.optionsGrid.setAttribute("role", "radiogroup");
    elements.optionsGrid.setAttribute("tabindex", "0");
    elements.optionsGrid.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const card = event.target.closest("[data-mode]");
      if (!(card instanceof HTMLElement)) return;
      const mode = card.dataset.mode;
      if (!mode) return;
      elements.optionsGrid.focus();
      onModeSelect(mode);
    });

    elements.optionCards.forEach((card) => {
      card.setAttribute("role", "radio");
      card.addEventListener("focus", () => elements.optionsGrid.focus());
    });

    elements.optionsGrid.addEventListener("keydown", (event) => {
      const selectedCard = elements.optionMap[
        document.querySelector("[data-mode][aria-checked='true']")?.getAttribute(
          "data-mode",
        ) || MODES[0]
      ];
      const currentMode = selectedCard?.getAttribute("data-mode") || MODES[0];
      const currentIndex = MODES.indexOf(currentMode);

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        const nextMode = MODES[(currentIndex - 1 + MODES.length) % MODES.length];
        onModeSelect(nextMode);
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        const nextMode = MODES[(currentIndex + 1) % MODES.length];
        onModeSelect(nextMode);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onModeSelect(currentMode);
      }
    });
  }

  elements.themeToggle?.addEventListener("click", () => {
    window.setTimeout(onThemeChange, 0);
  });
};
