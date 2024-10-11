let iconConfig = {};
let currentPath = 'root';
let showHidden = false;
let totalSquares = 20;

function initializeApplication() {
    document.getElementById('search-bar').addEventListener('input', filterFiles);
    document.getElementById('back-button').addEventListener('click', navigateBack);

    initializeScrollIndicator();
    fetch('icons.json')
        .then(response => response.json())
        .then(data => {
            iconConfig = data;
            loadFilesForCurrentPath();
        })
        .catch(error => console.error('Error loading icons:', error));
}

function getRandomInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper to create unique identifier for each file
function createFileIdentifier(file) {
    return `root/${file.parent}/${file.name}`;
}

function loadFiles(files) {
    const fileGrid = document.getElementById('file-grid');
    fileGrid.innerHTML = '';

    files.forEach((file, index) => {
        if (!file.hidden || showHidden) {
            const fileItem = document.createElement('div');
            fileItem.classList.add('file-item');

            // Create a unique identifier for this file
            const fileIdentifier = createFileIdentifier(file);
            fileItem.setAttribute('data-path', fileIdentifier);

            let iconPath = iconConfig[file.type] || '/default.png';
            let fileStatus = '';

            // Retrieve the status from localStorage based on the unique identifier
            const storedStatus = localStorage.getItem(fileIdentifier);

            if (storedStatus === 'corrupted') {
                fileStatus = 'corrupted';
                iconPath = iconPath.replace('.png', '-corrupted.png');
                fileItem.classList.add('corrupted');
            } else if (storedStatus && storedStatus.startsWith('locked')) {
                fileStatus = 'locked';
                iconPath = iconPath.replace('.png', '-locked.png');
                fileItem.classList.add('locked');
            }

            let fileItemHTML = `
                <img class="file-icon" src="TempIconsSaveFile${iconPath}" alt="File Icon">
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-date">${file.date}</div>
                </div>
                <div class="file-size">${file.size}</div>
            `;

            if (file.hidden) {
                fileItem.classList.add('hidden-file');
                fileItem.style.opacity = '0.9';
                fileItemHTML += '<div class="hidden-label">Hidden</div>';
            }

            fileItem.innerHTML = fileItemHTML;

            // Apply file styles if previously checked
            if (fileStatus) {
                applyFileStyles(fileItem, fileStatus);
            }

            // Add click listener to check the file and update style
            fileItem.addEventListener('click', () => showFilePopup(file, fileItem));

            fileItem.style.opacity = file.hidden ? '0.5' : '0';
            fileGrid.appendChild(fileItem);
            setTimeout(() => {
                fileItem.style.transition = 'opacity 0.25s ease-out';
                fileItem.style.opacity = file.hidden ? '0.5' : '1';
            }, index * 250);
        }
    });
}

function addPasswordField(popup, overlay, file) {
    const passwordContainer = document.createElement('div');
    passwordContainer.classList.add('password-container');

    const messageElement = document.createElement('div');
    messageElement.classList.add('password-message');
    passwordContainer.appendChild(messageElement);

    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.placeholder = 'Enter password';
    passwordContainer.appendChild(passwordInput);

    const submitButton = document.createElement('button');
    submitButton.textContent = 'Submit';
    submitButton.addEventListener('click', () => verifyPassword(passwordInput.value, file, messageElement));
    passwordContainer.appendChild(submitButton);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
    });
    passwordContainer.appendChild(closeButton);

    popup.appendChild(passwordContainer);
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

    function updateProgress() {
        progress += 10;
        loadingBar.style.width = `${progress}%`;

        if (progress === 20) {
            loadingText.innerText = 'Analyzing data...';
        } else if (progress === 40) {
            loadingText.innerText = 'Processing file...';
        } else if (progress === 90) {
            loadingText.innerText = 'Finalizing...';
        }

        if (progress >= 100) {
            clearInterval(interval);

            const fileIdentifier = createFileIdentifier(file);

            if (file.corrupted) {
                loadingText.innerText = 'File Status: CORRUPT\nSystem Diagnostics: Reconstruct attempt [failed]';
                loadingText.classList.add('corrupted-text');
                fileElement.classList.add('corrupted');
                applyFileStyles(fileElement, 'corrupted');
                localStorage.setItem(fileIdentifier, 'corrupted'); // Save status in localStorage
                
                updateFileIcon(fileElement, file, 'corrupted');
                addCloseButton(popup, overlay);

            } else if (file.locked && file.locked > 0) {
                loadingText.innerText = `File Status: LOCKED\nClearance Level: ${file.locked}`;
                loadingText.classList.add('locked-text');
                fileElement.classList.add('locked');
                applyFileStyles(fileElement, 'locked');
                localStorage.setItem(fileIdentifier, `locked-${file.locked}`); // Save status in localStorage
                
                updateFileIcon(fileElement, file, 'locked');
                addPasswordField(popup, overlay, file);
            } else {
                document.body.removeChild(popup);
                document.body.removeChild(overlay);
                if (file.type === 'file') {
                    navigateToFolder(file.name);
                } else {
                    openFileViewer(file);
                }
            }
        }
    }

    updateProgress();
    const interval = setInterval(updateProgress, getRandomInterval(100, 300));
}

