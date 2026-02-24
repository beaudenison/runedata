# RuneData

A minimalist, high-performance RuneScape data search engine built with React, Vite, and Tailwind CSS.

## Overview

RuneData is an open-source project created for fun and utility. It provides a clean, distraction-free interface for searching Old School RuneScape (OSRS) items, viewing real-time Grand Exchange market data, and inspecting detailed item attributes (stats, requirements, etc.).

This project is designed to be:
- **Minimalist**: A single search bar experience.
- **Fast**: High-performance autosuggest and real-time data fetching.
- **Open Source**: Anyone can use this as a starter template for their own OSRS tools or just use the deployed version.

## Features

- **Real-time GE Data**: Fetches the latest high/low prices, margins, and buy limits directly from the RuneScape Wiki Prices API.
- **Detailed Attributes**: Displays combat stats, equipment slots, attack speeds, and level requirements using OSRSBox DB.
- **Keyboard Navigation**: Full support for arrow keys and enter to navigate and select search results.
- **API Status Tracking**: Real-time indicators for the health of underlying data sources.
- **Responsive Design**: Works beautifully on desktop and mobile.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/runedata.git
   cd runedata
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

This project is configured for easy deployment to GitHub Pages.

To deploy:
```bash
npm run deploy
```

## Data Sources

- [RuneScape Wiki Prices API](https://prices.runescape.wiki/api/v1/osrs/mapping)
- [OSRSBox DB](https://www.osrsbox.com/)

## License

This project is open-source and available for anyone to use, modify, and learn from. Have fun!

---
Created by [Beau Denison](https://x.com/beaudenison)
