# VennProspect - Website Analysis Tool

<img src="/api/placeholder/400/100" alt="ProspectPro Logo" />

## Overview

VennProspect is a backend data collection tool mashup, and on the front end, it's and ugly but funtional Progressive Web Application (PWA) designed to with assessing prospects website, and engagment metrics with a sprinkle of businesses analyze to quickly and effectively. Perfect for sales teams and digital marketers, it provides instant website performance insights and actionable recommendations when prospecting new clients.

## Overall function VennProspect?

Walking into a meeting with detailed insights about a prospect's website demonstrates preparation and professionalism. ProspectPro equips you with the data you need to have meaningful conversations about:

- Website performance issues
- SEO optimization opportunities
- Content quality assessment
- Mobile-friendliness
- Competitive positioning

## Key Features

### Comprehensive Website Analysis
- **Performance Scoring**: Evaluate website speed and responsiveness
- **SEO Assessment**: Identify optimization opportunities
- **Content Evaluation**: Analyze word count, image alt text, and structured data
- **Freshness Check**: Determine when content was last updated
- **Mobile Compatibility**: Test responsive design implementation

### Business Intelligence
- **Competitor Analysis**: Identify online competitors and compare metrics
- **Actionable Recommendations**: Get prioritized suggestions for improvement
- **Detailed Reports**: Generate shareable reports for team collaboration

### User Experience
- **Intuitive Interface**: Clean, modern design makes analysis simple
- **Progressive Web App**: Works offline and can be installed on any device
- **Analysis History**: Save and manage previous analyses with filtering options
- **Data Export**: Download insights as JSON for further processing

## Getting Started

### Installation Options


### NEEDS UPDATED
#### Method 1: Quick Start (No Installation)
Access the hosted version at [https://prospectpro.yourdomain.com](https://prospectpro.yourdomain.com)

#### Method 2: Local Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/prospectpro.git
   cd prospectpro
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Configure environment variables in a `.env` file:
   ```
   SUPABASE_URL=your-supabase-url
   SUPABASE_KEY=your-supabase-key
   PORT=3000
   ```

4. Start the server:
   ```sh
   npm start
   ```

5. Open in your browser:
   [http://localhost:3000](http://localhost:3000)

## Usage

1. **Enter URL**: Input the website address you want to analyze
2. **Review Results**: Examine the overall score and category breakdowns
3. **Explore Recommendations**: Review prioritized suggestions for improvement
4. **Check Competitors**: See how the site compares to competitors
5. **Save or Share**: Download a report or share results with your team

## Technical Details

### API Endpoints

- `POST /api/analyze`: Analyze a website and return results
- `GET /api/history`: Retrieve previous analyses
- `GET /api/analysis/:id`: Get detailed analysis for a specific URL
- `GET /api/health`: Check API health status

### Technologies

- **Backend**: Node.js, Express.js
- **Frontend**: HTML, CSS, JavaScript
- **Database**: Supabase
- **Analysis Tools**: Lighthouse, Puppeteer, Cheerio
- **PWA Features**: Service Worker for offline support

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

Special thanks to my friends for their support and feedback during development.

---

*Built with pseudo deterministic development to make prospecting easier and sales messaging more accurate and effective in a pintch.*