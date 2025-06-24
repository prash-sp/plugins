import { html,LitElement} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/all/lit-all.min.js';
import { LitElement, html, css } from 'lit';

class AirportInfo extends LitElement {
  static properties = {
    iataCode: { type: String },
    airportData: { type: Object },
    error: { type: String }
  };

  constructor() {
    super();
    this.iataCode = 'JFK';
    this.airportData = null;
    this.error = null;
  }

  async updated(changedProperties) {
    if (changedProperties.has('iataCode')) {
      this.fetchAirportData();
    }
  }

  async fetchAirportData() {
    const url = `https://airport-data.com/api/ap_info.json?iata=${this.iataCode}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch airport data');
      const data = await response.json();
      this.airportData = data;
      this.error = null;
    } catch (err) {
      this.error = err.message;
      this.airportData = null;
    }
  }

  render() {
    return html`
      <div>
        <label for="iata">IATA Code:</label>
        <input
          id="iata"
          type="text"
          .value=${this.iataCode}
          @input=${(e) => this.iataCode = e.target.value.toUpperCase()}
        />
        ${this.error
          ? html`<p style="color:red;">Error: ${this.error}</p>`
          : this.airportData
            ? html`
              <div>
                <p><strong>Name:</strong> ${this.airportData.name}</p>
                <p><strong>Location:</strong> ${this.airportData.location}</p>
                <p><strong>ICAO:</strong> ${this.airportData.icao}</p>
              </div>
            `
            : html`<p>Enter an IATA code to get airport info.</p>`
        }
      </div>
    `;
  }
}

customElements.define('airport-info', AirportInfo);
