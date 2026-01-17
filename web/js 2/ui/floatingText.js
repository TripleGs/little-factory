function spawnFloatingText(x, y, text) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.innerText = text;
    el.style.left = `${x * (state.cellSize + 1) + COLOR_CONFIG.floatingText.offsetX}px`;
    el.style.top = `${y * (state.cellSize + 1) + COLOR_CONFIG.floatingText.offsetY}px`;
    el.style.width = `${state.cellSize}px`;
    el.style.textAlign = 'center';
    els.grid.appendChild(el);

    requestAnimationFrame(() => {
        el.style.transform = `translateY(${COLOR_CONFIG.floatingText.moveDistance}px)`;
        el.style.opacity = '0';
    });

    setTimeout(() => el.remove(), COLOR_CONFIG.floatingText.duration);
}
