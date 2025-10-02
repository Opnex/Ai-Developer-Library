   // Initialize state
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let books = JSON.parse(localStorage.getItem('books')) || [];
let users = JSON.parse(localStorage.getItem('users')) || [];


       // Load data from JSON
async function loadLibraryData() {
  try {
    const response = await fetch('library-data.json');
    const data = await response.json();
    
    if (books.length === 0) {
      books = data.books;
      localStorage.setItem('books', JSON.stringify(books));
    } else {
      books = JSON.parse(localStorage.getItem('books'));
    }
    
    if (users.length === 0) {
      localStorage.setItem('users', JSON.stringify(data.users));
    }

          // Initialize borrowing histories if they don't exist
    if (!localStorage.getItem('allBorrowingHistories')) {
      storeAllBorrowingHistories();
    }
  } catch (error) {
    console.error('Error loading library data:', error);
    showAlert('Failed to load book data. Some features may not work.', 'warning');
    localStorage.setItem('books', JSON.stringify([]));
    localStorage.setItem('users', JSON.stringify([]));
    return { users: [], books: [] };
  }
}

      // Save books to localStorage
function saveBooks() {
  localStorage.setItem('books', JSON.stringify(books));
}


      // Store all borrowing histories in localStorage
function storeAllBorrowingHistories() {
  const allHistories = {};

  books.forEach(book => {
    if (book.borrowHistory) {
      book.borrowHistory.forEach(entry => {
        if (!allHistories[entry.user]) {
          allHistories[entry.user] = [];
        }
        allHistories[entry.user].push({
          bookTitle: book.title,
          borrowDate: entry.borrowDate,
          returnDate: entry.returnDate || null,
        });
      });
    }
  });

  localStorage.setItem('allBorrowingHistories', JSON.stringify(allHistories));
}



        // Display books for user or librarian
function displayBooks() {
  const userBookList = document.getElementById('userBookList');
  const librarianBookList = document.getElementById('librarianBookList');
  if (userBookList) userBookList.innerHTML = '';
  if (librarianBookList) librarianBookList.innerHTML = '';

  const borrowedBooksList = document.getElementById('borrowedBooksList');
  if (borrowedBooksList) borrowedBooksList.innerHTML = '';
   

        // Sort books
  const sortedBooks = [...books].sort((a, b) => {
    if (a.isAvailable && !b.isAvailable) return -1;
    if (!a.isAvailable && b.isAvailable) return 1;
    return a.title.localeCompare(b.title);
  });
    
       // Display sorted book
  sortedBooks.forEach(book => {
    const bookCard = createBookCard(book);
    
    if (currentUser?.role === 'user' && userBookList) {
      if (book.isAvailable) {
        userBookList.appendChild(bookCard);
      }
      if (!book.isAvailable && book.borrowedBy === currentUser.username) {
        const borrowedCard = createBookCard(book, true);
        borrowedBooksList.appendChild(borrowedCard);
      }
    } else if (currentUser?.role === 'librarian' && librarianBookList) {
      librarianBookList.appendChild(bookCard);
    }
  });
     
         // Search functionality
  document.getElementById('searchButton')?.addEventListener('click', () => {
    const searchTerm = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
    const filteredBooks = books.filter(book =>
      searchTerm === '' ||
      book.title?.toLowerCase().includes(searchTerm) ||
      book.author?.toLowerCase().includes(searchTerm) ||
      book.genre?.toLowerCase().includes(searchTerm)
    );
    displaySearchResults(filteredBooks);
    // if (searchInput) searchInput.value = '';

  });

  document.getElementById('clearSearch')?.addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    displayBooks();
  });

          // Show/hide borrowed books section
  const myBorrowedBooks = document.getElementById('myBorrowedBooks');
  if (myBorrowedBooks) {
    const hasBorrowedBooks = books.some(book => 
      !book.isAvailable && book.borrowedBy === currentUser?.username
    );
    myBorrowedBooks.style.display = hasBorrowedBooks ? 'block' : 'none';
  }

  setTimeout(() => displayBorrowingHistory());
}

        // Create book card element
