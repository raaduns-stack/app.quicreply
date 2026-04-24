# GitHub Actions VPS Deploy

This repo now includes a production deploy workflow at [.github/workflows/deploy.yml](/Users/azam/Documents/Codes/client/app.quicreply/.github/workflows/deploy.yml) and a reusable VPS deploy script at [scripts/deploy-production.sh](/Users/azam/Documents/Codes/client/app.quicreply/scripts/deploy-production.sh).

After the one-time setup below, every push to `main` can deploy automatically.

## What this flow does

On every push to `main`, GitHub Actions will:

1. SSH into your VPS
2. update the checkout on the server
3. run `wasp build`
4. rebuild/restart Docker containers with `docker-compose` or `docker compose`
5. run a local health check against the app port

## One-time VPS setup

### 1. Make the VPS repo use SSH instead of HTTPS

Run this on the VPS inside your app directory:

```bash
git remote set-url origin git@github.com:YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
git remote -v
```

Important:

- use the same repository you actually push from locally
- right now your local machine and VPS have used different GitHub remotes before, so make sure they match exactly

### 2. Give the VPS permission to pull from GitHub

Create a deploy key on the VPS:

```bash
ssh-keygen -t ed25519 -C "app.quicreply.io deploy key"
cat ~/.ssh/id_ed25519.pub
```

Then add that public key in GitHub:

- Repo `Settings`
- `Deploy keys`
- `Add deploy key`
- keep it read-only

Test it on the VPS:

```bash
ssh -T git@github.com
git pull --ff-only origin main
```

## One-time GitHub Actions setup

Add these repository secrets in GitHub:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_PORT` (optional, default is `22`)
- `VPS_DEPLOY_PATH` (optional, default is `$HOME/www/app.quicreply.io`)

### `VPS_SSH_KEY`

This is the private SSH key GitHub Actions will use to log into your VPS.

Create a separate keypair for GitHub Actions on your local machine:

```bash
ssh-keygen -t ed25519 -C "github-actions deploy"
cat ~/.ssh/github_actions_deploy.pub
cat ~/.ssh/github_actions_deploy
```

Then:

- append the `.pub` key to `~/.ssh/authorized_keys` for your VPS user
- save the private key content as the GitHub secret `VPS_SSH_KEY`

## Manual deploy fallback

If you ever need to deploy manually on the server:

```bash
bash scripts/deploy-production.sh
```

If you already pulled the latest code yourself:

```bash
SKIP_PULL=true bash scripts/deploy-production.sh
```

## Notes for this repo

- The deploy script will deploy `opensaas-app` by default.
- If `opensaas-client` exists in `docker-compose.yml`, it only deploys that service when `.wasp/out/web-app/build/index.html` exists.
- This is deliberate because this repo has had a broken static client mount before, and we do not want auto-deploys to fail on that case.
- The script validates `.env.server` before deploying and fails fast if the file is missing.
- The script checks `http://127.0.0.1:3002` after deploy by default. Override with `APP_PORT` if your app port changes later.

## Official references

- [GitHub Actions docs](https://docs.github.com/en/actions/get-started/understanding-github-actions?apiVersion=2022-11-28)
- [Deploying with GitHub Actions](https://docs.github.com/en/actions/how-tos/deploy)
- [Managing deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)
