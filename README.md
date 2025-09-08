# App Usage Tracker for macOS

A desktop application built with Electron that tracks and displays your application usage time on macOS, similar to iOS Screen Time.

## Features

- 🕐 **Real-time tracking** - Monitors active application usage every 5 seconds
- 📊 **Usage statistics** - View detailed stats for today, yesterday, this week, or all time
- 💾 **Local storage** - All data is stored locally using SQLite
- 🎨 **Beautiful UI** - Modern, responsive interface with smooth animations
- 📱 **Session tracking** - See how many times you used each app
- 🔄 **Auto-refresh** - Updates automatically while tracking
- 🗑️ **Data management** - Clear all data when needed

## Screenshots

The app provides a beautiful, modern interface with usage statistics displayed in an easy-to-read format with progress bars and percentages.

## Prerequisites

- macOS (required for AppleScript integration)
- Node.js 16+ and npm
- Accessibility permissions (required for tracking active applications)

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/victoralfonsoperez/macos-app-usage-tracker.git
   cd macos-app-usage-tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Setting up Accessibility Permissions

**This is crucial for the app to work!**

1. Run the app first:
   ```bash
   npm start
   ```

2. Go to **System Preferences** → **Security & Privacy** → **Privacy** → **Accessibility**

3. Click the **lock icon** and enter your password

4. Click the **"+"** button and add your app:
   - If running in development: Add **Electron** or **Terminal**
   - If built as app: Add the **App Usage Tracker.app**

5. Make sure the checkbox next to the app is **checked**

6. Restart the application

## Usage

### Development Mode
```bash
npm start
# or with dev tools
npm run dev
```

### Building for Production
```bash
# Build for distribution
npm run build

# Or just package (no installer)
npm run pack
```

## How It Works

### Application Tracking
- Uses **AppleScript** to query the frontmost (active) application
- Tracks usage in 5-second intervals
- Stores session data when you switch between apps

### Data Storage
- **SQLite database** stored in your user data directory
- Tracks: app name, usage duration, session count, date
- Data persists between app restarts

### Privacy
- **100% local** - no data leaves your computer
- **No network requests** - everything runs offline
- **You control your data** - clear it anytime

## File Structure

```
macos-app-usage-tracker/
├── package.json          # Dependencies and build config
├── main.js               # Electron main process
├── database.js           # SQLite database handler
├── preload.js            # IPC bridge (security)
├── index.html            # User interface
└── README.md            # This file
```

## Troubleshooting

### App Not Tracking
1. **Check accessibility permissions** (most common issue)
2. Make sure you granted permission to the correct app
3. Try restarting the application
4. Check the console for AppleScript errors

### Database Issues
- Database file location: `~/Library/Application Support/app-usage-tracker/usage_tracking.db`
- You can delete this file to reset all data

### Build Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# For M1 Macs, you might need:
npm install --arch=arm64
```

## Customization

### Change Tracking Interval
In `main.js`, modify the interval (currently 5000ms = 5 seconds):
```javascript
this.trackingInterval = setInterval(() => {
  this.trackCurrentApp();
}, 5000); // Change this value
```

### Add New Time Periods
In `database.js`, add new cases to the `getUsageStats` method and update the UI accordingly.

### Styling
Modify the CSS in `index.html` to change the appearance.

## Technical Details

### Dependencies
- **electron**: Desktop app framework
- **node-applescript**: Interface with macOS AppleScript
- **sqlite3**: Local database storage
- **electron-builder**: App packaging and distribution

### Security Features
- **Context isolation** enabled
- **Node integration** disabled in renderer
- **Preload script** for secure IPC communication

### Performance
- Lightweight tracking (5-second intervals)
- Efficient SQLite queries
- Minimal memory usage
- Background processing

## License

MIT License - Feel free to modify and distribute!

## Contributing

Feel free to submit issues and enhancement requests!

## Roadmap

- [ ] Export data to CSV
- [ ] Set usage goals and notifications
- [ ] App categorization (productivity, entertainment, etc.)
- [ ] Time-based charts and graphs
- [ ] Weekly/monthly reports
- [ ] Idle time detection
- [ ] Menu bar widget

---

**Note**: This app requires macOS and accessibility permissions to function properly. The tracking accuracy depends on your system performance and the 5-second polling interval.

## Support

If you encounter any issues:

1. Make sure you have the latest version of Node.js
2. Verify accessibility permissions are correctly set
3. Check the console output for error messages
4. Try clearing the database file if data appears corrupted

For additional support, please open an issue on GitHub.