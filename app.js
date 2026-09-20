const STATUS_LABELS = {
  'reading': 'Reading',
  'want-to-read': 'Want to read',
  'finished': 'Finished'
};

let currentFilter = 'all';
let currentSearch = '';

async function loadBooks() {
  try {
    const res = await fetch('books.json');
    if (!res.ok) throw new Error('Could not load books.json');
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

// Like escapeHTML, but also escapes quotes so the result is safe to drop
// straight into a double-quoted HTML attribute (e.g. data-search="...").
function escapeAttr(str) {
  return escapeHTML(str).replace(/"/g, '&quot;');
}

function searchText(...parts) {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

// "books" -> "book" when there's only one; "novellas" -> "novella"; etc.
function pluralize(label, count) {
  if (count === 1 && label.endsWith('s')) {
    return label.slice(0, -1);
  }
  return label;
}

function stripLeadingArticle(text) {
  return text.replace(/^(the|a|an)\s+/i, '');
}

// Sorts author entries (single books and author collections) by last name;
// entries with no author (anonymous works, themed collections without an
// author) fall back to sorting by title instead.
function sortKey(entry) {
  const author = entry.author;
  if (author) {
    const tokens = author.trim().split(/\s+/);
    return tokens[tokens.length - 1].toLowerCase();
  }
  const title = entry.title || '';
  return stripLeadingArticle(title.trim()).toLowerCase();
}

function sortEntries(books) {
  return [...books].sort(
      (a, b) => sortKey(a).localeCompare(
          sortKey(b), undefined, {sensitivity: 'base'}));
}

function renderStars(rating) {
  const pct = Math.max(0, Math.min(5, rating)) / 5 * 100;
  const display = Number.isInteger(rating) ? rating : rating.toFixed(1);
  return `<span class="book-rating" aria-label="${display} out of 5 stars">
    <span class="stars-base">★★★★★</span>
    <span class="stars-fill" style="width:${pct}%">★★★★★</span>
  </span>`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', {month: 'short', year: 'numeric'});
}

function metaLinesHTML(entry) {
  const metaLines = [];
  metaLines.push(`<span class="book-status">${
      STATUS_LABELS[entry.status] || entry.status}</span>`);
  if (entry.status === 'finished' && entry.rating) {
    metaLines.push(renderStars(entry.rating));
  }
  if (entry.dateFinished) {
    metaLines.push(`<span>${formatDate(entry.dateFinished)}</span>`);
  }
  return metaLines.join('<br>');
}

function bookEntryHTML(book) {
  const reviewHTML = book.review ?
      `<p class="book-review">${escapeHTML(book.review)}</p>` :
      '';
  const authorHTML = book.author ?
      `<p class="book-author">${escapeHTML(book.author)}</p>` :
      '';
  const search = escapeAttr(searchText(book.title, book.author));

  return `
    <li class="book-entry" data-status="${book.status}" data-search="${search}">
      <div class="book-entry-head">
        <div>
          <p class="book-title">${escapeHTML(book.title)}</p>
          ${authorHTML}
        </div>
        <div class="book-meta">${metaLinesHTML(book)}</div>
      </div>
      ${reviewHTML}
    </li>
  `;
}

// showAuthor: false when the item's author is already shown once, in the
// parent group's heading (an author-based collection) — avoids repeating it.
function collectionItemHTML(item, {showAuthor = true} = {}) {
  const reviewHTML = item.review ?
      `<p class="collection-item-review">${escapeHTML(item.review)}</p>` :
      '';
  const authorHTML = showAuthor && item.author ?
      `<p class="collection-item-author">${escapeHTML(item.author)}</p>` :
      '';
  const search = escapeAttr(searchText(item.title, item.author));

  return `
    <li class="collection-item" data-status="${item.status}" data-search="${
      search}">
      <div class="collection-item-head">
        <div>
          <p class="collection-item-title">${escapeHTML(item.title)}</p>
          ${authorHTML}
        </div>
        <div class="book-meta">${metaLinesHTML(item)}</div>
      </div>
      ${reviewHTML}
    </li>
  `;
}

// A collection groups several books into one condensed block. Give it an
// "author" to group everything by the same author (author name is written
// once, in the heading); give it a "title" instead for an arbitrary themed
// group (e.g. "Novellas") whose items keep their own author lines.
function collectionEntryHTML(entry) {
  const heading = entry.author || entry.title || '';
  const label = entry.itemLabel || 'books';
  const showAuthor = !entry.author;
  const itemsHTML =
      entry.items.map(item => collectionItemHTML(item, {showAuthor})).join('');
  const search = escapeAttr(searchText(heading));

  return `
    <li class="book-entry book-collection" data-search="${search}">
      <div class="book-entry-head">
        <div>
          <p class="book-title">${escapeHTML(heading)}</p>
          <p class="book-author">${entry.items.length} ${
      escapeHTML(pluralize(label, entry.items.length))}</p>
        </div>
      </div>
      <ul class="collection-items">
        ${itemsHTML}
      </ul>
    </li>
  `;
}

function flattenEntries(books) {
  const flat = [];
  books.forEach(entry => {
    if (entry.type === 'collection' && Array.isArray(entry.items)) {
      entry.items.forEach(item => flat.push(item));
    } else {
      flat.push(entry);
    }
  });
  return flat;
}

function renderStats(books) {
  const finished = books.filter(b => b.status === 'finished').length;
  const reading = books.filter(b => b.status === 'reading').length;
  const wantToRead = books.filter(b => b.status === 'want-to-read').length;
  const parts = [];
  if (finished) parts.push(`${finished} finished`);
  if (reading) parts.push(`${reading} reading`);
  if (wantToRead) parts.push(`${wantToRead} to read`);
  document.getElementById('stats').textContent = parts.join(', ');
}

function matchesSearch(text) {
  return !currentSearch || (text || '').includes(currentSearch);
}

function updateVisibility() {
  let anyResultVisible = false;
  const allEntries = document.querySelectorAll('.book-entry');

  document.querySelectorAll('.book-entry:not(.book-collection)').forEach(el => {
    const statusOk =
        currentFilter === 'all' || el.dataset.status === currentFilter;
    const searchOk = matchesSearch(el.dataset.search);
    const visible = statusOk && searchOk;
    el.hidden = !visible;
    if (visible) anyResultVisible = true;
  });

  document.querySelectorAll('.book-collection').forEach(collectionEl => {
    // If the search matches the group's own heading (e.g. the author name),
    // treat every item in the group as a match so the whole author shows up.
    const groupMatches = matchesSearch(collectionEl.dataset.search);
    let anyItemVisible = false;
    collectionEl.querySelectorAll('.collection-item').forEach(itemEl => {
      const statusOk =
          currentFilter === 'all' || itemEl.dataset.status === currentFilter;
      const searchOk = groupMatches || matchesSearch(itemEl.dataset.search);
      const visible = statusOk && searchOk;
      itemEl.hidden = !visible;
      if (visible) anyItemVisible = true;
    });
    collectionEl.hidden = !anyItemVisible;
    if (anyItemVisible) anyResultVisible = true;
  });

  const noResultsEl = document.getElementById('no-results');
  if (noResultsEl) {
    noResultsEl.hidden = anyResultVisible || allEntries.length === 0;
  }
}

(async function init() {
  const books = await loadBooks();
  const listEl = document.getElementById('book-list');
  const emptyEl = document.getElementById('empty-state');

  if (books.length === 0) {
    emptyEl.hidden = false;
  } else {
    listEl.innerHTML =
        sortEntries(books)
            .map(
                entry =>
                    (entry.type === 'collection' ? collectionEntryHTML(entry) :
                                                   bookEntryHTML(entry)))
            .join('');
  }

  renderStats(flattenEntries(books));

  document.getElementById('filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn')
        .forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    currentFilter = btn.dataset.filter;
    updateVisibility();
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    currentSearch = e.target.value.trim().toLowerCase();
    updateVisibility();
  });
})();