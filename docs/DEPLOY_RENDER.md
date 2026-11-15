# Publish FINN to GitHub and deploy on Render

This deploys the complete application in the cloud. Your computer can be switched off after deployment. The old tunnel and static Sites preview are not needed.

## 1. GitHub repository

The recommended repository name is `finn-investor-desk`. Private visibility is fine: Render can deploy a private repository after you grant its GitHub App access. If evaluators require repository access, invite them or make the repository public after checking its contents.

The repository root must contain:

```text
Dockerfile
render.yaml
.dockerignore
.gitignore
.env.example
README.md
backend/
frontend/
docs/
scripts/
tests/
```

Use the current project folder as the repository root, without nesting it inside another folder. The root `.gitignore` excludes `.env`, environments, dependencies, local databases and generated output when using Git. If using GitHub’s website upload, exclude those files manually: browser uploads do not consult `.gitignore`. Keep `frontend/public/snapshot.json`: it contains public demo data needed by cloud startup.

## 2. Create and connect Render

1. Open https://dashboard.render.com/ and sign up or sign in.
2. Choose a personal workspace. Use the free workspace/service options; no paid database or disk is required for this demo.
3. Select **New → Blueprint**.
4. Connect GitHub when prompted. GitHub opens an authorization screen for the Render GitHub App.
5. Choose the correct GitHub account/organization. Prefer **Only select repositories**, then select `finn-investor-desk` and authorize it.
6. Return to Render and select **Connect** beside that repository. If it is missing, update Render's GitHub App repository access, then refresh the list.
7. Name the Blueprint `finn` (the name is only for organizing it).
8. Select branch `main` and Blueprint Path `render.yaml`.
9. Review the generated service. It must be a **Web Service**, Docker runtime, **Free** plan, using `./Dockerfile` from repository root `.`. It should not add a paid database or disk.

Official workflow: https://render.com/docs/infrastructure-as-code

## 3. Supply the API secret

The Blueprint declares `HYDE_INFERENCE_API_KEY` with `sync: false`, so Render asks you for the value rather than storing it in GitHub.

1. Enter your actual Hyde key in the prompt. Paste only its value, without `HYDE_INFERENCE_API_KEY=` or surrounding quotes.
2. If you already created the service, open **Service → Environment → Add Environment Variable** instead.
3. Use Key `HYDE_INFERENCE_API_KEY` and your key as Value.
4. Choose **Save and deploy** if configuring an existing service. `Save only` does not apply the new secret until the next deployment.

The rest of the Blueprint supplies these nonsecret settings:

| Variable | Value |
| --- | --- |
| `LLM_MODEL` | `hyde/glm-5.3-flash` |
| `FINN_AUTO_REFRESH` | `true` |
| `FINN_DAILY_MODEL_CALL_LIMIT` | `60` |
| `PORT` | `10000` |

Do not set `NEXT_PUBLIC_HYDE_INFERENCE_API_KEY`, and do not upload `.env`. The Python server reads the runtime environment directly. The static frontend uses same-origin `/api` calls and never receives the provider key. `LLM_BASE_URL` already defaults to `https://inference.hyde.tech/v1`.

Official secret instructions: https://render.com/docs/configure-environment-variables

## 4. Start the deployment

1. Click **Deploy Blueprint** after reviewing the Free plan and entering the secret.
2. Open the resulting service `finn-investor-desk`.
3. Watch the **Events/Logs** build output. The Docker build installs frontend dependencies, builds Next.js, installs Python dependencies, and starts Uvicorn. You do not need to enter separate npm build/start commands for this Docker service.
4. Wait for the service to report **Live**. Copy the HTTPS URL shown by Render; use the actual URL, which may include a suffix.
5. The configured health-check path is `/api/health`. The container listens on Render's configured `PORT` and binds to `0.0.0.0`.

If you use **New → Web Service** instead of a Blueprint, set the same settings manually: Docker runtime, repository-root directory, `./Dockerfile`, Free instance, `/api/health`, and all environment variables listed above. Use only one creation method to avoid duplicate services.

## 5. Verify before submitting

1. Open `https://YOUR-RENDER-HOST/api/health`. Expect `status: "ok"` and `model_configured: true`. The latter confirms a key is present, not that the provider accepts it.
2. Open the root URL on a phone. Today should show the portfolio; the date window may legitimately have no recent events. Research should have the bundled dated examples immediately.
3. Check the health response's `refresh` field after ingestion finishes. Look at `prices`, `announcements`, and `errors`. Data sources can restrict cloud IPs, so a cached demo alone does not establish successful live ingestion.
4. Open Research → DIXON and verify an evidence badge opens an excerpt and the original PDF.
5. Ask a follow-up question. This checks actual model authentication and outbound connectivity.
6. Enter an NSE ticker outside the prepared set and select Research. Wait for the job to finish or inspect a specific source-coverage error.
7. Change an alert threshold and save. Verify the alert view reflects it.
8. Switch off your computer and reopen the Render URL on your phone using mobile data. The application must still work.
9. Replace the placeholders in `docs/COVERING_NOTE.md` with your Render URL, GitHub URL and name.

## 6. Troubleshooting

| Symptom | Check |
| --- | --- |
| Repository does not appear in Render | GitHub App permissions, account/organization selection and repository access |
| Blueprint or Dockerfile not found | Files must be at repository root; do not upload a nested `finn/` folder |
| Build fails during dependency installation | Copy the failing log section; the exact lockfiles are included. Do not add secrets to build logs |
| No port/health check detected | Runtime must use the supplied Dockerfile; check `PORT=10000`, `/api/health`, and Uvicorn startup logs |
| `model_configured: false` | Add `HYDE_INFERENCE_API_KEY` to the service environment, then deploy |
| Model returns 401/403 | Confirm the secret value and Hyde account's API access; restart/deploy after editing it |
| Model returns 429 or local budget message | Provider quota or FINN's attempt cap was reached; cached research remains usable |
| Source requests fail but app loads | Review the refresh errors; exchange/Yahoo sites may reject host IPs. Record the limitation rather than calling cached data live |
| First request is slow | Render Free can sleep after 15 minutes of inactivity; allow the service to wake |
| Settings/new research disappear after restart | Free storage is ephemeral; the seed restores prepared demo output, not new user changes |

Free-plan limits: https://render.com/docs/free

Background polling runs only while the service is awake. Uninterrupted monitoring and durable user data require persistent storage and an always-available scheduler later. The current app is a shared, single-user demonstration.

## 7. Later updates

Push changes to the connected branch. Check Render's auto-deploy/Blueprint sync settings and watch the resulting build. Update secrets through the Render Environment page; never commit a new key. Keep the same cloud URL in your submission.
