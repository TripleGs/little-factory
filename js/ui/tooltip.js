// Tooltip Helper
let currentTooltip = null;
function showTooltip(targetEl, text) {
    if (currentTooltip) currentTooltip.remove();

    const tooltip = document.createElement('div');
    tooltip.className = 'floating-text';
    tooltip.style.position = 'fixed';
    tooltip.style.zIndex = '9999'; // Very high z-index
    tooltip.style.background = 'white';
    tooltip.style.padding = '5px 10px';
    tooltip.style.border = '2px solid black';
    tooltip.style.borderRadius = '5px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.fontSize = '16px'; // Readable font size
    tooltip.style.color = 'black';
    tooltip.innerText = text;

    document.body.appendChild(tooltip);

    const rect = targetEl.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    // Position above centered
    let top = rect.top - tooltipRect.height - 10;
    let left = rect.left + (rect.width - tooltipRect.width) / 2;

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;

    currentTooltip = tooltip;
}

function hideTooltip() {
    if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
    }
}