function createBookCard(book, isBorrowed = false, isPublic = false) {
  const bookCard = document.createElement('div');
  bookCard.className = `book-card ${book.isAvailable ? 'available' : 'not-available'} ${
    isBorrowed ? 'borrowed-card' : ''
  }`;
  
  const borrowDate = book.borrowDate ? new Date(book.borrowDate) : null;
  const dueDate = book.dueDate ? new Date(book.dueDate) : null;
  const imageUrl = book.bookImage || book.coverImage ;
  
  bookCard.innerHTML = `
    <div class="book-image-container">
      <img src="${imageUrl}" alt="${book.title} cover" class="book-cover">
      ${!book.isAvailable ? `
        <span class="book-status-badge">Borrowed</span>
      ` : ''}
    </div>
    <div class="book-info">
      <h4 class="book-title">${book.title}</h4>
      <p class="book-author">by ${book.author}</p>
      <div class="book-meta">
        <span class="book-genre">${book.genre}</span>
        <span class="badge ${book.isAvailable ? 'bg-success' : 'bg-danger'}">
          ${book.isAvailable ? 'Available' : 'Borrowed'}
        </span>
      </div>
      ${!book.isAvailable && borrowDate && dueDate && !isPublic ? `
        <div class="borrow-dates">
          <div class="date-item">
            <span class="date-label">Borrowed:</span>
            <span class="date-value">${borrowDate.toLocaleDateString()}</span>
          </div>
          <div class="date-item">
            <span class="date-label">Due:</span>
            <span class="date-value">${dueDate.toLocaleDateString()}</span>
          </div>
        </div>
      ` : ''}
      ${isPublic && !book.isAvailable ? `
        <p class="text-muted mt-2">Please register to borrow this book.</p>
      ` : ''}
    </div>
    <div class="book-actions">
      ${isPublic ? `
        <a href="#" class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#registerModal">Register to Borrow</a>
      ` : currentUser?.role === 'user' ? `
        <button class="btn btn-sm ${book.isAvailable ? 'btn-primary' : 'btn-secondary'}"
          onclick="handleBookAction(${book.id}, '${book.isAvailable ? 'borrow' : 'return'}')">
          ${book.isAvailable ? 'Borrow' : 'Return'}
        </button>
      ` : currentUser?.role === 'librarian' ? `
        <button class="btn btn-sm btn-danger delete-btn" style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.875rem;"
          onclick="handleBookAction(${book.id}, 'delete')"
          data-bs-toggle="tooltip" title="Delete this book">
          <i class="bi bi-trash"></i> Delete
        </button>
      ` : ''}
    </div>
  `;
  
  return bookCard;
}

        // Display search results
function displaySearchResults(filteredBooks) {
  const userBookList = document.getElementById('userBookList');
  const borrowedBooksList = document.getElementById('borrowedBooksList');
  if (!userBookList || !borrowedBooksList) return;

  userBookList.innerHTML = '';
  borrowedBooksList.innerHTML = '';

  if (filteredBooks.length === 0) {
    userBookList.innerHTML = '<p class="text-muted">No books found matching your search.</p>';
    return;
  }


          // Sort search results - available first
  const sortedResults = [...filteredBooks].sort((a, b) => {
    if (a.isAvailable && !b.isAvailable) return -1;
    if (!a.isAvailable && b.isAvailable) return 1;
    return 0;
  });
 
      // Render Books for User Based on Availability and Borrowing
  sortedResults.forEach(book => {
    const bookCard = createBookCard(book);
    
    if (currentUser?.role === 'user' && userBookList) {
      if (book.isAvailable) {
        userBookList.appendChild(bookCard);
      }
      if (!book.isAvailable && book.borrowedBy === currentUser.username) {
        const borrowedCard = createBookCard(book, true);
        borrowedBooksList.appendChild(borrowedCard);
      }
    }
  });
}


        // Display borrowing history
