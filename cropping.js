const elements = {
    imageInput: document.getElementById('imageInput'),
    originalImage: document.getElementById('originalImage'),
    gridContainer: document.getElementById('gridContainer'),
    errorMessage: document.getElementById('text-message'),
    shuffleButton: document.getElementById('shuffleButton'),
    levelSelect: document.querySelector('#level')
};

let currentImageUrl = null;
let imageCache = new Map();

const createImageBitmap = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });
    return window.createImageBitmap(blob);
};

const resizeImage = async (imageBitmap, targetSize) => {
    const canvas = new OffscreenCanvas(targetSize, targetSize);
    const ctx = canvas.getContext('2d');

    const size = Math.min(imageBitmap.width, imageBitmap.height);
    const sourceX = imageBitmap.width > size ? (imageBitmap.width - size) / 2 : 0;
    const sourceY = imageBitmap.height > size ? (imageBitmap.height - size) / 2 : 0;

    ctx.drawImage(imageBitmap, sourceX, sourceY, size, size, 0, 0, targetSize, targetSize);
    return canvas.convertToBlob();
};

const shuffleArray = () => {
    for (let i = 0; i < 1000; i++) {
        const randomIndex = Math.floor(Math.random() * 4);
        const event = { key: ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'][randomIndex] };
        document.dispatchEvent(new KeyboardEvent('keydown', event));
    }
};

const createGridItems = (imageUrl) => {
    const level = parseInt(elements.levelSelect.value);
    const totalCells = level * level;
    const backposUnit = 100 / (level - 1);

    elements.gridContainer.style.gridTemplateColumns = `repeat(${level}, 1fr)`;

    const positions = Array.from({ length: totalCells }, (_, i) => i);
    const fragment = document.createDocumentFragment();

    requestAnimationFrame(() => {
        positions.forEach((originalPos, currentPos) => {
            const gridItem = document.createElement('div');
            const row = Math.floor(originalPos / level);
            const col = originalPos % level;

            gridItem.className = currentPos < totalCells - 1 ? 'grid-item' : 'grid-item runner';
            gridItem.style.cssText = `
          background-size: ${level * 100}% ${level * 100}%;
          ${currentPos < totalCells - 1 ? `background-image: url(${imageUrl});` : ''}
          background-position: ${col * backposUnit}% ${row * backposUnit}%
        `;
            gridItem.dataset.originalPosition = originalPos + 1;

            fragment.appendChild(gridItem);
        });

        elements.gridContainer.innerHTML = '';
        elements.gridContainer.appendChild(fragment);
    });
};

const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        elements.shuffleButton.disabled = true;
        elements.errorMessage.textContent = 'Processing image...';

        const cacheKey = await crypto.subtle.digest('SHA-1', await file.arrayBuffer());
        if (imageCache.has(cacheKey)) {
            currentImageUrl = imageCache.get(cacheKey);
        } else {
            const imageBitmap = await createImageBitmap(file);
            const resizedBlob = await resizeImage(imageBitmap, 800); // Optimal size for game
            currentImageUrl = URL.createObjectURL(resizedBlob);
            imageCache.set(cacheKey, currentImageUrl);
        }

        elements.errorMessage.textContent = '';
        elements.originalImage.src = currentImageUrl;
        elements.originalImage.style.display = 'block';
        elements.shuffleButton.disabled = false;
        if (currentImageUrl) {
            const runnerElement = document.querySelector('.runner');
        }
        requestAnimationFrame(() => createGridItems(currentImageUrl));

    } catch (error) {
        elements.errorMessage.textContent = 'Error processing image';
        console.error(error);
    }
};

// Clean up object URLs when cache size exceeds limit
const cleanupCache = () => {
    if (imageCache.size > 10) {
        const oldestKey = imageCache.keys().next().value;
        URL.revokeObjectURL(imageCache.get(oldestKey));
        imageCache.delete(oldestKey);
    }
};

// Event Listeners with debouncing
let debounceTimer;
const debouncedCreateGrid = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => currentImageUrl && createGridItems(currentImageUrl), 150);
    elements.levelSelect.blur();
};

elements.shuffleButton.addEventListener('click', shuffleArray);
elements.levelSelect.addEventListener('change', debouncedCreateGrid);
elements.imageInput.addEventListener('change', handleImageUpload);


document.addEventListener('keydown', (event, isAuto) => {

    const runner = document.querySelector('.runner');
    const gridItems = Array.from(document.querySelectorAll('.grid-item'));
    const runnerIndex = gridItems.indexOf(runner);
    const gridSize = Math.sqrt(gridItems.length);

    let newIndex;
    switch (event.key) {
        case 'ArrowLeft':
            newIndex = runnerIndex % gridSize === 0 ? runnerIndex : runnerIndex - 1;
            break;
        case 'ArrowUp':
            newIndex = runnerIndex < gridSize ? runnerIndex : runnerIndex - gridSize;
            break;
        case 'ArrowRight':
            newIndex = runnerIndex % gridSize === gridSize - 1 ? runnerIndex : runnerIndex + 1;
            break;
        case 'ArrowDown':
            newIndex = runnerIndex >= gridItems.length - gridSize ? runnerIndex : runnerIndex + gridSize;
            break;
        default:
            return; // Exit if it's not an arrow key
    }

    if (newIndex !== runnerIndex) {
        const newRunner = gridItems[newIndex];
        // Swap the runner with the new grid item
        const runnerClone = runner.cloneNode(true);
        const newRunnerClone = newRunner.cloneNode(true);

        runner.replaceWith(newRunnerClone);
        newRunner.replaceWith(runnerClone);
    }
});

// Cleanup on page unload
window.addEventListener('unload', () => {
    imageCache.forEach(url => URL.revokeObjectURL(url));
});

