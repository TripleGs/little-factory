function applyStopperState(item) {
    if (state.stoppedItems.has(item.id)) {
        const stopData = state.stoppedItems.get(item.id);
        stopData.ticksRemaining--;
        if (stopData.ticksRemaining <= 0) {
            state.stoppedItems.delete(item.id);
        } else {
            return true;
        }
    }

    return false;
}

function markItemStopped(item) {
    if (!state.stoppedItems.has(item.id)) {
        Sound.play('stop');
    }
    state.stoppedItems.set(item.id, { ticksRemaining: 3 });
}
