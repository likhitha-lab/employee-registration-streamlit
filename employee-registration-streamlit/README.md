# Employee Registration Form (Streamlit)

Streamlit version of the Employee Registration Form. It uses a clean form layout with purple accents. There is no database and no authentication; all state lives in the user's Streamlit session.

## Behavior

1. Enter Full Name, Work Email and Department.
2. Click the large **Review your information** section.
   - Additional Details (Location, Comments) appears.
   - "Review section opened successfully." is displayed.
   - The section turns green.
   - Submit is enabled.
3. Click **Submit**. "Form submitted successfully." is displayed. Nothing is stored or sent anywhere.

Submit is disabled until the review section has been opened.

Streamlit buttons respond to a single click; Streamlit has no built-in double-click event.

## Streamlit keys for testing

| Key | Element |
|-----|---------|
| `full_name` | Full Name text input |
| `work_email` | Work Email text input |
| `department` | Department select box |
| `review_section` | Review your information button |
| `submit_button` | Submit button |
| `review_success` | Container holding "Review section opened successfully." |
| `submit_success` | Container holding "Form submitted successfully." |

Widget keys work with `streamlit.testing.v1.AppTest`, for example `at.button(key="review_section").click().run()`.

In the browser, every keyed element also gets the CSS class `st-key-<key>`, for example `.st-key-review_success`, for Playwright or Selenium selectors.

## Run locally

Requires Python 3.10 or later.

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
streamlit run app.py
```

Open http://localhost:8501.

To use port 8080 instead:

```bash
streamlit run app.py --server.port 8080
```

## Project structure

```
employee-registration-streamlit/
  app.py                 Streamlit app (no external files, database or secrets)
  requirements.txt       Python dependencies (Streamlit only)
  .streamlit/config.toml Theme and server settings, used locally and on Streamlit Cloud
  .gitignore             Excludes .venv, caches and secrets
  README.md
```

The app reads no local files, environment variables or secrets. The files above are all it needs.

## Push to GitHub

These steps publish this folder as the root of a new repository, which is the simplest setup for Streamlit Cloud.

1. On https://github.com/new, create an empty repository, for example `employee-registration-streamlit`. Do not add a README, `.gitignore` or license, so the first push does not conflict.
2. In a terminal, from this folder:

   ```bash
   git init
   git add .
   git status        # confirm .venv/ and __pycache__/ are NOT listed
   git commit -m "Add Employee Registration Form Streamlit app"
   git branch -M main
   git remote add origin https://github.com/<your-account>/employee-registration-streamlit.git
   git push -u origin main
   ```

   Alternatively, with the GitHub CLI:

   ```bash
   git init && git add . && git commit -m "Add Employee Registration Form Streamlit app"
   gh repo create employee-registration-streamlit --private --source . --push
   ```

3. On GitHub, confirm the repository root contains `app.py`, `requirements.txt` and `.streamlit/config.toml`.

**If the app is in a subfolder of a larger repository instead:** set the main file path to `employee-registration-streamlit/app.py` when deploying. Streamlit Cloud reads `.streamlit/config.toml` from the repository root, so move or copy the `.streamlit` folder to the root; otherwise the app runs with the default theme settings.

## Deploy to Streamlit Community Cloud

1. Sign in at https://share.streamlit.io with GitHub and authorize Streamlit to access your repositories. For a private repository, grant access to private repositories when prompted.
2. Select **Create app**, then choose to deploy from a GitHub repository (wording may vary slightly).
3. Fill in:
   - **Repository**: `<your-account>/employee-registration-streamlit`
   - **Branch**: `main`
   - **Main file path**: `app.py`
   - **App URL**: optional custom subdomain
4. Open **Advanced settings** and select Python 3.11 or 3.12. Leave **Secrets** empty; the app needs none.
5. Select **Deploy**. Streamlit Cloud installs `requirements.txt` and starts the app. The first build takes a few minutes.
6. Open the app URL and run the smoke test below.
7. Every push to `main` redeploys automatically. To update: edit, `git commit`, `git push`.

If the build fails, open **Manage app** (bottom right of the deployed app) to view the logs.

### Smoke test after deployment

1. The page shows "Employee Registration Form" with Full Name, Work Email and Department.
2. Submit is disabled.
3. Click **Review your information**. "Review section opened successfully." appears, Location and Comments appear, and Submit is enabled.
4. Click **Submit**. "Form submitted successfully." appears.

### Visibility

Apps deployed from a public repository are public. Apps from a private repository can be restricted to invited viewers in the app's **Share** settings. The app has no authentication, so do not enter real personal data during testing.