function updateFileIcon(fileElement, file, status) {
    const iconElement = fileElement.querySelector('.file-icon');
    let iconPath = iconConfig[file.type] || '/default.png';
    iconPath = iconPath.replace('.png', `-${status}.png`);
    iconElement.src = `TempIconsSaveFile${iconPath}`;
}

function applyFileStyles(fileElement, status) {
    const fileNameElement = fileElement.querySelector('.file-name');
    const fileDateElement = fileElement.querySelector('.file-date');
    const fileSizeElement = fileElement.querySelector('.file-size');

    if (status === 'corrupted' || status === 'locked') {
        if (fileNameElement) fileNameElement.classList.add(status);
        if (fileDateElement) fileDateElement.classList.add(status);
        if (fileSizeElement) fileSizeElement.classList.add(status);
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
        })
        .catch(error => console.error('Error loading files:', error));
}

function navigateBack() {
    if (currentPath !== 'root') {
        const pathParts = currentPath.split('/');
        pathParts.pop();
        currentPath = pathParts.join('/') || 'root';
        updateFilePath();
        loadFilesForCurrentPath();
    }
}

function createHeader() {
    const header = document.createElement('header');
    header.innerHTML = `
        <div class="header-banner">
            <div>Connection: Secured | Encryption Protocol: A.R.C-99</div>
        </div>
        <div class="header-top">
            <h2>ARCHON ARCHIVE v1.97</h2>
            <div id="additional-container">
                <div id="file-path"><b>File path:</b> root/</div>
            </div>
        </div>
        <div class="header-middle">
            <button id="back-button">BACK</button>
            <div id="search-bar-container">
                <input type="text" id="search-bar" placeholder="Search:">
            </div>
        </div>
    `;
    return header;
}

function createMainContainer() {
    const mainContainer = document.createElement('div');
    mainContainer.className = 'main-container';
    mainContainer.innerHTML = `
        <div class="file-system-container">
            <div id="file-grid" class="file-grid">
                <!-- Files will be loaded here dynamically -->
            </div>
        </div>
        <div id="scroll-indicator"></div>
    `;
    return mainContainer;
}

function loadMainContent() {
    // Create main content structure
    const mainContent = document.createElement('div');
    mainContent.id = 'main-content';

    const header = createHeader();
    const mainContainer = createMainContainer();

    mainContent.appendChild(header);
    mainContent.appendChild(mainContainer);

    // Append main content to body
    document.body.appendChild(mainContent);

    // Initialize application
    initializeApplication();
}

document.addEventListener('DOMContentLoaded', function() {
    const passwordOverlay = document.getElementById('password-overlay');
    const passwordInput = document.getElementById('password-input');
    const submitButton = document.getElementById('submit-password');
    const errorMessage = document.getElementById('password-error');
    const correctPassword = 'REMNANT';

    function checkPassword() {
        if (passwordInput.value === correctPassword) {
            passwordOverlay.style.display = 'none';
            loadMainContent();
        } else {
            errorMessage.textContent = 'Incorrect password. Access denied.';
            passwordInput.value = '';
        }
    }

    submitButton.addEventListener('click', checkPassword);
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkPassword();
        }
    });
});

function verifyPassword(enteredPassword, file, messageElement) {
    if (file.psword === "" || enteredPassword !== file.psword) {
        messageElement.textContent = "Incorrect password. Access denied.";
        messageElement.style.color = 'red';
        setTimeout(() => {
            messageElement.textContent = '';
        }, 3000);
    } else {
        messageElement.textContent = "Access granted. Opening file...";
        messageElement.style.color = 'green';
        setTimeout(() => {
            const popup = document.querySelector('.file-popup');
            const overlay = document.querySelector('.modal-overlay');
            document.body.removeChild(popup);
            document.body.removeChild(overlay);
            if (file.type === 'file') {
                navigateToFolder(file.name);
            } else {
                openFileViewer(file);
            }
        }, 1500);
    }
}

