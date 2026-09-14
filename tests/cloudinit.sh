#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
export LOG="$tmp/log"
touch "$tmp/key.pub"
echo 'ssh-ed25519 test-fixture' > "$tmp/key.pub"
mkdir "$tmp/bin"
cat > "$tmp/bin/qm" <<'EOF'
#!/usr/bin/env bash
case "$1" in
status) echo "status: ${VM_STATE:-stopped}" ;;
config) echo 'ide2: local-lvm:vm-101-cloudinit,media=cdrom' ;;
set|cloudinit) printf '%s\n' "$*" >> "$LOG" ;;
*) exit 99 ;;
esac
EOF
chmod +x "$tmp/bin/qm"
export PATH="$tmp/bin:$PATH"
VM_STATE=running bash .test-output/00-set-static-ip.sh "$tmp/key.pub" && exit 1
test ! -e "$LOG"
bash .test-output/00-set-static-ip.sh "$tmp/key.pub"
grep -q 'ip=10.0.0.10/24,gw=10.0.0.1' "$LOG"
grep -q 'cloudinit update 101' "$LOG"
echo 'PASS: Cloud-Init rejects running VM before mutation and configures stopped VM through qm only'
