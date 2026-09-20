const STATUS_LABELS = {
  'reading': 'Reading',
  'want-to-read': 'Want to read',
  'finished': 'Finished'
};

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
  div.textContent = str;
  return div.innerHTML;
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

function bookEntryHTML(book) {
  const metaLines = [];
  metaLines.push(`<span class="book-status">${
      STATUS_LABELS[book.status] || book.status}</span>`);
  if (book.status === 'finished' && book.rating) {
    metaLines.push(renderStars(book.rating));
  }
  if (book.dateFinished) {
    metaLines.push(`<span>${formatDate(book.dateFinished)}</span>`);
  }

  const reviewHTML = book.review ?
      `<p class="book-review">${escapeHTML(book.review)}</p>` :
      '';

  return `
    <li class="book-entry" data-status="${book.status}">
      <div class="book-entry-head">
        <div>
          <p class="book-title">${escapeHTML(book.title)}</p>
          <p class="book-author">${escapeHTML(book.author)}</p>
        </div>
        <div class="book-meta">${metaLines.join('<br>')}</div>
      </div>
      ${reviewHTML}
    </li>
  `;
}

function collectionItemHTML(item) {
  const metaLines = [];
  metaLines.push(`<span class="book-status">${
      STATUS_LABELS[item.status] || item.status}</span>`);
  if (item.status === 'finished' && item.rating) {
    metaLines.push(renderStars(item.rating));
  }
  if (item.dateFinished) {
    metaLines.push(`<span>${formatDate(item.dateFinished)}</span>`);
  }

  const reviewHTML = item.review ?
      `<p class="collection-item-review">${escapeHTML(item.review)}</p>` :
      '';

  return `
    <li class="collection-item" data-status="${item.status}">
      <div class="collection-item-head">
        <div>
          <p class="collection-item-title">${escapeHTML(item.title)}</p>
          <p class="collection-item-author">${escapeHTML(item.author)}</p>
        </div>
        <div class="book-meta">${metaLines.join('<br>')}</div>
      </div>
      ${reviewHTML}
    </li>
  `;
}

function collectionEntryHTML(entry) {
  const label = entry.itemLabel || 'novellas';
  const itemsHTML = entry.items.map(collectionItemHTML).join('');

  return `
    <li class="book-entry book-collection">
      <div class="book-entry-head">
        <div>
          <p class="book-title">${escapeHTML(entry.title)}</p>
          <p class="book-author">${entry.items.length} ${escapeHTML(label)}</p>
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

function applyFilter(filter) {
  document.querySelectorAll('.book-entry:not(.book-collection)').forEach(el => {
    el.hidden = filter !== 'all' && el.dataset.status !== filter;
  });

  document.querySelectorAll('.book-collection').forEach(collectionEl => {
    let anyVisible = false;
    collectionEl.querySelectorAll('.collection-item').forEach(itemEl => {
      const matches = filter === 'all' || itemEl.dataset.status === filter;
      itemEl.hidden = !matches;
      if (matches) anyVisible = true;
    });
    collectionEl.hidden = !anyVisible;
  });
}

(async function init() {
  const books = await loadBooks();
  const listEl = document.getElementById('book-list');
  const emptyEl = document.getElementById('empty-state');

  if (books.length === 0) {
    emptyEl.hidden = false;
  } else {
    listEl.innerHTML =
        books
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
    applyFilter(btn.dataset.filter);
  });
})();
