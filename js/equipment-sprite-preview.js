(function () {
    'use strict';
    let active = null, preview = null, frame = 0;
    const sizeObserver = new ResizeObserver(position);

    function close() {
        cancelAnimationFrame(frame);
        frame = 0;
        sizeObserver.disconnect();
        document.removeEventListener('scroll', schedulePosition, true);
        window.removeEventListener('resize', schedulePosition);
        active?.setAttribute('aria-expanded', 'false');
        preview?.remove();
        active = preview = null;
    }
    function position() {
        if (!active) return;
        const image = active?.querySelector('img');
        const rect = image?.getBoundingClientRect();
        if (!active?.isConnected || !rect?.width || !rect.height) { close(); return; }
        preview.style.left = rect.left + rect.width / 2 + 'px';
        preview.style.top = rect.top + rect.height / 2 + 'px';
    }
    function schedulePosition() {
        if (frame || !active) return;
        // Coalesce scroll/resize events without running a permanent frame loop.
        frame = requestAnimationFrame(() => { frame = 0; position(); });
    }
    function toggle(icon) {
        if (active === icon) { close(); return; }
        close();
        const image = icon.querySelector('img');
        if (!image) return;
        active = icon;
        active.setAttribute('aria-expanded', 'true');
        preview = document.createElement('button');
        preview.type = 'button';
        preview.className = 'equipment-sprite-preview';
        preview.setAttribute('aria-label', 'Close enlarged equipment sprite');
        preview.append(image.cloneNode());
        preview.addEventListener('click', event => {
            event.stopPropagation();
            const source = active;
            close();
            source?.focus({preventScroll: true});
        });
        document.body.append(preview);
        sizeObserver.observe(image);
        document.addEventListener('scroll', schedulePosition, {capture: true, passive: true});
        window.addEventListener('resize', schedulePosition, {passive: true});
        position();
    }
    function createIcon(item, fallback) {
        const icon = Equipment.createIcon(item, fallback);
        if (!icon.querySelector('img')) return icon;
        icon.classList.add('equipment-sprite-trigger');
        icon.removeAttribute('aria-hidden');
        icon.setAttribute('role', 'button');
        icon.tabIndex = 0;
        icon.setAttribute('aria-label', 'Enlarge ' + item.name + ' sprite');
        icon.setAttribute('aria-expanded', 'false');
        icon.addEventListener('click', event => {
            event.stopPropagation();
            toggle(icon);
        });
        icon.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            event.stopPropagation();
            toggle(icon);
        });
        return icon;
    }
    document.addEventListener('click', event => {
        if (!active || active.contains(event.target) || preview.contains(event.target)) return;
        close();
    }, true);
    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !active) return;
        const source = active;
        close();
        source.focus({preventScroll: true});
    });
    window.EquipmentSpritePreview = {createIcon};
}());
