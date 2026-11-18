#!/usr/bin/env bash
# ==============================================================================
# SmartNotes AI - Google Cloud Compute Engine Turnkey Deployment Script
# Supports: Ubuntu 22.04 / 24.04 LTS on Google Cloud VM (GCE)
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo "🚀 Starting SmartNotes AI Production Deployment on GCP VM"
echo "=========================================================="

# 1. Update system packages
echo "📦 Updating apt packages..."
sudo apt-get update && sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw

# 2. Add 4GB Swap Space (Essential for PyTorch & Whisper on budget VMs)
if [ ! -f /swapfile ]; then
    echo "💾 Creating 4GB Swap space to protect against Out-Of-Memory (OOM)..."
    sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Swap configured."
fi

# 3. Install Docker Engine & Docker Compose Plugin
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker & Docker Compose..."
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker "$USER"
    echo "✅ Docker installed."
fi

# 4. Check for .env file
if [ ! -f .env ]; then
    echo "⚙️  No .env file found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        cat <<EOF > .env
GROQ_API_KEY=
JWT_SECRET=$(openssl rand -hex 24)
ENVIRONMENT=production
COOKIE_SECURE=false
EOF
    fi
    echo "⚠️  Created .env file. Please edit .env with your GROQ_API_KEY if needed:"
    echo "    nano .env"
fi

# 5. Build and launch services with Docker Compose
echo "🚀 Building and starting containers (MySQL, Qdrant, FastAPI Backend, React Frontend)..."
sudo docker compose up -d --build

# 6. Verify running services
echo "----------------------------------------------------------"
sudo docker compose ps
echo "----------------------------------------------------------"

EXTERNAL_IP=$(curl -s -4 ifconfig.me || curl -s -4 icanhazip.com || echo "YOUR_VM_EXTERNAL_IP")

echo "=========================================================="
echo "🎉 Deployment Complete!"
echo "🌐 You can now open your browser and access NoteFlow at:"
echo "    http://${EXTERNAL_IP}"
echo ""
echo "📊 To view live logs:"
echo "    sudo docker compose logs -f"
echo "=========================================================="

