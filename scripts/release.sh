#!/usr/bin/env bash
set -euo pipefail

APP_NAME="scope"

# ── Couleurs ───────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}▸${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
die()   { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

# ── Prérequis ──────────────────────────────────────────────
info "Vérification des prérequis…"

command -v gh >/dev/null 2>&1   || die "gh (GitHub CLI) n'est pas installé"
gh auth status >/dev/null 2>&1  || die "gh n'est pas authentifié (gh auth login)"
command -v npm >/dev/null 2>&1  || die "npm n'est pas installé"

rustup target list --installed | grep -q x86_64-apple-darwin \
  || die "Target x86_64-apple-darwin manquante (rustup target add x86_64-apple-darwin)"

ok "Prérequis OK"

# ── Version ────────────────────────────────────────────────
VERSION="${1:-}"

if [ -z "$VERSION" ]; then
  read -rp "Numéro de version (ex: v1.0.0) : " VERSION
fi

# Normaliser : ajouter le préfixe v si absent
[[ "$VERSION" == v* ]] || VERSION="v${VERSION}"

# Valider le format
[[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] \
  || die "Format de version invalide : $VERSION (attendu : vX.Y.Z)"

VERSION_NUM="${VERSION#v}"
info "Version : ${CYAN}${VERSION}${NC}"

# ── Mise à jour des versions dans les fichiers ─────────────
info "Mise à jour de la version dans package.json et tauri.conf.json…"

cd "$(git rev-parse --show-toplevel)"

# package.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"${VERSION_NUM}\"/" package.json

# tauri.conf.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"${VERSION_NUM}\"/" src-tauri/tauri.conf.json

ok "Versions mises à jour → ${VERSION_NUM}"

# ── Build arm64 (Apple Silicon) ────────────────────────────
info "Build arm64 (Apple Silicon)…"
npm run build:tauri

ARM64_DMG_DIR="src-tauri/target/release/bundle/dmg"
ARM64_DMG=$(find "$ARM64_DMG_DIR" -name "*.dmg" -type f 2>/dev/null | head -1)
[ -n "$ARM64_DMG" ] || die "DMG arm64 introuvable dans $ARM64_DMG_DIR"
ok "DMG arm64 : $(basename "$ARM64_DMG")"

# ── Build x86_64 (Intel) ──────────────────────────────────
info "Build x86_64 (Intel)…"
npm run build:tauri -- --target x86_64-apple-darwin

X64_DMG_DIR="src-tauri/target/x86_64-apple-darwin/release/bundle/dmg"
X64_DMG=$(find "$X64_DMG_DIR" -name "*.dmg" -type f 2>/dev/null | head -1)
[ -n "$X64_DMG" ] || die "DMG x86_64 introuvable dans $X64_DMG_DIR"
ok "DMG x86_64 : $(basename "$X64_DMG")"

# ── Renommer les DMG pour clarifier l'architecture ─────────
ARM64_FINAL="${APP_NAME}_${VERSION_NUM}_aarch64.dmg"
X64_FINAL="${APP_NAME}_${VERSION_NUM}_x64.dmg"

cp "$ARM64_DMG" "$ARM64_FINAL"
cp "$X64_DMG" "$X64_FINAL"

ok "DMG prêts : $ARM64_FINAL, $X64_FINAL"

# ── Confirmation avant publication ─────────────────────────
echo ""
info "Récapitulatif :"
echo "   Version  : ${VERSION}"
echo "   arm64    : ${ARM64_FINAL}"
echo "   x86_64   : ${X64_FINAL}"
echo ""
read -rp "$(echo -e "${YELLOW}Commit, tag et publier la release ? [y/N]${NC} ")" CONFIRM
[[ "$CONFIRM" =~ ^[yYoO]$ ]] || { warn "Abandon."; rm -f "$ARM64_FINAL" "$X64_FINAL"; exit 0; }

# ── Tag git + push ─────────────────────────────────────────
info "Création du tag ${VERSION}…"

git add package.json src-tauri/tauri.conf.json
git commit -m "chore: bump version to ${VERSION_NUM}" || true
git tag -a "$VERSION" -m "Release ${VERSION}"
git push origin main
git push origin "$VERSION"

ok "Tag ${VERSION} poussé"

# ── Release GitHub ─────────────────────────────────────────
info "Création de la release GitHub…"

gh release create "$VERSION" \
  "$ARM64_FINAL" \
  "$X64_FINAL" \
  --title "SCOPE ${VERSION}" \
  --generate-notes

ok "Release ${VERSION} publiée !"

# ── Nettoyage ──────────────────────────────────────────────
rm -f "$ARM64_FINAL" "$X64_FINAL"
ok "Fichiers temporaires nettoyés"

echo ""
echo -e "${GREEN}🎉 Release ${VERSION} terminée !${NC}"
echo -e "   → $(gh release view "$VERSION" --json url -q .url)"
