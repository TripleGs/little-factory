const Pan = (() => {
    let ready = false;
    let viewport = null;
    let stage = null;

    let trackingPointer = false;
    let dragActivated = false;
    let panButton = -1;
    let startX = 0;
    let startY = 0;
    let startOffsetX = 0;
    let startOffsetY = 0;
    let offsetX = 0;
    let offsetY = 0;
    let suppressClick = false;
    let suppressNextContextMenu = false;
    let hasUserMoved = false;

    const DRAG_THRESHOLD = 4;

    function syncElements() {
        viewport = els.mapViewport || document.getElementById('map-viewport');
        stage = els.mapStage || document.getElementById('map-stage');
    }

    function applyTransform() {
        if (!stage) return;
        stage.style.transform = `translate(${Math.round(offsetX)}px, ${Math.round(offsetY)}px)`;
    }

    function centerMap() {
        syncElements();
        if (!viewport || !stage) return;

        offsetX = (viewport.clientWidth - stage.offsetWidth) / 2;
        offsetY = (viewport.clientHeight - stage.offsetHeight) / 2;
        applyTransform();
    }

    function refresh() {
        syncElements();
        if (!viewport || !stage) return;

        if (!hasUserMoved) {
            centerMap();
            return;
        }

        applyTransform();
    }

    function resetPosition() {
        hasUserMoved = false;
        refresh();
    }

    function isInteractiveUI(target) {
        return target.closest('button, input, select, textarea, .palette, .sub-palette, .tool-btn, .player-sidebar');
    }

    function canStartPan(target) {
        syncElements();
        if (!viewport || !target || !viewport.contains(target)) return false;
        if (isInteractiveUI(target)) return false;
        return !target.closest('.grid-container');
    }

    function onMouseDown(e) {
        suppressClick = false;

        if (e.button === 2) {
            if (canStartPan(e.target)) {
                beginPan(e);
            }
            return;
        }

        if (e.button === 0 && canStartPan(e.target)) {
            beginPan(e);
        }
    }

    function beginPan(e) {
        syncElements();
        if (!viewport || !stage) return;

        trackingPointer = true;
        dragActivated = false;
        panButton = e.button;
        startX = e.clientX;
        startY = e.clientY;
        startOffsetX = offsetX;
        startOffsetY = offsetY;
        e.preventDefault();
    }

    function onMouseMove(e) {
        if (!trackingPointer || !stage) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const movedDistance = Math.max(Math.abs(dx), Math.abs(dy));

        if (!dragActivated && movedDistance <= DRAG_THRESHOLD) {
            return;
        }

        if (!dragActivated) {
            dragActivated = true;
            document.body.classList.add('is-panning');
        }

        offsetX = startOffsetX + dx;
        offsetY = startOffsetY + dy;
        hasUserMoved = true;
        applyTransform();
        e.preventDefault();
    }

    function onMouseUp() {
        if (!trackingPointer) return;

        if (dragActivated) {
            suppressClick = true;
        }

        if (panButton === 2 && dragActivated) {
            suppressNextContextMenu = true;
        }

        trackingPointer = false;
        dragActivated = false;
        panButton = -1;
        document.body.classList.remove('is-panning');
    }

    function onContextMenu(e) {
        if (!canStartPan(e.target)) {
            return;
        }

        if (suppressNextContextMenu) {
            suppressNextContextMenu = false;
        }

        e.preventDefault();
        e.stopPropagation();
    }

    function init() {
        syncElements();
        if (ready) {
            refresh();
            return;
        }

        window.addEventListener('mousedown', onMouseDown, true);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('contextmenu', onContextMenu, true);
        ready = true;
        refresh();
    }

    return {
        blocksGridInput: () => trackingPointer,
        consumeClick: () => {
            if (!suppressClick) return false;
            suppressClick = false;
            return true;
        },
        init,
        isPanning: () => dragActivated,
        refresh,
        resetPosition
    };
})();