function displayBorrowingHistory() {
  const historySection = document.getElementById('borrowingHistory');
  if (!historySection) return;

  historySection.innerHTML = '';


       // For regular users: 
  if (currentUser?.role === 'user') {
    const userHistory = books
      .filter(book => book.borrowHistory?.some(entry => entry.user === currentUser.username))
      .flatMap(book => 
        book.borrowHistory
          .filter(entry => entry.user === currentUser.username)
          .map(entry => ({
            title: book.title,
            ...entry
          }))
      )
      .sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate));

    const historyHTML = `
      <div class="history-section-header">
        <h3>Your Borrowing History</h3>
      </div>
      ${userHistory.length === 0 ? 
        '<p class="text-muted">No borrowing history found</p>' : 
        `<div class="table-responsive">
          <table class="table table-hover">
            <thead class="table-light">
              <tr>
                <th>Book</th>
                <th>Borrowed</th>
                <th>Returned</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${userHistory.map(entry => `
                <tr>
                  <td>${entry.title}</td>
                  <td>${new Date(entry.borrowDate).toLocaleDateString()}</td>
                  <td>${entry.returnDate ? new Date(entry.returnDate).toLocaleDateString() : '-'}</td>
                  <td><span class="badge ${entry.returnDate ? 'bg-success' : 'bg-warning'}">${
                    entry.returnDate ? 'Returned' : 'Not returned'
                  }</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`
      }
    `;
    
    historySection.innerHTML = historyHTML;

       // For librarians: 
  } else if (currentUser?.role === 'librarian') {
    const allHistories = JSON.parse(localStorage.getItem('allBorrowingHistories')) || {};
    
    const historyHTML = `
      <div class="history-section-header">
        <h3>All Users' Borrowing Histories</h3>
      </div>
      <div class="librarian-history-view">
        ${Object.keys(allHistories).length === 0 ? 
          '<p class="text-muted">No borrowing histories found.</p>' : 
          Object.entries(allHistories).map(([user, entries]) => `
            <div class="user-history mb-4">
              <h5 class="user-history-header">${user}</h5>
              <div class="table-responsive">
                <table class="table table-sm table-striped">
                  <thead>
                    <tr>
                      <th>Book</th>
                      <th>Borrowed</th>
                      <th>Returned</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${entries.map(entry => `
                      <tr>
                        <td>${entry.bookTitle}</td>
                        <td>${new Date(entry.borrowDate).toLocaleDateString()}</td>
                        <td>${entry.returnDate ? new Date(entry.returnDate).toLocaleDateString() : '-'}</td>
                        <td><span class="badge ${
                          entry.returnDate ? 'bg-success' : 'bg-warning'
                        }">${entry.returnDate ? 'Returned' : 'Not returned'}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `).join('')}
      </div>
    `;
    
    historySection.innerHTML = historyHTML;
  }
}


        // Display public search results for non-logged-in users
function displayPublicSearchResults(filteredBooks) {
  const publicSearchResults = document.getElementById('publicSearchResults');
  console.log('Displaying public search results:', { publicSearchResults, filteredBooks });
  if (!publicSearchResults) {
    console.error('Public search results container not found');
    return;
  }

  publicSearchResults.innerHTML = '';

  if (!filteredBooks || filteredBooks.length === 0) {
    publicSearchResults.innerHTML = '<p style="color: white;">No books found. Try a different search term or check back later.</p>';
    publicSearchInput.value = "";
    return;
  }
  publicSearchInput.value = "";

  const validBooks = filteredBooks.filter(book => book.title && book.author && book.genre);
  if (validBooks.length === 0) {
    publicSearchResults.innerHTML = '<p class="text-muted">No valid books found in the library.</p>';
    return;
  }
  

  const sortedResults = [...validBooks].sort((a, b) => {
    if (a.isAvailable && !b.isAvailable) return -1;
    if (!a.isAvailable && b.isAvailable) return 1;
    return 0;
  });

  sortedResults.forEach(book => {
    const bookCard = createBookCard(book, false, true);
    publicSearchResults.appendChild(bookCard);
  });
}


        // Handle public search
function setupPublicSearch() {
  const publicSearchButton = document.getElementById('publicSearchButton');
  const publicSearchInput = document.getElementById('publicSearchInput');
  console.log('Public search setup:', { publicSearchButton, publicSearchInput });

  if (publicSearchButton && publicSearchInput) {
    publicSearchButton.addEventListener('click', async () => {
      if (currentUser) return;
      await loadLibraryData();
      const searchTerm = publicSearchInput.value.trim().toLowerCase();
      console.log('Public search term:', searchTerm);
      const filteredBooks = books.filter(book =>
        searchTerm === '' ||
        book.title?.toLowerCase().includes(searchTerm) ||
        book.author?.toLowerCase().includes(searchTerm) ||
        book.genre?.toLowerCase().includes(searchTerm)
      );
      displayPublicSearchResults(filteredBooks);
    });

    publicSearchInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter' && !currentUser) {
        await loadLibraryData();
        const searchTerm = publicSearchInput.value.trim().toLowerCase();
        console.log('Public search term (Enter):', searchTerm);
        const filteredBooks = books.filter(book =>
          searchTerm === '' ||
          book.title?.toLowerCase().includes(searchTerm) ||
          book.author?.toLowerCase().includes(searchTerm) ||
          book.genre?.toLowerCase().includes(searchTerm)
        );
      displayPublicSearchResults(filteredBooks);
      }
    });
  } else {
    console.error('Public search elements not found:', { publicSearchButton, publicSearchInput });
  }
}


        // Handle book actions
function handleBookAction(bookId, action) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;

  if (action === 'delete' && currentUser?.role === 'librarian') {
    if (!book.isAvailable) {
      showAlert(`Cannot delete "${book.title}" because it's currently borrowed.`, 'danger');
      return;
    }
    if (confirm('Are you sure you want to delete this book?')) {
      books = books.filter(b => b.id !== bookId);
      saveBooks();
      storeAllBorrowingHistories();
      displayBooks();
      showAlert(`"${book.title}" has been deleted from the library.`, 'danger');
    }
    return;
  }

  if (action === 'borrow' && book.isAvailable) {
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(now.getDate() + 14);
  
    book.isAvailable = false;
    book.borrowedBy = currentUser.username;
    book.borrowDate = now.toISOString();
    book.dueDate = dueDate.toISOString();
    
    if (!book.borrowHistory) book.borrowHistory = [];
    book.borrowHistory.push({
      user: currentUser.username,
      borrowDate: now.toISOString()
    });
  
    saveBooks();
    storeAllBorrowingHistories();
    displayBooks();
    showAlert(`You borrowed "${book.title}". Due on ${dueDate.toLocaleDateString()}`, 'success');
  } else if (action === 'return' && !book.isAvailable && book.borrowedBy === currentUser.username) {
    book.isAvailable = true;
    

    
    const historyEntry = book.borrowHistory?.find(
      entry => entry.user === currentUser.username && !entry.returnDate
    );
    if (historyEntry) {
      historyEntry.returnDate = new Date().toISOString();
    }
    
    delete book.borrowedBy;
    delete book.borrowDate;
    delete book.dueDate;
    
    saveBooks();
    storeAllBorrowingHistories();
    displayBooks();
    showAlert(`You have successfully returned "${book.title}".`, 'warning');
  }
}


        // Show alert notification
