# Reading Log

A tiny static site for tracking what you're reading and writing reviews once you finish. No build step, no server, no database — just files.

## Files

- `index.html` — the page structure
- `style.css` — all styling
- `app.js` — loads `books.json` and renders the list
- `books.json` — **this is the file you edit** to add books and reviews

## Adding a book or writing a review

Open `books.json` and add an entry to the array:

```json
{
  "title": "Book Title",
  "author": "Author Name",
  "status": "reading",
  "dateFinished": "2026-09-01",
  "rating": 4,
  "review": "Your thoughts here."
}
```

Field notes:

- `status` — one of `"want-to-read"`, `"reading"`, or `"finished"`
- `dateFinished`, `rating`, `review` — optional; only add them once you've actually finished the book
- `rating` — a number from 1 to 5

Save the file, commit, and push — the live site updates automatically once GitHub Pages rebuilds (usually under a minute).

## Previewing locally

Opening `index.html` directly by double-clicking it won't work — browsers block a local page from fetching a local JSON file. Instead, run a tiny local server from inside the folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

## Deploying with GitHub Pages

1. **Create a repository.** On GitHub, click **New repository**, give it a name (e.g. `reading-log`), and create it.
2. **Push these files to it.** From inside this folder:
   ```bash
   git init
   git add .
   git commit -m "Initial reading log"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/reading-log.git
   git push -u origin main
   ```
   (No git experience? You can also drag-and-drop these files into the repo through GitHub's web UI using "Add file → Upload files.")
3. **Turn on Pages.** In the repository, go to **Settings → Pages**. Under "Build and deployment," set **Source** to "Deploy from a branch," choose the **main** branch and the **/ (root)** folder, then click **Save**.
4. **Visit your site.** After a minute or so, it'll be live at:
   ```
   https://YOUR-USERNAME.github.io/reading-log/
   ```

From then on, updating your reading log is just: edit `books.json` → commit → push.
