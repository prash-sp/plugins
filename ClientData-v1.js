import { html, LitElement, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@2/all/lit-all.min.js';

export class ClientInfoPlugin extends LitElement {
  static properties = {
    clientId: { type: String },
    clientName: { type: String },
    region: { type: String },
    segment: { type: String },
    loading: { type: Boolean },
    error: { type: String },
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
    label {
      display: block;
      margin-bottom: 8px;
    }
    input {
      width: 100%;
      padding: 6px;
      margin-top: 2px;
      margin-bottom: 10px;
    }
    input[readonly] {
      background-color: #eee;
    }
    .error {
      color: red;
      font-size: 0.9rem;
      margin-bottom: 10px;
    }
    .loading {
      font-style: italic;
      margin-bottom: 10px;
    }
  `;

  static getMetaConfig() {
    return {
      controlName: 'Client Info',
      version: '1.0.0',
      fallbackDisableSubmit: false,
      properties: {
        clientId: {
          type: 'string',
          title: 'Client ID',
          description: 'Client ID (usually 4 digits)',
          defaultValue: '8100'
        }
      }
    };
  }

  constructor() {
    super();
    this.clientId = '8100';
    this.clientName = '';
    this.region = '';
    this.segment = '';
    this.loading = false;
    this.error = '';
  }

  async fetchClientData() {
    if (!this.clientId) return;
    this.loading = true;
    this.error = '';
    try {
      const res = await fetch(`https://dev1wsmqap.insperity.com/administration/webservices/clientdataapi/v1/client/${this.clientId}`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      this.clientName = data?.Client?.CompanyName || '';
      this.region = data?.Client?.SalesRegionName || '';
      this.segment = data?.Client?.ClientSegmentDesc || '';
    } catch (err) {
      console.error('API error:', err);
      this.error = 'Unable to retrieve client info.';
      this.clientName = this.region = this.segment = '';
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <div class="container">
        <label>Client ID:        
          <input .value=${this.clientId} @input=${e => this.clientId = e.target.value} @blur=${this.fetchClientData}/>
        </label>

        ${this.loading ? html`<div class="loading">Loading...</div>` : ''}
        ${this.error ? html`<div class="error">${this.error}</div>` : ''}

        <label>Client Name:
          <input .value=${this.clientName} readonly />
        </label>
        <label>Sales Region:
          <input .value=${this.region} readonly />
        </label>
        <label>Market Segment:
          <input .value=${this.segment} readonly />
        </label>
      </div>
    `;
  }
}

customElements.define('nsp-clientinfo-plugin-v1', ClientInfoPlugin);
