# Docker Setup for macOS App Usage Tracker

## 🚨 Important Limitation

⚠️ **This application was originally designed for macOS** and uses AppleScript to track active applications. While successfully containerized, the core tracking functionality **only works on macOS**.

## What Works in Docker

### ✅ On any platform:
- **Web interface** at `http://localhost:3000`
- **REST API endpoints** for data management
- **Mock data demonstration** (perfect for testing)
- **Database operations** (SQLite)
- **Container orchestration** with Docker Compose

### ✅ Additional on macOS:
- **Real app tracking** (with accessibility permissions)
- **GUI mode** (with XQuartz setup)
- **AppleScript integration**

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)
```bash
# Clone repository
git clone https://github.com/victoralfonsoperez/macos-app-usage-tracker.git
cd macos-app-usage-tracker

# Run interactive setup
chmod +x setup-docker.sh
./setup-docker.sh

# Access application
open http://localhost:3000
```

### Option 2: Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access web interface
open http://localhost:3000
```

### Option 3: Make Commands
```bash
# Quick start (build + run + health check)
make quick-start

# Or individual commands
make build      # Build Docker image
make run        # Start container
make logs       # View logs
make health     # Check status
make stop       # Stop container
```

## 🌐 Web Interface Features

The containerized version includes a modern web interface:

- **📊 Usage Statistics** - View app usage data and charts
- **🔄 Real-time Updates** - Live data refresh
- **⚙️ API Management** - Start/stop tracking, clear data
- **💡 Mock Data Mode** - Demonstration data on non-macOS
- **🏥 Health Monitoring** - Container status and diagnostics

### API Endpoints
- `GET /` - Web interface
- `GET /api/usage-stats/:period` - Get usage stats (today, yesterday, week, all)
- `POST /api/start-tracking` - Start tracking
- `POST /api/stop-tracking` - Stop tracking
- `GET /api/is-tracking` - Check tracking status
- `POST /api/clear-data` - Clear all data
- `GET /health` - Health check

## 🛠️ Management Commands

### Make Commands (25+ available)
```bash
make help           # Show all commands
make setup          # Create directories
make build          # Build Docker image
make run            # Start container
make run-compose    # Start with docker-compose
make run-gui        # Start with GUI (macOS + XQuartz)
make run-dev        # Development mode
make stop           # Stop container
make logs           # View logs
make shell          # Open container shell
make health         # Check container health
make test           # Run tests
make backup-db      # Backup database
make clean          # Remove container and image
make info           # Show configuration info
```

### Docker Scripts (via npm)
```bash
npm run docker:build   # Build image
npm run docker:run     # Start with compose
npm run docker:stop    # Stop services
npm run docker:logs    # View logs
npm run docker:health  # Check health
npm test              # Run test suite
```

## 🔧 Configuration

### Environment Variables
```bash
NODE_ENV=production                           # Runtime environment
PORT=3000                                    # Web server port
DATABASE_PATH=/app/data/usage_tracking.db    # Database location
LOG_LEVEL=info                               # Logging level
```

### Volume Mounts
```bash
./data:/app/data       # Persistent database storage
./logs:/app/logs       # Application logs
./backups:/backups     # Database backups
```

### Docker Compose Services
- **app-usage-tracker** - Main application container
- **db-backup** - Automated database backup service

## 🖥️ Platform-Specific Setup

### macOS with Full Features
```bash
# Install XQuartz for GUI support
brew install --cask xquartz

# Start XQuartz and configure
open -a XQuartz
# Enable "Allow connections from network clients"

# Run with GUI support
make run-gui

# Access both GUI and web interface
open http://localhost:3000
```

### Linux/Windows (Web Interface Only)
```bash
# Standard Docker setup works
docker-compose up -d

# Access web interface with mock data
curl http://localhost:3000/health
open http://localhost:3000
```

## 🧪 Testing

### Automated Test Suite
```bash
# Run comprehensive tests
npm test

# Test Docker container
make test

# Test API endpoints
make test-api

# Platform detection
make check-macos
make check-xquartz
```

### Manual Testing
```bash
# Health check
curl http://localhost:3000/health

# Get usage stats
curl http://localhost:3000/api/usage-stats/today

# Start tracking (macOS only)
curl -X POST http://localhost:3000/api/start-tracking
```

## 🚀 Production Deployment

### Docker Compose Production
```yaml
version: '3.8'
services:
  app:
    image: macos-app-usage-tracker:latest
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    volumes:
      - app_data:/app/data
    ports:
      - \"80:3000\"
    healthcheck:
      test: [\"CMD\", \"curl\", \"-f\", \"http://localhost:3000/health\"]
```

### Reverse Proxy (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔍 Monitoring & Debugging

### Container Health
```bash
# Check container status
make health
docker ps

# View resource usage
make stats
docker stats usage-tracker
```

### Logs and Diagnostics
```bash
# Application logs
make logs
docker logs usage-tracker

# Container shell access
make shell
docker exec -it usage-tracker /bin/sh

# Database backup
make backup-db
```

## 🐛 Troubleshooting

### Common Issues

**Container won't start**
```bash
# Check logs
docker logs usage-tracker
# Verify port availability
lsof -i :3000
# Check Docker daemon
docker info
```

**API not responding**
```bash
# Test health endpoint
curl http://localhost:3000/health
# Check container status
docker ps
# Restart container
make restart
```

**No tracking data (Expected on non-macOS)**
```bash
# Check platform
make check-macos
# View mock data
curl http://localhost:3000/api/usage-stats/today
```

### Getting Help
1. Run diagnostics: `make health`
2. Check logs: `make logs`
3. Run tests: `npm test`
4. Review setup: `./setup-docker.sh check`

## 📈 CI/CD Pipeline

The repository includes GitHub Actions for:
- ✅ **Automated testing** (Ubuntu + macOS)
- ✅ **Docker build & test**
- ✅ **Security scanning** with Trivy
- ✅ **Multi-platform builds** (amd64, arm64)
- ✅ **Container registry publishing**

## 🎯 Use Cases

### Development & Testing
- Cross-platform development environment
- API testing and integration development
- Mock data scenarios and demonstrations

### Production Deployment
- Web interface for existing macOS installations
- API server for mobile app integrations
- Remote monitoring and data access

### Education & Demo
- Showcase application functionality
- API demonstration and documentation
- Container orchestration example

## 📚 Additional Resources

- **GitHub Repository**: https://github.com/victoralfonsoperez/macos-app-usage-tracker
- **Docker Hub**: `macos-app-usage-tracker:latest`
- **API Documentation**: `http://localhost:3000/api/`
- **Health Endpoint**: `http://localhost:3000/health`

---

**Note**: While containerization enables cross-platform deployment, real app tracking remains macOS-specific due to AppleScript requirements. The web interface provides full functionality for data visualization and management on all platforms.