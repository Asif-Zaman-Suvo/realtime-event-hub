# Skill: GitHub Repo Initializer

Use this skill whenever the user wants to initialize a new GitHub repository and push it for the first time.

---

## Variables (ask the user before running)

| Variable | Example | Notes |
|---|---|---|
| `REPO_NAME` | `realtime-event-hub` | The repository name |
| `ACCOUNT_TYPE` | `personal` or `office` | Determines which SSH host to use |
| `GITHUB_USERNAME` | `Asif-Zaman-Suvo` | GitHub username |

---

## SSH Host Mapping

Based on `ACCOUNT_TYPE`, use the correct SSH alias from `~/.ssh/config`:

| Account Type | SSH Host Alias | Remote URL format |
|---|---|---|
| `personal` | `personal` | `git@personal:USERNAME/REPO_NAME.git` |
| `office` | `office` | `git@office:USERNAME/REPO_NAME.git` |

---

## Commands to Run

```bash
# 1. Create README
echo "# REPO_NAME" >> README.md

# 2. Initialize git
git init

# 3. Stage and commit
git add README.md
git commit -m "first commit"

# 4. Set main branch
git branch -M main

# 5. Add remote — use correct SSH alias
# For personal:
git remote add origin git@personal:GITHUB_USERNAME/REPO_NAME.git

# For office:
git remote add origin git@office:GITHUB_USERNAME/REPO_NAME.git

# 6. Push
git push -u origin main
```

---

## SSH Config Prerequisite

Make sure `~/.ssh/config` has these entries set up:

```
Host personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa_personal

Host office
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa_office
```

---

## Example (filled in)

```bash
echo "# realtime-event-hub" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin git@personal:Asif-Zaman-Suvo/realtime-event-hub.git
git push -u origin main
```

---

## How to Use in Cursor

When the user says something like:

> "new repo initialize koro, name hobe `my-project`, personal account e"

Run the above commands with:
- `REPO_NAME` = `my-project`
- `ACCOUNT_TYPE` = `personal`
- `GITHUB_USERNAME` = `Asif-Zaman-Suvo`
