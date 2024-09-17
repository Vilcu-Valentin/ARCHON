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
    const interval = setInterval(() => updateProgress(), getRandomInterval(minInterval, maxInterval));
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
        }

        fileItem.addEventListener('click', () => showFilePopup(file, fileItem));

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