function openFileViewer(file) {
    const overlay = document.createElement('div');
    overlay.classList.add('modal-overlay');
    document.body.appendChild(overlay);

    const viewer = document.createElement('div');
    viewer.classList.add('file-viewer');

    // Add file name display
    const fileNameDisplay = document.createElement('div');
    fileNameDisplay.classList.add('file-name-display');
    fileNameDisplay.textContent = file.name;
    viewer.appendChild(fileNameDisplay);

    let content;
    let mediaElement; // This will store the audio or video element
    switch (file.type) {
        case 'text':
            content = createTextViewer(file);
            break;
        case 'document':
            content = createPDFViewer(file);
            break;
        case 'audio':
            ({content, mediaElement} = createAudioPlayer(file));
            break;
        case 'video':
            ({content, mediaElement} = createVideoPlayer(file));
            break;
        default:
            content = document.createElement('div');
            content.textContent = 'Unsupported file type';
    }

    viewer.appendChild(content);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => {
        if (mediaElement) {
            mediaElement.pause(); // Stop audio/video playback
            mediaElement.currentTime = 0; // Reset to beginning
        }
        document.body.removeChild(viewer);
        document.body.removeChild(overlay);
    });
    viewer.appendChild(closeButton);

    document.body.appendChild(viewer);
}

function createTextViewer(file) {
    const textContainer = document.createElement('div');
    textContainer.classList.add('text-viewer');

    fetch(file.path)
        .then(response => response.text())
        .then(text => {
            textContainer.textContent = text;
        })
        .catch(error => {
            console.error('Error loading text file:', error);
            textContainer.textContent = 'Error loading file';
        });

    return textContainer;
}

function createPDFViewer(file) {
    const pdfContainer = document.createElement('div');
    pdfContainer.classList.add('pdf-viewer');

    const pdfEmbed = document.createElement('embed');
    pdfEmbed.src = file.path;
    pdfEmbed.type = 'application/pdf';
    pdfEmbed.width = '100%';
    pdfEmbed.height = '100%';

    pdfContainer.appendChild(pdfEmbed);

    return pdfContainer;
}

function createAudioPlayer(file) {
    const audioContainer = document.createElement('div');
    audioContainer.classList.add('audio-player');

    const audio = document.createElement('audio');
    audio.src = file.path;

    const playPauseButton = document.createElement('button');
    playPauseButton.textContent = 'Play';
    playPauseButton.addEventListener('click', () => {
        if (audio.paused) {
            audio.play();
            playPauseButton.textContent = 'Pause';
        } else {
            audio.pause();
            playPauseButton.textContent = 'Play';
        }
    });

    const timeDisplay = document.createElement('span');
    timeDisplay.classList.add('time-display');

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 100;
    slider.value = 0;

    slider.addEventListener('input', () => {
        const time = (slider.value / 100) * audio.duration;
        audio.currentTime = time;
    });

    audio.addEventListener('loadedmetadata', () => {
        timeDisplay.textContent = `0:00 - ${formatTime(audio.duration)}`;
    });

    audio.addEventListener('timeupdate', () => {
        const currentTime = formatTime(audio.currentTime);
        const duration = formatTime(audio.duration);
        timeDisplay.textContent = `${currentTime} - ${duration}`;
        slider.value = (audio.currentTime / audio.duration) * 100;
    });

    audioContainer.appendChild(playPauseButton);
    audioContainer.appendChild(slider);
    audioContainer.appendChild(timeDisplay);

    return {content: audioContainer, mediaElement: audio};
}

function createVideoPlayer(file) {
    const videoContainer = document.createElement('div');
    videoContainer.classList.add('video-player');

    const video = document.createElement('video');
    video.src = file.path;
    video.controls = true;
    video.width = '100%';
    video.height = 'auto';

    videoContainer.appendChild(video);

    return {content: videoContainer, mediaElement: video};
}

function formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

    // Extract tags
    const tagPattern = /<([^>]+)>/g;
    let match;
    while ((match = tagPattern.exec(query)) !== null) {
        filters.push(match[1].toLowerCase());
    }

    // Extract sort order
    const sortPattern = /%([<>])([^%]+)%/g;
    while ((match = sortPattern.exec(query)) !== null) {
        sortOrder = match[1] === '>' ? 'asc' : 'desc';
        sortField = match[2].toLowerCase();
    }

    // Check for [showhidden] tag
    showHidden = query.includes('[showhidden]');

    // Remove all special tags from the query
    query = query.replace(tagPattern, '')
                 .replace(sortPattern, '')
                 .replace(/\[showhidden\]/g, '')
                 .trim()
                 .toLowerCase();

    let filteredFiles = files.filter(file => {
        const fileType = file.type.toLowerCase();
        const fileName = file.name.toLowerCase();

        let matchesType = filters.length === 0 || filters.some(filter => fileType.includes(filter));
        let matchesName = !query || fileName.includes(query);
        let isVisible = !file.hidden || showHidden;

        return matchesType && matchesName && isVisible;
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

        if (valueA === valueB) return 0;
        if (order === 'asc') {
            return valueA < valueB ? -1 : 1;
        } else {
            return valueA > valueB ? -1 : 1;
        }
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