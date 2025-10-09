/**
 * Shared Widget Definitions for BetTicker Dashboards
 *
 * This module defines a standard interface for dashboard widgets, including methods for initialization,
 * data fetching, and rendering UI updates. Widgets are designed to be modular and reusable components
 * that can be easily integrated into any dashboard.
 *
 * @version 1.0.0
 * @date 2025-10-09
 */

/**
 * Base Widget Interface.
 * All dashboard widgets should implement this interface.
 */
export class BaseWidget {
    constructor(id, config, utils) {
        this.id = id; // DOM element ID where the widget will render
        this.config = config; // Configuration object from shared/config.js
        this.utils = utils; // Utility functions from shared/utils.js
        this.data = null; // Stores fetched data
        this.isLoading = false;
        this.error = null;
    }

    /**
     * Initializes the widget. This method can be used for initial DOM setup, event listeners, or chart creation.
     * @param {HTMLElement} containerEl - The main container element for the widget.
     */
    init(containerEl) {
        console.log(`[Widget ${this.id}] Initializing...`);
        // Default initialization logic, override in child classes
    }

    /**
     * Fetches data for the widget. This method should handle API calls and update the widget's internal data state.
     * @param {Object} [params={}] - Optional parameters for the data fetch.
     * @returns {Promise<any>} A promise that resolves with the fetched data.
     */
    async loadData(params = {}) {
        this.isLoading = true;
        this.error = null;
        console.log(`[Widget ${this.id}] Loading data...`);
        // Default data loading logic, override in child classes
        return Promise.resolve(null);
    }

    /**
     * Renders or updates the widget's UI based on its current data. This method should manipulate the DOM.
     */
    render() {
        this.isLoading = false;
        console.log(`[Widget ${this.id}] Rendering...`);
        // Default rendering logic, override in child classes
    }

    /**
     * Displays an error message in the widget.
     * @param {string} message - The error message to display.
     */
    displayError(message) {
        this.error = message;
        this.isLoading = false;
        console.error(`[Widget ${this.id}] Error: ${message}`);
        // Default error display logic, override in child classes
    }

    /**
     * Clears any displayed error messages.
     */
    clearError() {
        this.error = null;
        // Default clear error logic, override in child classes
    }
}
