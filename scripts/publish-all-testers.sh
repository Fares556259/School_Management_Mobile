#!/bin/bash
# ==============================================================================
# Script: publish-all-testers.sh
# Purpose: Publish EAS OTA updates across ALL runtime versions (1.0.1, 1.0.2, 1.0.3)
#          and ALL channels (main, production) so EVERY tester gets the update!
# ==============================================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

echo "========================================================"
echo "🚀 SnapSchool Mobile - Diffusion Mise à Jour Testeurs"
echo "========================================================"

MESSAGE="${1:-feat: admin portal, hnia chat, caisse & auto-update}"

publish_for_version() {
  local VER=$1
  echo ""
  echo "--------------------------------------------------------"
  echo "📦 Préparation du bundle pour Runtime Version: $VER"
  echo "--------------------------------------------------------"
  
  # Temporarily set version in app.json so EAS generates the matching runtime version
  node -e "
    const fs = require('fs');
    const p = './app.json';
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    j.expo.version = '$VER';
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
  "
  
  echo "📡 1/2 Diffusion sur le canal 'main' (APKs de prévisualisation)..."
  eas update --channel main --message "$MESSAGE [v$VER]" --non-interactive

  echo "📡 2/2 Diffusion sur le canal 'production' (Google Play Closed Testing)..."
  eas update --channel production --message "$MESSAGE [v$VER]" --non-interactive

  echo "✅ Runtime $VER mis à jour avec succès sur main & production !"
}

# Publish for all tester versions
publish_for_version "1.0.1"
publish_for_version "1.0.2"
publish_for_version "1.0.3"

# Restore app.json to 1.0.3
node -e "
  const fs = require('fs');
  const p = './app.json';
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  j.expo.version = '1.0.3';
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
"

echo ""
echo "========================================================"
echo "🎉 SUCCÈS TOTAL !"
echo "Tous vos testeurs (1.0.1, 1.0.2, 1.0.3 sur main & production)"
echo "recevront la mise à jour dès l'ouverture de l'application !"
echo "========================================================"
