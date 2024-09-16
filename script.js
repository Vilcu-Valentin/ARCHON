let iconConfig = {};
let scrollIndicator;
let totalSquares = 20; // Total number of squares in the scroll indicator

// Fetch and load icon configuration first
fetch('icons.json')
    .then(response => response.json())
    .then(data => {
        iconConfig = data;
        return fetch('files.json');
    })
    .then(response => response.json())
    .then(data => {
        loadFiles(data);
        initializeScrollIndicator(); // Initialize the scroll indicator after files are loaded
    })
    .catch(error => console.error('Error loading files:', error));

document.getElementById('search-bar').addEventListener('input', filterFiles);

function filterFiles() {
    const query = document.getElementById('search-bar').value.trim();
    const fileGrid = document.getElementById('file-grid');
    fileGrid.innerHTML = ''; // Clear current files

    fetch('files.json')
        .then(response => response.json())
        .then(files => {
            const filteredFiles = processQuery(query, files);
            loadFiles(filteredFiles);
        })
        .catch(error => console.error('Error filtering files:', error));
}

function processQuery(query, files) {
    let filters = [];
    let sortOrder = null;
    let sortField = null;

    // Check for tags like <document> or sorting indicators like %>name%
    const tagPattern = /<([^>]+)>/g;
    const sortPattern = /%([<>])([^%]+)%/g;

    let match;
    // Extract tags
    while ((match = tagPattern.exec(query)) !== null) {
        filters.push(match[1].toLowerCase());
    }

    // Extract sorting
    while ((match = sortPattern.exec(query)) !== null) {
        sortOrder = match[1] === '>' ? 'asc' : 'desc';
        sortField = match[2].toLowerCase();
    }

    // Remove tags and sorting from the search query
    query = query.replace(tagPattern, '').replace(sortPattern, '').trim().toLowerCase();

    // Filter files based on the query and tags
    let filteredFiles = files.filter(file => {
        const fileType = file.type.toLowerCase();
        const fileName = file.name.toLowerCase();

        let matchesType = filters.length === 0 || filters.some(filter => fileType.includes(filter));
        let matchesName = !query || fileName.startsWith(query);

        return matchesType && matchesName;
    });

    // Sort the files if a sort order is defined
    if (sortField) {
        filteredFiles = sortFiles(filteredFiles, sortField, sortOrder);
    }

    return filteredFiles;
}

function sortFiles(files, field, order) {
    return files.sort((a, b) => {
        let valueA, valueB;
        if (field === 'name') {
            valueA = a.name.toLowerCase();
            valueB = b.name.toLowerCase();
        } else if (field === 'size') {
            valueA = parseFloat(a.size);
            valueB = parseFloat(b.size);
        } else if (field === 'date') {
            valueA = new Date(a.date);
            valueB = new Date(b.date);
        } else if (field === 'type') {
            const typeOrder = ['file', 'text', 'document', 'audio', 'video'];
            valueA = typeOrder.indexOf(a.type.toLowerCase());
            valueB = typeOrder.indexOf(b.type.toLowerCase());
        }

        if (order === 'asc') {
            return valueA > valueB ? 1 : -1;
        } else {
            return valueA < valueB ? 1 : -1;
        }
    });
}

// Function to load the files and set up sequential loading
function loadFiles(files) {
    const fileGrid = document.getElementById('file-grid');

    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.classList.add('file-item');
        fileItem.classList.add(file.corrupted ? 'locked' : 'unlocked');

        // Determine the icon based on file type from the configuration
        const iconPath = iconConfig[file.type] || '/default.png'; // Fallback icon if type not found

        // Prepare HTML content
        fileItem.innerHTML = `
            <img class="file-icon" src="TempIconsSaveFile${iconPath}" alt="File Icon">
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-date">${file.date}</div>
            </div>
            <div class="file-size">${file.size}</div>
        `;

        // Attach click event to open file if unlocked
        if (!file.corrupted) {
            fileItem.addEventListener('click', () => {
                window.open(file.path, '_blank'); // Opens the file in a new tab
            });
        }

        // Append to grid and set opacity to 0 initially
        fileItem.style.opacity = 0;
        fileGrid.appendChild(fileItem);

        // Sequential fade-in effect
        setTimeout(() => {
            fileItem.style.transition = 'opacity 0.25s ease-out';
            fileItem.style.opacity = 1;
        }, index * 250); // Delay of 0.25s per file (sequential)
    });
}