function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) {
    console.warn('Alert container not found');
    return;
  }

  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.role = 'alert';
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  alertContainer.appendChild(alert);

  setTimeout(() => {
    alert.classList.remove('show');
    setTimeout(() => alert.remove(), 100);
  }, 3000);
}


      // Show/hide sections based on login state
async function updateUI() {
  const heroSection = document.getElementById('heroSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const userDashboard = document.getElementById('userDashboard');
  const librarianDashboard = document.getElementById('librarianDashboard');
  const welcomeMessage = document.getElementById('welcomeMessage');
  const logoutButton = document.getElementById('logoutButton');
  const loginButton = document.getElementById('loginButton');
  const historySection = document.getElementById('borrowingHistory');
  const publicSearchContainer = document.querySelector('.search-container');
  const publicSearchResults = document.getElementById('publicSearchResults');

  
              // Load users and books
  await loadLibraryData();
  if (currentUser) {
    if (heroSection) heroSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'block';
    if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${currentUser.username}!`;
    if (userDashboard) {
      userDashboard.style.display = currentUser.role === 'user' ? 'block' : 'none';
    }
    if (librarianDashboard) {
      librarianDashboard.style.display = currentUser.role === 'librarian' ? 'block' : 'none';
    }
    if (logoutButton) logoutButton.style.display = 'block';
    if (loginButton) loginButton.style.display = 'none';
    if (publicSearchContainer) publicSearchContainer.style.display = 'none';
    if (publicSearchResults) publicSearchResults.innerHTML = '';



           // Only display books and history when logged in

    if (currentUser.role === 'librarian') {
    displayLibraryStatistics();
  }
    displayBooks();
  } else {
    if (heroSection) heroSection.style.display = 'flex';
    if (dashboardSection) dashboardSection.style.display = 'none';
    if (userDashboard) userDashboard.style.display = 'none';
    if (librarianDashboard) librarianDashboard.style.display = 'none';
    if (logoutButton) logoutButton.style.display = 'none';
    if (loginButton) loginButton.style.display = 'block';
    if (publicSearchContainer) publicSearchContainer.style.display = 'block';
    if (historySection) historySection.innerHTML = '';
  }
}


       // Handle login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const loginError = document.getElementById('loginError');

  const users = JSON.parse(localStorage.getItem('users')) || [];
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    if (loginError) loginError.style.display = 'none';
    const loginModal = document.getElementById('loginModal');
    if (loginModal) bootstrap.Modal.getInstance(loginModal)?.hide();
    await updateUI();
  } else {
    if (loginError) {
      loginError.textContent = 'Invalid username or password.';
      loginError.style.display = 'block';
    }
  }
});


      // Handle registration
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value;
  const registerError = document.getElementById('registerError');

  if (!username || !password) {
    if (registerError) {
      registerError.textContent = 'Please enter a username and password.';
      registerError.style.display = 'block';
    }
    return;
  }

  const users = JSON.parse(localStorage.getItem('users')) || [];

  if (users.some(user => user.username === username)) {
    if (registerError) {
      registerError.textContent = 'Username already exists. Please choose another one.';
      registerError.style.display = 'block';
    }
    return;
  }

  const newUser = { username: username, password: password, role: 'user' };
  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));

  if (registerError) registerError.style.display = 'none';
  const registerModal = document.getElementById('registerModal');
  if (registerModal) bootstrap.Modal.getInstance(registerModal)?.hide();
  showAlert('Registration successful! You can now log in.', 'success');

  const loginModal = document.getElementById('loginModal');
  if (loginModal) {
    const bsLoginModal = bootstrap.Modal.getOrCreateInstance(loginModal);
    bsLoginModal.show();
  }
});


      // Handle add book form
document.getElementById('addBookForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (currentUser?.role !== 'librarian') return;

  const title = document.getElementById('bookTitle').value.trim();
  const author = document.getElementById('bookAuthor').value.trim();
  const genre = document.getElementById('bookGenre').value.trim();
  const bookImage = document.getElementById('bookCover').value.trim() ;

  if (title && author && genre) {
    const newId = books.length ? Math.max(...books.map(b => b.id)) + 1 : 1;
    books.push({ 
      id: newId, 
      title, 
      author, 
      genre, 
      isAvailable: true, 
      bookImage,
      borrowHistory: [] 
    });
    saveBooks();
    displayBooks();
    showAlert(`"${title}" has been added to the library.`, 'success');
    const addBookForm = document.getElementById('addBookForm');
    if (addBookForm) addBookForm.reset();
  }
});


    // Handle logout
document.getElementById('logoutButton')?.addEventListener('click', () => {
  currentUser = null;
  localStorage.removeItem('currentUser');
  updateUI();
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  if (loginForm) loginForm.reset();
  if (loginError) loginError.style.display = 'none';
});

     
    // Initialize public search and tooltips when the page loads
document.addEventListener('DOMContentLoaded', () => {
  setupPublicSearch();
       

   // Initialize Bootstrap tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(element => new bootstrap.Tooltip(element));
});

    // Initial UI update
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
});

 

      // statitics for librarian dashboard
function getLibraryStatistics() {
  const totalBooks = books.length;
  const availableBooks = books.filter(book => book.isAvailable).length;
  const borrowedBooks = totalBooks - availableBooks;
  
  
     // Find most borrowed book
  let mostBorrowedBook = null;
  let maxBorrows = 0;
  
  books.forEach(book => {
    const borrowCount = book.borrowHistory?.length || 0;
    if (borrowCount > maxBorrows) {
      maxBorrows = borrowCount;
      mostBorrowedBook = book;
    }
  });
  
  return {
    totalBooks,
    availableBooks,
    borrowedBooks,
    mostBorrowedBook: mostBorrowedBook ? {
      title: mostBorrowedBook.title,
      borrowCount: maxBorrows
    } : null
  };
}

function displayLibraryStatistics() {
  const statsContainer = document.getElementById('libraryStatistics');
  if (!statsContainer || currentUser?.role !== 'librarian') {
    return;
  }

  const stats = getLibraryStatistics();
  
  statsContainer.innerHTML = `
    <div class="row g-4">
      <div class="col-md-3">
        <div class="stat-card card h-100">
          <div class="card-body">
            <h5 class="card-title">Total Books</h5>
            <p class="stat-value">${stats.totalBooks}</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card card h-100">
          <div class="card-body">
            <h5 class="card-title">Available</h5>
            <p class="stat-value text-success">${stats.availableBooks}</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card card h-100">
          <div class="card-body">
            <h5 class="card-title">Borrowed</h5>
            <p class="stat-value text-warning">${stats.borrowedBooks}</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card card h-100">
          <div class="card-body">
            <h5 class="card-title">Most Popular</h5>
            <p class="stat-value">${stats.mostBorrowedBook ? 
              `${stats.mostBorrowedBook.title} (${stats.mostBorrowedBook.borrowCount} borrows)` : 
              'No data'}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}