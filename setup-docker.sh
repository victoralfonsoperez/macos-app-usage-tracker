#!/bin/bash

# Setup script for macOS App Usage Tracker Docker containerization
# This script helps set up the Docker environment and requirements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="macos-app-usage-tracker"
CONTAINER_NAME="usage-tracker"
PORT="3000"

print_banner() {
    echo -e "${BLUE}"
    echo "========================================================"
    echo "  macOS App Usage Tracker - Docker Setup"
    echo "========================================================"
    echo -e "${NC}"
}

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        log "✓ $1 is installed"
        return 0
    else
        error "✗ $1 is not installed"
        return 1
    fi
}

check_docker() {
    if ! check_command docker; then
        error "Docker is required but not installed."
        echo -e "${YELLOW}Please install Docker Desktop from: https://www.docker.com/products/docker-desktop${NC}"
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running."
        echo -e "${YELLOW}Please start Docker Desktop${NC}"
        return 1
    fi
    
    log "Docker is running properly"
    return 0
}

check_docker_compose() {
    if ! check_command docker-compose; then
        warn "docker-compose not found, checking for docker compose plugin..."
        if docker compose version &> /dev/null; then
            log "✓ Docker Compose plugin is available"
            return 0
        else
            error "Docker Compose is not available"
            echo -e "${YELLOW}Please install Docker Compose or update Docker Desktop${NC}"
            return 1
        fi
    else
        log "✓ docker-compose is installed"
        return 0
    fi
}

check_node() {
    if ! check_command node; then
        warn "Node.js is not installed (not required for Docker-only usage)"
        return 1
    fi
    
    local node_version=$(node -v | cut -d'v' -f2)
    local required_version="18.20.4"
    
    if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" = "$required_version" ]; then
        log "✓ Node.js version $node_version is compatible"
        return 0
    else
        warn "Node.js version $node_version may not be compatible (recommended: $required_version)"
        return 1
    fi
}

check_platform() {
    local platform=$(uname)
    info "Platform: $platform"
    
    if [ "$platform" = "Darwin" ]; then
        log "✓ Running on macOS - full functionality available"
        
        # Check for XQuartz if planning to use GUI
        if command -v xquartz &> /dev/null; then
            log "✓ XQuartz is installed (required for GUI in Docker)"
        else
            warn "XQuartz not found (install with: brew install --cask xquartz)"
            warn "XQuartz is needed for GUI applications in Docker"
        fi
        
        return 0
    else
        warn "Not running on macOS - AppleScript tracking will not work"
        info "Web interface and mock data will be available"
        return 0
    fi
}

create_directories() {
    info "Creating required directories..."
    
    directories=("data" "logs" "backups")
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log "Created directory: $dir"
        else
            log "Directory already exists: $dir"
        fi
    done
    
    # Set proper permissions
    chmod 755 data logs backups
    log "Set directory permissions"
}

create_docker_files() {
    info "Checking Docker configuration files..."
    
    # Check if Dockerfile exists
    if [ ! -f "Dockerfile" ]; then
        warn "Dockerfile not found - this should be created separately"
    else
        log "✓ Dockerfile found"
    fi
    
    # Check if docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        warn "docker-compose.yml not found - this should be created separately"
    else
        log "✓ docker-compose.yml found"
    fi
    
    # Create .dockerignore if it doesn't exist
    if [ ! -f ".dockerignore" ]; then
        info "Creating .dockerignore..."
        cat > .dockerignore << 'EOF'
node_modules/
npm-debug.log*
.git/
.gitignore
README.md
.DS_Store
dist/
build/
*.log
.env*
.vscode/
.idea/
EOF
        log "Created .dockerignore"
    else
        log "✓ .dockerignore found"
    fi
}

update_package_json() {
    info "Checking package.json for Docker scripts..."
    
    if [ -f "package.json" ]; then
        # Check if Docker scripts exist
        if grep -q '"docker:' package.json; then
            log "✓ Docker scripts already exist in package.json"
        else
            warn "Docker scripts not found in package.json"
            info "Consider adding these scripts to package.json:"
            echo '  "docker:build": "docker build -t macos-app-usage-tracker .",'
            echo '  "docker:run": "docker-compose up -d",'
            echo '  "docker:stop": "docker-compose down",'
            echo '  "docker:logs": "docker-compose logs -f"'
        fi
        
        # Check for required dependencies
        if grep -q '"express"' package.json; then
            log "✓ Express dependency found"
        else
            warn "Express dependency not found (required for web mode)"
            info "Add to dependencies: npm install express cors helmet"
        fi
    else
        error "package.json not found"
        return 1
    fi
}

build_docker_image() {
    info "Building Docker image..."
    
    if docker build -t "$IMAGE_NAME" .; then
        log "✓ Docker image built successfully"
        
        # Show image info
        docker images "$IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
        return 0
    else
        error "Failed to build Docker image"
        return 1
    fi
}

