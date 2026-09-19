const images = new Map();
const pendingLoads = new Map();

function imageConstructor() {
    if (typeof globalThis.Image !== 'function') {
        throw new Error('Image loading requires a browser Image implementation');
    }
    return globalThis.Image;
}

export function isImageReady(image) {
    return Boolean(image?.complete && image.naturalWidth > 0);
}

/**
 * Return the one owned Image instance for a URL, starting its load if needed.
 * Renderers can retain this object safely; preloading and drawing therefore use
 * the same decoded image rather than allocating a fresh wrapper per frame.
 */
export function imageFor(url) {
    if (!url) return null;
    if (images.has(url)) return images.get(url);

    const ImageType = imageConstructor();
    const image = new ImageType();
    images.set(url, image);
    image.src = url;
    return image;
}

export function loadImage(url) {
    if (!url) return Promise.reject(new TypeError('An image URL is required'));

    const existing = images.get(url);
    if (isImageReady(existing)) return Promise.resolve(existing);
    if (pendingLoads.has(url)) return pendingLoads.get(url);

    const image = existing ?? imageFor(url);
    const pending = new Promise((resolve, reject) => {
        const loaded = () => {
            cleanup();
            resolve(image);
        };
        const failed = () => {
            cleanup();
            images.delete(url);
            reject(new Error(`Required image failed to load: ${url}`));
        };
        const cleanup = () => {
            image.removeEventListener('load', loaded);
            image.removeEventListener('error', failed);
            pendingLoads.delete(url);
        };

        image.addEventListener('load', loaded);
        image.addEventListener('error', failed);
        if (isImageReady(image)) loaded();
    });

    pendingLoads.set(url, pending);
    return pending;
}

export async function preloadImages(urls) {
    const uniqueUrls = [...new Set((urls ?? []).filter(Boolean))];
    await Promise.all(uniqueUrls.map(loadImage));
    return uniqueUrls.map((url) => images.get(url));
}

export function cachedImageUrls() {
    return [...images.entries()]
        .filter(([, image]) => isImageReady(image))
        .map(([url]) => url);
}

