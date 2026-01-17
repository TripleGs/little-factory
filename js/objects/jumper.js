function markItemJumping(item) {
    item._isJumping = true;
}

function consumeJumpFlag(item) {
    const jumpDistance = item._isJumping ? 2 : 1;
    delete item._isJumping;
    return jumpDistance;
}
