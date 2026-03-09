const Pan = (() => {
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;
    let scrollTarget = null;
    let ready = false;

    function resolveScrollTarget() {
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            const canScroll = appContainer.scrollWidth > appContainer.clientWidth ||
                appContainer.scrollHeight > appContainer.clientHeight;
            if (canScroll) {
                return appContainer;
            }
        }
        return document.scrollingElement || document.documentElement;
    }

    function startPan(event) {
        if (event.button !== 0 || event.detail !== 2) return;

        scrollTarget = resolveScrollTarget();
        if (!scrollTarget || !els.grid) return;

        isPanning = true;
        startX = event.clientX;
        startY = event.clientY;
        startScrollLeft = scrollTarget.scrollLeft;
        startScrollTop = scrollTarget.scrollTop;

        els.grid.classList.add('is-panning');
        event.preventDefault();
        event.stopPropagation();
    }

    function movePan(event) {
        if (!isPanning || !scrollTarget) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        scrollTarget.scrollLeft = startScrollLeft - dx;
        scrollTarget.scrollTop = startScrollTop - dy;
    }

    function stopPan() {
        if (!isPanning) return;
        isPanning = false;
        if (els.grid) {
            els.grid.classList.remove('is-panning');
        }
    }

    function init() {
        if (ready || !els.grid) return;
        els.grid.addEventListener('mousedown', startPan, true);
        window.addEventListener('mousemove', movePan);
        window.addEventListener('mouseup', stopPan);
        ready = true;
    }

    return {
        init,
        isPanning: () => isPanning
    };
})();
