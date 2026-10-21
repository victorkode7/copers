// Equipment-slot visual experiment. Set enabled to false to disable it on reload.
(function () {
    const palettes = new Map();

    function paletteFor(image) {
        const source = image.currentSrc || image.src;
        if (palettes.has(source)) return palettes.get(source);
        let palette = null;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 32;
            const context = canvas.getContext('2d', {willReadFrequently: true});
            context.drawImage(image, 0, 0, 32, 32);
            const pixels = context.getImageData(0, 0, 32, 32).data;
            const buckets = new Map();
            for (let i = 0; i < pixels.length; i += 4) {
                if (pixels[i + 3] < 128) continue;
                const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
                const brightest = Math.max(...rgb), darkest = Math.min(...rgb);
                if (brightest < 45) continue;
                const key = rgb.map(value => Math.floor(value / 32)).join(',');
                const bucket = buckets.get(key) || {rgb, weight: 0};
                bucket.weight += pixels[i + 3] / 255 * (0.5 + (brightest - darkest) / 255);
                buckets.set(key, bucket);
            }
            const colors = [...buckets.values()].sort((a, b) => b.weight - a.weight);
            if (colors.length) {
                const primary = colors[0].rgb;
                const secondary = colors.find(color => color.rgb.reduce((sum, value, i) => sum + Math.abs(value - primary[i]), 0) > 100)?.rgb || primary;
                palette = [primary, secondary].map(rgb => 'rgb(' + rgb.join(',') + ')');
            }
        } catch (_) {
            // Local-file restrictions or unreadable images still get the rarity glow.
        }
        if (palettes.size >= 256) palettes.delete(palettes.keys().next().value);
        palettes.set(source, palette);
        return palette;
    }

    window.EquipmentEffects = {
        enabled: true,
        apply(icon) {
            const image = icon.querySelector('img');
            if (!this.enabled || !image) return;
            const decorate = () => {
                if (!image.naturalWidth || !icon.contains(image)) return;
                const palette = paletteFor(image);
                if (palette) {
                    icon.style.setProperty('--sprite-aura-primary', palette[0]);
                    icon.style.setProperty('--sprite-aura-secondary', palette[1]);
                }
                icon.classList.add('has-equipment-aura');
            };
            if (image.complete && image.naturalWidth) decorate();
            else image.addEventListener('load', decorate, {once: true});
        }
    };
}());
