let iconConfig = {};
let scrollIndicator;
let totalSquares = 20;
let currentPath = 'root';

function getRandomInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function showFilePopup(file, fileElement) {
    const overlay = document.createElement('div');
    overlay.classList.add('modal-overlay');
    document.body.appendChild(overlay);

    const popup = document.createElement('div');
    popup.classList.add('file-popup');

    const loadingBarContainer = document.createElement('div');
    loadingBarContainer.classList.add('loading-bar-container');
    const loadingBar = document.createElement('div');
    loadingBar.classList.add('loading-bar');
    loadingBarContainer.appendChild(loadingBar);

    const loadingText = document.createElement('div');
    loadingText.classList.add('loading-text');
    loadingText.innerText = 'Discovering file...';

    popup.appendChild(loadingText);
    popup.appendChild(loadingBarContainer);
    document.body.appendChild(popup);

    let progress = 0;
    const minInterval = 100;
    const maxInterval = 300;

    function updateProgress() {
        progress += 10;
        loadingBar.style.width = progress + '%';

        if (progress === 20) {
            loadingText.innerText = 'Analyzing data...';
        } else if (progress === 40) {
            loadingText.innerText = 'Processing file...';
        } else if (progress === 90) {
            loadingText.innerText = 'Finalizing...';
        }

        if (progress >= 100) {
            clearInterval(interval);

            if (file.corrupted) {
                loadingText.innerText = 'WARNING: File is corrupted';
                loadingText.classList.add('corrupted-text');
                fileElement.classList.add('corrupted');
                applyFileStyles(fileElement, 'corrupted');
                sessionStorage.setItem(file.path, 'corrupted');
                addCloseButton(popup, overlay);
            } else if (file.locked && file.locked > 0) {
                loadingText.innerText = `Locked by Administrator\nLevel Access Required: ${file.locked}`;
                loadingText.classList.add('locked-text');
                fileElement.classList.add('locked');
                applyFileStyles(fileElement, 'locked');
                sessionStorage.setItem(file.path, `locked-${file.locked}`);
                addCloseButton(popup, overlay);
            } else {
                document.body.removeChild(popup);
                document.body.removeChild(overlay);
                if (file.type === 'file') {
                    navigateToFolder(file.name);
                } else {
                    window.open(file.path, '_blank');
                }
            }
        }
    }

    updateProgress();
    const interval = setInterval(() => updateProgress(), getRandomInterval(minInterval, maxInterval));
}

function applyFileStyles(fileElement, status) {
    const fileNameElement = fileElement.querySelector('.file-name');
    const fileDateElement = fileElement.querySelector('.file-date');
    const fileSizeElement = fileElement.querySelector('.file-size');

    if (status === 'corrupted') {
        if (fileNameElement) fileNameElement.classList.add('corrupted');
        if (fileDateElement) fileDateElement.classList.add('corrupted');
        if (fileSizeElement) fileSizeElement.classList.add('corrupted');
    } else if (status === 'locked') {
        if (fileNameElement) fileNameElement.classList.add('locked');
        if (fileDateElement) fileDateElement.classList.add('locked');
        if (fileSizeElement) fileSizeElement.classList.add('locked');
    }
}

function addCloseButton(popup, overlay) {
    const closeButton = document.createElement('button');
    closeButton.innerText = 'Close';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
    });
    popup.appendChild(closeButton);
}

function navigateToFolder(folderName) {
    currentPath = currentPath === 'root' ? folderName : `${currentPath}/${folderName}`;
    updateFilePath();
    loadFilesForCurrentPath();
}

function updateFilePath() {
    const filePathElement = document.getElementById('file-path');
    filePathElement.innerHTML = `<b>File path:</b> ${currentPath}/`;
}

function loadFilesForCurrentPath() {
    fetch('files.json')
        .then(response => response.json())
        .then(data => {
            const filteredFiles = data.filter(file => file.parent === currentPath);
            loadFiles(filteredFiles);
            initializeScrollIndicator();
        })
        .catch(error => console.error('Error loading files:', error));
}

document.getElementById('search-bar').addEventListener('input', filterFiles);
document.getElementById('back-button').addEventListener('click', navigateBack);

function navigateBack() {
    if (currentPath !== 'root') {
        const pathParts = currentPath.split('/');
        pathParts.pop();
        currentPath = pathParts.join('/') || 'root';
        updateFilePath();
        loadFilesForCurrentPath();
    }
}

function filterFiles() {
    const query = document.getElementById('search-bar').value.trim();
    const fileGrid = document.getElementById('file-grid');
    fileGrid.innerHTML = '';

    fetch('files.json')
        .then(response => response.json())
        .then(files => {
            const filteredFiles = processQuery(query, files.filter(file => file.parent === currentPath));
            loadFiles(filteredFiles);
        })
        .catch(error => console.error('Error filtering files:', error));
}

