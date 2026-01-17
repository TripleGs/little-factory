// UI Helper Functions
function updateButtonAffordability(button, cost, isAffordable) {
    button.style.opacity = isAffordable ? '1' : COLOR_CONFIG.ui.disabledOpacity;
    button.setAttribute('aria-disabled', String(!isAffordable));
    if (!isAffordable) {
        button.classList.add('unaffordable');
    } else {
        button.classList.remove('unaffordable');
    }
}