test_docker_container() {
    info "Testing Docker container..."
    
    # Start container in background
    if docker run -d --name "${CONTAINER_NAME}-test" -p "${PORT}:${PORT}" "$IMAGE_NAME" > /dev/null; then
        log "Container started successfully"
        
        # Wait for container to be ready
        info "Waiting for container to be ready..."
        sleep 10
        
        # Test health endpoint
        if curl -sf "http://localhost:${PORT}/health" > /dev/null; then
            log "✓ Health check passed"
            
            # Test API
            if curl -sf "http://localhost:${PORT}/api/usage-stats/today" > /dev/null; then
                log "✓ API endpoints accessible"
            else
                warn "API endpoints may not be working properly"
            fi
        else
            warn "Health check failed - container may not be ready"
        fi
        
        # Show container logs
        info "Container logs:"
        docker logs "${CONTAINER_NAME}-test" | tail -10
        
        # Cleanup
        docker stop "${CONTAINER_NAME}-test" > /dev/null
        docker rm "${CONTAINER_NAME}-test" > /dev/null
        log "Test container cleaned up"
        
        return 0
    else
        error "Failed to start test container"
        return 1
    fi
}

show_usage_instructions() {
    echo ""
    echo -e "${BLUE}🚀 Setup Complete! Next Steps:${NC}"
    echo "==========================================="
    echo ""
    echo -e "${GREEN}To run with Docker Compose (recommended):${NC}"
    echo "  docker-compose up -d"
    echo "  docker-compose logs -f"
    echo ""
    echo -e "${GREEN}To run with Docker directly:${NC}"
    echo "  docker run -d --name $CONTAINER_NAME -p $PORT:$PORT -v \$(pwd)/data:/app/data $IMAGE_NAME"
    echo ""
    echo -e "${GREEN}To access the application:${NC}"
    echo "  Web Interface: http://localhost:$PORT"
    echo "  Health Check:  http://localhost:$PORT/health"
    echo "  API Docs:      http://localhost:$PORT/api/usage-stats/today"
    echo ""
    echo -e "${GREEN}Management commands:${NC}"
    echo "  make run          - Start container"
    echo "  make stop         - Stop container"
    echo "  make logs         - View logs"
    echo "  make health       - Check status"
    echo "  make clean        - Remove container and image"
    echo ""
    echo -e "${YELLOW}Platform-specific notes:${NC}"
    if [ "$(uname)" = "Darwin" ]; then
        echo "  ✓ Running on macOS - full functionality available"
        echo "  ✓ AppleScript tracking will work"
        echo ""
        echo -e "${CYAN}For GUI mode (requires XQuartz):${NC}"
        echo "  make run-gui      - Start with GUI support"
    else
        echo "  ⚠ Not on macOS - limited functionality"
        echo "  ⚠ AppleScript tracking will not work"
        echo "  ✓ Web interface with mock data available"
    fi
}

run_interactive_setup() {
    echo ""
    read -p "$(echo -e ${CYAN}"Would you like to run the full setup now? (y/n): "${NC})" -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "Running full setup..."
        
        create_directories
        create_docker_files
        update_package_json
        
        echo ""
        read -p "$(echo -e ${CYAN}"Build Docker image? (y/n): "${NC})" -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if build_docker_image; then
                echo ""
                read -p "$(echo -e ${CYAN}"Test the container? (y/n): "${NC})" -n 1 -r
                echo ""
                
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    test_docker_container
                fi
            fi
        fi
        
        show_usage_instructions
    else
        info "Setup skipped. Run individual functions as needed."
        echo ""
        echo "Available functions:"
        echo "  ./setup-docker.sh check    - Check prerequisites"
        echo "  ./setup-docker.sh build    - Build Docker image"
        echo "  ./setup-docker.sh test     - Test container"
        echo "  ./setup-docker.sh dirs     - Create directories"
    fi
}

main() {
    print_banner
    
    # Check if running with arguments
    if [ $# -gt 0 ]; then
        case "$1" in
            "check")
                info "Checking prerequisites..."
                check_docker && check_docker_compose && check_node && check_platform
                ;;
            "build")
                check_docker || exit 1
                build_docker_image
                ;;
            "test")
                check_docker || exit 1
                test_docker_container
                ;;
            "dirs")
                create_directories
                ;;
            "files")
                create_docker_files
                ;;
            *)
                error "Unknown command: $1"
                echo "Available commands: check, build, test, dirs, files"
                exit 1
                ;;
        esac
        exit 0
    fi
    
    # Interactive setup
    info "Starting Docker setup for macOS App Usage Tracker"
    echo ""
    
    # Prerequisites check
    info "Checking prerequisites..."
    local prereq_ok=true
    
    check_docker || prereq_ok=false
    check_docker_compose || prereq_ok=false
    check_platform
    check_node
    
    if [ "$prereq_ok" = false ]; then
        error "Prerequisites check failed. Please install missing requirements."
        exit 1
    fi
    
    log "✓ All prerequisites satisfied"
    
    run_interactive_setup
}

# Make script executable and run main function
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi