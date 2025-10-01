# Propalyst - AI-Powered Property Intelligence Platform

Welcome to Propalyst, an intelligent real estate search platform powered by Claude's AI capabilities.

## 🚀 Quick Start

This application uses Claude's built-in WebSearch tool for property intelligence - no external API keys or Python services required!

### Prerequisites

- **Node.js 18+** and npm
- That's it! No Python, no external APIs needed.

### Setup & Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the application**:
   ```bash
   npm run dev
   ```

3. **Open your browser**: http://localhost:3000

## 🔐 Login Credentials

Use these demo credentials to access the platform:
- **Email**: `demo@propalyst.com`
- **Password**: `password123`

## 🎯 How It Works

Propalyst leverages Claude's AI to provide intelligent property analysis:

### 1. AI-Powered Search
- Enter any property search query
- Claude's WebSearch finds relevant real estate listings
- AI analyzes each property for comprehensive insights

### 2. Property Intelligence Analysis
Each property gets analyzed for:
- **Specifications**: Property type, configurations, pricing
- **Location Intelligence**: Neighborhood, connectivity, work proximity
- **Market Analysis**: Investment potential, developer reputation, category
- **Community Features**: Amenities, family facilities, security
- **Confidence Scoring**: AI confidence in the analysis quality

### 3. Rich Results Display
Results show comprehensive property intelligence including:
- Property details with developer information
- Location analysis with business hub proximity
- Market positioning and investment insights
- Community amenities and family features
- AI confidence scores and proximity ratings

## 🔍 Search Tips

### Effective Search Queries
- **Specific properties**: "Embassy Lake Terraces"
- **Developer-focused**: "Prestige Apartments Bangalore"
- **Location-based**: "3BHK apartments Electronic City"
- **Project-specific**: "Brigade Gateway Orion Mall"

### Expected Results
- AI analyzes 5-10 properties per search
- Each result includes comprehensive intelligence
- Confidence scores help evaluate data quality
- Direct links to original property listings

## 🏗️ Architecture

```
User Search → Next.js Frontend → Claude WebSearch → AI Analysis → Rich Results
```

### Key Components

1. **Next.js Frontend**
   - Google-style search interface
   - Rich property intelligence display
   - Authentication system

2. **Claude AI Integration**
   - Built-in web search capabilities
   - Intelligent property analysis
   - No external dependencies

3. **Property Intelligence Engine**
   - Comprehensive data extraction
   - Market analysis algorithms
   - Confidence scoring system

## 📁 Project Structure

```
├── app/
│   ├── api/search/           # Search API endpoint
│   ├── login/               # Authentication
│   └── page.tsx            # Main search interface
├── components/
│   ├── auth/               # Login components
│   ├── home/               # Search & results
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── services/           # Claude search service
│   ├── types/              # Property intelligence types
│   └── utils/              # Analysis utilities
```

## 🎨 Features

### Authentication
- Demo login system
- Route protection
- Session management

### Search Interface
- Google-style search box
- Quick search suggestions
- Real-time search feedback

### Results Display
- Comprehensive property intelligence
- Confidence indicators
- Market analysis insights
- Community features overview

### Data Intelligence
- AI-powered property analysis
- Investment potential scoring
- Location intelligence
- Amenities categorization

## 🐛 Troubleshooting

### No Search Results
- Try more specific queries
- Include developer or project names
- Check if search terms are too generic

### Low Confidence Scores
- Normal for properties with limited online information
- Higher scores indicate more comprehensive data
- Use results with 60%+ confidence for better insights

### Application Issues
- Refresh the page if components don't load
- Clear browser cache for authentication issues
- Check browser console for any JavaScript errors

## 🔄 Development

### Making Changes
1. **Frontend changes**: Hot reload enabled in dev mode
2. **API changes**: Restart dev server with `npm run dev`
3. **Type changes**: TypeScript will auto-validate

### Adding Features
- Check existing components in `/components`
- Use shadcn/ui components for consistency
- Follow established patterns in the codebase

## 🌟 What's Next

Future enhancements could include:
- Advanced filtering options
- Favorites and saved searches
- Property comparison features
- Market trend analysis
- Investment calculators

---

**Ready to explore intelligent property search?** Start with the demo credentials and try searching for properties like "Embassy Lake Terraces" or "Brigade Gateway"!

Happy property hunting! 🏡