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


    window.addEventListener('resize', () => {
        updateScrollIndicator(); // Recalculate on resize
    });
    
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