function processQuery(query, files) {
    let filters = [];
    let sortOrder = null;
    let sortField = null;

    const tagPattern = /<([^>]+)>/g;
    const sortPattern = /%([<>])([^%]+)%/g;

    let match;
    while ((match = tagPattern.exec(query)) !== null) {
        filters.push(match[1].toLowerCase());
    }

    while ((match = sortPattern.exec(query)) !== null) {
        sortOrder = match[1] === '>' ? 'asc' : 'desc';
        sortField = match[2].toLowerCase();
    }

    query = query.replace(tagPattern, '').replace(sortPattern, '').trim().toLowerCase();

    let filteredFiles = files.filter(file => {
        const fileType = file.type.toLowerCase();
        const fileName = file.name.toLowerCase();

        let matchesType = filters.length === 0 || filters.some(filter => fileType.includes(filter));
        let matchesName = !query || fileName.startsWith(query);

        return matchesType && matchesName;
    });

    if (sortField) {
        filteredFiles = sortFiles(filteredFiles, sortField, sortOrder);
    }

    return filteredFiles;
}

function convertSizeToBytes(sizeString) {
    const sizePattern = /([\d.]+)\s*(B|KB|MB|GB)/i;
    const match = sizePattern.exec(sizeString);

    if (!match) return 0;

    const sizeValue = parseFloat(match[1]);
    const sizeUnit = match[2].toUpperCase();

    switch (sizeUnit) {
        case 'B': return sizeValue;
        case 'KB': return sizeValue * 1000;
        case 'MB': return sizeValue * 1000000;
        case 'GB': return sizeValue * 1000000000;
        default: return 0;
    }
}

function sortFiles(files, field, order) {
    return files.sort((a, b) => {
        let valueA, valueB;

        if (field === 'name') {
            valueA = a.name.toLowerCase();
            valueB = b.name.toLowerCase();
        } else if (field === 'size') {
            valueA = convertSizeToBytes(a.size);
            valueB = convertSizeToBytes(b.size);
        } else if (field === 'date') {
            valueA = new Date(a.date);
            valueB = new Date(b.date);
        } else if (field === 'type') {
            const typeOrder = ['file', 'text', 'document', 'audio', 'video'];
            valueA = typeOrder.indexOf(a.type.toLowerCase());
            valueB = typeOrder.indexOf(b.type.toLowerCase());
        }

        return order === 'asc' ? (valueA > valueB ? 1 : -1) : (valueA < valueB ? 1 : -1);
    });
}

function loadFiles(files) {
    const fileGrid = document.getElementById('file-grid');
    fileGrid.innerHTML = '';

    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.classList.add('file-item');

        const iconPath = iconConfig[file.type] || '/default.png';
        fileItem.innerHTML = `
            <img class="file-icon" src="TempIconsSaveFile${iconPath}" alt="File Icon">
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-date">${file.date}</div>
            </div>
            <div class="file-size">${file.size}</div>
        `;

        const sessionStatus = sessionStorage.getItem(file.path);
        if (sessionStatus === 'corrupted') {
            fileItem.classList.add('corrupted');
            applyFileStyles(fileItem, 'corrupted');
        } else if (sessionStatus && sessionStatus.startsWith('locked')) {
            const lockLevel = sessionStatus.split('-')[1];
            fileItem.classList.add('locked');
            applyFileStyles(fileItem, 'locked');
        } else {
            fileItem.addEventListener('click', () => showFilePopup(file, fileItem));
        }

        fileItem.style.opacity = 0;
        fileGrid.appendChild(fileItem);
        setTimeout(() => {
            fileItem.style.transition = 'opacity 0.25s ease-out';
            fileItem.style.opacity = 1;
        }, index * 250);
    });
}

function initializeScrollIndicator() {
    scrollIndicator = document.getElementById('scroll-indicator');
    const container = document.querySelector('.file-system-container');
    
    scrollIndicator.innerHTML = '';
    for (let i = 0; i < totalSquares; i++) {
        const square = document.createElement('div');
        square.classList.add('scroll-square');
        scrollIndicator.appendChild(square);
    }

    container.addEventListener('scroll', updateScrollIndicator);
    window.addEventListener('resize', updateScrollIndicator);
    updateScrollIndicator();
}

function updateScrollIndicator() {
    const container = document.querySelector('.file-system-container');
    const totalHeight = container.scrollHeight - container.clientHeight;
    const scrollTop = container.scrollTop;

    const containerHeight = container.clientHeight;
    totalSquares = Math.max(Math.floor(containerHeight / 20), 5);

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

    const squareHeight = 100 / totalSquares;
    const squares = scrollIndicator.getElementsByClassName('scroll-square');
    for (let square of squares) {
        square.style.height = `${squareHeight}%`;
    }
    
    scrollIndicator.style.display = totalHeight > 0 ? 'block' : 'none';

    if (totalHeight > 0) {
        const percentageScrolled = scrollTop / totalHeight;
        const selectedSquare = Math.min(
            Math.floor(percentageScrolled * totalSquares),
            totalSquares - 1
        );

        for (let i = 0; i < squares.length; i++) {
            squares[i].style.backgroundImage = i === selectedSquare
                ? "url('/TempIconsSaveFile/SelectedScroll.png')"
                : "url('/TempIconsSaveFile/UnselectedScroll.png')";
        }
    }
}

// Initialize the application
fetch('icons.json')
    .then(response => response.json())
    .then(data => {
        iconConfig = data;
        loadFilesForCurrentPath();
    })
    .catch(error => console.error('Error loading icons:', error));