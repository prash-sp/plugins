import { html, LitElement, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@2/all/lit-all.min.js';

////////////////////////////////////////////////////////////////////////////////
// Utility: Locate an input field (input, textarea, or contenteditable) on the form
////////////////////////////////////////////////////////////////////////////////
function findInputControl(labelText) {
  const labels = Array.from(document.querySelectorAll("label span.nx-title"));
  const targetLabel = labels.find(span => span.textContent.trim() === labelText);
  if (!targetLabel) return null;

  const container = targetLabel.closest(
    "ntx-multilinetext, ntx-singlelinetext, ntx-datepicker, ntx-dropdown, ntx-checkbox"
  );
  if (!container) return null;

  return (
    container.querySelector("input, textarea, select") ||
    container.querySelector(".ck-editor__editable[contenteditable='true']") ||
    null
  );
}


////////////////////////////////////////////////////////////////////////////////
// Utility: Set value for any input type, including rich text editors (CKEditor)
////////////////////////////////////////////////////////////////////////////////
function setInputValueWithEvents(el, value) {
  if (!el) return;

  const tag = el.tagName.toLowerCase();

  if (tag === "input" || tag === "textarea") {
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } else if (tag === "select") {
    el.value = value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } else if (el.classList.contains("ck-editor__editable")) {
    el.innerHTML = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    console.warn("Unsupported element type.");
  }
}

////////////////////////////////////////////////////////////////////////////////
// Main Plugin Class
////////////////////////////////////////////////////////////////////////////////
export class ClientInfoPlugin extends LitElement {
  static properties = {
    apiBaseUrl: { type: String },
    clientId: { type: String },
    clientIdFieldLabel: { type: String },
    fieldMappingPart1: { type: String },
    fieldMappingPart2: { type: String },
    loading: { type: Boolean },
    error: { type: String },
    showOnForm: { type: Boolean },
    enableDebugLogging: { type: Boolean }
  };

  static styles = css`
    .container {
      font-family: Arial, sans-serif;
      padding: 1rem;
      background: #f5f7fa;
      border-radius: 8px;
      border: 1px solid #ccc;
      max-width: 400px;
    }
    .error { color: red; font-size: 0.9rem; margin-bottom: 10px; }
    .loading { font-style: italic; margin-bottom: 10px; }
  `;

  static getMetaConfig() {
    return {
      controlName: 'Client Info with Mapping v10',
      version: '1.0.0',
      properties: {
        apiBaseUrl: {
          type: 'string',
          title: 'API Base URL',
          description: 'Paste your Web API URL',
          defaultValue: 'https://devescinternal.insperity.com/services/sharepoint/clientdataapi/v1/client'
        },
        clientIdFieldLabel: {
          type: 'string',
          title: 'Client ID Field Label',
          description: 'Label or name of the input field that contains the Client ID.',
          defaultValue: 'ClientID'
        },
        fieldMappingPart1: {
          type: 'string',
          title: 'Field Mapping (JSON) - Part 1',
          description: `Map form control labels/names to API response fields.`,
          defaultValue: '{"Name":"CompanyName","Region":"SalesRegionName","Segment":"ClientSegmentDesc","City":"ClientCity","Phone":"ClientPhone","State":"ClientState","Payroll Specialist": "PayrollSpecialist"}'
        },
        fieldMappingPart2: {
          type: 'string',
          title: 'Field Mapping (JSON) - Part 2',
          description: `Use this field if your mapping exceeds 255 characters.`,
          defaultValue: ''
        },
        showOnForm: {
          type: 'boolean',
          title: 'Show on Form',
          description: 'Should the plugin be visible on the form?',
          defaultValue: false
        },
        enableDebugLogging: {
          type: 'boolean',
          title: 'Enable Debug Logging',
          description: 'Toggle to output debug logs to the browser console.',
          defaultValue: false
        }
      }
    };
  }

  constructor() {
    super();
    this.apiBaseUrl = 'https://devescinternal.insperity.com/services/sharepoint/clientdataapi/v1/client';
    this.clientId = '';
    this.clientIdFieldLabel = 'ClientID';
    this.fieldMappingPart1 = '{"Name":"CompanyName","Region":"SalesRegionName","Segment":"ClientSegmentDesc","City":"ClientCity","Phone":"ClientPhone","State":"ClientState","Payroll Specialist": "PayrollSpecialist"}';
    this.fieldMappingPart2 = '';
    this.loading = false;
    this.error = '';
    this.showOnForm = false;
    this.enableDebugLogging = false;
  }

  connectedCallback() {
    super.connectedCallback();
    setTimeout(() => this.attachClientIdListener(), 700);
  }

  attachClientIdListener() {
    const clientIdInput = findInputControl(this.clientIdFieldLabel);
    if (!clientIdInput) {
      if (this.enableDebugLogging) {
        console.warn(`Client ID field "${this.clientIdFieldLabel}" not found. Retrying...`);
      }
      setTimeout(() => this.attachClientIdListener(), 500);
      return;
    }

    clientIdInput.addEventListener('change', async () => {
      this.clientId = clientIdInput.value;
      if (this.enableDebugLogging) {
        console.log(`Client ID changed: ${this.clientId}`);
      }
      await this.fetchAndPopulate();
    });

    // Trigger fetch if value is already populated
    if (clientIdInput.value) {
      this.clientId = clientIdInput.value;
      if (this.enableDebugLogging) {
        console.log(`Initial Client ID: ${this.clientId}`);
      }
      this.fetchAndPopulate();
    }
  }

  async fetchAndPopulate() {
    if (!this.apiBaseUrl || !this.clientId) return;

    this.loading = true;
    this.error = '';

    try {
      const url = `${this.apiBaseUrl}/${encodeURIComponent(this.clientId)}`;
      if (this.enableDebugLogging) {
        console.log(`Fetching: ${url}`);
      }

      const res = await fetch(url, { credentials: 'include', mode: 'cors' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();

      let fieldMap = {};
      try {
        const combinedMapping = (this.fieldMappingPart1 || '') + (this.fieldMappingPart2 || '');
        fieldMap = JSON.parse(combinedMapping);
      } catch {
        this.error = 'Invalid field mapping format.';
        return;
      }

      Object.entries(fieldMap).forEach(([formFieldLabel, apiFieldName]) => {
        let value = data?.Client?.[apiFieldName] ?? '';

        // Join arrays with comma if needed
        if (Array.isArray(value)) value = value.join(',');

        const input = findInputControl(formFieldLabel);
        if (!input) {
          if (this.enableDebugLogging) {
            console.warn(`Field "${formFieldLabel}" not found on form. Value to insert:`, value);
          }
          return;
        }
        if (this.enableDebugLogging) {
          console.log(`Populating "${formFieldLabel}" with value:`, value);
        }
        setInputValueWithEvents(input, value);
      });

    } catch (err) {
      this.error = 'Unable to retrieve client info. ' + (err.message || '');
      if (this.enableDebugLogging) {
        console.error(this.error);
      }
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  render() {
    if (!this.showOnForm) {
      if (this.enableDebugLogging && this.error) {
        console.error(this.error);
      }
      return null;
    }
    return html`
      <div>
        <div>Client Info API call</div>
        ${this.loading ? html`<div class="loading">Loading client info...</div>` : ''}
        ${this.error ? html`<div class="error">${this.error}</div>` : ''}
      </div>
    `;
  }
}

customElements.define('nsp-clientinfomapping-v10', ClientInfoPlugin);