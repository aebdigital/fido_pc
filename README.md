# FIDO Building Calculator - PC Version

A comprehensive web application for construction project estimation and management, built as the PC counterpart to the FIDO mobile app.

## 🏗️ Overview

FIDO Building Calculator helps construction professionals create detailed project estimates by managing clients, projects, rooms, and pricing data. The application features an intuitive interface for calculating costs across 30+ work categories with dynamic pricing and VAT calculations.

## ✨ Features

### 📊 Project Management
- **4 Project Categories**: Flats, Houses, Companies, Cottages
- **Room-based Calculations**: Add multiple rooms per project with detailed work configurations
- **30+ Work Categories**: From preparatory work to sanitary installations
- **Real-time Price Calculations**: Automatic totals with VAT calculations

### 👥 Client Management
- **Complete Client Profiles**: Contact information, addresses, VAT numbers
- **Project-Client Relationships**: Bidirectional navigation between clients and their projects
- **Client Project History**: View all projects associated with each client

### 💰 Dynamic Pricing System
- **Editable General Price List**: Modify prices in Settings with floating save button
- **Project-specific Overrides**: Override individual prices per project while preserving general settings
- **Price Inheritance**: New projects automatically inherit updated general prices
- **Dynamic VAT Calculations**: Configurable VAT rates that update all calculations instantly

### 🎨 User Experience
- **Dark/Light Mode**: Automatic theme switching with system preferences
- **Mobile Responsive**: Optimized for both desktop and mobile use
- **Intuitive Navigation**: Sidebar navigation with clear section organization
- **Real-time Updates**: All changes save automatically to browser storage

## 🛠️ Technical Stack

- **Frontend**: React 18 (Functional Components, Hooks)
- **Styling**: Tailwind CSS with dark mode support
- **Icons**: Lucide React
- **State Management**: React Context API
- **Data Persistence**: Browser localStorage
- **Build Tool**: Create React App

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── Layout.js        # Main layout with sidebar
│   ├── ProjectPriceList.js  # Project-specific price overrides
│   └── RoomDetailsModal.js  # Room configuration modal
├── context/             # React Context providers
│   ├── AppDataContext.js    # Main app state and data management
│   └── DarkModeContext.js   # Theme management
├── pages/               # Main application pages
│   ├── Projects.js      # Project management and room configuration
│   ├── Clients.js       # Client management
│   ├── Settings.js      # Application settings and price lists
│   ├── Invoices.js      # Invoice management (placeholder)
│   └── PriceList.js     # Editable general price list
├── images/              # Static assets
└── App.js              # Main application component
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aebdigital/fido_pc.git
   cd fido_pc
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Open browser**
   Navigate to `http://localhost:3000`

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App (irreversible)

## 💾 Data Storage

The application uses **browser localStorage** for data persistence:

- **User-specific**: Each user gets their own isolated data storage
- **Persistent**: Data survives browser restarts and computer reboots
- **Offline-capable**: Works without internet connection after initial load
- **No backend required**: All data stored locally in user's browser

### Data Structure
- Clients with contact information and project relationships
- Projects organized by categories with room configurations
- Customizable price lists with inheritance system
- Room work items with detailed field configurations

## 🏗️ Work Categories

The application includes 30+ work property categories:
- Preparatory and demolition works
- Electrical wiring and plumbing
- Masonry (brick partitions, load-bearing walls)
- Plasterboarding (partition, offset wall, ceiling)
- Plastering and painting
- Flooring and tiling
- Sanitary installations (12 types)
- Window and door installations
- Scaffolding and tool rentals
- Custom work and materials

## 🎯 Key Workflows

### Creating a Project
1. Navigate to Projects page
2. Select category (Flats/Houses/Companies/Cottages)
3. Click "New Project" and enter project name
4. Add rooms and configure work items for each room
5. Associate with a client for complete project management

### Managing Prices
1. Go to Settings > General price list
2. Edit any price inline (changes highlighted in blue)
3. Click floating save button to persist changes
4. New projects automatically inherit updated prices
5. Override specific prices per project if needed

### Client Management
1. Navigate to Clients page
2. Add new clients with complete contact information
3. Associate projects with clients
4. View client's project history and totals

## 🔧 Customization

### Adding New Work Categories
Edit `src/components/RoomDetailsModal.js` to add new work properties to the `workProperties` array.

### Modifying Price Structure
Update the `generalPriceList` in `src/context/AppDataContext.js` to change default pricing structure.

### Styling Changes
Modify `tailwind.config.js` for theme customization or edit component classes directly.

## 📱 Mobile Compatibility

The application is fully responsive and works on:
- Desktop computers (primary target)
- Tablets and iPads
- Mobile phones (optimized layout)

## 🧹 Development Utilities

- `clear-storage.js` - Utility to reset localStorage during development
- Dark mode toggle in Layout component
- Development-friendly console logging for debugging

## 📋 Production Deployment Notes

Before deploying to production, consider:
- Setting up proper domain and SSL certificate
- Configuring build optimizations
- Adding error tracking (Sentry, etc.)
- Implementing user authentication if needed
- Adding data export/import functionality
- Setting up automated backups if server-side storage is added

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software developed for FIDO Building Calculator.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Contact the development team

---

**Built with ❤️ for construction professionals**