function performSearch() {
    const query = document.getElementById('search-bar').value.trim();
    
    if (query === '') {
        alert('Please enter a search term');
        return;
    }

    const queryParts = query.split('%');
    let filterTags = [];
    let sortOrder = null;
    
    // Handle sorting part (if it exists in the query)
    if (queryParts.length > 1) {
        sortOrder = queryParts[1].trim();
    }

    const fileTypes = ['document', 'text', 'file', 'audio', 'video'];
    const filteredFiles = files.filter(file => {
        const fileName = file.name.toLowerCase();
        let match = false;
        
        // Extract tags
        filterTags = query.match(/<.*?>/g);
        if (filterTags) {
            filterTags = filterTags.map(tag => tag.replace(/[<>]/g, '').toLowerCase());
        }

        // If there are no tags, search by name
        if (!filterTags || filterTags.length === 0) {
            return fileName.startsWith(query.toLowerCase());
        }

        // Apply tag filters
        if (filterTags.includes(file.type)) {
            if (query.match(/[<>].*$/)) {
                const nameQuery = query.replace(/<.*?>/g, '').trim().toLowerCase();
                if (fileName.startsWith(nameQuery)) {
                    match = true;
                }
            } else {
                match = true;
            }
        }

        return match;
    });

    // Handle sorting by name, size, type, or date
    if (sortOrder) {
        const orderChar = sortOrder.charAt(0);
        const orderType = sortOrder.substring(1).toLowerCase();

        if (orderType === 'name') {
            filteredFiles.sort((a, b) => orderChar === '>' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
        } else if (orderType === 'size') {
            filteredFiles.sort((a, b) => orderChar === '>' ? a.size - b.size : b.size - a.size);
        } else if (orderType === 'type') {
            filteredFiles.sort((a, b) => orderChar === '>' ? fileTypes.indexOf(a.type) - fileTypes.indexOf(b.type) : fileTypes.indexOf(b.type) - fileTypes.indexOf(a.type));
        } else if (orderType === 'date') {
            filteredFiles.sort((a, b) => orderChar === '>' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date));
        }
    }

    displayFiles(filteredFiles);
}

function displayFiles(filteredFiles) {
    const fileGrid = document.getElementById('file-grid');
    fileGrid.innerHTML = ''; // Clear existing files

    filteredFiles.forEach((file, index) => {
        // Add your logic to render the filtered files
    });
}


// Initialize scroll indicator
function initializeScrollIndicator() {
    scrollIndicator = document.getElementById('scroll-indicator');
    const container = document.querySelector('.file-system-container');
    
    // Create squares for the scroll indicator
    for (let i = 0; i < totalSquares; i++) {
        const square = document.createElement('div');
        square.classList.add('scroll-square');
        scrollIndicator.appendChild(square);
    }

    // Add scroll event listener
    container.addEventListener('scroll', updateScrollIndicator);
    
    // Add resize event listener
    window.addEventListener('resize', updateScrollIndicator);
    
    // Initial update
    updateScrollIndicator();
}

// Update scroll indicator based on scroll position
function updateScrollIndicator() {
    const container = document.querySelector('.file-system-container');
    const totalHeight = container.scrollHeight - container.clientHeight;
    const scrollTop = container.scrollTop;

    // Recalculate totalSquares based on container height
    const containerHeight = container.clientHeight;
    totalSquares = Math.max(Math.floor(containerHeight / 20), 5); // Minimum of 5 squares

    // Adjust the number of squares in the indicator
    const currentSquares = scrollIndicator.children.length;
    if (currentSquares < totalSquares) {
        for (let i = currentSquares; i < totalSquares; i++) {
            const square = document.createElement('div');
            square.classList.add('scroll-square');
            scrollIndicator.appendChild(square);
        }
    } else if (currentSquares > totalSquares) {
        for (let i = currentSquares - 1; i >= totalSquares; i--) {
            scrollIndicator.removeChild(scrollIndicator.children[i]);
        }
    }

    // Update square height
    const squareHeight = 100 / totalSquares;
    const squares = scrollIndicator.getElementsByClassName('scroll-square');
    for (let square of squares) {
        square.style.height = `${squareHeight}%`;
    }
    
    // Show scroll indicator only if scrolling is possible
    scrollIndicator.style.display = totalHeight > 0 ? 'block' : 'none';

    if (totalHeight > 0) {
        const percentageScrolled = scrollTop / totalHeight;
        const selectedSquare = Math.min(
            Math.floor(percentageScrolled * totalSquares),
            totalSquares - 1
        );

        // Update the background of each square
        for (let i = 0; i < squares.length; i++) {
            if (i === selectedSquare) {
                squares[i].style.backgroundImage = "url('/TempIconsSaveFile/SelectedScroll.png')";
            } else {
                squares[i].style.backgroundImage = "url('/TempIconsSaveFile/UnselectedScroll.png')";
            }
        }
    }
}