# How to Pull Latest Changes on EC2 Server

## Step-by-Step Commands

### Step 1: Navigate to Project Directory

```bash
cd zomesstay
```

### Step 2: Check Current Status

```bash
git status
```

This shows:
- Current branch
- Any uncommitted changes
- If you're behind/ahead of remote

### Step 3: Check Which Remote You're Connected To

```bash
git remote -v
```

Should show your remote repository URL.

### Step 4: Fetch Latest Changes

```bash
git fetch origin
```

This downloads latest changes without merging.

### Step 5: Pull Latest Changes

**Option A: If you have no local changes (recommended):**

```bash
git pull origin main
```

**Option B: If you have local changes:**

```bash
# Check what files changed
git status

# If you want to keep local changes, stash them
git stash

# Pull latest changes
git pull origin main

# Apply your local changes back
git stash pop
```

**Option C: If you want to discard local changes:**

```bash
# Discard local changes
git reset --hard HEAD

# Pull latest changes
git pull origin main
```

---

## Complete Command Sequence

**If no local changes:**
```bash
cd zomesstay
git status
git pull origin main
```

**If you have local changes to keep:**
```bash
cd zomesstay
git stash
git pull origin main
git stash pop
```

**If you want to discard local changes:**
```bash
cd zomesstay
git reset --hard HEAD
git pull origin main
```

---

## After Pulling - Restart Server

After pulling latest changes, restart your Node.js server:

```bash
# If using PM2:
pm2 restart all

# Or if running manually:
# Stop server (Ctrl+C)
# Then start:
cd server
npm install  # Install any new dependencies
npm run dev  # Or npm start for production
```

---

## Troubleshooting

### Issue: "Your branch is behind 'origin/main'"
**Solution:**
```bash
git pull origin main
```

### Issue: "Your branch has diverged"
**Solution:**
```bash
# If you want remote changes:
git reset --hard origin/main

# Or if you want to merge:
git pull origin main --no-rebase
```

### Issue: "Permission denied"
**Solution:**
```bash
# Check file permissions
ls -la

# If needed, fix permissions
sudo chown -R ubuntu:ubuntu zomesstay
```

### Issue: "Merge conflict"
**Solution:**
```bash
# View conflicts
git status

# Edit files to resolve conflicts
# Then:
git add .
git commit -m "Resolve merge conflicts"
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `git status` | Check current status |
| `git pull origin main` | Pull latest changes |
| `git fetch origin` | Download without merging |
| `git stash` | Save local changes temporarily |
| `git reset --hard HEAD` | Discard local changes |
| `git remote -v` | View remote repository |

---

## Recommended Workflow

1. **Before pulling:**
   ```bash
   cd zomesstay
   git status
   ```

2. **If clean (no changes):**
   ```bash
   git pull origin main
   ```

3. **If you have local changes:**
   ```bash
   git stash
   git pull origin main
   git stash pop
   ```

4. **After pulling:**
   ```bash
   cd server
   npm install  # If new dependencies
   pm2 restart all  # Or restart manually
   ```

---

**Run these commands on your EC2 server to get latest changes!** 🚀

